import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, 
  Clock, 
  Bell, 
  Calendar,
  User,
  Building2,
  Loader2,
  X
} from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useTenant } from '@/hooks/use-tenant';
import { useWorkingHours } from '@/hooks/use-working-hours';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const daysOfWeek = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' }
];

const MyWorkspace = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { currentTenant } = useTenant();
  const { workingHours, loading: workingHoursLoading, saveWorkingHours } = useWorkingHours();
  
  const [activeTab, setActiveTab] = useState('work-info');
  const [saving, setSaving] = useState(false);
  
  // Working hours state
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailTodos: true,
    emailDeals: true,
    emailPayments: true,
    pushTodos: true,
    pushDeals: false,
    pushPayments: true,
  });

  useEffect(() => {
    if (workingHours) {
      setWorkingDays(workingHours.working_days || [1, 2, 3, 4, 5]);
      setStartTime(workingHours.start_time || '09:00');
      setEndTime(workingHours.end_time || '18:00');
      setHolidays(workingHours.custom_holidays || []);
    }
  }, [workingHours]);

  const toggleWorkingDay = (dayId: number) => {
    setWorkingDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId) 
        : [...prev, dayId]
    );
  };

  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday]);
      setNewHoliday('');
    }
  };

  const removeHoliday = (holiday: string) => {
    setHolidays(holidays.filter(h => h !== holiday));
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await saveWorkingHours({
        working_days: workingDays,
        start_time: startTime,
        end_time: endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        custom_holidays: holidays
      });
      toast.success('Schedule settings saved successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      // TODO: Implement notification preferences save
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading || workingHoursLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8" />
            My Workspace
          </h1>
          <p className="text-muted-foreground">
            Configure your personal settings for {currentTenant?.name}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="work-info" className="gap-2">
              <User className="h-4 w-4" />
              Work Info
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Work Info Tab */}
          <TabsContent value="work-info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Tenant Employment Info
                </CardTitle>
                <CardDescription>
                  Your role and employment details for this organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input value={currentTenant?.name || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID</Label>
                    <Input placeholder="Not set" disabled className="bg-muted" />
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input placeholder="Not set" disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input placeholder="Not set" disabled className="bg-muted" />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Contact your administrator to update your employment details.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Working Hours
                </CardTitle>
                <CardDescription>
                  Set your regular working hours for task scheduling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input 
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Working Days</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {daysOfWeek.map((day) => (
                      <div
                        key={day.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`day-${day.id}`}
                          checked={workingDays.includes(day.id)}
                          onCheckedChange={() => toggleWorkingDay(day.id)}
                        />
                        <Label htmlFor={`day-${day.id}`} className="text-sm font-normal">
                          {day.short}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Custom Holidays</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={newHoliday}
                      onChange={(e) => setNewHoliday(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" onClick={addHoliday} size="sm">
                      Add
                    </Button>
                  </div>
                  
                  {holidays.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {holidays.map((holiday) => (
                        <Badge key={holiday} variant="secondary" className="text-xs">
                          {new Date(holiday).toLocaleDateString()}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeHoliday(holiday)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveSchedule} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Schedule
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Choose which notifications you receive by email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">To-Do Reminders</p>
                    <p className="text-sm text-muted-foreground">Get notified about upcoming tasks</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.emailTodos}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(p => ({ ...p, emailTodos: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Deal Updates</p>
                    <p className="text-sm text-muted-foreground">Notifications when deals change status</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.emailDeals}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(p => ({ ...p, emailDeals: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment Alerts</p>
                    <p className="text-sm text-muted-foreground">Reminders about upcoming payments</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.emailPayments}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(p => ({ ...p, emailPayments: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  In-App Notifications
                </CardTitle>
                <CardDescription>
                  Configure push notifications within the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">To-Do Assignments</p>
                    <p className="text-sm text-muted-foreground">When tasks are assigned to you</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.pushTodos}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(p => ({ ...p, pushTodos: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Deal Mentions</p>
                    <p className="text-sm text-muted-foreground">When you're mentioned in deal notes</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.pushDeals}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(p => ({ ...p, pushDeals: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment Received</p>
                    <p className="text-sm text-muted-foreground">When payments are registered</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.pushPayments}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs(p => ({ ...p, pushPayments: checked }))
                    }
                  />
                </div>

                <Button onClick={handleSaveNotifications} disabled={saving} className="mt-4">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MyWorkspace;
