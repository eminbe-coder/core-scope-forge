import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface QueryConfig {
  fields: string[];
  filters: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  sorting: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  grouping: string[];
  visualization_type: 'table' | 'bar_chart' | 'pie_chart' | 'kpi_cards';
}

interface QueryBuilderProps {
  dataSource: string;
  onDataSourceChange: (source: string) => void;
  queryConfig: QueryConfig;
  onQueryConfigChange: (config: QueryConfig) => void;
  visualizationType: string;
  onVisualizationTypeChange: (type: string) => void;
}

const DATA_SOURCES = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'deals', label: 'Deals' },
  { value: 'sites', label: 'Sites' },
  { value: 'customers', label: 'Customers' },
];

const FIELD_DEFINITIONS = {
  contacts: [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'position', label: 'Position' },
    { value: 'created_at', label: 'Created Date' },
  ],
  companies: [
    { value: 'name', label: 'Company Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'website', label: 'Website' },
    { value: 'industry', label: 'Industry' },
    { value: 'size', label: 'Size' },
    { value: 'created_at', label: 'Created Date' },
  ],
  deals: [
    { value: 'name', label: 'Deal Name' },
    { value: 'value', label: 'Deal Value' },
    { value: 'status', label: 'Status' },
    { value: 'probability', label: 'Probability' },
    { value: 'expected_close_date', label: 'Expected Close Date' },
    { value: 'created_at', label: 'Created Date' },
  ],
  sites: [
    { value: 'name', label: 'Site Name' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'country', label: 'Country' },
    { value: 'created_at', label: 'Created Date' },
  ],
  customers: [
    { value: 'name', label: 'Customer Name' },
    { value: 'type', label: 'Type' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'city', label: 'City' },
    { value: 'country', label: 'Country' },
    { value: 'created_at', label: 'Created Date' },
  ],
};

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

const VISUALIZATION_TYPES = [
  { value: 'table', label: 'Table' },
  { value: 'bar_chart', label: 'Bar Chart' },
  { value: 'pie_chart', label: 'Pie Chart' },
  { value: 'kpi_cards', label: 'KPI Cards' },
];

export function QueryBuilder({ dataSource, onDataSourceChange, queryConfig, onQueryConfigChange, visualizationType, onVisualizationTypeChange }: QueryBuilderProps) {
  const availableFields = dataSource ? FIELD_DEFINITIONS[dataSource as keyof typeof FIELD_DEFINITIONS] || [] : [];

  const updateQueryConfig = (updates: Partial<QueryConfig>) => {
    onQueryConfigChange({ ...queryConfig, ...updates });
  };

  const handleFieldToggle = (field: string, checked: boolean) => {
    const newFields = checked
      ? [...queryConfig.fields, field]
      : queryConfig.fields.filter(f => f !== field);
    updateQueryConfig({ fields: newFields });
  };

  const handleAddFilter = () => {
    const newFilter = { field: '', operator: 'equals', value: '' };
    updateQueryConfig({ filters: [...queryConfig.filters, newFilter] });
  };

  const handleUpdateFilter = (index: number, updates: Partial<typeof queryConfig.filters[0]>) => {
    const newFilters = queryConfig.filters.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    );
    updateQueryConfig({ filters: newFilters });
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = queryConfig.filters.filter((_, i) => i !== index);
    updateQueryConfig({ filters: newFilters });
  };

  const handleAddSort = () => {
    const newSort = { field: '', direction: 'asc' as const };
    updateQueryConfig({ sorting: [...queryConfig.sorting, newSort] });
  };

  const handleUpdateSort = (index: number, updates: Partial<typeof queryConfig.sorting[0]>) => {
    const newSorting = queryConfig.sorting.map((sort, i) => 
      i === index ? { ...sort, ...updates } : sort
    );
    updateQueryConfig({ sorting: newSorting });
  };

  const handleRemoveSort = (index: number) => {
    const newSorting = queryConfig.sorting.filter((_, i) => i !== index);
    updateQueryConfig({ sorting: newSorting });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Source</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={dataSource} onValueChange={onDataSourceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              {DATA_SOURCES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {dataSource && (
        <Card>
          <CardHeader>
            <CardTitle>Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={visualizationType} onValueChange={onVisualizationTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select visualization type" />
              </SelectTrigger>
              <SelectContent>
                {VISUALIZATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {dataSource && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {availableFields.map((field) => (
                  <div key={field.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.value}
                      checked={queryConfig.fields.includes(field.value)}
                      onCheckedChange={(checked) => handleFieldToggle(field.value, checked as boolean)}
                    />
                    <Label htmlFor={field.value} className="text-sm">{field.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {queryConfig.filters.map((filter, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label>Field</Label>
                    <Select
                      value={filter.field}
                      onValueChange={(value) => handleUpdateFilter(index, { field: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label>Operator</Label>
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => handleUpdateFilter(index, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label>Value</Label>
                    <Input
                      value={filter.value}
                      onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                      placeholder="Enter value"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFilter(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddFilter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sorting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {queryConfig.sorting.map((sort, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label>Field</Label>
                    <Select
                      value={sort.field}
                      onValueChange={(value) => handleUpdateSort(index, { field: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6">
                    <Label>Direction</Label>
                    <Select
                      value={sort.direction}
                      onValueChange={(value: 'asc' | 'desc') => handleUpdateSort(index, { direction: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSort(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddSort}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sort
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}