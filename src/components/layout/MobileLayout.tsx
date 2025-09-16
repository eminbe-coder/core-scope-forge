import { useIsMobile } from '@/hooks/use-mobile';
import { DashboardLayout } from './DashboardLayout';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileHeader } from './MobileHeader';

interface MobileLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  headerTitle?: string;
}

export function MobileLayout({ 
  children, 
  showBottomNav = true,
  headerTitle 
}: MobileLayoutProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MobileHeader title={headerTitle} />
      
      <main className="flex-1 overflow-auto pb-20 px-4 pt-4">
        {children}
      </main>
      
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}