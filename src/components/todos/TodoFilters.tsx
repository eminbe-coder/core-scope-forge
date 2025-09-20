import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle, Calendar, Clock, User, CheckCircle } from 'lucide-react';

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
  showPending: boolean;
  onShowPendingChange: (value: boolean) => void;
  showCreatedByMe: boolean;
  onShowCreatedByMeChange: (value: boolean) => void;
  showCompleted: boolean;
  onShowCompletedChange: (value: boolean) => void;
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
  showPending,
  onShowPendingChange,
  showCreatedByMe,
  onShowCreatedByMeChange,
  showCompleted,
  onShowCompletedChange,
}) => {
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant={showOverdue ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => onShowOverdueChange(!showOverdue)}
          className={showOverdue ? 'bg-red-500 hover:bg-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Overdue
        </Button>

        <Button
          variant={showDue ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowDueChange(!showDue)}
          className={showDue ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Due Today
        </Button>

        <Button
          variant={showPending ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowPendingChange(!showPending)}
          className={showPending ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'}
        >
          <Clock className="h-4 w-4 mr-1" />
          Pending
        </Button>
        
        <Button
          variant={showCreatedByMe ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowCreatedByMeChange(!showCreatedByMe)}
        >
          <User className="h-4 w-4 mr-1" />
          Created by me
        </Button>

        <Button
          variant={showCompleted ? 'default' : 'outline'}
          size="sm"
          onClick={() => onShowCompletedChange(!showCompleted)}
          className={showCompleted ? 'bg-green-500 hover:bg-green-600' : 'border-green-200 text-green-600 hover:bg-green-50'}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Completed
        </Button>
      </div>
    </div>
  );
};