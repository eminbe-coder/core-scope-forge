import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateSiteForm } from '@/components/forms/CreateSiteForm';
import { CreateContactForm } from '@/components/forms/CreateContactForm';
import { CreateCompanyForm } from '@/components/forms/CreateCompanyForm';
import { CreateDealForm } from '@/components/forms/CreateDealForm';
import { TodoForm } from '@/components/todos/TodoForm';
import { 
  Plus, 
  MapPin, 
  Users, 
  Building2, 
  Handshake,
  CheckSquare,
  Target,
  Settings
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  icon: any;
  description: string;
  color: string;
  form?: React.ReactNode;
  route?: string;
  enabled: boolean;
}

export function MobileQuickActions() {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  
  const defaultActions: QuickAction[] = [
    {
      id: 'todo',
      title: 'Add To-Do',
      icon: CheckSquare,
      description: 'Quick task',
      color: 'bg-blue-500',
      enabled: true,
      form: (
        <TodoForm
          entityType="general"
          entityId=""
          onSuccess={() => setActiveAction(null)}
        />
      )
    },
    {
      id: 'site',
      title: 'New Site',
      icon: MapPin,
      description: 'Location',
      color: 'bg-green-500',
      enabled: true,
      form: (
        <CreateSiteForm
          onSuccess={() => setActiveAction(null)}
        />
      )
    },
    {
      id: 'lead',
      title: 'Add Lead',
      icon: Target,
      description: 'Opportunity',
      color: 'bg-yellow-500',
      enabled: true,
      route: '/leads/add'
    },
    {
      id: 'contact',
      title: 'New Contact',
      icon: Users,
      description: 'Person',
      color: 'bg-purple-500',
      enabled: true,
      form: (
        <CreateContactForm
          onSuccess={() => setActiveAction(null)}
        />
      )
    },
    {
      id: 'company',
      title: 'Add Company',
      icon: Building2,
      description: 'Business',
      color: 'bg-orange-500',
      enabled: true,
      form: (
        <CreateCompanyForm
          onSuccess={() => setActiveAction(null)}
        />
      )
    },
    {
      id: 'deal',
      title: 'New Deal',
      icon: Handshake,
      description: 'Deal',
      color: 'bg-red-500',
      enabled: false,
      form: (
        <CreateDealForm
          onSuccess={() => setActiveAction(null)}
        />
      )
    }
  ];

  const [quickActions, setQuickActions] = useState<QuickAction[]>(() => {
    const saved = localStorage.getItem('mobile-quick-actions');
    if (saved) {
      try {
        const savedActions = JSON.parse(saved);
        return defaultActions.map(action => ({
          ...action,
          enabled: savedActions.find((s: any) => s.id === action.id)?.enabled ?? action.enabled
        }));
      } catch {
        return defaultActions;
      }
    }
    return defaultActions;
  });

  const enabledActions = quickActions.filter(action => action.enabled);

  const handleActionClick = (action: QuickAction) => {
    if (action.route) {
      navigate(action.route);
    } else {
      setActiveAction(action.id);
    }
  };

  const handleToggleAction = (actionId: string) => {
    const updatedActions = quickActions.map(action =>
      action.id === actionId ? { ...action, enabled: !action.enabled } : action
    );
    setQuickActions(updatedActions);
    localStorage.setItem('mobile-quick-actions', JSON.stringify(
      updatedActions.map(({ id, enabled }) => ({ id, enabled }))
    ));
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize Quick Actions</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {quickActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${action.color} text-white`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{action.title}</span>
                  </div>
                  <Checkbox
                    checked={action.enabled}
                    onCheckedChange={() => handleToggleAction(action.id)}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {enabledActions.map((action) => (
          <div key={action.id}>
            {action.form ? (
              <Sheet 
                open={activeAction === action.id}
                onOpenChange={(open) => setActiveAction(open ? action.id : null)}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-auto p-4 flex flex-col items-center gap-3 border-2 hover:border-primary/50 transition-colors"
                  >
                    <div className={`p-3 rounded-full ${action.color} text-white`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="bottom" 
                  className="h-[90vh] rounded-t-lg"
                >
                  <div className="mt-6">
                    {action.form}
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button
                variant="outline"
                className="w-full h-auto p-4 flex flex-col items-center gap-3 border-2 hover:border-primary/50 transition-colors"
                onClick={() => handleActionClick(action)}
              >
                <div className={`p-3 rounded-full ${action.color} text-white`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}