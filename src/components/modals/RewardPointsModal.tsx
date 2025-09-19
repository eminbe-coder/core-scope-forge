import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, History, Star, Target } from 'lucide-react';
import { useRewardPoints } from '@/hooks/use-reward-points';

interface RewardConfiguration {
  id: string;
  action_name: string;
  action_description: string;
  points_value: number;
  active: boolean;
}

interface RewardPointsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RewardPointsModal({ open, onOpenChange }: RewardPointsModalProps) {
  const navigate = useNavigate();
  const { 
    totalPoints, 
    currentPoints, 
    targetPoints, 
    achieved, 
    loadAvailableActions 
  } = useRewardPoints();
  
  const [availableActions, setAvailableActions] = useState<RewardConfiguration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadActions();
    }
  }, [open]);

  const loadActions = async () => {
    setLoading(true);
    try {
      const actions = await loadAvailableActions();
      setAvailableActions(actions);
    } catch (error) {
      console.error('Error loading actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 0;

  const handleViewHistory = () => {
    onOpenChange(false);
    navigate('/reward-history');
  };

  const getActionIcon = (actionName: string) => {
    if (actionName.includes('create')) return '✨';
    if (actionName.includes('complete')) return '✅';
    if (actionName.includes('convert')) return '🎯';
    if (actionName.includes('move')) return '📈';
    return '⭐';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Reward Points System
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium">Current Progress</span>
              </div>
              <Badge variant={achieved ? "default" : "secondary"}>
                {achieved ? "Target Achieved!" : "In Progress"}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Period: {currentPoints} / {targetPoints} points</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>All-time Total: {totalPoints} points</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleViewHistory}
                className="h-7 px-3"
              >
                <History className="h-3 w-3 mr-1" />
                View History
              </Button>
            </div>
          </div>

          {/* Available Actions */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Star className="h-4 w-4" />
              How to Earn Points
            </h3>
            
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-secondary/20 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {availableActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {getActionIcon(action.action_name)}
                      </span>
                      <div>
                        <div className="font-medium">
                          {action.action_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        {action.action_description && (
                          <div className="text-sm text-muted-foreground">
                            {action.action_description}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      +{action.points_value}
                    </Badge>
                  </div>
                ))}
                
                {availableActions.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No reward actions configured yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}