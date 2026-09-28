import prisma from '@/lib/prisma';
import { FollowUpStatus } from '@prisma/client';
import { ReportsData, EnquiryStatusDistribution, MonthlyTrend } from '@/types/reports';

export async function getReportsData(userId?: string): Promise<ReportsData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Last week and last month dates
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  // Base filter for user-specific data (for telecallers)
  const userFilter = userId ? { assignedToUserId: userId } : {};

  // Get current stats
  const [
    totalEnquiries,
    totalEnquiriesLastMonth,
    newEnquiriesThisWeek,
    newEnquiriesLastWeek,
    pendingFollowUpsToday,
    pendingFollowUpsYesterday,
    callsToday,
    callsYesterday,
  ] = await Promise.all([
    // Total enquiries
    prisma.enquiry.count({
      where: userFilter,
    }),

    // Total enquiries last month
    prisma.enquiry.count({
      where: {
        ...userFilter,
        createdAt: { lt: lastMonth },
      },
    }),

    // New enquiries this week
    prisma.enquiry.count({
      where: {
        ...userFilter,
        createdAt: { gte: lastWeek },
      },
    }),

    // New enquiries last week
    prisma.enquiry.count({
      where: {
        ...userFilter,
        createdAt: {
          gte: new Date(lastWeek.getTime() - 7 * 24 * 60 * 60 * 1000),
          lt: lastWeek,
        },
      },
    }),

    // Pending follow-ups (all pending)
    prisma.followUp.count({
      where: {
        enquiry: userFilter,
        status: FollowUpStatus.PENDING,
      },
    }),

    // Pending follow-ups yesterday
    prisma.followUp.count({
      where: {
        enquiry: userFilter,
        status: FollowUpStatus.PENDING,
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    }),

    // Calls today
    prisma.callLog.count({
      where: {
        enquiry: userFilter,
        callDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    }),

    // Calls yesterday
    prisma.callLog.count({
      where: {
        enquiry: userFilter,
        callDate: {
          gte: yesterday,
          lt: today,
        },
      },
    }),
  ]);

  // Calculate trends
  const totalEnquiriesTrend =
    totalEnquiriesLastMonth > 0
      ? Math.round(((totalEnquiries - totalEnquiriesLastMonth) / totalEnquiriesLastMonth) * 100)
      : 0;

  const newEnquiriesTrend = newEnquiriesThisWeek - newEnquiriesLastWeek;
  const followUpsTrend = pendingFollowUpsToday - pendingFollowUpsYesterday;
  const callsTrend = callsToday - callsYesterday;

  // Get status distribution
  const statusCounts = await prisma.enquiry.groupBy({
    by: ['status'],
    where: userFilter,
    _count: {
      status: true,
    },
  });

  const statusColors: Record<string, string> = {
    NEW: '#3b82f6', // blue
    CONTACTED: '#f59e0b', // amber
    INTERESTED: '#10b981', // emerald
    NOT_INTERESTED: '#ef4444', // red
    ENROLLED: '#06b6d4', // cyan
    FOLLOW_UP: '#f97316', // orange
    DROPPED: '#6b7280', // gray
    INVALID: '#8b5cf6', // violet
  };

  const statusDistribution: EnquiryStatusDistribution[] = statusCounts.map((item) => ({
    status: item.status.replace('_', ' '),
    count: item._count.status,
    percentage:
      totalEnquiries > 0 ? Math.round((item._count.status / totalEnquiries) * 100 * 10) / 10 : 0,
    color: statusColors[item.status] || '#6b7280',
  }));

  // Get monthly trend (last 6 months)
  const monthlyData = await prisma.enquiry.groupBy({
    by: ['createdAt'],
    where: {
      ...userFilter,
      createdAt: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      },
    },
    _count: {
      id: true,
    },
  });

  // Group by month
  const monthlyTrend: MonthlyTrend[] = [];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = months[date.getMonth()];

    const count = monthlyData
      .filter((item) => {
        const itemDate = new Date(item.createdAt);
        return (
          itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear()
        );
      })
      .reduce((sum, item) => sum + item._count.id, 0);

    monthlyTrend.push({
      month: monthName,
      count,
    });
  }

  return {
    stats: {
      totalEnquiries: {
        count: totalEnquiries,
        trend: {
          value: `${totalEnquiriesTrend > 0 ? '+' : ''}${totalEnquiriesTrend}% from last month`,
          type: totalEnquiriesTrend >= 0 ? 'up' : 'down',
        },
      },
      newEnquiries: {
        count: newEnquiriesThisWeek,
        trend: {
          value: `${newEnquiriesTrend > 0 ? '+' : ''}${newEnquiriesTrend} from last week`,
          type: newEnquiriesTrend >= 0 ? 'up' : 'down',
        },
      },
      pendingFollowUps: {
        count: pendingFollowUpsToday,
        trend: {
          value: `${followUpsTrend > 0 ? '+' : ''}${Math.abs(followUpsTrend)} from yesterday`,
          type: followUpsTrend <= 0 ? 'up' : 'down', // Less follow-ups is good
        },
      },
      todaysCalls: {
        count: callsToday,
        trend: {
          value: `${callsTrend > 0 ? '+' : ''}${callsTrend} from yesterday`,
          type: callsTrend >= 0 ? 'up' : 'down',
        },
      },
    },
    statusDistribution,
    monthlyTrend,
  };
}
