import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckSquare,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { TodoTypesManager } from '@/components/settings/TodoTypesManager';
import { useNavigate } from 'react-router-dom';

const TodoEngineSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('task-types');

  const settingSections = [
    {
      id: 'task-types',
      label: 'Task Types',
      icon: CheckSquare,
      component: TodoTypesManager,
      description: 'Define the types of tasks that can be created across your platform'
    }
    // Future sections can be added here:
    // - Task Priorities
    // - Task Statuses  
    // - Task Templates
    // - Automation Rules
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">To-Do Engine Settings</h1>
            <p className="text-muted-foreground">
              Configure your universal to-do system settings and preferences
            </p>
          </div>
        </div>

        {/* Settings Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5" />
                  Settings Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {settingSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant={activeTab === section.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab(section.id)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {section.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">About To-Do Engine</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <p>
                  The To-Do Engine powers task management across your entire platform. 
                  Configure task types, priorities, and automation rules that work 
                  consistently in CRM, Projects, and all other modules.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {settingSections.map((section) => {
                const Component = section.component;
                return (
                  <TabsContent key={section.id} value={section.id}>
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-xl font-semibold">{section.label}</h2>
                        <p className="text-sm text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                      <Component />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TodoEngineSettings;