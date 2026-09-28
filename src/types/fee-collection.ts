import { z } from "zod";

/**
 * Enum representing the different types of fees that can be collected
 */
export enum CollectedTowards {
  ADMISSION_FEE = "ADMISSION_FEE",
  COURSE_FEE = "COURSE_FEE",
  SEMESTER_FEE = "SEMESTER_FEE",
  OTHER = "OTHER",
}

/**
 * Interface representing a receipt in the system
 */
import { User, AdmissionStatus } from "@prisma/client";

export interface Receipt {
  id: string;
  receiptNumber: string;
  amountCollected: number;
  collectedTowards: CollectedTowards;
  paymentDate: Date;
  paymentMode: string;
  transactionId?: string;
  notes?: string;
  admissionId: string;
  courseId: string;
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseFee {
  id: string;
  name: string;
  courseFee: number | null;
  admissionFee: number | null;
  semesterFee: number | null;
  agentCommission: number | null;
}

/**
 * Interface representing an admission with its receipts and course details
 */
export interface AdmissionWithReceiptsAndCourse {
  id: string;
  admissionNumber: string;
  candidateName: string;
  status?: AdmissionStatus;
  totalFee?: number;
  balance: number;
  agentName?: string;
  agentCommission?: number;
  nextDueDate?: Date;
  receipts: Receipt[];
  course: CourseFee;
}

/**
 * Input type for creating a new receipt
 */
export interface CreateReceiptInput {
  receiptNumber: string;
  amountCollected: number;
  collectedTowards: CollectedTowards;
  paymentDate: Date;
  nextDueDate: Date;
  paymentMode: string;
  transactionId?: string;
  notes?: string;
  admissionId: string;
  courseId: string;
}

/**
 * Input type for updating an existing receipt
 */
export interface UpdateReceiptInput {
  id: string;
  receiptNumber?: string;
  amountCollected?: number;
  collectedTowards?: CollectedTowards;
  paymentDate: Date;
  nextDueDate: Date;
  paymentMode?: string;
  transactionId?: string;
  notes?: string;
}

/**
 * Function to create receipt form schema with dynamic validation
 */
export const receiptFormSchema = (balance?: number, admissionFee?: number) => {
  return z
    .object({
      receiptNumber: z
        .string()
        .min(1, { message: "Receipt number is required" }),
      amountCollected: z.coerce
        .number()
        .min(1, { message: "Amount must be greater than 0" })
        .refine(
          (amount) => {
            // Validate amount against maximum allowed
            if (balance && amount > balance) {
              return false;
            }
            return true;
          },
          {
            message: `Amount cannot exceed the remaining balance: ${balance}`,
          }
        ),
      collectedTowards: z.nativeEnum(CollectedTowards, {
        required_error: "Please select a fee type",
      }),
      paymentDate: z.date({
        required_error: "Payment date is required",
      }),
      nextDueDate: z.date({
        required_error: "Next due date is required",
      }),
      paymentMode: z.string().min(1, { message: "Payment mode is required" }),
      transactionId: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine(
      (data) => {
        // If payment mode is not CASH, transaction ID is required
        if (
          data.paymentMode !== "CASH" &&
          (!data.transactionId || data.transactionId.trim() === "")
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Transaction ID is required for non-cash payments",
        path: ["transactionId"],
      }
    )
    .refine(
      (data) => {
        // If collecting towards admission fee, amount cannot exceed admission fee
        if (
          data.collectedTowards === CollectedTowards.ADMISSION_FEE &&
          admissionFee &&
          data.amountCollected > admissionFee
        ) {
          return false;
        }
        return true;
      },
      {
        message: `Amount cannot exceed the admission fee: ${admissionFee}`,
        path: ["amountCollected"],
      }
    );
};

/**
 * Type for receipt form data
 */
export type ReceiptFormData = z.infer<ReturnType<typeof receiptFormSchema>>;

/**
 * Type for fee calculation results
 */
export interface FeeCalculationResult {
  courseFee: number;
  admissionFee: number;
  semesterFee?: number | null;
  balance: number;
  nextDueDate?: Date;
  totalFee: number;
  totalPaid: number;
}
