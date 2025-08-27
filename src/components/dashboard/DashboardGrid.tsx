import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, X, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import './dashboard-grid.css';

// Widget components
import { CompaniesWidget } from './widgets/CompaniesWidget';
import { SitesWidget } from './widgets/SitesWidget';
import { ContactsWidget } from './widgets/ContactsWidget';
import { DealsWidget } from './widgets/DealsWidget';
import { ProjectsWidget } from './widgets/ProjectsWidget';
import { ActivitiesWidget } from './widgets/ActivitiesWidget';
import { IncomingPaymentsWidget } from './widgets/IncomingPaymentsWidget';

export interface WidgetConfig {
  id: string;
  user_id: string;
  widget_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  active: boolean;
  filters?: any;
  settings?: any;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

const availableWidgets = [
  { id: 'companies', name: 'Companies', component: CompaniesWidget },
  { id: 'sites', name: 'Sites', component: SitesWidget },
  { id: 'contacts', name: 'Contacts', component: ContactsWidget },
  { id: 'deals', name: 'Deals', component: DealsWidget },
  { id: 'projects', name: 'Projects', component: ProjectsWidget },
  { id: 'activities', name: 'Recent Activities', component: ActivitiesWidget },
  { id: 'incoming-payments', name: 'Expected Incoming Payments', component: IncomingPaymentsWidget },
];

export function DashboardGrid() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [customizeMode, setCustomizeMode] = useState(false);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);

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
      { widget_id: 'companies', position_x: 0, position_y: 0, width: 3, height: 2 },
      { widget_id: 'sites', position_x: 3, position_y: 0, width: 3, height: 2 },
      { widget_id: 'contacts', position_x: 6, position_y: 0, width: 3, height: 2 },
      { widget_id: 'deals', position_x: 9, position_y: 0, width: 3, height: 2 },
      { widget_id: 'activities', position_x: 0, position_y: 2, width: 6, height: 3 },
      { widget_id: 'projects', position_x: 6, position_y: 2, width: 6, height: 3 },
    ];

    try {
      const widgetsToInsert = defaultWidgets.map(widget => ({
        user_id: user?.id,
        ...widget,
        filters: {},
        settings: {},
        active: true,
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
      
      const newWidgetData = {
        user_id: user?.id,
        widget_id: widgetId,
        position_x: 0,
        position_y: maxY + 1,
        width: 3,
        height: 2,
        active: true,
        filters: {},
        settings: {}
      };

      const { data, error } = await supabase
        .from('user_dashboard_configs')
        .insert([newWidgetData])
        .select()
        .single();

      if (error) throw error;

      const newWidget = {
        ...data,
        id: data.id,
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

  const convertWidgetsToLayout = (widgets: WidgetConfig[]): Layout[] => {
    return widgets.map(widget => ({
      i: widget.id,
      x: widget.position_x,
      y: widget.position_y,
      w: widget.width,
      h: widget.height,
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 6,
    }));
  };

  const handleLayoutChange = async (layout: Layout[], layouts: Layouts) => {
    if (isLayoutLocked) return;
    
    setLayouts(layouts);
    
    // Update widgets with new positions and sizes
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = layout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position_x: layoutItem.x,
          position_y: layoutItem.y,
          width: layoutItem.w,
          height: layoutItem.h,
        };
      }
      return widget;
    });

    setWidgets(updatedWidgets);

    // Save to database
    try {
      for (const widget of updatedWidgets) {
        const layoutItem = layout.find(item => item.i === widget.id);
        if (layoutItem) {
          await supabase
            .from('user_dashboard_configs')
            .update({
              position_x: layoutItem.x,
              position_y: layoutItem.y,
              width: layoutItem.w,
              height: layoutItem.h,
            })
            .eq('id', widget.id);
        }
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout changes');
    }
  };

  // Update layouts when widgets change
  useEffect(() => {
    if (widgets.length > 0) {
      const newLayout = convertWidgetsToLayout(widgets);
      setLayouts({
        lg: newLayout,
        md: newLayout,
        sm: newLayout,
        xs: newLayout,
        xxs: newLayout,
      });
    }
  }, [widgets.length]);

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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isLayoutLocked ? "outline" : "default"}
            onClick={() => setIsLayoutLocked(!isLayoutLocked)}
            className="flex items-center gap-2"
          >
            {isLayoutLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {isLayoutLocked ? "Locked" : "Unlocked"}
          </Button>
          
          <Button
            variant={customizeMode ? "default" : "outline"}
            onClick={() => setCustomizeMode(!customizeMode)}
          >
            {customizeMode ? "Done" : "Customize"}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Widget</DialogTitle>
                <DialogDescription>Choose a widget to add to your dashboard.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-2 mt-4">
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
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All available widgets are already added to your dashboard.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-12 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="col-span-3 h-64">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className={`min-h-96 ${isLayoutLocked ? 'layout-locked' : ''}`}>
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            isDraggable={!isLayoutLocked}
            isResizable={!isLayoutLocked}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            useCSSTransforms={true}
            preventCollision={false}
            compactType="vertical"
          >
            {widgets.map((widgetConfig) => {
              const WidgetComponent = getWidgetComponent(widgetConfig.widget_id);
              
              if (!WidgetComponent) return null;

              return (
                <div key={widgetConfig.id} className="relative">
                  {customizeMode && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 z-50 h-6 w-6 p-0 rounded-full shadow-md"
                      onClick={() => removeWidget(widgetConfig.id)}
                    >
                      <X className="h-3 w-3" />
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
          </ResponsiveGridLayout>
        </div>
      )}
    </div>
  );
}