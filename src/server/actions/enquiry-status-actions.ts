'use server';

import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { EnquiryStatus } from '@/types/enquiry';
import { ActivityType } from '@/types/enquiry-activity';

// Helper function to get current user
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user;
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
    case ActivityType.ENROLLMENT_DIRECT:
      return 'Direct enrollment completed';
    default:
      return 'Activity logged';
  }
}

// Create safe action client
const action = createSafeActionClient();

// Schema for status update with activity
const statusUpdateSchema = z.object({
  id: z.string().min(1, 'Enquiry ID is required'),
  newStatus: z.nativeEnum(EnquiryStatus),
  statusRemarks: z.string().optional(),
});

// Schema for direct enrollment
const directEnrollmentSchema = z.object({
  id: z.string().min(1, 'Enquiry ID is required'),
  statusRemarks: z.string().optional(),
});

// Safe action for status update with activity tracking
export const updateEnquiryStatusWithActivity = action
  .schema(statusUpdateSchema)
  .action(async ({ parsedInput }) => {
    try {
      const user = await getCurrentUser();
      const { id, newStatus, statusRemarks } = parsedInput;

      // Check if enquiry exists and user has permission
      const existingEnquiry = await prisma.enquiry.findUnique({
        where: { id },
      });

      if (!existingEnquiry) {
        throw new Error('Enquiry not found');
      }

      // Role-based access control
      if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
        throw new Error('Access denied');
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

      revalidatePath('/enquiries');
      revalidatePath(`/enquiries/${id}`);
      return {
        success: true,
        data: result,
        message: 'Status updated successfully with activity logged',
      };
    } catch (error) {
      console.error('Error updating enquiry status with activity:', error);
      throw new Error('Failed to update status');
    }
  });

// Safe action for direct enrollment
export const updateEnquiryStatusDirectToEnrolled = action
  .schema(directEnrollmentSchema)
  .action(async ({ parsedInput }) => {
    try {
      const user = await getCurrentUser();
      const { id, statusRemarks } = parsedInput;

      // Check if enquiry exists and user has permission
      const existingEnquiry = await prisma.enquiry.findUnique({
        where: { id },
      });

      if (!existingEnquiry) {
        throw new Error('Enquiry not found');
      }

      // Role-based access control
      if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
        throw new Error('Access denied');
      }

      // Use transaction to update enquiry
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

      revalidatePath('/enquiries');
      revalidatePath(`/enquiries/${id}`);
      return {
        success: true,
        data: result,
        message: 'Direct enrollment completed successfully',
      };
    } catch (error) {
      console.error('Error processing direct enrollment:', error);
      throw new Error('Failed to process direct enrollment');
    }
  });