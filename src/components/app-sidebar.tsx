'use client';

import Link from 'next/link';
import { IconInnerShadowTop } from '@tabler/icons-react';

import { NavAdmin } from '@/components/nav-admin';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SIDEBAR_DATA, COMPANY_INFO } from '@/constants/navigation';
import { User, Role } from '@prisma/client';
import { hasFeatureAccess, getPositionDefinition } from '@/lib/permissions';
import { FeatureKey } from '@/constants/permissions';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: (User & { userRole?: Role | null }) | null;
  counts?: {
    enquiries?: number;
    jobOrdersPending?: number;
    followUps?: number;
  };
}

// Maps sidebar items to feature permission keys
const NAV_ITEM_FEATURE_MAP: Record<string, FeatureKey> = {
  Dashboard: 'dashboard',
  Enquiries: 'enquiries',
  'Job Orders': 'job_orders',
  'Follow-ups': 'follow_ups',
  'Call Register': 'call_register',
  'Site Surveys & Projects': 'projects',
  'Service Billing': 'services',
  Proposals: 'proposals',
  Reports: 'reports',
  'Data Management': 'data_management',
  Users: 'users_management',
  Invoices: 'invoices',
  Expenses: 'expenses',
};

export function AppSidebar({ user, counts, ...props }: AppSidebarProps) {
  const position = getPositionDefinition(user?.role);

  // 1. Filter and decorate main navigation items based on user permissions
  const filteredNavMain = SIDEBAR_DATA.navMain
    .filter((item) => {
      const featureKey = NAV_ITEM_FEATURE_MAP[item.title];
      if (!featureKey) return true;
      return hasFeatureAccess(user, featureKey);
    })
    .map((item) => {
      if (item.title === 'Enquiries' && counts?.enquiries) {
        return { ...item, badge: counts.enquiries };
      }
      if (item.title === 'Job Orders') {
        return {
          ...item,
          items: item.items?.map((subItem) => {
            if (subItem.title === 'Pending' && counts?.jobOrdersPending) {
              return { ...subItem, badge: counts.jobOrdersPending };
            }
            return subItem;
          }),
        };
      }
      if (item.title === 'Follow-ups' && counts?.followUps) {
        return { ...item, badge: counts.followUps };
      }
      return item;
    });

  // 2. Filter secondary finance items (Invoices, Expenses)
  const filteredNavSecondary = SIDEBAR_DATA.navSecondary.filter((item) => {
    const featureKey = NAV_ITEM_FEATURE_MAP[item.title];
    if (!featureKey) return true;
    return hasFeatureAccess(user, featureKey);
  });

  // 3. Filter admin management items (Reports, Data Management, Users)
  const filteredAdmin = SIDEBAR_DATA.admin.filter((item) => {
    const featureKey = NAV_ITEM_FEATURE_MAP[item.title];
    if (!featureKey) return false;
    return hasFeatureAccess(user, featureKey);
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-border/70" {...props}>
      <SidebarHeader className="border-b border-border/60 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="hover:bg-transparent">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                  <IconInnerShadowTop className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-sm font-bold tracking-tight text-foreground">{COMPANY_INFO.name}</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {position.shortTitle} Workspace
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {filteredNavMain.length > 0 && <NavMain items={filteredNavMain} />}
        {filteredAdmin.length > 0 && <NavAdmin items={filteredAdmin} />}
        {filteredNavSecondary.length > 0 && (
          <NavSecondary items={filteredNavSecondary} className="mt-auto" />
        )}
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
