import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SiteQuickActionsProps {
  siteId: string;
  siteName: string;
}

export function SiteQuickActions({ siteId, siteName }: SiteQuickActionsProps) {
  const navigate = useNavigate();

  const handleAddDeal = () => {
    navigate(`/deals/add?siteId=${siteId}&siteName=${encodeURIComponent(siteName)}`);
  };

  const handleAddLead = () => {
    // For now, navigate to contacts with a flag to create a lead
    navigate(`/contacts/add?siteId=${siteId}&isLead=true`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={handleAddDeal} 
          className="w-full justify-start"
          variant="outline"
        >
          <FileText className="h-4 w-4 mr-2" />
          Add Deal for this Site
        </Button>
        
        <Button 
          onClick={handleAddLead} 
          className="w-full justify-start"
          variant="outline"
        >
          <Building className="h-4 w-4 mr-2" />
          Add Lead for this Site
        </Button>
      </CardContent>
    </Card>
  );
}