// Shared types for entity select components

export interface BaseEntitySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  showQuickAdd?: boolean;
}

export interface EntityOption {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string;
  [key: string]: any;
}
