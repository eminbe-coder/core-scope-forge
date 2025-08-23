import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, MapPin, Handshake, FolderKanban, Activity } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const Dashboard = () => {
  const stats = [
    {
      title: 'Total Customers',
      value: '24',
      description: '+2 from last month',
      icon: Users,
    },
    {
      title: 'Active Sites',
      value: '18',
      description: '+4 from last month',
      icon: MapPin,
    },
    {
      title: 'Open Deals',
      value: '12',
      description: '$45,000 total value',
      icon: Handshake,
    },
    {
      title: 'Active Projects',
      value: '8',
      description: '3 due this month',
      icon: FolderKanban,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your CRM and Project Management system
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                Latest CRM activities and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New deal created</p>
                    <p className="text-xs text-muted-foreground">
                      Office renovation project - $15,000
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">2h ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Customer added</p>
                    <p className="text-xs text-muted-foreground">
                      Acme Corporation joined as new customer
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">4h ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Project completed</p>
                    <p className="text-xs text-muted-foreground">
                      Lighting calculation for Building A
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">1d ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Add New Customer</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <Handshake className="h-4 w-4" />
                    <span className="text-sm font-medium">Create Deal</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="h-4 w-4" />
                    <span className="text-sm font-medium">Start New Project</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">Add Site</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;