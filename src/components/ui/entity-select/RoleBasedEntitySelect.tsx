import { useState, useEffect, useCallback } from "react";
import { Building2, User, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { EntitySelectPopover } from "./EntitySelectPopover";
import { BaseEntitySelectProps, EntityOption } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface RoleBasedEntitySelectProps extends Omit<BaseEntitySelectProps, 'onValueChange'> {
  /** Filter by relationship role name (e.g., "Technician", "Project Manager") */
  roleName?: string;
  /** Entity type to search for */
  entityType: 'company' | 'contact';
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Show role filter dropdown */
  showRoleFilter?: boolean;
}

interface RelationshipRole {
  id: string;
  name: string;
  category: string;
}

/**
 * Entity selector that filters by relationship roles.
 * Powers the "find all Technicians" use case.
 */
export function RoleBasedEntitySelect({
  value,
  onValueChange,
  entityType,
  roleName: initialRoleName,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled,
  className,
  showRoleFilter = true,
}: RoleBasedEntitySelectProps) {
  const { currentTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(initialRoleName || "");
  const [roles, setRoles] = useState<RelationshipRole[]>([]);
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      if (!currentTenant?.id) return;

      const { data, error } = await supabase
        .from('relationship_roles')
        .select('id, name, category')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('category')
        .order('name');

      if (!error && data) {
        setRoles(data);
      }
    };

    fetchRoles();
  }, [currentTenant?.id]);

  // Fetch entities by role
  useEffect(() => {
    const fetchEntities = async () => {
      if (!currentTenant?.id) return;

      setLoading(true);
      setError(null);

      try {
        if (selectedRole) {
          // Fetch entities with matching role relationships
          const column = entityType === 'company' ? 'company_id' : 'contact_id';
          const joinTable = entityType === 'company' ? 'companies' : 'contacts';
          
          const { data, error: queryError } = await supabase
            .from('entity_relationships')
            .select(`
              ${column},
              ${joinTable} (id, ${entityType === 'company' ? 'name' : 'first_name, last_name, email'}),
              relationship_roles!inner (name)
            `)
            .eq('tenant_id', currentTenant.id)
            .eq('is_active', true)
            .ilike('relationship_roles.name', selectedRole);

          if (queryError) throw queryError;

          // Deduplicate entities
          const entityMap = new Map<string, EntityOption>();
          (data || []).forEach((rel: any) => {
            const entity = rel[joinTable];
            const entityId = rel[column];
            if (entity && entityId && !entityMap.has(entityId)) {
              entityMap.set(entityId, entity);
            }
          });

          setOptions(Array.from(entityMap.values()));
        } else {
          // No role filter - fetch all entities
          if (entityType === 'company') {
            const { data, error: queryError } = await supabase
              .from('companies')
              .select('id, name')
              .eq('tenant_id', currentTenant.id)
              .eq('active', true)
              .is('deleted_at', null)
              .ilike('name', `%${searchTerm}%`)
              .order('name')
              .limit(100);

            if (queryError) throw queryError;
            setOptions(data || []);
          } else {
            const { data, error: queryError } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, email')
              .eq('tenant_id', currentTenant.id)
              .eq('active', true)
              .is('deleted_at', null)
              .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
              .order('first_name')
              .limit(100);

            if (queryError) throw queryError;
            setOptions(data || []);
          }
        }
      } catch (err) {
        console.error('Error fetching entities:', err);
        setError('Failed to load options');
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [currentTenant?.id, entityType, selectedRole, searchTerm]);

  const getDisplayName = useCallback((option: EntityOption) => {
    if (entityType === 'company') {
      return option.name || option.id;
    }
    const fullName = `${option.first_name || ""} ${option.last_name || ""}`.trim();
    return option.email ? `${fullName} (${option.email})` : fullName || option.id;
  }, [entityType]);

  const refresh = () => {
    // Trigger refetch by changing searchTerm
    setSearchTerm(prev => prev + ' ');
    setSearchTerm(prev => prev.trim());
  };

  return (
    <div className="space-y-2">
      {showRoleFilter && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm text-muted-foreground">Filter by Role:</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {role.category}
                    </Badge>
                    {role.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRole && (
            <Badge variant="secondary" className="text-xs">
              Showing: {selectedRole}
            </Badge>
          )}
        </div>
      )}

      <EntitySelectPopover
        value={value}
        options={options}
        loading={loading}
        error={error}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={selectedRole ? `No ${entityType}s with role "${selectedRole}" found.` : emptyText}
        disabled={disabled}
        className={className}
        icon={entityType === 'company' 
          ? <Building2 className="h-4 w-4 text-muted-foreground" />
          : <User className="h-4 w-4 text-muted-foreground" />
        }
        getDisplayName={getDisplayName}
        onValueChange={onValueChange}
        onSearchChange={setSearchTerm}
        onRefresh={refresh}
        showQuickAdd={false}
      />
    </div>
  );
}
