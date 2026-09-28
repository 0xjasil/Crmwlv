import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDashboardData } from '@/lib/actions/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
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
    const branch = await prisma.branch.findUnique({
      where: { id: session.user.branch },
      select: { name: true },
    });
    branchName = branch?.name;
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

  return (
    <PageContainer>
      {/* Top Welcome Header */}
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session.user.name || 'User'} • Session started ${formattedDate}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold uppercase tracking-wider text-[10px]">
              {session.user.role?.toUpperCase() || 'TELECALLER'}
            </Badge>
            {session.user.role === 'executive' && session.user.branch && (
              <Badge variant="outline" className="text-[11px]">
                {branchName || session.user.branch}
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/follow-ups">
                <IconCalendarClock className="mr-1.5 h-4 w-4" />
                Follow-ups
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/enquiries">
                <IconUsers className="mr-1.5 h-4 w-4" />
                View Enquiries
              </Link>
            </Button>
          </>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Enquiries"
          value={stats.totalEnquiries}
          description="All captured lead records"
          icon={<IconUsers className="size-5 text-blue-600 dark:text-blue-400" />}
          href="/enquiries"
        />
        <KpiCard
          title="New Enquiries"
          value={stats.newEnquiries}
          description="Unassigned & fresh leads"
          icon={<IconUserPlus className="size-5 text-emerald-600 dark:text-emerald-400" />}
          href="/enquiries"
        />
        <KpiCard
          title="Pending Follow-ups"
          value={stats.pendingFollowUps}
          description="Awaiting telecaller action"
          icon={<IconClock className="size-5 text-amber-600 dark:text-amber-400" />}
          href="/follow-ups"
        />
        <KpiCard
          title="Total Calls"
          value={stats.totalCalls}
          description="Recorded interactions"
          icon={<IconPhone className="size-5 text-purple-600 dark:text-purple-400" />}
          href="/call-register"
        />
      </div>

      {/* Follow-up Priority Queues */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-rose-200/80 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                  <IconAlertCircle className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold text-rose-950 dark:text-rose-200">
                  Overdue Follow-ups
                </CardTitle>
              </div>
              <Badge variant="destructive" className="text-[10px]">Action Needed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold tracking-tight text-rose-700 dark:text-rose-400">
                {followUpStats.overdueCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-rose-200 bg-card hover:bg-rose-100/80 dark:border-rose-800"
                asChild
              >
                <Link href="/follow-ups?filter=overdue">
                  View Queue <IconArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
            <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-2 font-medium">
              Past scheduled interaction window
            </p>
          </CardContent>
        </Card>

        <Card className="border border-amber-200/80 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                  <IconCalendar className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                  Today&apos;s Follow-ups
                </CardTitle>
              </div>
              <Badge variant="warning" className="text-[10px]">Today</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
                {followUpStats.todayCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-amber-200 bg-card hover:bg-amber-100/80 dark:border-amber-800"
                asChild
              >
                <Link href="/follow-ups?filter=today">
                  View Queue <IconArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-2 font-medium">
              Scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <IconTarget className="size-4" />
                </div>
                <CardTitle className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                  Interested Leads
                </CardTitle>
              </div>
              <Badge variant="success" className="text-[10px]">High Intent</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                {followUpStats.interestedLeadsCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-emerald-200 bg-card hover:bg-emerald-100/80 dark:border-emerald-800"
                asChild
              >
                <Link href="/my-enquiries?status=interested">
                  View Queue <IconArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-2 font-medium">
              Ready for enrollment conversion
            </p>
          </CardContent>
        </Card>
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
            {session.user.role === 'telecaller' ? (
              <>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/my-enquiries">
                    <IconEye className="mr-2.5 size-4 text-muted-foreground" />
                    View My Enquiries
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/follow-ups?filter=today">
                    <IconCalendarClock className="mr-2.5 size-4 text-muted-foreground" />
                    Today&apos;s Follow-ups
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/call-register">
                    <IconPhoneCall className="mr-2.5 size-4 text-muted-foreground" />
                    Call Register
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/follow-ups?filter=overdue">
                    <IconClockExclamation className="mr-2.5 size-4 text-muted-foreground" />
                    Overdue Follow-ups
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/enquiries">
                    <IconEye className="mr-2.5 size-4 text-muted-foreground" />
                    View All Enquiries
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/follow-ups">
                    <IconCalendarClock className="mr-2.5 size-4 text-muted-foreground" />
                    Follow-ups Manager
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/admissions">
                    <IconUserCheck className="mr-2.5 size-4 text-muted-foreground" />
                    Admissions & Receipts
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/reports">
                    <IconTrendingUp className="mr-2.5 size-4 text-muted-foreground" />
                    Analytics & Reports
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 rounded-lg hover:bg-muted text-sm font-medium" asChild>
                  <Link href="/expenses">
                    <IconReceipt className="mr-2.5 size-4 text-muted-foreground" />
                    Expense Tracker
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary Metrics */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Conversion & Performance Summary</CardTitle>
          <CardDescription className="text-xs">Live conversion rates and aggregate engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-center">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {performanceMetrics.totalEnquiries}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Assigned Enquiries</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-center">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {performanceMetrics.interestRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Interest Rate</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-center">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {performanceMetrics.conversionRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Conversion Rate</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-center">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {performanceMetrics.totalCalls}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Total Calls Logged</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
