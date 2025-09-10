import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TodoList } from '@/components/todos/TodoList';
import { TodoForm } from '@/components/todos/TodoForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

const MyTodos = () => {
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    dueToday: 0
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchStats();
    }
  }, [currentTenant?.id]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: todos } = await supabase
        .from('todos')
        .select('status, due_date')
        .eq('tenant_id', currentTenant?.id)
        .eq('assigned_to', user.id);

      if (todos) {
        const today = new Date().toISOString().split('T')[0];
        const completed = todos.filter(t => t.status === 'completed').length;
        const pending = todos.filter(t => t.status !== 'completed').length;
        const overdue = todos.filter(t => 
          t.status !== 'completed' && 
          t.due_date && 
          t.due_date < today
        ).length;
        const dueToday = todos.filter(t => 
          t.status !== 'completed' && 
          t.due_date === today
        ).length;

        setStats({
          total: todos.length,
          completed,
          pending,
          overdue,
          dueToday
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My To-Dos</h1>
            <p className="text-muted-foreground">
              Manage all your to-do items across the platform
            </p>
          </div>
          <TodoForm
            entityType="general"
            entityId=""
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Quick Add To-Do
              </Button>
            }
            onSuccess={fetchStats}
          />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Todo List */}
        <TodoList
          showFilters={true}
          showStats={false}
          title="All My To-Dos"
          canEdit={true}
        />
      </div>
    </DashboardLayout>
  );
};

export default MyTodos;