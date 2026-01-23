import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle, Calendar, Clock, User, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodoFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  showOverdue: boolean;
  onShowOverdueChange: (value: boolean) => void;
  showDue: boolean;
  onShowDueChange: (value: boolean) => void;
  showLater: boolean;
  onShowLaterChange: (value: boolean) => void;
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
  showOverdue,
  onShowOverdueChange,
  showDue,
  onShowDueChange,
  showLater,
  onShowLaterChange,
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
    !showOverdue || 
    !showDue || 
    !showLater || 
    showCreatedByMe || 
    showCompleted;
  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
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

      <div className="flex flex-wrap gap-2 items-center">
        {/* Clear All Filters Button */}
        {onClearAllFilters && hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAllFilters}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All Filters
          </Button>
        )}
        <Button
          variant={showOverdue ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => onShowOverdueChange(!showOverdue)}
          className={cn(
            "relative",
            showOverdue ? 'bg-red-500 hover:bg-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'
          )}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Overdue
          <span className="absolute -top-1 -right-1 text-[8px] bg-background px-1 rounded text-foreground">
            {showOverdue ? 'ON' : 'OFF'}
          </span>
        </Button>

        <Button
          variant={showDue ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowDueChange(!showDue)}
          className={cn(
            "relative",
            showDue ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-200 text-orange-600 hover:bg-orange-50'
          )}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Due Today
          <span className="absolute -top-1 -right-1 text-[8px] bg-background px-1 rounded text-foreground">
            {showDue ? 'ON' : 'OFF'}
          </span>
        </Button>

        <Button
          variant={showLater ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowLaterChange(!showLater)}
          className={cn(
            "relative",
            showLater ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'
          )}
        >
          <Clock className="h-4 w-4 mr-1" />
          Later
          <span className="absolute -top-1 -right-1 text-[8px] bg-background px-1 rounded text-foreground">
            {showLater ? 'ON' : 'OFF'}
          </span>
        </Button>
        
        <Button
          variant={showCreatedByMe ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowCreatedByMeChange(!showCreatedByMe)}
          className="relative"
        >
          <User className="h-4 w-4 mr-1" />
          Created by me
          <span className="absolute -top-1 -right-1 text-[8px] bg-background px-1 rounded text-foreground">
            {showCreatedByMe ? 'ON' : 'OFF'}
          </span>
        </Button>

        <Button
          variant={showCompleted ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowCompletedChange(!showCompleted)}
          className={cn(
            "relative",
            showCompleted ? 'bg-green-500 hover:bg-green-600' : 'border-green-200 text-green-600 hover:bg-green-50'
          )}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Completed
          <span className="absolute -top-1 -right-1 text-[8px] bg-background px-1 rounded text-foreground">
            {showCompleted ? 'ON' : 'OFF'}
          </span>
        </Button>
      </div>
    </div>
  );
};