import prisma from '@/lib/prisma';
import { EnquiryStatus, FollowUpStatus } from '@prisma/client';
import { DashboardData } from '@/types/dashboard';
import { cacheService } from '@/lib/cache/cache-service';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/cache-keys';

export async function getDashboardData(
  userId?: string,
  userRole?: string,
  userBranch?: string
): Promise<DashboardData> {
  // Determine isolated cache scope
  let scope = 'admin';
  if (userRole === 'telecaller' && userId) {
    scope = `telecaller:${userId}`;
  } else if (userRole === 'executive' && userBranch) {
    scope = `executive:${userBranch}`;
  }

  const cacheKey = CACHE_KEYS.dashboardSummary(scope);

  return await cacheService.getOrSet(cacheKey, CACHE_TTL.DASHBOARD, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get the date 7 days ago for recent activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Base filter for user-specific data
    let userFilter: Record<string, string> = {};

    // For telecallers, filter by assigned enquiries
    if (userRole === 'telecaller' && userId) {
      userFilter = { assignedToUserId: userId };
    }

    // For executives, filter by branch
    if (userRole === 'executive' && userBranch) {
      userFilter = { branchId: userBranch };
    }

  // For admins, no filtering (see all data)

  // Get basic enquiry stats
  const [
    totalEnquiries,
    newEnquiriesCount,
    totalCalls,
    overdueFollowUps,
    todayFollowUps,
    interestedLeads,
    recentCallLogs,
    enrolledEnquiries,
  ] = await Promise.all([
    // Total enquiries
    prisma.enquiry.count({
      where: userFilter,
    }),

    // New enquiries (created in last 7 days)
    prisma.enquiry.count({
      where: {
        ...userFilter,
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // Total calls
    prisma.callLog.count({
      where: {
        enquiry: userFilter,
      },
    }),

    // Overdue follow-ups
    prisma.followUp.count({
      where: {
        enquiry: userFilter,
        status: FollowUpStatus.PENDING,
        scheduledAt: { lt: today },
      },
    }),

    // Today's follow-ups
    prisma.followUp.count({
      where: {
        enquiry: userFilter,
        status: FollowUpStatus.PENDING,
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    }),

    // Interested leads
    prisma.enquiry.count({
      where: {
        ...userFilter,
        status: EnquiryStatus.INTERESTED,
      },
    }),

    // Recent call logs (last 7 days)
    prisma.callLog.count({
      where: {
        enquiry: userFilter,
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // Enrollments (last 7 days)
    prisma.enquiry.count({
      where: {
        ...userFilter,
        status: EnquiryStatus.ENROLLED,
        updatedAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  // Calculate performance metrics
  const interestRate = totalEnquiries > 0 ? (interestedLeads / totalEnquiries) * 100 : 0;
  const conversionRate = totalEnquiries > 0 ? (enrolledEnquiries / totalEnquiries) * 100 : 0;

    return {
      stats: {
        totalEnquiries,
        newEnquiries: newEnquiriesCount,
        pendingFollowUps: overdueFollowUps + todayFollowUps,
        totalCalls,
      },
      followUpStats: {
        overdueCount: overdueFollowUps,
        todayCount: todayFollowUps,
        interestedLeadsCount: interestedLeads,
      },
      recentActivity: {
        newEnquiries: {
          count: newEnquiriesCount,
          description: `${newEnquiriesCount} new leads`,
        },
        callsMade: {
          count: recentCallLogs,
          description: `${recentCallLogs} calls completed`,
        },
        enrollments: {
          count: enrolledEnquiries,
          description: `${enrolledEnquiries} successful conversions`,
        },
      },
      performanceMetrics: {
        totalEnquiries,
        interestRate: Math.round(interestRate),
        conversionRate: Math.round(conversionRate),
        totalCalls,
      },
    };
  });
}
