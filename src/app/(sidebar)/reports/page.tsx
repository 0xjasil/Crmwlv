import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getReportDashboardData } from '@/server/actions/report-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconUsers,
  IconBuilding,
  IconCash,
  IconReceipt,
  IconChartBar,
  IconTrendingUp,
  IconAlertTriangle,
  IconArrowRight,
  IconFileAnalytics,
} from '@tabler/icons-react';
import { PageContainer, PageHeader } from '@/components/ui/page-header';

export default async function ReportsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  // Get dashboard data
  const dashboardResult = await getReportDashboardData({});

  if (!dashboardResult?.data) {
    throw new Error('Failed to load dashboard data');
  }

  const dashboardData = dashboardResult.data;
  const userRole = session.user.role || 'telecaller';

  // Define all available reports with their details
  const allReports = [
    {
      id: 'telecaller',
      title: 'Telecaller Performance',
      description:
        'Individual telecaller call metrics, lead conversion rates, and monthly productivity KPIs.',
      icon: IconUsers,
      href: '/reports/telecaller',
      features: [
        'Performance Metrics',
        'Conversion Analysis',
        'Call Statistics',
        'Follow-up Tracking',
      ],
      accessRoles: ['admin', 'executive', 'telecaller'],
    },
    {
      id: 'branch',
      title: 'Branch Analytics',
      description:
        'Cross-branch performance benchmarking, regional lead distribution, and center volume.',
      icon: IconBuilding,
      href: '/reports/branch',
      features: [
        'Branch Comparison',
        'Regional Performance',
        'Enquiry Distribution',
        'Revenue Analysis',
      ],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'admission-payment',
      title: 'Admission Payments',
      description:
        'Student course fee collection status, payment method breakdown, and outstanding balance tracking.',
      icon: IconCash,
      href: '/reports/admission-payment',
      features: [
        'Course Fee Tracking',
        'Outstanding Balances',
        'Collection Reports',
        'Payment History',
      ],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'expense',
      title: 'Expense Analysis',
      description:
        'Operational expense tracking, category breakdowns, vendor disbursements, and cost optimization.',
      icon: IconReceipt,
      href: '/reports/expense',
      features: ['Category Breakdown', 'Cost Analysis', 'Budget Tracking', 'Trend Analysis'],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'invoice',
      title: 'Invoice Reports',
      description:
        'Billed invoice lifecycles, payment timelines, client aging analysis, and receivable forecasts.',
      icon: IconChartBar,
      href: '/reports/invoice',
      features: ['Status Tracking', 'Payment Timeline', 'Aging Analysis', 'Revenue Reports'],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'income',
      title: 'Income Analysis',
      description:
        'Commercial revenue performance, corporate service billings, and multi-stream earnings.',
      icon: IconTrendingUp,
      href: '/reports/income',
      features: ['Invoice Revenue', 'Growth Analysis', 'Source Distribution', 'Trend Forecasting'],
      accessRoles: ['admin', 'executive'],
    },
    {
      id: 'pending-payment',
      title: 'Pending Payments',
      description:
        'Actionable ledger of overdue student installments and unpaid client service bills.',
      icon: IconAlertTriangle,
      href: '/reports/pending-payment',
      features: [
        'Outstanding Tracking',
        'Aging Analysis',
        'Collection Targets',
        'Priority Management',
      ],
      accessRoles: ['admin', 'executive', 'telecaller'],
    },
  ];

  const accessibleReports = allReports.filter((report) => report.accessRoles.includes(userRole));

  return (
    <PageContainer>
      <PageHeader
        title="Reports & Intelligence"
        description="Comprehensive operational analytics, telecaller benchmarks, and financial metrics."
      />

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardData.summaryCards.map((card, index) => (
          <div key={index} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {card.icon === 'Users' && <IconUsers className="h-4 w-4" />}
                {card.icon === 'UserCheck' && <IconUsers className="h-4 w-4" />}
                {card.icon === 'TrendingUp' && <IconTrendingUp className="h-4 w-4" />}
                {card.icon === 'TrendingDown' && <IconTrendingUp className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{card.value}</div>
            {card.trend && (
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                <span
                  className={`font-semibold ${
                    card.trend.type === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {card.trend.value}
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Launchpad */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <IconFileAnalytics className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Direct Access Shortcuts
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {accessibleReports.map((report) => (
            <Button
              key={report.id}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium hover:bg-muted/60"
              asChild
            >
              <Link href={report.href}>
                <report.icon className="h-3.5 w-3.5 text-primary" />
                <span>{report.title}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Available Reports Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Available Dashboards</h2>
          <Badge variant="secondary" className="text-xs font-medium">
            {accessibleReports.length} modules active
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accessibleReports.map((report) => {
            const IconComponent = report.icon;
            return (
              <Card
                key={report.id}
                className="group border-border/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase text-muted-foreground">
                      {report.id}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="rounded-lg bg-muted/30 p-2.5 border border-border/40">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Included Modules
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {report.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-1">
                    <Button
                      asChild
                      size="sm"
                      className="w-full h-8 text-xs font-medium justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                    >
                      <Link href={report.href}>
                        <span>Launch Analytics</span>
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}

