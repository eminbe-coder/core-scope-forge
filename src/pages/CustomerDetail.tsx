import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Building2, User, MapPin, Phone, Mail, Globe, Edit3, Activity, CheckSquare, Handshake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { CreateActivityModal } from '@/components/modals/CreateActivityModal';
import { TodoWidget } from '@/components/todos/TodoWidget';

interface Customer {
  id: string;
  tenant_id: string;
  type: 'individual' | 'company';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
  currency_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Deal {
  id: string;
  name: string;
  value?: number;
  status: string;
  stage_id?: string;
  expected_close_date?: string;
  currencies?: { symbol: string };
  deal_stages?: { name: string; win_percentage: number };
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  country: string;
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  type: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string };
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
}

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);

  const fetchCustomer = async () => {
    if (!id || !currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch customer details',
        variant: 'destructive',
      });
      navigate('/customers');
    }
  };

  const fetchRelatedData = async () => {
    if (!id || !currentTenant) return;

    try {
      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          id, name, value, status, stage_id, expected_close_date,
          currencies(symbol),
          deal_stages(name, win_percentage)
        `)
        .eq('customer_id', id)
        .eq('tenant_id', currentTenant.id);

      if (dealsError) throw dealsError;
      setDeals(dealsData || []);

      // Fetch linked companies via company_customers
      const { data: companyCustomersData, error: companyCustomersError } = await supabase
        .from('company_customers')
        .select(`
          companies(id, name, industry, website, phone, email)
        `)
        .eq('customer_id', id);

      if (companyCustomersError) throw companyCustomersError;
      const linkedCompanies = companyCustomersData?.map(cc => cc.companies).filter(Boolean) || [];
      setCompanies(linkedCompanies as Company[]);

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, position')
        .eq('customer_id', id)
        .eq('tenant_id', currentTenant.id);

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name, address, city, country')
        .eq('customer_id', id)
        .eq('tenant_id', currentTenant.id);

      if (sitesError) throw sitesError;
      setSites(sitesData || []);

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id, title, description, type, created_at,
          profiles!activities_created_by_fkey(first_name, last_name)
        `)
        .eq('customer_id', id)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch todos
      const { data: todosData, error: todosError } = await supabase
        .from('activities')
        .select('id, title, description, due_date, completed, created_at')
        .eq('customer_id', id)
        .eq('type', 'task')
        .eq('tenant_id', currentTenant.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (todosError) throw todosError;
      setTodos(todosData || []);

    } catch (error) {
      console.error('Error fetching related data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    fetchRelatedData();
  }, [id, currentTenant]);

  const getStageColor = (winPercentage?: number) => {
    if (!winPercentage) return 'bg-gray-500';
    if (winPercentage >= 80) return 'bg-green-500';
    if (winPercentage >= 60) return 'bg-orange-500';
    if (winPercentage >= 30) return 'bg-yellow-500';
    if (winPercentage >= 10) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  if (loading || !customer) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading customer details...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {customer.type === 'company' ? (
                <Building2 className="h-8 w-8 text-primary" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
              <div>
                <h1 className="text-3xl font-bold">{customer.name}</h1>
                <Badge variant={customer.type === 'company' ? 'default' : 'secondary'}>
                  {customer.type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowActivityModal(true)}>
              <Activity className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
            <Button variant="outline" onClick={() => setShowTodoModal(true)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button onClick={() => navigate(`/customers/edit/${customer.id}`)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Customer
            </Button>
          </div>
        </div>

        {/* Customer Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {customer.website}
                  </a>
                </div>
              )}
              {(customer.address || customer.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {[customer.address, customer.city, customer.state, customer.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
            {customer.notes && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Related Data */}
        <Tabs defaultValue="deals" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
            <TabsTrigger value="companies">Companies ({companies.length})</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="sites">Sites ({sites.length})</TabsTrigger>
            <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
            <TabsTrigger value="todos">Tasks ({todos.length})</TabsTrigger>
          </TabsList>

          {/* Deals Tab */}
          <TabsContent value="deals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="h-5 w-5" />
                  Customer Deals
                </CardTitle>
                <CardDescription>Sales opportunities with this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {deals.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No deals found for this customer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/deals/edit/${deal.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{deal.name}</h4>
                            {deal.deal_stages && (
                              <Badge 
                                className={`text-white ${getStageColor(deal.deal_stages.win_percentage)} mt-1`}
                                variant="secondary"
                              >
                                {deal.deal_stages.name} ({deal.deal_stages.win_percentage}%)
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            {deal.value && (
                              <div className="font-semibold">
                                {deal.currencies?.symbol || '$'}{deal.value.toLocaleString()}
                              </div>
                            )}
                            {deal.expected_close_date && (
                              <div className="text-sm text-muted-foreground">
                                Due: {new Date(deal.expected_close_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Linked Companies
                </CardTitle>
                <CardDescription>Companies associated with this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {companies.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No companies linked to this customer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {companies.map((company) => (
                      <div key={company.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{company.name}</h4>
                            {company.industry && (
                              <p className="text-sm text-muted-foreground mt-1">{company.industry}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {company.email && <div>{company.email}</div>}
                            {company.phone && <div>{company.phone}</div>}
                            {company.website && (
                              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Contacts
                </CardTitle>
                <CardDescription>People associated with this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No contacts found for this customer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </h4>
                            {contact.position && (
                              <p className="text-sm text-muted-foreground mt-1">{contact.position}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {contact.email && <div>{contact.email}</div>}
                            {contact.phone && <div>{contact.phone}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sites Tab */}
          <TabsContent value="sites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Customer Sites
                </CardTitle>
                <CardDescription>Physical locations for this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {sites.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No sites found for this customer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sites.map((site) => (
                      <div
                        key={site.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/sites/edit/${site.id}`)}
                      >
                        <h4 className="font-medium">{site.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {[site.address, site.city, site.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activities
                </CardTitle>
                <CardDescription>Recent interactions and activities</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No activities recorded for this customer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{activity.title}</h4>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{new Date(activity.created_at).toLocaleDateString()}</div>
                            {activity.profiles && (
                              <div>
                                by {activity.profiles.first_name} {activity.profiles.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Todos Tab */}
          <TabsContent value="todos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Customer Tasks
                </CardTitle>
                <CardDescription>Tasks and follow-ups for this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {todos.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No tasks found for this customer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {todos.map((todo) => (
                      <div key={todo.id} className={`border rounded-lg p-4 ${todo.completed ? 'bg-muted/50' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {todo.title}
                            </h4>
                            {todo.description && (
                              <p className={`text-sm mt-1 ${todo.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                                {todo.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {todo.due_date && (
                              <div>Due: {new Date(todo.due_date).toLocaleDateString()}</div>
                            )}
                            <Badge variant={todo.completed ? 'outline' : 'secondary'}>
                              {todo.completed ? 'Completed' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateActivityModal
        open={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onSuccess={() => {
          setShowActivityModal(false);
          fetchRelatedData();
          toast({
            title: 'Success',
            description: 'Activity logged successfully',
          });
        }}
        entityId={customer.id}
        entityType="customer"
        entityName={customer.name}
      />

      <TodoWidget 
        entityType="customer"
        entityId={customer.id}
        canEdit={true}
        compact={false}
        includeChildren={false}
      />
    </DashboardLayout>
  );
};

export default CustomerDetail;