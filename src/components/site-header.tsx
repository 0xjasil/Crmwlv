import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface SiteHeaderProps {
  title?: string;
  showGitHubLink?: boolean;
}

export function SiteHeader({ title = 'Dashboard' }: SiteHeaderProps = {}) {
  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/70 bg-card/90 backdrop-blur-md px-4 lg:px-6 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2">
        <SidebarTrigger className="-ml-1 size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted" />
        <Separator orientation="vertical" className="mx-1.5 h-4 bg-border/80" />
        <span className="text-sm font-semibold text-foreground/90 tracking-tight">{title}</span>
        <div className="ml-auto flex items-center gap-2.5">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
