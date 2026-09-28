import type { Metadata } from 'next';
import './../globals.css';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import prisma from '@/lib/prisma';
import { APP_CONFIG, theme } from '@/config/app';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';

import { cacheService } from '@/lib/cache/cache-service';

export const metadata: Metadata = {
  description: APP_CONFIG.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: User | null = null;
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const userCookie = cookieStore.get('user')?.value;

  if (token) {
    try {
      const decoded = jwt.decode(token) as { id: string; email: string; role: string; branchId?: string } | null;
      if (decoded?.id) {
        user = await cacheService.getOrSet<User | null>(`user:${decoded.id}`, 60, async () => {
          return (await prisma.user.findUnique({
            where: { id: decoded.id },
          })) as unknown as User;
        });
      }
    } catch (err) {
      console.error('JWT parse error in layout:', err);
    }
  }

  if (!user && userCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(userCookie));
      if (parsed?.id) {
        user = await cacheService.getOrSet<User | null>(`user:${parsed.id}`, 60, async () => {
          return (await prisma.user.findUnique({
            where: { id: parsed.id },
          })) as unknown as User;
        });
      }
    } catch (e) {
      console.error('User cookie parse error in layout:', e);
    }
  }

  if (!user) {
    redirect('/login');
  }

  let counts = {
    enquiries: 0,
    jobOrdersPending: 0,
    followUps: 0,
  };

  if (user) {
    const isManagerial = ['admin', 'manager'].includes(user.role || '');
    const isManager = user.role === 'manager';
    const isAdmin = user.role === 'admin';
    const currentUserId = user.id;
    const currentUserRole = user.role;
    const currentUserBranch = user.branch;

    const cacheKey = `sidebar:counts:${currentUserId}:${currentUserRole}:${currentUserBranch || 'none'}`;

    counts = await cacheService.getOrSet(cacheKey, 30, async () => {
      // Enquiries Count (Unassigned)
      const enquiryCountPromise = isManagerial
        ? prisma.enquiry.count({
            where: {
              assignedToUserId: null,
              ...(isManager && currentUserBranch ? { branchId: currentUserBranch } : {}),
            },
          })
        : Promise.resolve(0);

      const jobLeadWhere: any = {
        status: 'PENDING',
      };

      if (isAdmin) {
        // No extra filter
      } else if (isManager && currentUserBranch) {
        jobLeadWhere.job = { branchId: currentUserBranch };
      } else {
        jobLeadWhere.lead = { assignedToUserId: currentUserId };
      }

      const jobOrdersPendingPromise = prisma.jobLead.count({
        where: jobLeadWhere,
      });

      const followUpWhere: any = { status: 'PENDING' };
      if (isAdmin) {
        // No extra filter
      } else if (isManager && currentUserBranch) {
        followUpWhere.enquiry = { branchId: currentUserBranch };
      } else {
        followUpWhere.enquiry = { assignedToUserId: currentUserId };
      }

      const followUpsPromise = prisma.followUp.count({
        where: followUpWhere,
      });

      const [enquiriesCount, jobOrdersPendingCount, followUpsCount] = await Promise.all([
        enquiryCountPromise,
        jobOrdersPendingPromise,
        followUpsPromise,
      ]);

      return {
        enquiries: enquiriesCount,
        jobOrdersPending: jobOrdersPendingCount,
        followUps: followUpsCount,
      };
    });
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': theme.sidebarWidth,
          '--header-height': theme.headerHeight,
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} counts={counts} />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 bg-background min-h-[calc(100vh-var(--header-height))]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
