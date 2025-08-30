import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, User, FileText, DollarSign, Users, Building2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  user_name?: string;
  notes?: string;
  created_at: string;
}

interface ContractAuditTrailProps {
  contractId: string;
}

export const ContractAuditTrail = ({ contractId }: ContractAuditTrailProps) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dealActivities, setDealActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (contractId) {
      fetchAuditTrail();
    }
  }, [contractId]);

  const fetchAuditTrail = async () => {
    try {
      // Fetch contract audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('contract_audit_logs')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (auditError) throw auditError;

      // Fetch inherited deal activities if contract has a deal_id
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('deal_id')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;

      let dealActivitiesData = [];
      if (contractData.deal_id) {
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('entity_id', contractData.deal_id)
          .eq('entity_type', 'deal')
          .order('created_at', { ascending: false });

        if (activitiesError) throw activitiesError;
        dealActivitiesData = activitiesData || [];
      }

      setAuditLogs(auditData || []);
      setDealActivities(dealActivitiesData);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string, entityType: string) => {
    switch (action) {
      case 'created':
      case 'todo_added':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'updated':
      case 'payment_stage_changed':
      case 'payment_stage_auto_updated':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'todo_completed':
        return <Calendar className="h-4 w-4 text-green-600" />;
      case 'todo_uncompleted':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'contact_linked':
        return <User className="h-4 w-4 text-purple-600" />;
      case 'company_linked':
        return <Building2 className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
      case 'todo_added':
      case 'todo_completed':
        return 'default';
      case 'updated':
      case 'payment_stage_changed':
      case 'payment_stage_auto_updated':
        return 'secondary';
      case 'todo_uncompleted':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatActionText = (log: AuditLog) => {
    switch (log.action) {
      case 'created':
        return `Contract created`;
      case 'updated':
        return `Contract updated`;
      case 'todo_added':
        return `To-do item added`;
      case 'todo_completed':
        return `To-do item completed`;
      case 'todo_uncompleted':
        return `To-do item uncompleted`;
      case 'payment_stage_changed':
        return `Payment stage changed`;
      case 'payment_stage_auto_updated':
        return `Payment stage automatically updated`;
      case 'contact_linked':
        return `Contact linked to contract`;
      case 'company_linked':
        return `Company linked to contract`;
      default:
        return log.action.replace(/_/g, ' ');
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Combine and filter audit logs
  const allLogs = [
    ...auditLogs.map(log => ({ ...log, source: 'contract' })),
    ...dealActivities.map(activity => ({ 
      ...activity, 
      source: 'deal',
      action: activity.activity_type,
      entity_type: 'deal_activity'
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredLogs = allLogs.filter(log => {
    const matchesFilter = filter === 'all' || 
      (filter === 'contract' && log.source === 'contract') ||
      (filter === 'deal' && log.source === 'deal') ||
      log.action.includes(filter);
    
    const matchesSearch = searchTerm === '' ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search audit trail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="contract">Contract Changes</SelectItem>
              <SelectItem value="deal">Inherited from Deal</SelectItem>
              <SelectItem value="todo">To-Do Items</SelectItem>
              <SelectItem value="payment">Payment Changes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No audit trail entries found.
            </p>
          ) : (
            filteredLogs.map((log) => (
              <div key={`${log.source}-${log.id}`} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getActionIcon(log.action, log.entity_type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {formatActionText(log)}
                        </h4>
                        <Badge variant={getActionColor(log.action)} className="text-xs">
                          {log.source === 'deal' ? 'From Deal' : 'Contract'}
                        </Badge>
                      </div>
                      
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {log.notes}
                        </p>
                      )}

                      {log.field_name && (log.old_value || log.new_value) && (
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-muted-foreground">
                            Field: {log.field_name}
                          </p>
                          {log.old_value && (
                            <p>
                              <span className="text-red-600">From:</span> {formatValue(log.old_value)}
                            </p>
                          )}
                          {log.new_value && (
                            <p>
                              <span className="text-green-600">To:</span> {formatValue(log.new_value)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user_name || 'System'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};