import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  GripVertical, 
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  DEFAULT_CONFIGS, 
  type EntityType, 
  type TabConfig, 
  type PageLayoutConfig,
  ICON_MAP 
} from '@/hooks/use-page-layout';
import type { Json } from '@/integrations/supabase/types';

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'deal', label: 'Deals' },
  { value: 'contract', label: 'Contracts' },
  { value: 'site', label: 'Sites' },
  { value: 'contact', label: 'Contacts' },
  { value: 'company', label: 'Companies' },
  { value: 'lead_company', label: 'Lead Companies' },
  { value: 'lead_contact', label: 'Lead Contacts' },
];

interface SortableTabItemProps {
  tab: TabConfig;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
}

function SortableTabItem({ tab, onToggleVisibility, onToggleLock, onLabelChange }: SortableTabItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = ICON_MAP[tab.icon];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:bg-muted p-1 rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2 flex-1">
        {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
        <Input
          value={tab.label}
          onChange={(e) => onLabelChange(tab.id, e.target.value)}
          className="h-8 w-32"
        />
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {tab.component}
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleVisibility(tab.id)}
          className="h-8 w-8 p-0"
          disabled={tab.locked}
        >
          {tab.visible ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleLock(tab.id)}
          className="h-8 w-8 p-0"
        >
          {tab.locked ? (
            <Lock className="h-4 w-4 text-destructive" />
          ) : (
            <Unlock className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function PageEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasGlobalAccess, currentTenant } = useTenant();
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('deal');
  const [config, setConfig] = useState<PageLayoutConfig>(DEFAULT_CONFIGS.deal);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Redirect if not superadmin
  useEffect(() => {
    if (!hasGlobalAccess || currentTenant?.slug !== 'platform') {
      navigate('/');
    }
  }, [hasGlobalAccess, currentTenant, navigate]);

  // Load config when entity type changes
  useEffect(() => {
    loadConfig();
  }, [selectedEntityType]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_page_configs')
        .select('layout_data')
        .eq('entity_type', selectedEntityType)
        .maybeSingle();

      if (error) throw error;

      if (data?.layout_data) {
        setConfig(data.layout_data as unknown as PageLayoutConfig);
      } else {
        setConfig(DEFAULT_CONFIGS[selectedEntityType]);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setConfig(DEFAULT_CONFIGS[selectedEntityType]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setConfig(prev => {
        const oldIndex = prev.tabs.findIndex(t => t.id === active.id);
        const newIndex = prev.tabs.findIndex(t => t.id === over.id);

        const newTabs = arrayMove(prev.tabs, oldIndex, newIndex).map((tab, index) => ({
          ...tab,
          order: index,
        }));

        return { ...prev, tabs: newTabs };
      });
    }
  };

  const handleToggleVisibility = (tabId: string) => {
    setConfig(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab =>
        tab.id === tabId && !tab.locked
          ? { ...tab, visible: !tab.visible }
          : tab
      ),
    }));
  };

  const handleToggleLock = (tabId: string) => {
    setConfig(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab =>
        tab.id === tabId
          ? { ...tab, locked: !tab.locked }
          : tab
      ),
    }));
  };

  const handleLabelChange = (tabId: string, label: string) => {
    setConfig(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab =>
        tab.id === tabId
          ? { ...tab, label }
          : tab
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('global_page_configs')
        .select('id')
        .eq('entity_type', selectedEntityType)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('global_page_configs')
          .update({
            layout_data: config as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('entity_type', selectedEntityType);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('global_page_configs')
          .insert({
            entity_type: selectedEntityType,
            layout_data: config as unknown as Json,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `${selectedEntityType} page configuration saved`,
      });
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIGS[selectedEntityType]);
    toast({
      title: 'Reset',
      description: 'Configuration reset to defaults (not saved)',
    });
  };

  if (!hasGlobalAccess || currentTenant?.slug !== 'platform') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/global-admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Page Layout Editor
              </h1>
              <p className="text-muted-foreground">
                Configure the layout and tabs for entity detail pages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Entity Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Entity Type</CardTitle>
            <CardDescription>
              Choose which entity page layout to configure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEntityType}
              onValueChange={(value: EntityType) => setSelectedEntityType(value)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tab Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Tab Configuration</CardTitle>
            <CardDescription>
              Drag to reorder, toggle visibility, and lock tabs. Locked tabs cannot be disabled by tenant admins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={config.tabs.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {config.tabs
                      .sort((a, b) => a.order - b.order)
                      .map(tab => (
                        <SortableTabItem
                          key={tab.id}
                          tab={tab}
                          onToggleVisibility={handleToggleVisibility}
                          onToggleLock={handleToggleLock}
                          onLabelChange={handleLabelChange}
                        />
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              This is how the tabs will appear on the {selectedEntityType} detail page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 p-4 bg-muted rounded-lg">
              {config.tabs
                .filter(t => t.visible)
                .sort((a, b) => a.order - b.order)
                .map(tab => {
                  const IconComponent = ICON_MAP[tab.icon];
                  return (
                    <div
                      key={tab.id}
                      className="flex items-center gap-2 px-3 py-2 bg-background rounded-md border"
                    >
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      <span className="text-sm font-medium">{tab.label}</span>
                      {tab.locked && <Lock className="h-3 w-3 text-destructive" />}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
