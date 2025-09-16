import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Settings, 
  GripVertical, 
  CheckSquare, 
  Activity, 
  BarChart3, 
  Users,
  Building2,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface DashboardSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  order: number;
}

interface MobileDashboardCustomizerProps {
  sections: DashboardSection[];
  onSectionsChange: (sections: DashboardSection[]) => void;
}

export function MobileDashboardCustomizer({ sections, onSectionsChange }: MobileDashboardCustomizerProps) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [localSections, setLocalSections] = useState(sections);

  const handleToggleSection = (sectionId: string) => {
    const updatedSections = localSections.map(section =>
      section.id === sectionId ? { ...section, enabled: !section.enabled } : section
    );
    setLocalSections(updatedSections);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedSections = items.map((section, index) => ({
      ...section,
      order: index
    }));

    setLocalSections(updatedSections);
  };

  const handleSave = () => {
    onSectionsChange(localSections);
    setShowCustomizer(false);
  };

  return (
    <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-auto">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Toggle sections on/off and drag to reorder
          </p>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {localSections.map((section, index) => (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <section.icon className="h-4 w-4" />
                              <div>
                                <p className="font-medium text-sm">{section.title}</p>
                                <p className="text-xs text-muted-foreground">{section.description}</p>
                              </div>
                            </div>
                            <Checkbox
                              checked={section.enabled}
                              onCheckedChange={() => handleToggleSection(section.id)}
                            />
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setShowCustomizer(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const defaultDashboardSections: DashboardSection[] = [
  {
    id: 'todos',
    title: 'To-Do Summary',
    description: 'Your pending tasks',
    icon: CheckSquare,
    enabled: true,
    order: 0
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Fast creation tools',
    icon: Activity,
    enabled: true,
    order: 1
  },
  {
    id: 'overview',
    title: 'Overview Stats',
    description: 'Key metrics',
    icon: BarChart3,
    enabled: true,
    order: 2
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    description: 'Latest updates',
    icon: Activity,
    enabled: true,
    order: 3
  },
  {
    id: 'upcoming-tasks',
    title: 'Upcoming Tasks',
    description: 'Calendar view',
    icon: Calendar,
    enabled: false,
    order: 4
  },
  {
    id: 'team-activity',
    title: 'Team Activity',
    description: 'Team updates',
    icon: Users,
    enabled: false,
    order: 5
  }
];