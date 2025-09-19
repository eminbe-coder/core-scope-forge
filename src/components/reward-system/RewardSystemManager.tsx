import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Users, Settings, History, Plus, Edit, Save, X, Clock, Target } from 'lucide-react';

interface RewardConfiguration {
  id: string;
  action_name: string;
  action_description: string;
  points_value: number;
  active: boolean;
}

interface UserParticipation {
  id: string;
  user_id: string;
  active: boolean;
  user_profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
  total_points?: number;
  current_target?: {
    target_points: number;
    current_points: number;
    achieved: boolean;
  };
}

interface PointTransaction {
  id: string;
  user_id: string;
  action_name: string;
  points_earned: number;
  created_at: string;
  entity_type?: string;
  notes?: string;
  user_profile: {
    first_name: string;
    last_name: string;
  };
}

interface RewardPeriod {
  id: string;
  period_type: 'weekly' | 'monthly';
  is_active: boolean;
}

interface PeriodCycle {
  id: string;
  period_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export const RewardSystemManager = () => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [configurations, setConfigurations] = useState<RewardConfiguration[]>([]);
  const [participants, setParticipants] = useState<UserParticipation[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [periods, setPeriods] = useState<RewardPeriod[]>([]);
  const [currentCycle, setCurrentCycle] = useState<PeriodCycle | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RewardConfiguration | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingTarget, setEditingTarget] = useState<{ userId: string; targetPoints: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUserTargetPoints, setNewUserTargetPoints] = useState<number>(100);

  useEffect(() => {
    if (currentTenant?.id) {
      loadConfigurations();
      loadParticipants();
      loadTransactions();
      loadAvailableUsers();
      loadPeriods();
      loadCurrentCycle();
      // Create missing user_reward_points records for existing participants
      createMissingPointsRecords();
    }
  }, [currentTenant?.id]);

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_configurations')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('action_name');

      if (error) throw error;
      setConfigurations(data || []);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast({
        title: "Error",
        description: "Failed to load reward configurations",
        variant: "destructive",
      });
    }
  };

  const loadParticipants = async () => {
    try {
      // Get participants - use LEFT JOIN approach to handle missing user_reward_points
      const { data: participantData, error: participantError } = await supabase
        .from('user_reward_participation')
        .select('*')
        .eq('tenant_id', currentTenant?.id);

      if (participantError) throw participantError;

      // Get user reward points separately with LEFT JOIN logic
      const userIds = participantData?.map(p => p.user_id) || [];
      let pointsData: any[] = [];
      if (userIds.length > 0) {
        const { data: points } = await supabase
          .from('user_reward_points')
          .select('user_id, total_points')
          .in('user_id', userIds)
          .eq('tenant_id', currentTenant?.id);
        pointsData = points || [];
      }

      // Get current cycle to fetch targets
      const { data: cycleData } = await supabase
        .from('reward_period_cycles')
        .select('id')
        .eq('tenant_id', currentTenant?.id)
        .eq('is_current', true)
        .single();

      // Get user profiles and targets
      if (userIds.length > 0) {
        const [profilesResult, targetsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds),
          cycleData ? supabase
            .from('user_reward_targets')
            .select('user_id, target_points, current_points, achieved')
            .eq('period_cycle_id', cycleData.id)
            .in('user_id', userIds) : Promise.resolve({ data: [] })
        ]);

        if (profilesResult.error) throw profilesResult.error;

        const participantsWithProfiles = participantData?.map(p => ({
          ...p,
          user_profile: profilesResult.data?.find(profile => profile.id === p.user_id) || {
            first_name: 'Unknown',
            last_name: 'User',
            email: 'unknown@example.com'
          },
          total_points: pointsData.find(pt => pt.user_id === p.user_id)?.total_points || 0,
          current_target: targetsResult.data?.find(t => t.user_id === p.user_id) || null
        })) || [];

        setParticipants(participantsWithProfiles);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: "Error",
        description: "Failed to load participants",
        variant: "destructive",
      });
    }
  };

  const loadTransactions = async () => {
    try {
      const { data: transactionData, error: transactionError } = await supabase
        .from('reward_point_transactions')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionError) throw transactionError;

      // Get user profiles for transactions
      const userIds = [...new Set(transactionData?.map(t => t.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profileError) throw profileError;

        const transactionsWithProfiles = transactionData?.map(t => ({
          ...t,
          user_profile: profiles?.find(profile => profile.id === t.user_id) || {
            first_name: 'Unknown',
            last_name: 'User'
          }
        })) || [];

        setTransactions(transactionsWithProfiles);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load point transactions",
        variant: "destructive",
      });
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          user_id,
          profiles(id, first_name, last_name, email)
        `)
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true);

      if (error) throw error;
      setAvailableUsers(data?.map(u => u.profiles).filter(Boolean) || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_periods')
        .select('*')
        .eq('tenant_id', currentTenant?.id);

      if (error) throw error;
      setPeriods((data as RewardPeriod[]) || []);
    } catch (error) {
      console.error('Error loading periods:', error);
    }
  };

  const loadCurrentCycle = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_period_cycles')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .eq('is_current', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentCycle(data as PeriodCycle);
    } catch (error) {
      console.error('Error loading current cycle:', error);
    }
  };

  // Data cleanup function to create missing user_reward_points records
  const createMissingPointsRecords = async () => {
    try {
      // Get all participants
      const { data: participants } = await supabase
        .from('user_reward_participation')
        .select('user_id')
        .eq('tenant_id', currentTenant?.id);

      if (!participants?.length) return;

      // Get existing points records
      const { data: existingPoints } = await supabase
        .from('user_reward_points')
        .select('user_id')
        .eq('tenant_id', currentTenant?.id);

      const existingUserIds = existingPoints?.map(p => p.user_id) || [];
      const missingUserIds = participants
        .map(p => p.user_id)
        .filter(userId => !existingUserIds.includes(userId));

      // Create missing records
      if (missingUserIds.length > 0) {
        const missingRecords = missingUserIds.map(userId => ({
          user_id: userId,
          tenant_id: currentTenant?.id,
          total_points: 0
        }));

        const { error } = await supabase
          .from('user_reward_points')
          .insert(missingRecords);

        if (error) throw error;
        
        console.log(`Created ${missingUserIds.length} missing user_reward_points records`);
      }
    } catch (error) {
      console.error('Error creating missing points records:', error);
    }
  };

  const updateConfiguration = async (config: RewardConfiguration) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('reward_configurations')
        .update({
          points_value: config.points_value,
          active: config.active,
          action_description: config.action_description
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reward configuration updated successfully",
      });

      loadConfigurations();
      setEditingConfig(null);
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = async (userId: string, targetPoints: number = 100) => {
    try {
      setLoading(true);
      
      // Check for duplicates
      const { data: existing } = await supabase
        .from('user_reward_participation')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', currentTenant?.id)
        .single();

      if (existing) {
        toast({
          title: "Error",
          description: "User is already in the reward system",
          variant: "destructive",
        });
        return;
      }

      // Use transaction-like approach with multiple inserts
      const { error: participantError } = await supabase
        .from('user_reward_participation')
        .insert({
          user_id: userId,
          tenant_id: currentTenant?.id,
          active: true
        });

      if (participantError) throw participantError;

      // Create user_reward_points record (required for joins)
      const { error: pointsError } = await supabase
        .from('user_reward_points')
        .insert({
          user_id: userId,
          tenant_id: currentTenant?.id,
          total_points: 0
        });

      if (pointsError) throw pointsError;

      // Create target for current cycle if exists
      if (currentCycle) {
        const { error: targetError } = await supabase
          .from('user_reward_targets')
          .insert({
            user_id: userId,
            tenant_id: currentTenant?.id,
            period_cycle_id: currentCycle.id,
            target_points: targetPoints,
            current_points: 0
          });

        if (targetError) console.error('Error creating target:', targetError);
      }

      toast({
        title: "Success",
        description: "User added to reward system successfully",
      });

      loadParticipants();
      setIsAddingUser(false);
      setSelectedUser(null);
      setNewUserTargetPoints(100);
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({
        title: "Error",
        description: "Failed to add user to reward system",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserTarget = async (userId: string, targetPoints: number) => {
    if (!currentCycle) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_reward_targets')
        .upsert({
          user_id: userId,
          tenant_id: currentTenant?.id,
          period_cycle_id: currentCycle.id,
          target_points: targetPoints
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Target updated successfully",
      });

      loadParticipants();
      setEditingTarget(null);
    } catch (error) {
      console.error('Error updating target:', error);
      toast({
        title: "Error",
        description: "Failed to update target",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePeriodType = async (periodType: 'weekly' | 'monthly') => {
    try {
      setLoading(true);
      
      // Update period configuration
      const { error } = await supabase
        .from('reward_periods')
        .update({ period_type: periodType })
        .eq('tenant_id', currentTenant?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Period type updated successfully",
      });

      loadPeriods();
      loadCurrentCycle();
    } catch (error) {
      console.error('Error updating period:', error);
      toast({
        title: "Error",
        description: "Failed to update period type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = async (participantId: string, active: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_reward_participation')
        .update({ active })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${active ? 'activated' : 'deactivated'} in reward system`,
      });

      loadParticipants();
    } catch (error) {
      console.error('Error updating participant:', error);
      toast({
        title: "Error",
        description: "Failed to update participant status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activePeriod = periods.find(p => p.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Reward System</h2>
      </div>

      <Tabs defaultValue="period" className="space-y-4">
        <TabsList>
          <TabsTrigger value="period" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Period Settings
          </TabsTrigger>
          <TabsTrigger value="configurations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Action Points
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Point History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="period">
          <Card>
            <CardHeader>
              <CardTitle>Period Configuration</CardTitle>
              <CardDescription>
                Configure how often reward points reset and targets are calculated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reward Period Type</Label>
                <Select 
                  value={activePeriod?.period_type || 'weekly'} 
                  onValueChange={(value: 'weekly' | 'monthly') => updatePeriodType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {currentCycle && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Current Period</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(currentCycle.start_date).toLocaleDateString()} - {new Date(currentCycle.end_date).toLocaleDateString()}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {currentCycle.period_type} cycle
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configurations">
          <Card>
            <CardHeader>
              <CardTitle>Action Point Values</CardTitle>
              <CardDescription>
                Configure how many points users earn for different actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {config.action_name.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>{config.action_description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{config.points_value} pts</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.active ? "default" : "secondary"}>
                          {config.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingConfig(config)}
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Reward Participants</CardTitle>
                <CardDescription>
                  Manage which users participate in the reward system and set their targets
                </CardDescription>
              </div>
              <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add User to Reward System</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!selectedUser ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Select a user to add to the reward system
                        </p>
                        {availableUsers
                          .filter(user => !participants.some(p => p.user_id === user.id))
                          .map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 cursor-pointer"
                                 onClick={() => setSelectedUser(user)}>
                              <div>
                                <p className="font-medium">{user.first_name} {user.last_name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                Select
                              </Button>
                            </div>
                          ))}
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium">Selected User</h4>
                          <p className="text-sm">{selectedUser.first_name} {selectedUser.last_name}</p>
                          <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="targetPoints">Target Points for Current Period</Label>
                          <Input
                            id="targetPoints"
                            type="number"
                            value={newUserTargetPoints}
                            onChange={(e) => setNewUserTargetPoints(parseInt(e.target.value) || 100)}
                            min="1"
                            max="10000"
                          />
                          <p className="text-xs text-muted-foreground">
                            Set the target points this user should achieve in the current reward period
                          </p>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(null);
                              setNewUserTargetPoints(100);
                            }}
                          >
                            Back
                          </Button>
                          <Button
                            onClick={() => addParticipant(selectedUser.id, newUserTargetPoints)}
                            disabled={loading}
                          >
                            Add to Reward System
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Points</TableHead>
                    <TableHead>Current Target</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.user_profile.first_name} {participant.user_profile.last_name}
                      </TableCell>
                      <TableCell>{participant.user_profile.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Trophy className="h-3 w-3 mr-1" />
                          {participant.total_points || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{participant.current_target?.target_points || 100}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTarget({
                              userId: participant.user_id,
                              targetPoints: participant.current_target?.target_points || 100
                            })}
                          >
                            <Target className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={participant.current_target?.achieved ? "default" : "secondary"}
                          >
                            {participant.current_target?.current_points || 0}/{participant.current_target?.target_points || 100}
                          </Badge>
                          {participant.current_target?.achieved && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={participant.active ? "default" : "secondary"}>
                          {participant.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={participant.active}
                          onCheckedChange={(checked) => 
                            toggleParticipant(participant.id, checked)
                          }
                          disabled={loading}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Point Transaction History</CardTitle>
              <CardDescription>
                Recent point earnings across all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.user_profile.first_name} {transaction.user_profile.last_name}
                      </TableCell>
                      <TableCell>{transaction.action_name.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">+{transaction.points_earned}</Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.entity_type && (
                          <Badge variant="outline">{transaction.entity_type}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Configuration Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Action Configuration</DialogTitle>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="points">Points Value</Label>
                <Input
                  id="points"
                  type="number"
                  value={editingConfig.points_value}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    points_value: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingConfig.action_description || ''}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    action_description: e.target.value
                  })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={editingConfig.active}
                  onCheckedChange={(checked) => setEditingConfig({
                    ...editingConfig,
                    active: checked
                  })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingConfig(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={() => updateConfiguration(editingConfig)}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Target Dialog */}
      <Dialog open={!!editingTarget} onOpenChange={() => setEditingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Target Points</DialogTitle>
          </DialogHeader>
          {editingTarget && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="target">Target Points</Label>
                <Input
                  id="target"
                  type="number"
                  value={editingTarget.targetPoints}
                  onChange={(e) => setEditingTarget({
                    ...editingTarget,
                    targetPoints: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateUserTarget(editingTarget.userId, editingTarget.targetPoints)}
                  disabled={loading}
                >
                  Save Target
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};