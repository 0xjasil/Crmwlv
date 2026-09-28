"use server";

import prisma from "@/lib/prisma";
import {
  AdmissionWithReceiptsAndCourse,
  Receipt,
} from "@/types/fee-collection";

/**
 * Get a receipt by ID with related data
 */
export async function getReceiptById(id: string) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        createdBy: true,
      },
    });

    if (!receipt) {
      return { error: "Receipt not found" };
    }

    return { success: true, data: receipt as Receipt };
  } catch (error) {
    console.error("Error fetching receipt:", error);
    return { error: "Failed to fetch receipt" };
  }
}

/**
 * Get receipt with admission and course data for PDF generation
 */
export async function getReceiptWithAdmissionData(receiptId: string) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        createdBy: true,
      },
    });

    if (!receipt) {
      return { error: "Receipt not found" };
    }

    // Get the admission with course and all receipts
    const admission = await prisma.admission.findUnique({
      where: { id: receipt.admissionId },
      include: {
        course: true,
        receipts: {
          orderBy: { paymentDate: "desc" },
          include: {
            createdBy: true,
          },
        },
      },
    });

    if (!admission) {
      return { error: "Admission not found" };
    }

    return {
      success: true,
      data: {
        receipt: receipt as Receipt,
        admission: admission as unknown as AdmissionWithReceiptsAndCourse,
      },
    };
  } catch (error) {
    console.error("Error fetching receipt with admission data:", error);
    return { error: "Failed to fetch receipt data" };
  }
}
