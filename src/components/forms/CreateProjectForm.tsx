import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeviceBrowserDialog, SelectedDevice } from '@/components/projects/DeviceBrowserDialog';

interface Deal {
  id: string;
  name: string;
  customer_id: string;
  customers: {
    name: string;
  } | null;
}

interface Device {
  id: string;
  name: string;
  category: string;
  unit_price: number | null;
  currencies: {
    symbol: string;
  } | null;
}

interface ProjectDevice {
  device_id: string;
  quantity: number;
  unit_price?: number;
}

interface CreateProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProjectForm = ({ isOpen, onClose, onSuccess }: CreateProjectFormProps) => {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    status: 'planning',
    deal_id: '',
    budget: '',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    notes: '',
  });

  const [deals, setDeals] = useState<Deal[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<ProjectDevice[]>([]);
  const [selectedBOQDevices, setSelectedBOQDevices] = useState<SelectedDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeviceBrowserOpen, setIsDeviceBrowserOpen] = useState(false);

  const fetchDeals = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id,
          name,
          customer_id,
          customers(name)
        `)
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const fetchDevices = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          id,
          name,
          category,
          unit_price,
          currency_id,
          currencies!devices_currency_id_fkey(symbol)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeals();
      fetchDevices();
    }
  }, [isOpen, currentTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !formData.name) return;

    setLoading(true);
    try {
      // Get currency from deal or tenant default
      let currency_id = null;
      if (formData.deal_id) {
        const { data: effectiveCurrency } = await supabase
          .rpc('get_effective_currency', {
            entity_type: 'project',
            entity_id: null,
            input_tenant_id: currentTenant.id
          });
        currency_id = effectiveCurrency;
      }

      const projectData = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type as any,
        status: formData.status as any,
        deal_id: formData.deal_id || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date?.toISOString().split('T')[0] || null,
        end_date: formData.end_date?.toISOString().split('T')[0] || null,
        notes: formData.notes || null,
        currency_id,
        tenant_id: currentTenant.id,
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (projectError) throw projectError;

      // Add devices to project (for BOQ type, use selectedBOQDevices)
      const devicesToAdd = formData.type === 'BOQ' 
        ? selectedBOQDevices.map(d => ({
            project_id: project.id,
            device_id: d.device_id,
            quantity: d.quantity,
            unit_price: d.unit_price,
          }))
        : selectedDevices.map(device => ({
            project_id: project.id,
            device_id: device.device_id,
            quantity: device.quantity,
            unit_price: device.unit_price || null,
          }));

      if (devicesToAdd.length > 0) {
        const { error: devicesError } = await supabase
          .from('project_devices')
          .insert(devicesToAdd);

        if (devicesError) throw devicesError;
      }

      toast({
        title: 'Success',
        description: 'Project created successfully',
      });

      // For BOQ type, navigate to project detail page
      if (formData.type === 'BOQ') {
        handleClose();
        navigate(`/projects/${project.id}`);
        return;
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBOQDevicesConfirm = (devices: SelectedDevice[]) => {
    setSelectedBOQDevices(devices);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      type: '',
      status: 'planning',
      deal_id: '',
      budget: '',
      start_date: undefined,
      end_date: undefined,
      notes: '',
    });
    setSelectedBOQDevices([]);
    setSelectedDevices([]);
    onClose();
  };

  const addDevice = () => {
    setSelectedDevices([...selectedDevices, { device_id: '', quantity: 1 }]);
  };

  const updateDevice = (index: number, field: keyof ProjectDevice, value: any) => {
    const updated = [...selectedDevices];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedDevices(updated);
  };

  const removeDevice = (index: number) => {
    setSelectedDevices(selectedDevices.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project and optionally link devices to it
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="BOQ">BOQ</SelectItem>
                  <SelectItem value="lighting_calculation">Lighting Calculation</SelectItem>
                  <SelectItem value="lighting_control">Lighting Control</SelectItem>
                  <SelectItem value="elv">ELV</SelectItem>
                  <SelectItem value="home_automation">Home Automation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Project description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal">Related Deal</Label>
              <Select value={formData.deal_id} onValueChange={(value) => setFormData(prev => ({ ...prev, deal_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.name} ({deal.customers?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(formData.end_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* BOQ Device Selection */}
          {formData.type === 'BOQ' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>BOQ Devices</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDeviceBrowserOpen(true)}>
                  <Package className="mr-2 h-4 w-4" />
                  Select Devices
                </Button>
              </div>
              
              {selectedBOQDevices.length > 0 ? (
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <p className="text-sm font-medium">{selectedBOQDevices.length} device(s) selected</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedBOQDevices.slice(0, 5).map(d => (
                      <Badge key={d.device_id} variant="secondary">
                        {d.device.name} × {d.quantity}
                      </Badge>
                    ))}
                    {selectedBOQDevices.length > 5 && (
                      <Badge variant="outline">+{selectedBOQDevices.length - 5} more</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total: ${selectedBOQDevices.reduce((sum, d) => sum + (d.unit_price * d.quantity), 0).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click "Select Devices" to add items to your BOQ</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Project Devices</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDevice}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </div>
              
              {selectedDevices.map((projectDevice, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Select 
                      value={projectDevice.device_id} 
                      onValueChange={(value) => updateDevice(index, 'device_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name} - {device.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={projectDevice.quantity}
                      onChange={(e) => updateDevice(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={projectDevice.unit_price || ''}
                      onChange={(e) => updateDevice(index, 'unit_price', parseFloat(e.target.value) || undefined)}
                      placeholder="Unit price"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeDevice(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>

        <DeviceBrowserDialog
          isOpen={isDeviceBrowserOpen}
          onClose={() => setIsDeviceBrowserOpen(false)}
          onConfirm={handleBOQDevicesConfirm}
          initialDevices={selectedBOQDevices}
        />
      </DialogContent>
    </Dialog>
  );
};