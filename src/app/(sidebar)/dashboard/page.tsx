import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDashboardData } from '@/lib/actions/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
import {
  IconUsers,
  IconUserPlus,
  IconClock,
  IconPhone,
  IconAlertCircle,
  IconCalendar,
  IconTarget,
  IconTrendingUp,
  IconPhoneCall,
  IconUserCheck,
  IconEye,
  IconCalendarClock,
  IconUserSearch,
  IconClockExclamation,
  IconReceipt,
  IconArrowRight,
} from '@tabler/icons-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { getPositionDefinition, hasFeatureAccess } from '@/lib/permissions';
import { IconBriefcase, IconFileInvoice, IconFileDollar } from '@tabler/icons-react';

export default async function Dashboard() {
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (err) {
    console.error('Dashboard session error:', err);
  }

  if (!session) {
    redirect('/login');
  }

  // Get branch name if user is executive
  let branchName: string | undefined;
  if (session.user.role === 'executive' && session.user.branch) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: session.user.branch },
        select: { name: true },
      });
      branchName = branch?.name;
    } catch (e) {
      console.warn('Dashboard branch fetch warning:', e);
    }
  }

  // Get dashboard data - for telecallers, filter by their assigned enquiries
  const isTelecaller = session.user.role === 'telecaller';
  const isExecutive = session.user.role === 'executive';
  const dashboardData = await getDashboardData(
    isTelecaller ? session.user.id : undefined,
    session.user.role || undefined,
    isExecutive ? session.user.branch || undefined : undefined
  );

  const { stats, followUpStats, recentActivity, performanceMetrics } = dashboardData;

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const userPosition = getPositionDefinition(session.user.role);
  const canAccessEnquiries = hasFeatureAccess(session.user, 'enquiries');
  const canAccessJobOrders = hasFeatureAccess(session.user, 'job_orders');
  const canAccessFollowUps = hasFeatureAccess(session.user, 'follow_ups');
  const canAccessInvoices = hasFeatureAccess(session.user, 'invoices');
  const canAccessServices = hasFeatureAccess(session.user, 'services');
  const canAccessProjects = hasFeatureAccess(session.user, 'projects');
  const canAccessExpenses = hasFeatureAccess(session.user, 'expenses');
  const canAccessReports = hasFeatureAccess(session.user, 'reports');

  return (
    <PageContainer>
      {/* Top Welcome Header */}
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session.user.name || 'User'} • Session started ${formattedDate}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold uppercase tracking-wider text-[10px]">
              {userPosition.title}
            </Badge>
            {session.user.branch && (
              <Badge variant="outline" className="text-[11px]">
                {branchName || 'Branch User'}
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            {canAccessFollowUps && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/follow-ups">
                  <IconCalendarClock className="mr-1.5 h-4 w-4" />
                  Follow-ups
                </Link>
              </Button>
            )}
            {canAccessEnquiries && (
              <Button size="sm" asChild>
                <Link href="/enquiries">
                  <IconUsers className="mr-1.5 h-4 w-4" />
                  View Enquiries
                </Link>
              </Button>
            )}
            {!canAccessEnquiries && canAccessJobOrders && (
              <Button size="sm" asChild>
                <Link href="/enquiries/job-orders/pending">
                  <IconBriefcase className="mr-1.5 h-4 w-4" />
                  Job Orders
                </Link>
              </Button>
            )}
            {!canAccessEnquiries && !canAccessJobOrders && canAccessInvoices && (
              <Button size="sm" asChild>
                <Link href="/invoices">
                  <IconFileInvoice className="mr-1.5 h-4 w-4" />
                  Invoices
                </Link>
              </Button>
            )}
            {!canAccessEnquiries && !canAccessJobOrders && !canAccessInvoices && canAccessServices && (
              <Button size="sm" asChild>
                <Link href="/services">
                  <IconFileDollar className="mr-1.5 h-4 w-4" />
                  Service Billing
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Enquiries"
          value={stats.totalEnquiries}
          indicatorColor="amber"
          description="Shows total enquiries by status to track pipeline performance."
          href="/enquiries"
        />
        <KpiCard
          title="New Enquiries"
          value={stats.newEnquiries}
          indicatorColor="emerald"
          description="Fresh enquiries and leads currently being processed."
          trend={stats.newEnquiries > 0 ? { value: stats.newEnquiries, isPositive: true, label: 'new' } : undefined}
          href="/enquiries"
        />
        <KpiCard
          title="Pending Follow-ups"
          value={stats.pendingFollowUps}
          indicatorColor="slate"
          description="Enquiries awaiting action, such as confirmation or callback."
          href="/follow-ups"
        />
        <KpiCard
          title="Total Calls"
          value={stats.totalCalls}
          indicatorColor="purple"
          description="Recorded client conversations and communication logs."
          href="/call-register"
        />
      </div>

      {/* Follow-up Priority Queues */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          title="Overdue Follow-ups"
          value={followUpStats.overdueCount}
          indicatorColor="rose"
          description="Past scheduled interaction window requiring urgent attention."
          href="/follow-ups?filter=overdue"
        />
        <KpiCard
          title="Today's Follow-ups"
          value={followUpStats.todayCount}
          indicatorColor="amber"
          description="Scheduled calls and customer follow-ups queued for today."
          href="/follow-ups?filter=today"
        />
        <KpiCard
          title="Interested Leads"
          value={followUpStats.interestedLeadsCount}
          indicatorColor="emerald"
          description="High-intent prospects expressing strong interest in services."
          href="/enquiries?status=INTERESTED"
        />
      </div>

      {/* Activity & Quick Actions Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <IconTrendingUp className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">Activity Overview (Last 7 Days)</CardTitle>
            </div>
            <CardDescription className="text-xs">Summary of weekly engagement and throughput</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <IconUserPlus className="size-4.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">New Enquiries</p>
                  <p className="text-xs text-muted-foreground">
                    {recentActivity.newEnquiries.count} new leads captured this week
                  </p>
                </div>
              </div>
              <Badge variant="info" className="text-xs font-semibold">{recentActivity.newEnquiries.count}</Badge>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <IconPhoneCall className="size-4.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Calls Made</p>
                  <p className="text-xs text-muted-foreground">
                    {recentActivity.callsMade.count} calls completed by team
                  </p>
                </div>
              </div>
              <Badge variant="success" className="text-xs font-semibold">{recentActivity.callsMade.count}</Badge>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <IconUserCheck className="size-4.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Enrollments</p>
                  <p className="text-xs text-muted-foreground">
                    {recentActivity.enrollments.count} successful conversions
                  </p>
                </div>
              </div>
              <Badge variant="warning" className="text-xs font-semibold">{recentActivity.enrollments.count}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Shortcuts */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Quick Shortcuts</CardTitle>
            <CardDescription className="text-xs">Direct workflow navigations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {canAccessEnquiries && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/enquiries">
                  <IconEye className="mr-2.5 size-4 text-muted-foreground" />
                  View All Enquiries
                </Link>
              </Button>
            )}

            {canAccessJobOrders && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/enquiries/job-orders/pending">
                  <IconBriefcase className="mr-2.5 size-4 text-muted-foreground" />
                  Pending Job Orders
                </Link>
              </Button>
            )}

            {canAccessFollowUps && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/follow-ups?filter=today">
                  <IconCalendarClock className="mr-2.5 size-4 text-muted-foreground" />
                  Today&apos;s Follow-ups
                </Link>
              </Button>
            )}

            {canAccessInvoices && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/invoices">
                  <IconFileInvoice className="mr-2.5 size-4 text-muted-foreground" />
                  Invoices & Payments
                </Link>
              </Button>
            )}

            {canAccessServices && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/services">
                  <IconFileDollar className="mr-2.5 size-4 text-muted-foreground" />
                  Service Billing
                </Link>
              </Button>
            )}

            {canAccessProjects && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/admissions">
                  <IconUserCheck className="mr-2.5 size-4 text-muted-foreground" />
                  Site Surveys & Projects
                </Link>
              </Button>
            )}

            {canAccessReports && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/reports">
                  <IconTrendingUp className="mr-2.5 size-4 text-muted-foreground" />
                  Analytics & Reports
                </Link>
              </Button>
            )}

            {canAccessExpenses && (
              <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                <Link href="/expenses">
                  <IconReceipt className="mr-2.5 size-4 text-muted-foreground" />
                  Expense Tracker
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary Metrics */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Conversion & Performance Summary</CardTitle>
          <CardDescription className="text-xs">Live conversion rates and aggregate engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Assigned Pipeline"
              value={performanceMetrics.totalEnquiries}
              indicatorColor="blue"
              description="Total active enquiries currently in pipeline"
              showChevron={false}
            />
            <KpiCard
              title="Interest Rate"
              value={`${performanceMetrics.interestRate}%`}
              indicatorColor="emerald"
              description="High-intent prospects showing interest"
              showChevron={false}
            />
            <KpiCard
              title="Conversion Rate"
              value={`${performanceMetrics.conversionRate}%`}
              indicatorColor="amber"
              description="Completed admissions and closed orders"
              showChevron={false}
            />
            <KpiCard
              title="Calls Logged"
              value={performanceMetrics.totalCalls}
              indicatorColor="purple"
              description="Total call sessions recorded in register"
              showChevron={false}
            />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
