import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const EditContract = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/contracts/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contract
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Contract</h1>
            <p className="text-muted-foreground">Editing contracts will be available soon.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditContract;
