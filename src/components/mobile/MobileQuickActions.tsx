import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  Target
} from 'lucide-react';

interface QuickAction {
  title: string;
  icon: any;
  description: string;
  color: string;
  form: React.ReactNode;
}

export function MobileQuickActions() {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleSuccess = () => {
    setActiveAction(null);
  };

  const quickActions: QuickAction[] = [
    {
      title: 'Add To-Do',
      icon: CheckSquare,
      description: 'Quick task',
      color: 'bg-blue-500',
      form: (
        <TodoForm
          entityType="general"
          entityId=""
          onSuccess={handleSuccess}
        />
      )
    },
    {
      title: 'New Site',
      icon: MapPin,
      description: 'Location',
      color: 'bg-green-500',
      form: (
        <CreateSiteForm
          onSuccess={() => handleSuccess()}
        />
      )
    },
    {
      title: 'Add Lead',
      icon: Target,
      description: 'Opportunity',
      color: 'bg-yellow-500',
      form: (
        <CreateDealForm
          onSuccess={() => handleSuccess()}
        />
      )
    },
    {
      title: 'New Contact',
      icon: Users,
      description: 'Person',
      color: 'bg-purple-500',
      form: (
        <CreateContactForm
          onSuccess={() => handleSuccess()}
        />
      )
    },
    {
      title: 'Add Company',
      icon: Building2,
      description: 'Business',
      color: 'bg-orange-500',
      form: (
        <CreateCompanyForm
          onSuccess={() => handleSuccess()}
        />
      )
    },
    {
      title: 'New Deal',
      icon: Handshake,
      description: 'Opportunity',
      color: 'bg-red-500',
      form: (
        <CreateDealForm
          onSuccess={() => handleSuccess()}
        />
      )
    }
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <Plus className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <Sheet 
            key={action.title}
            open={activeAction === action.title}
            onOpenChange={(open) => setActiveAction(open ? action.title : null)}
          >
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-3 border-2 hover:border-primary/50 transition-colors"
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
        ))}
      </div>
    </Card>
  );
}