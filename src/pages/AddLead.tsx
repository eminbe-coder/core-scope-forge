import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Building2, MapPin } from 'lucide-react';
import { CreateContactForm } from '@/components/forms/CreateContactForm';
import { CreateCompanyForm } from '@/components/forms/CreateCompanyForm';
import { CreateSiteForm } from '@/components/forms/CreateSiteForm';

const AddLead = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadType = searchParams.get('type') as 'contact' | 'company' | 'site' || 'contact';
  const [activeTab, setActiveTab] = useState(leadType);

  const handleSuccess = (id: string) => {
    navigate(`/leads/${activeTab}/${id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add New Lead</h1>
            <p className="text-muted-foreground">
              Create a new lead from a contact, company, or site
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'contact' | 'company' | 'site')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Lead
                </TabsTrigger>
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Lead
                </TabsTrigger>
                <TabsTrigger value="site" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Site Lead
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="contact">
                  <CreateContactForm
                    isLead={true}
                    onSuccess={handleSuccess}
                  />
                </TabsContent>

                <TabsContent value="company">
                  <CreateCompanyForm
                    isLead={true}
                    onSuccess={handleSuccess}
                  />
                </TabsContent>

                <TabsContent value="site">
                  <CreateSiteForm
                    isLead={true}
                    onSuccess={handleSuccess}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddLead;