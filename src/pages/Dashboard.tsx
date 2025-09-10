import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { PaymentPipelineDashboard } from '@/components/dashboard/PaymentPipelineDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DashboardType = 'main' | 'payment-pipeline';

const Dashboard = () => {
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardType>('main');

  const renderDashboard = () => {
    switch (selectedDashboard) {
      case 'payment-pipeline':
        return <PaymentPipelineDashboard />;
      default:
        return <DashboardGrid />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Dashboard Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <Select value={selectedDashboard} onValueChange={(value: DashboardType) => setSelectedDashboard(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Dashboard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Main Dashboard</SelectItem>
                <SelectItem value="payment-pipeline">Payment Pipeline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {renderDashboard()}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;