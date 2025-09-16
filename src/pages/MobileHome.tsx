import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { MobileQuickActions } from '@/components/mobile/MobileQuickActions';
import { MobileTodoSummary } from '@/components/mobile/MobileTodoSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  MapPin,
  ArrowRight,
  Zap
} from 'lucide-react';

interface QuickStat {
  title: string;
  value: number;
  icon: any;
  route: string;
  color: string;
}

export default function MobileHome() {
  const isMobile = useIsMobile();
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (currentTenant?.id) {
      fetchQuickStats();
      fetchRecentActivity();
    }
  }, [currentTenant?.id]);

  const fetchQuickStats = async () => {
    try {
      const [contactsResult, companiesResult, sitesResult, dealsResult] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact' }).eq('tenant_id', currentTenant?.id),
        supabase.from('companies').select('id', { count: 'exact' }).eq('tenant_id', currentTenant?.id),
        supabase.from('sites').select('id', { count: 'exact' }).eq('tenant_id', currentTenant?.id),
        supabase.from('deals').select('id', { count: 'exact' }).eq('tenant_id', currentTenant?.id)
      ]);

      const stats: QuickStat[] = [
        {
          title: 'Contacts',
          value: contactsResult.count || 0,
          icon: Users,
          route: '/contacts',
          color: 'text-blue-600'
        },
        {
          title: 'Companies',
          value: companiesResult.count || 0,
          icon: Building2,
          route: '/companies',
          color: 'text-green-600'
        },
        {
          title: 'Sites',
          value: sitesResult.count || 0,
          icon: MapPin,
          route: '/sites',
          color: 'text-purple-600'
        },
        {
          title: 'Deals',
          value: dealsResult.count || 0,
          icon: TrendingUp,
          route: '/deals',
          color: 'text-orange-600'
        }
      ];

      setQuickStats(stats);
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from('activities')
        .select(`
          *,
          profiles!created_by(first_name, last_name)
        `)
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  if (!isMobile) {
    // Redirect to regular dashboard for desktop
    navigate('/');
    return null;
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Stay on top of your tasks and business
          </p>
        </div>

        {/* Todo Summary - Primary focus */}
        <MobileTodoSummary />

        {/* Quick Actions */}
        <MobileQuickActions />

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickStats.map((stat) => (
                <Button
                  key={stat.title}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => navigate(stat.route)}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  <div className="text-center">
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/activities')}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg border">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.profiles?.first_name} {activity.profiles?.last_name}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {activity.activity_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}