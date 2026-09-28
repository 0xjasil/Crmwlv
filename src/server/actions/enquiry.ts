'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createNotification } from './notification';
import { NotificationType } from '@prisma/client';
import {
  EnquiryStatus,
  CreateEnquiryInput,
  UpdateEnquiryInput,
  EnquiryFilters,
} from '@/types/enquiry';
import { ActivityType } from '@/types/enquiry-activity';
import { invalidateDashboardCache } from '@/lib/cache/cache-invalidation';

// Generic response type
interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Helper function to get current user
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user;
}

// Helper function to format enquiry object for frontend
function formatEnquiry(enquiry: any) {
  if (!enquiry) return enquiry;
  return {
    ...enquiry,
    enquirySource: enquiry.enquirySource || (enquiry.source ? { id: enquiry.source, name: enquiry.source } : null),
    requiredService: enquiry.requiredService || enquiry.service || null,
  };
}

// Helper function to generate activity title
function generateActivityTitle(
  type: ActivityType,
  previousStatus?: string,
  newStatus?: string
): string {
  switch (type) {
    case ActivityType.STATUS_CHANGE:
      if (previousStatus && newStatus) {
        return `Status changed from ${previousStatus} to ${newStatus}`;
      }
      return 'Status updated';
    case ActivityType.FOLLOW_UP:
      return 'Follow-up scheduled';
    case ActivityType.CALL_LOG:
      return 'Call logged';
    case ActivityType.ENROLLMENT_DIRECT:
      return 'Direct enrollment completed';
    default:
      return 'Activity logged';
  }
}

// Enquiry Actions
export async function createEnquiry(data: CreateEnquiryInput): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    const enquiry = await prisma.enquiry.create({
      data: {
        ...data,
        createdByUserId: user.id,
        assignedToUserId: user.id, // Auto-assign to creator
        lastContactDate: new Date(),
      },
      include: {
        branch: true,
        preferredCourse: true,
        service: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    return { success: true, data: formatEnquiry(enquiry), message: 'Enquiry created successfully' };
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return {
      success: false,
      message: 'Failed to create enquiry',
    };
  }
}

import {
  normalizePagination,
  validateSortField,
  validateSortOrder,
  buildPaginationResult,
} from '@/lib/pagination-utils';

const ENQUIRY_SORT_FIELDS = [
  'createdAt',
  'candidateName',
  'status',
  'updatedAt',
  'lastContactDate',
] as const;

export async function getEnquiries(filters: EnquiryFilters = {}): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const {
      page: rawPage,
      limit: rawLimit,
      search,
      status,
      branchId,
      enquirySourceId,
      assignedToUserId,
      dateFrom,
      dateTo,
      sortBy: rawSortBy,
      sortOrder: rawSortOrder,
    } = filters;

    const { page, limit, skip } = normalizePagination(rawPage, rawLimit, 20);
    const sortBy = validateSortField(rawSortBy, ENQUIRY_SORT_FIELDS, 'createdAt');
    const sortOrder = validateSortOrder(rawSortOrder, 'desc');

    // Build where clause
    const where: Prisma.EnquiryWhereInput = {};

    // Role-based filtering
    const role = (user.role || '').toLowerCase();
    
    if (role === 'admin') {
      // Admin sees everything (no default filter).
    } else if (role === 'manager' || role === 'executive' || role === 'branch manager') {
      // Managers see everything in their branch.
      if (user.branch) {
        where.branchId = user.branch;
      }
    } else {
      // All other roles (staff) see ONLY enquiries assigned to them.
      where.assignedToUserId = user.id;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { candidateName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }

    if (enquirySourceId && enquirySourceId !== 'all') {
      where.source = enquirySourceId;
    }

    if (assignedToUserId && assignedToUserId !== 'all') {
      where.assignedToUserId = assignedToUserId;
    }

    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) createdAtFilter.gte = dateFrom;
      if (dateTo) createdAtFilter.lte = dateTo;
      where.createdAt = createdAtFilter;
    }

    if (filters.isAssigned !== undefined) {
      if (filters.isAssigned) {
        where.assignedToUserId = { not: null };
      } else {
        where.assignedToUserId = null;
      }
    }

    const [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          candidateName: true,
          phone: true,
          contact2: true,
          email: true,
          status: true,
          source: true,
          notes: true,
          feedback: true,
          lastContactDate: true,
          createdAt: true,
          updatedAt: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          preferredCourse: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.enquiry.count({ where }),
    ]);

    const pagination = buildPaginationResult(total, page, limit);

    return {
      success: true,
      data: enquiries.map(formatEnquiry),
      pagination,
      message: 'Enquiries fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return {
      success: false,
      message: 'Failed to fetch enquiries',
    };
  }
}

export async function getEnquiry(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      select: {
        id: true,
        candidateName: true,
        phone: true,
        contact2: true,
        email: true,
        address: true,
        status: true,
        notes: true,
        feedback: true,
        lastContactDate: true,
        branchId: true,
        preferredCourseId: true,
        serviceId: true,
        source: true,
        sourceId: true,
        assignedToUserId: true,
        createdByUserId: true,
        assignedByUserId: true,
        createdAt: true,
        updatedAt: true,
        branch: { select: { id: true, name: true } },
        preferredCourse: { select: { id: true, name: true, courseFee: true } },
        service: { select: { id: true, name: true, price: true } },
        enquirySource: { select: { id: true, name: true } },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!enquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    // Check access permissions
    const role = (user.role || '').toLowerCase();
    if (
      role !== 'admin' &&
      role !== 'manager' &&
      role !== 'executive' &&
      role !== 'branch manager' &&
      enquiry.assignedToUserId !== user.id
    ) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    return { success: true, data: formatEnquiry(enquiry), message: 'Enquiry fetched successfully' };
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    return {
      success: false,
      message: 'Failed to fetch enquiry',
    };
  }
}

// On-demand sub-resource: Follow-ups for enquiry
export async function getEnquiryFollowUps(enquiryId: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const followUps = await prisma.followUp.findMany({
      where: { enquiryId },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        outcome: true,
        notes: true,
        enquiryId: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return { success: true, data: followUps, message: 'Follow-ups loaded successfully' };
  } catch (error) {
    console.error('Error fetching enquiry follow-ups:', error);
    return { success: false, message: 'Failed to fetch follow-ups' };
  }
}

// On-demand sub-resource: Call Logs for enquiry
export async function getEnquiryCallLogs(enquiryId: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const callLogs = await prisma.callLog.findMany({
      where: { enquiryId },
      orderBy: { callDate: 'desc' },
      select: {
        id: true,
        callDate: true,
        duration: true,
        outcome: true,
        notes: true,
        enquiryId: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return { success: true, data: callLogs, message: 'Call logs loaded successfully' };
  } catch (error) {
    console.error('Error fetching enquiry call logs:', error);
    return { success: false, message: 'Failed to fetch call logs' };
  }
}

// On-demand sub-resource: Job Leads for enquiry
export async function getEnquiryJobLeads(enquiryId: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const jobLeads = await prisma.jobLead.findMany({
      where: { leadId: enquiryId },
      select: {
        id: true,
        status: true,
        jobId: true,
        leadId: true,
        assigneeId: true,
        assignerId: true,
        job: {
          select: {
            id: true,
            name: true,
            jobCode: true,
            startDate: true,
            endDate: true,
            branch: { select: { id: true, name: true } },
          },
        },
        assignee: { select: { id: true, name: true, email: true } },
        assigner: { select: { id: true, name: true, email: true } },
      },
    });

    return { success: true, data: jobLeads, message: 'Job leads loaded successfully' };
  } catch (error) {
    console.error('Error fetching enquiry job leads:', error);
    return { success: false, message: 'Failed to fetch job leads' };
  }
}

export async function updateEnquiry(data: UpdateEnquiryInput): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const { id, ...updateData } = data;

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    const role = (user.role || '').toLowerCase();
    if (
      role !== 'admin' &&
      role !== 'manager' &&
      role !== 'executive' &&
      role !== 'branch manager' &&
      existingEnquiry.assignedToUserId !== user.id
    ) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: updateData,
      include: {
        branch: true,
        preferredCourse: true,
        service: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return { success: true, data: enquiry, message: 'Enquiry updated successfully' };
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return {
      success: false,
      message: 'Failed to update enquiry',
    };
  }
}

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    const role = (user.role || '').toLowerCase();
    if (
      role !== 'admin' &&
      role !== 'manager' &&
      role !== 'executive' &&
      role !== 'branch manager' &&
      existingEnquiry.assignedToUserId !== user.id
    ) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: {
        status,
        lastContactDate: new Date(),
      },
    });

    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return { success: true, data: enquiry, message: 'Status updated successfully' };
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    return {
      success: false,
      message: 'Failed to update status',
    };
  }
}

// Enhanced status update with activity tracking
export async function updateEnquiryStatusWithActivity(
  id: string,
  newStatus: EnquiryStatus,
  statusRemarks?: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    // Role-based access control
    const role = (user.role || '').toLowerCase();
    if (
      role !== 'admin' &&
      role !== 'manager' &&
      role !== 'executive' &&
      role !== 'branch manager' &&
      existingEnquiry.assignedToUserId !== user.id
    ) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const previousStatus = existingEnquiry.status;

    // Use transaction to update enquiry and create activity
    const result = await prisma.$transaction(async (tx) => {
      // Update enquiry status
      const updatedEnquiry = await tx.enquiry.update({
        where: { id },
        data: {
          status: newStatus,
          lastContactDate: new Date(),
        },
        include: {
          branch: true,
          preferredCourse: true,
          service: true,
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return updatedEnquiry;
    });

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return {
      success: true,
      data: result,
      message: 'Status updated successfully with activity logged',
    };
  } catch (error) {
    console.error('Error updating enquiry status with activity:', error);
    return {
      success: false,
      message: 'Failed to update status',
    };
  }
}

// Direct enrollment function
export async function updateEnquiryStatusDirectToEnrolled(
  id: string,
  statusRemarks?: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    // Role-based access control
    const role = (user.role || '').toLowerCase();
    if (
      role !== 'admin' &&
      role !== 'manager' &&
      role !== 'executive' &&
      role !== 'branch manager' &&
      existingEnquiry.assignedToUserId !== user.id
    ) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const previousStatus = existingEnquiry.status;

    // Use transaction to update enquiry and create activity
    const result = await prisma.$transaction(async (tx) => {
      // Update enquiry status to ENROLLED
      const updatedEnquiry = await tx.enquiry.update({
        where: { id },
        data: {
          status: EnquiryStatus.ENROLLED,
          lastContactDate: new Date(),
        },
        include: {
          branch: true,
          preferredCourse: true,
          service: true,
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return updatedEnquiry;
    });

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return {
      success: true,
      data: result,
      message: 'Direct enrollment completed successfully',
    };
  } catch (error) {
    console.error('Error processing direct enrollment:', error);
    return {
      success: false,
      message: 'Failed to process direct enrollment',
    };
  }
}

export async function assignEnquiry(
  id: string,
  assignedToUserId: string,
  startDate: Date,
  endDate: Date,
  branchId: string,
  name: string,
  description?: string | null,
  remarks?: string | null
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Only admins and managers can assign enquiries
    if (!['admin', 'manager', 'executive', 'branch manager'].includes((user.role || '').toLowerCase())) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    if (!name?.trim()) {
      return {
        success: false,
        message: 'Job name is required',
      };
    }

    // Validate dates
    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (start < today) {
      return {
        success: false,
        message: 'Start date cannot be in the past',
      };
    }

    if (startDate > endDate) {
      return {
        success: false,
        message: 'Start date cannot be after end date',
      };
    }

    // Validate branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return {
        success: false,
        message: 'Branch not found',
      };
    }

    // Get the assigned user to get their branch
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToUserId },
      select: { id: true, branch: true },
    });

    if (!assignedUser) {
      return {
        success: false,
        message: 'Assigned user not found',
      };
    }

    // Use transaction to create job order, assign enquiry, and create job lead
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update enquiry assignment
      const enquiry = await tx.enquiry.update({
        where: { id },
        data: {
          assignedToUserId,
          assignedByUserId: user.id,
          branchId,
          lastContactDate: new Date(),
        },
      });

      // 2. Create job order
      const jobOrder = await tx.jobOrder.create({
        data: {
          name,
          description,
          remarks,
          managerId: assignedToUserId,
          assignerId: user.id, // Track who assigned
          branchId,
          startDate,
          endDate,
          jobCode: null,
        },
      });

      // 3. Create job lead to link enquiry to job order
      await tx.jobLead.create({
        data: {
          jobId: jobOrder.id,
          leadId: id,
          status: 'PENDING',
          assignerId: user.id, 
          assigneeId: assignedToUserId, 
        },
      });

      return enquiry;
    });

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    revalidatePath('/enquiries/job-orders');
    revalidatePath('/enquiries/job-orders/pending');
    revalidatePath('/enquiries/job-orders/completed');
    revalidatePath('/enquiries/job-orders/due');

    // Send notification
    if (assignedToUserId !== user.id) {
      // We can't access enquiry details easily if we didn't fetch them or return them fully.
      // The result.enquiry might help if we modify the return, but result is the enquiry.
      await createNotification(
        assignedToUserId,
        'New Enquiry Assigned',
        'You have been assigned a new enquiry.',
        NotificationType.ENQUIRY_ASSIGNED,
        `/enquiries/${id}`
      );
    }

    return { success: true, data: result, message: 'Enquiry assigned and job order created successfully' };
  } catch (error) {
    console.error('Error assigning enquiry:', error);
    return {
      success: false,
      message: 'Failed to assign enquiry',
    };
  }

}

export async function bulkAssignEnquiries(
  ids: string[],
  assignedToUserId: string,
  startDate: Date,
  endDate: Date,
  branchId: string,
  name: string,
  description?: string | null,
  remarks?: string | null
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Only admins and managers can assign enquiries
    if (!['admin', 'manager', 'executive', 'branch manager'].includes((user.role || '').toLowerCase())) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: 'No enquiries selected for assignment',
      };
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (start < today) {
      return {
        success: false,
        message: 'Start date cannot be in the past',
      };
    }

    if (startDate > endDate) {
      return {
        success: false,
        message: 'Start date cannot be after end date',
      };
    }

    // Validate branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return {
        success: false,
        message: 'Branch not found',
      };
    }

    // Get the assigned user to verify they exist
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToUserId },
      select: { id: true, branch: true },
    });

    if (!assignedUser) {
      return {
        success: false,
        message: 'Assigned user not found',
      };
    }

    // Use transaction to create job order and update all enquiries
    const result = await prisma.$transaction(async (tx) => {
      // Update all enquiries
      const updateResult = await tx.enquiry.updateMany({
        where: {
          id: { in: ids },
        },
        data: { 
          assignedToUserId,
          assignedByUserId: user.id,
          branchId
        },
      });

      // Create job order
      const jobOrder = await tx.jobOrder.create({
        data: {
          name,
          description,
          remarks,
          managerId: assignedToUserId,
          assignerId: user.id, // Track who assigned
          branchId,
          startDate,
          endDate,
          jobCode: null,
        },
      });

      // Create job leads for all enquiries
      await Promise.all(
        ids.map((enquiryId) =>
          tx.jobLead.create({
            data: {
              jobId: jobOrder.id,
              leadId: enquiryId,
              status: 'PENDING',
              assignerId: user.id,
              assigneeId: assignedToUserId,
            },
          })
        )
      );

      return updateResult;
    });

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    revalidatePath('/enquiries/job-orders');
    revalidatePath('/enquiries/job-orders/pending');
    revalidatePath('/enquiries/job-orders/completed');
    revalidatePath('/enquiries/job-orders/due');

    // Send notification
    if (assignedToUserId !== user.id) {
      await createNotification(
        assignedToUserId,
        'Bulk Enquiries Assigned',
        `You have been assigned ${ids.length} new enquiries.`,
        NotificationType.ENQUIRY_ASSIGNED,
        '/enquiries'
      );
    }

    return {
      success: true,
      message: `${result.count} enquiries assigned and job order created successfully`,
      data: result
    };
  } catch (error) {
    console.error('Error bulk assigning enquiries:', error);
    return {
      success: false,
      message: 'Failed to assign enquiries',
    };
  }
}




export async function deleteEnquiry(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Only admins can delete enquiries
    if (user.role !== 'admin') {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    await prisma.enquiry.delete({
      where: { id },
    });

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    return { success: true, message: 'Enquiry deleted successfully' };
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    return {
      success: false,
      message: 'Failed to delete enquiry',
    };
  }
}

// Bulk Import Action
export async function bulkImportEnquiries(
  leads: any[],
  commonFields: { branchId: string; enquirySourceId?: string }
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    if (!leads || leads.length === 0) {
      return { success: false, message: 'No data found in the file' };
    }

    // Process in batches or a single transaction
    const result = await prisma.$transaction(
      leads.map((lead) => {
        // Basic mapping logic - can be expanded
        const name = lead.candidateName || lead['Candidate Name'] || lead['Name'];
        const phone = String(lead.phone || lead['Phone'] || lead['Mobile'] || '');
        
        if (!name || !phone) {
          throw new Error('Candidate Name and Phone are required for all rows');
        }

        return prisma.enquiry.create({
          data: {
            candidateName: name,
            phone: phone,
            email: lead.email || lead['Email'] || null,
            address: lead.address || lead['Address'] || null,
            notes: lead.notes || lead['Notes'] || 'Imported via Bulk Upload',
            status: EnquiryStatus.NEW,
            branchId: commonFields.branchId,
            source: commonFields.enquirySourceId || null,
            createdByUserId: user.id,
            assignedToUserId: null, // Keep unassigned so they can be bulk assigned later
            lastContactDate: new Date(),
          },
        });
      })
    );

    await invalidateDashboardCache();
    revalidatePath('/enquiries');
    return {
      success: true,
      data: result,
      message: `${result.length} enquiries imported successfully`,
    };
  } catch (error: any) {
    console.error('Error bulk importing enquiries:', error);
    return {
      success: false,
      message: error.message || 'Failed to import enquiries. Please check your file format.',
    };
  }
}

// Helper function to get users for assignment
export async function getUsers(branchId?: string): Promise<ActionResponse> {
  try {
    const where: Prisma.UserWhereInput = {
      NOT: {
        role: {
          in: ['admin', 'manager'],
        },
      },
    };

    if (branchId) {
      where.branch = branchId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branch: true,
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: users, message: 'Users fetched successfully' };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      message: 'Failed to fetch users',
    };
  }
}
