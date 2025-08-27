import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

// Widget components
import { CompaniesWidget } from './widgets/CompaniesWidget';
import { SitesWidget } from './widgets/SitesWidget';
import { ContactsWidget } from './widgets/ContactsWidget';
import { DealsWidget } from './widgets/DealsWidget';
import { ProjectsWidget } from './widgets/ProjectsWidget';
import { ActivitiesWidget } from './widgets/ActivitiesWidget';

export interface WidgetConfig {
  id: string;
  widget_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  filters: any;
  settings: any;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

const availableWidgets = [
  { id: 'companies', name: 'Companies', component: CompaniesWidget },
  { id: 'sites', name: 'Sites', component: SitesWidget },
  { id: 'contacts', name: 'Contacts', component: ContactsWidget },
  { id: 'deals', name: 'Deals', component: DealsWidget },
  { id: 'projects', name: 'Projects', component: ProjectsWidget },
  { id: 'activities', name: 'Recent Activities', component: ActivitiesWidget },
];

export function DashboardGrid() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [customizeMode, setCustomizeMode] = useState(false);

  useEffect(() => {
    if (user && currentTenant) {
      loadDashboardConfig();
    }
  }, [user, currentTenant]);

  const loadDashboardConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('user_dashboard_configs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('active', true)
        .order('position_y')
        .order('position_x');

      if (error) throw error;

      if (data.length === 0) {
        // Initialize with default widgets
        await initializeDefaultWidgets();
      } else {
        setWidgets(data.map(item => ({
          ...item,
          filters: item.filters || {},
          settings: item.settings || {}
        })));
      }
    } catch (error) {
      console.error('Error loading dashboard config:', error);
      toast.error('Failed to load dashboard configuration');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultWidgets = async () => {
    const defaultWidgets = [
      { widget_id: 'companies', position_x: 0, position_y: 0, width: 1, height: 1 },
      { widget_id: 'sites', position_x: 1, position_y: 0, width: 1, height: 1 },
      { widget_id: 'contacts', position_x: 2, position_y: 0, width: 1, height: 1 },
      { widget_id: 'deals', position_x: 3, position_y: 0, width: 1, height: 1 },
      { widget_id: 'activities', position_x: 0, position_y: 1, width: 2, height: 1 },
      { widget_id: 'projects', position_x: 2, position_y: 1, width: 2, height: 1 },
    ];

    try {
      const widgetsToInsert = defaultWidgets.map(widget => ({
        user_id: user?.id,
        ...widget,
        filters: {},
        settings: {},
      }));

      const { data, error } = await supabase
        .from('user_dashboard_configs')
        .insert(widgetsToInsert)
        .select();

      if (error) throw error;
      setWidgets(data.map(item => ({
        ...item,
        filters: item.filters || {},
        settings: item.settings || {}
      })));
    } catch (error) {
      console.error('Error initializing default widgets:', error);
      toast.error('Failed to initialize dashboard');
    }
  };

  const addWidget = async (widgetId: string) => {
    try {
      const maxY = Math.max(...widgets.map(w => w.position_y), -1);
      
      const { data, error } = await supabase
        .from('user_dashboard_configs')
        .insert({
          user_id: user?.id,
          widget_id: widgetId,
          position_x: 0,
          position_y: maxY + 1,
          width: 1,
          height: 1,
          filters: {},
          settings: {},
        })
        .select()
        .single();

      if (error) throw error;
      const newWidget = {
        ...data,
        filters: data.filters || {},
        settings: data.settings || {}
      };
      setWidgets([...widgets, newWidget]);
      toast.success('Widget added successfully');
    } catch (error) {
      console.error('Error adding widget:', error);
      toast.error('Failed to add widget');
    }
  };

  const removeWidget = async (widgetConfigId: string) => {
    try {
      const { error } = await supabase
        .from('user_dashboard_configs')
        .delete()
        .eq('id', widgetConfigId);

      if (error) throw error;
      setWidgets(widgets.filter(w => w.id !== widgetConfigId));
      toast.success('Widget removed successfully');
    } catch (error) {
      console.error('Error removing widget:', error);
      toast.error('Failed to remove widget');
    }
  };

  const updateWidgetConfig = async (widgetConfigId: string, updates: Partial<WidgetConfig>) => {
    try {
      const { error } = await supabase
        .from('user_dashboard_configs')
        .update(updates)
        .eq('id', widgetConfigId);

      if (error) throw error;
      
      setWidgets(widgets.map(w => 
        w.id === widgetConfigId ? { ...w, ...updates } : w
      ));
    } catch (error) {
      console.error('Error updating widget config:', error);
      toast.error('Failed to update widget');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-32">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getWidgetComponent = (widgetId: string) => {
    const widget = availableWidgets.find(w => w.id === widgetId);
    return widget?.component;
  };

  const getAvailableWidgetsToAdd = () => {
    const usedWidgetIds = widgets.map(w => w.widget_id);
    return availableWidgets.filter(w => !usedWidgetIds.includes(w.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your personalized CRM dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Widget</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                {getAvailableWidgetsToAdd().map(widget => (
                  <Button
                    key={widget.id}
                    variant="outline"
                    className="justify-start"
                    onClick={() => addWidget(widget.id)}
                  >
                    {widget.name}
                  </Button>
                ))}
                {getAvailableWidgetsToAdd().length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    All available widgets are already added to your dashboard.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            variant={customizeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCustomizeMode(!customizeMode)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {customizeMode ? 'Done' : 'Customize'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-min">
        {widgets.map((widgetConfig) => {
          const WidgetComponent = getWidgetComponent(widgetConfig.widget_id);
          
          if (!WidgetComponent) return null;

          const gridColumnSpan = widgetConfig.width === 2 ? 'md:col-span-2' : '';
          const gridRowSpan = widgetConfig.height === 2 ? 'row-span-2' : '';

          return (
            <div
              key={widgetConfig.id}
              className={`relative group ${gridColumnSpan} ${gridRowSpan}`}
            >
              {customizeMode && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeWidget(widgetConfig.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              <WidgetComponent
                config={widgetConfig}
                onUpdateConfig={(updates) => updateWidgetConfig(widgetConfig.id, updates)}
                customizeMode={customizeMode}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}