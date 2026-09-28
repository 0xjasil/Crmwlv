"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { actionClient, adminActionClient } from "@/lib/safe-action";
import {
  AdmissionGender,
  AdmissionStatus,
  AdmissionCreateData,
} from "@/types/admission";
import { Prisma } from "@prisma/client";
import { calculateBalance, calculateTotalFee } from "@/lib/fee-utils";
import { cacheService } from "@/lib/cache/cache-service";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/cache/cache-keys";
import { invalidateDashboardCache } from "@/lib/cache/cache-invalidation";

// Helper function to get current user
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

const agentRoles = ["manager", "admin","counsellor"];

// Helper function to generate admission number
function generateAdmissionNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `ADM-${year}${month}${day}-${random}`;
}

// Validation schemas
const createAdmissionSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.nativeEnum(AdmissionGender).optional(),
  dateOfBirth: z.date().optional(),
  address: z.string().min(1, "Address is required"),
  leadSource: z.string().optional(),
  lastQualification: z.string().optional(),
  yearOfPassing: z.number().min(1950).max(new Date().getFullYear()).optional(),
  percentageCGPA: z.string().optional(),
  instituteName: z.string().optional(),
  additionalNotes: z.string().optional(),
  courseId: z.string().min(1, "Course selection is required"),
  agentName: z.string().optional(),
  agentCommission: z.number().min(0).optional(),
  enquiryId: z.string().optional(),
  createdAt : z.date().optional()
});

const updateAdmissionSchema = z.object({
  id: z.string().min(1, "Admission ID is required"),
  candidateName: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.nativeEnum(AdmissionGender).optional(),
  dateOfBirth: z.date().optional(),
  address: z.string().optional(),
  agentName: z.string().optional(),
  agentCommission: z.number().min(0).optional(),
  leadSource: z.string().optional(),
  lastQualification: z.string().optional(),
  yearOfPassing: z.number().min(1950).max(new Date().getFullYear()).optional(),
  percentageCGPA: z.string().optional(),
  instituteName: z.string().optional(),
  additionalNotes: z.string().optional(),
  courseId: z.string().optional(),
  createdAt : z.date().optional(),
  status: z.nativeEnum(AdmissionStatus).optional(),
  enquiryId: z.string().optional(),
});

const deleteAdmissionSchema = z.object({
  id: z.string().min(1, "Admission ID is required"),
});

const getAdmissionsSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.nativeEnum(AdmissionStatus).optional(),
  branchId: z.string().optional(),
  courseId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

const getAdmissionByIdSchema = z.object({
  id: z.string().min(1, "Admission ID is required"),
});

const getAdmissionsByEnquirySchema = z.object({
  enquiryId: z.string().min(1, "Enquiry ID is required"),
});

// Safe action for creating admission
export const createAdmission = actionClient
  .schema(createAdmissionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const user = await getCurrentUser();

      // Get course details
      const course = await prisma.course.findUnique({
        where: { id: parsedInput.courseId },
        select: {
          id: true,
          name: true,
          admissionFee: true,
          courseFee: true,
          semesterFee: true,
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Generate unique admission number
      let admissionNumber: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        admissionNumber = generateAdmissionNumber();
        const existing = await prisma.admission.findUnique({
          where: { admissionNumber },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error("Could not generate unique admission number");
      }

      const eligibleForAgentCommission = user.role && agentRoles.includes(user?.role?.toLocaleLowerCase());

      if(!eligibleForAgentCommission && (parsedInput.agentName || parsedInput.agentCommission)){
        throw new Error("You don't have permission to add agent details");
      }

      // Prepare data object with conditional fields
      const admissionData: AdmissionCreateData = {
        admissionNumber,
        candidateName: parsedInput.candidateName,
        mobileNumber: parsedInput.mobileNumber,
        email: parsedInput.email || null,
        gender: parsedInput.gender || null,
        dateOfBirth: parsedInput.dateOfBirth || null,
        address: parsedInput.address,
        leadSource: parsedInput.leadSource || null,
        lastQualification: parsedInput.lastQualification || null,
        yearOfPassing: parsedInput.yearOfPassing || null,
        percentageCGPA: parsedInput.percentageCGPA || null,
        instituteName: parsedInput.instituteName || null,
        additionalNotes: parsedInput.additionalNotes || null,
        createdAt: parsedInput.createdAt || new Date(),
        ...(eligibleForAgentCommission ? { agentName: parsedInput.agentName, agentCommission: parsedInput.agentCommission , handledBy:{connect:{id:user.id}} } : {}),
        status: AdmissionStatus.PENDING,
        course: {
          connect: { id: parsedInput.courseId },
        },
        createdBy: {
          connect: { id: user.id },
        },
        balance: calculateTotalFee({...course,agentCommission: parsedInput.agentCommission || 0}),
      };

      // Add enquiryId only if it exists
      if (parsedInput.enquiryId) {
        admissionData.enquiry = { connect: { id: parsedInput.enquiryId } };
      }

      const admission = await prisma.admission.create({
        data: admissionData,
        include: {
          course: {
            select: {
              id: true,
              name: true,
            },
          },
          enquiry: {
            select: {
              id: true,
              candidateName: true,
              phone: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await invalidateDashboardCache();
      revalidatePath("/admissions");
      return {
        success: true,
        data: admission,
        message: "Admission created successfully",
      };
    } catch (error) {
      console.error("Error creating admission:", error);
      throw new Error("Failed to create admission");
    }
  });

// Safe action for updating admission (admin only)
export const updateAdmission = adminActionClient
  .schema(updateAdmissionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const user = await getCurrentUser();
      const { id, ...updateData } = parsedInput;

      // Check if admission exists
      const existingAdmission = await prisma.admission.findUnique({
        where: { id },
        include: { course: true },
      });

      if (!existingAdmission) {
        throw new Error("Admission not found");
      }

      // Build update data
      const data: Record<string, unknown> = {};

      const eligibleForAgentCommission = user.role && agentRoles.includes(user?.role?.toLocaleLowerCase());

      if(!eligibleForAgentCommission && (updateData.agentName || updateData.agentCommission)){
        throw new Error("You don't have permission to add agent details");
      }

      // Basic fields
      if (updateData.candidateName)
        data.candidateName = updateData.candidateName;
      if (updateData.mobileNumber) data.mobileNumber = updateData.mobileNumber;
      if (updateData.email !== undefined) data.email = updateData.email || null;
      if (updateData.gender) data.gender = updateData.gender;
      if (updateData.dateOfBirth) data.dateOfBirth = updateData.dateOfBirth;
      if (updateData.address) data.address = updateData.address;
      if (updateData.leadSource !== undefined)
        data.leadSource = updateData.leadSource || null;
      if (updateData.lastQualification)
        data.lastQualification = updateData.lastQualification;
      if (updateData.yearOfPassing)
        data.yearOfPassing = updateData.yearOfPassing;
      if (updateData.percentageCGPA)
        data.percentageCGPA = updateData.percentageCGPA;
      if (updateData.instituteName)
        data.instituteName = updateData.instituteName;
      if (updateData.additionalNotes !== undefined)
        data.additionalNotes = updateData.additionalNotes || null;
      if (updateData.status) data.status = updateData.status;
      if(updateData.createdAt) data.createdAt = updateData.createdAt;

      if (updateData.agentName || updateData.agentCommission) {
        data.agentName = updateData.agentName || null;
        data.agentCommission = updateData.agentCommission || null;
        data.handledBy = { connect: { id: user.id } };
      }

      // Handle course change
      if (updateData.courseId) {
        data.course = { connect: { id: updateData.courseId } };
      }

      const admission = await prisma.admission.update({
        where: { id },
        data: {...data,balance:calculateBalance(existingAdmission.balance,updateData.agentCommission || 0)},
        include: {
          course: {
            select: {
              id: true,
              name: true,
            },
          },
          enquiry: {
            select: {
              id: true,
              candidateName: true,
              phone: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await invalidateDashboardCache();
      revalidatePath("/admissions");
      revalidatePath(`/admissions/${id}`);
      return {
        success: true,
        data: admission,
        message: "Admission updated successfully",
      };
    } catch (error) {
      console.error("Error updating admission:", error);
      throw new Error("Failed to update admission");
    }
  });

// Safe action for deleting admission (soft delete, admin only)
export const deleteAdmission = adminActionClient
  .schema(deleteAdmissionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { id } = parsedInput;

      // Check if admission exists
      const existingAdmission = await prisma.admission.findUnique({
        where: { id },
      });

      if (!existingAdmission) {
        throw new Error("Admission not found");
      }

      // Perform soft delete by updating status to CANCELLED
      await prisma.admission.update({
        where: { id },
        data: {
          status: AdmissionStatus.CANCELLED,
        },
      });

      await invalidateDashboardCache();
      revalidatePath("/admissions");
      return { success: true, message: "Admission deleted successfully" };
    } catch (error) {
      console.error("Error deleting admission:", error);
      throw new Error("Failed to delete admission");
    }
  });

import {
  normalizePagination,
  validateSortField,
  validateSortOrder,
  buildPaginationResult,
} from "@/lib/pagination-utils";

const ADMISSION_SORT_FIELDS = [
  "createdAt",
  "candidateName",
  "admissionNumber",
  "status",
  "balance",
  "updatedAt",
];

// Safe action for getting admissions with filters and pagination
export const getAdmissions = actionClient
  .schema(getAdmissionsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const {
        search,
        status,
        courseId,
        branchId,
        dateFrom,
        dateTo,
      } = parsedInput;

      const { page, limit, skip } = normalizePagination({
        page: parsedInput.page,
        limit: parsedInput.limit,
      });

      const sortBy = validateSortField(
        parsedInput.sortBy,
        ADMISSION_SORT_FIELDS,
        "createdAt"
      );
      const sortOrder = validateSortOrder(parsedInput.sortOrder, "desc");

      // Build where clause
      const where: Prisma.AdmissionWhereInput = {};

      const user = await getCurrentUser();
      const role = (user.role || "").toLowerCase();

      if (role === "telecaller") {
        where.createdByUserId = user.id;
      } else if (
        (role === "manager" || role === "executive" || role === "branch manager") &&
        user.branch
      ) {
        where.OR = [
          { enquiry: { branchId: user.branch } },
          { createdBy: { branch: user.branch } },
        ];
      } else if (branchId) {
        where.OR = [
          { enquiry: { branchId } },
          { createdBy: { branch: branchId } },
        ];
      }

      // Add status filter
      if (status) {
        where.status = status;
      }

      // Add search filter
      if (search && search.trim()) {
        const query = search.trim();
        const searchConditions: Prisma.AdmissionWhereInput[] = [
          { candidateName: { contains: query, mode: "insensitive" } },
          { mobileNumber: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { admissionNumber: { contains: query, mode: "insensitive" } },
          { course: { name: { contains: query, mode: "insensitive" } } },
        ];

        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: searchConditions }];
          delete where.OR;
        } else {
          where.OR = searchConditions;
        }
      }

      // Add other filters
      if (courseId) where.courseId = courseId;

      // Add date range filter
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [admissions, totalCount] = await Promise.all([
        prisma.admission.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            course: {
              select: {
                id: true,
                name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.admission.count({ where }),
      ]);

      const pagination = buildPaginationResult(totalCount, page, limit);

      return {
        success: true,
        data: {
          admissions,
          totalCount,
          currentPage: page,
          totalPages: pagination.totalPages,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: pagination.totalPages,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching admissions:", error);
      throw new Error("Failed to fetch admissions");
    }
  });

// Safe action for getting single admission by ID
export const getAdmissionById = actionClient
  .schema(getAdmissionByIdSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { id } = parsedInput;

      const admission = await prisma.admission.findUnique({
        where: { id },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              duration: true,
            },
          },
          enquiry: {
            select: {
              id: true,
              candidateName: true,
              phone: true,
              email: true,
              source: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!admission) {
        throw new Error("Admission not found");
      }

      return { success: true, data: admission };
    } catch (error) {
      console.error("Error fetching admission:", error);
      throw new Error("Failed to fetch admission");
    }
  });

// Safe action for getting admissions by enquiry
export const getAdmissionsByEnquiry = actionClient
  .schema(getAdmissionsByEnquirySchema)
  .action(async ({ parsedInput }) => {
    try {
      const { enquiryId } = parsedInput;

      const admissions = await prisma.admission.findMany({
        where: {
          enquiryId,
          status: { not: AdmissionStatus.CANCELLED },
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return { success: true, data: admissions };
    } catch (error) {
      console.error("Error fetching admissions by enquiry:", error);
      throw new Error("Failed to fetch admissions");
    }
  });

// Safe action for getting enquiry sources for admission form
export const getEnquirySourcesForAdmission = actionClient.action(async () => {
  try {
    const enquirySources = await cacheService.getOrSet(
      CACHE_KEYS.sources,
      CACHE_TTL.MASTER_DATA,
      async () => await prisma.enquirySource.findMany()
    );
    return { success: true, data: enquirySources };
  } catch (error) {
    console.error("Error fetching enquiry sources:", error);
    throw new Error("Failed to fetch enquiry sources");
  }
});

// Helper action to get active courses for admission form
export const getCoursesForAdmission = actionClient.action(async () => {
  try {
    const courses = await cacheService.getOrSet(
      `${CACHE_KEYS.courses}:active`,
      CACHE_TTL.MASTER_DATA,
      async () =>
        await prisma.course.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            admissionFee: true,
            semesterFee: true,
            courseFee: true,
            description: true,
            duration: true,
          },
          orderBy: { name: "asc" },
        })
    );

    return { success: true, data: courses };
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw new Error("Failed to fetch courses");
  }
});
