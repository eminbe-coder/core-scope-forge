import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  History, 
  Trophy, 
  Calendar, 
  TrendingUp, 
  Award,
  ArrowLeft
} from 'lucide-react';
import { useRewardPoints } from '@/hooks/use-reward-points';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface PointTransaction {
  id: string;
  action_name: string;
  points_earned: number;
  entity_type: string;
  entity_id: string;
  notes: string;
  created_at: string;
}

interface PeriodCycle {
  id: string;
  period_type: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const RewardHistoryPage = () => {
  const navigate = useNavigate();
  const { 
    currentPoints, 
    targetPoints, 
    loadTransactionHistory, 
    loadPeriodCycles 
  } = useRewardPoints();
  
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [periods, setPeriods] = useState<PeriodCycle[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [loading, setLoading] = useState(false);
  const [periodStats, setPeriodStats] = useState({
    totalPoints: 0,
    totalActions: 0,
    mostFrequentAction: '',
    completionRate: 0
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadTransactions();
    }
  }, [selectedPeriod]);

  const loadPeriods = async () => {
    try {
      const periodsData = await loadPeriodCycles();
      setPeriods(periodsData);
      
      // Set current period as default
      const currentPeriod = periodsData.find(p => p.is_current);
      if (currentPeriod) {
        setSelectedPeriod(currentPeriod.id);
      }
    } catch (error) {
      console.error('Error loading periods:', error);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const cycleId = selectedPeriod === 'current' ? undefined : selectedPeriod;
      const transactionsData = await loadTransactionHistory(cycleId);
      setTransactions(transactionsData);
      
      // Calculate stats
      const stats = calculatePeriodStats(transactionsData);
      setPeriodStats(stats);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePeriodStats = (transactions: PointTransaction[]) => {
    const totalPoints = transactions.reduce((sum, t) => sum + t.points_earned, 0);
    const totalActions = transactions.length;
    
    // Find most frequent action
    const actionCounts = transactions.reduce((acc, t) => {
      acc[t.action_name] = (acc[t.action_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostFrequentAction = Object.keys(actionCounts).reduce((a, b) => 
      actionCounts[a] > actionCounts[b] ? a : b, ''
    );
    
    const completionRate = targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 0;
    
    return {
      totalPoints,
      totalActions,
      mostFrequentAction,
      completionRate: Math.round(completionRate)
    };
  };

  const getActionIcon = (actionName: string) => {
    if (actionName.includes('create')) return '✨';
    if (actionName.includes('complete')) return '✅';
    if (actionName.includes('convert')) return '🎯';
    if (actionName.includes('move')) return '📈';
    return '⭐';
  };

  const selectedPeriodData = periods.find(p => p.id === selectedPeriod);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <History className="h-8 w-8 text-primary" />
                Reward Points History
              </h1>
              <p className="text-muted-foreground">
                Track your points earning history and compare periods
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.is_current ? '🟢 ' : ''}
                    {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                    {period.is_current && ' (Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{periodStats.totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Points Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-secondary" />
                <div>
                  <div className="text-2xl font-bold">{periodStats.totalActions}</div>
                  <div className="text-sm text-muted-foreground">Actions Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{periodStats.completionRate}%</div>
                  <div className="text-sm text-muted-foreground">Target Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <div className="text-sm font-medium truncate">
                  {periodStats.mostFrequentAction?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Most Frequent Action</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            {selectedPeriodData && (
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedPeriodData.start_date), 'MMM d')} - {format(new Date(selectedPeriodData.end_date), 'MMM d, yyyy')}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-secondary/20 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction, index) => (
                  <div key={transaction.id}>
                    <div className="flex items-center justify-between p-4 hover:bg-secondary/20 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">
                          {getActionIcon(transaction.action_name)}
                        </span>
                        <div>
                          <div className="font-medium">
                            {transaction.action_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
                          </div>
                          {transaction.notes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {transaction.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        +{transaction.points_earned}
                      </Badge>
                    </div>
                    {index < transactions.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found for this period.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RewardHistoryPage;