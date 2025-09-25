import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateDealForm } from '@/components/forms/CreateDealForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AddDeal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadType = searchParams.get('leadType');
  const leadId = searchParams.get('leadId');
  const siteId = searchParams.get('siteId');
  const siteName = searchParams.get('siteName');
  const isConversion = leadType && leadId;
  const isFromSite = siteId && siteName;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/deals')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isConversion ? 'Convert Lead to Deal' : isFromSite ? `Create Deal for ${siteName}` : 'Create New Deal'}
            </h1>
            <p className="text-muted-foreground">
              {isConversion 
                ? 'Convert this lead into a sales opportunity' 
                : isFromSite 
                ? 'Create a new deal for this site'
                : 'Create a new sales opportunity'
              }
            </p>
          </div>
        </div>

        <CreateDealForm 
          leadType={leadType as 'company' | 'contact' | 'site' | null}
          leadId={leadId}
          siteId={siteId}
          siteName={siteName || undefined}
          onSuccess={() => navigate('/deals')}
        />
      </div>
    </DashboardLayout>
  );
};

export default AddDeal;