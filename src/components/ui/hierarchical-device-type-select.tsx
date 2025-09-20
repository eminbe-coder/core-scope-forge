import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { useDeviceTypes } from '@/hooks/use-device-types';

interface DeviceType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  is_global: boolean;
  parent_device_type_id?: string;
  sub_types?: DeviceType[];
}

interface HierarchicalDeviceTypeSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function HierarchicalDeviceTypeSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select device type",
  disabled = false
}: HierarchicalDeviceTypeSelectProps) {
  const { deviceTypes, loading } = useDeviceTypes();

  const renderDeviceTypeOptions = (types: DeviceType[], level: number = 0) => {
    return types.map((type) => (
      <React.Fragment key={type.id}>
        <SelectItem value={type.id}>
          <span style={{ paddingLeft: `${level * 16}px` }}>
            {type.name}
          </span>
        </SelectItem>
        {type.sub_types && type.sub_types.length > 0 && 
          renderDeviceTypeOptions(type.sub_types, level + 1)
        }
      </React.Fragment>
    ));
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading device types..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {renderDeviceTypeOptions(deviceTypes)}
      </SelectContent>
    </Select>
  );
}