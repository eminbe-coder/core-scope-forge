import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, AlertTriangle, Calendar, Clock, User, CheckCircle, X, ListFilter } from 'lucide-react';

export type TimeframeFilter = 'all' | 'overdue' | 'due_today' | 'later';

interface TodoFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  timeframe: TimeframeFilter;
  onTimeframeChange: (value: TimeframeFilter) => void;
  showCreatedByMe: boolean;
  onShowCreatedByMeChange: (value: boolean) => void;
  showCompleted: boolean;
  onShowCompletedChange: (value: boolean) => void;
  onClearAllFilters?: () => void;
}

export const TodoFilters: React.FC<TodoFiltersProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  timeframe,
  onTimeframeChange,
  showCreatedByMe,
  onShowCreatedByMeChange,
  showCompleted,
  onShowCompletedChange,
  onClearAllFilters,
}) => {
  // Check if any filters are non-default
  const hasActiveFilters = searchTerm !== '' || 
    sortBy !== 'due_date' || 
    sortOrder !== 'asc' || 
    timeframe !== 'all' ||
    showCreatedByMe || 
    showCompleted;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      {/* Search and Sort Row */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search todos..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="created_at">Created</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={sortOrder === 'asc' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      {/* Timeframe Filter - Single Select */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ListFilter className="h-4 w-4" />
          <span>Show tasks</span>
        </div>
        <RadioGroup 
          value={timeframe} 
          onValueChange={(value) => onTimeframeChange(value as TimeframeFilter)}
          className="flex flex-wrap gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="tf-all" />
            <Label htmlFor="tf-all" className="cursor-pointer font-normal">All</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="overdue" id="tf-overdue" className="border-destructive text-destructive" />
            <Label htmlFor="tf-overdue" className="cursor-pointer font-normal flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="due_today" id="tf-due-today" className="border-primary text-primary" />
            <Label htmlFor="tf-due-today" className="cursor-pointer font-normal flex items-center gap-1 text-primary">
              <Calendar className="h-3 w-3" />
              Due Today
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="later" id="tf-later" className="border-muted-foreground text-muted-foreground" />
            <Label htmlFor="tf-later" className="cursor-pointer font-normal flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              Later
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Toggle Filters */}
      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border">
        {/* Clear All Filters Button */}
        {onClearAllFilters && hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAllFilters}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}

        {/* Created By Me Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="created-by-me"
            checked={showCreatedByMe}
            onCheckedChange={onShowCreatedByMeChange}
          />
          <Label htmlFor="created-by-me" className="cursor-pointer flex items-center gap-1 text-sm">
            <User className="h-3.5 w-3.5" />
            Created by me
          </Label>
        </div>

        {/* Show Completed Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="show-completed"
            checked={showCompleted}
            onCheckedChange={onShowCompletedChange}
          />
          <Label htmlFor="show-completed" className="cursor-pointer flex items-center gap-1 text-sm">
            <CheckCircle className="h-3.5 w-3.5" />
            Show Completed
          </Label>
        </div>
      </div>
    </div>
  );
};
