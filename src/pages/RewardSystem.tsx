import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RewardSystemManager } from '@/components/reward-system/RewardSystemManager';

const RewardSystemPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reward System</h1>
          <p className="text-muted-foreground">
            Manage your company's reward point system, configure actions, and track user achievements
          </p>
        </div>
        
        <RewardSystemManager />
      </div>
    </DashboardLayout>
  );
};

export default RewardSystemPage;