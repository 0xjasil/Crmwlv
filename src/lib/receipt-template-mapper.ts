import { formatCurrency } from '@/lib/utils';
import { Receipt, AdmissionWithReceiptsAndCourse } from '@/types/fee-collection';

// Define specific types for receipt template inputs
interface ReceiptTemplateInputs {
  billedToInput: string;
  info: string; // JSON string containing receipt info
  orders: string[][]; // 2D array for table data
  balance: string; // Formatted remaining balance
  balanceFormatted: string; // Formatted balance for display
  dueDate: string; // Next payment due date
  date: string; // Payment date
  amountPaidFormatted: string; // Formatted amount paid
}

interface ReceiptPreviewData {
  templateInputs: ReceiptTemplateInputs;
  computedValues: {
    totalCourseFee: number;
    totalPaid: number;
    remainingBalance: number;
  };
  hasMultiplePayments: boolean;
}

/**
 * Maps receipt data to the specific template format used in receipt_template.json
 */
export class ReceiptTemplateMapper {
  /**
   * Map receipt and admission data to template inputs that match the existing template structure
   * @param receipt - Receipt data to map
   * @param admission - Admission with course and receipts data
   * @returns Template inputs object
   */
  static mapToTemplateInputs(
    receipt: Receipt,
    admission: AdmissionWithReceiptsAndCourse
  ): ReceiptTemplateInputs {
    // Format payment date
    const paymentDate = new Date(receipt.paymentDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Calculate totals
    const courseFee = admission.course.courseFee || 0;
    const admissionFee = admission.course.admissionFee || 0;
    const semesterFee = admission.course.semesterFee || 0;
    const totalCourseFee = courseFee + admissionFee + semesterFee;

    const totalPaid = admission.receipts.reduce(
      (sum, r) => sum + r.amountCollected,
      0
    );
    const remainingBalance = totalCourseFee - totalPaid;

    // Create student info string
    const studentInfo = `${admission.candidateName}\nAdmission No: ${admission.admissionNumber}`;

    // Create fee breakdown for table
    const feeBreakdown: string[][] = [];
    
    if (courseFee > 0) {
      feeBreakdown.push([`Course: ${admission.course.name}`, formatCurrency(courseFee)]);
    }
    if (admissionFee > 0) {
      feeBreakdown.push(['Admission Fee', formatCurrency(admissionFee)]);
    }
    if (semesterFee > 0) {
      feeBreakdown.push(['Semester Fee', formatCurrency(semesterFee)]);
    }
    
    feeBreakdown.push(['Total Course Fee', formatCurrency(totalCourseFee)]);
    feeBreakdown.push([
      `Amount Paid toward ${receipt.collectedTowards.replace(/_/g, ' ')}`,
      formatCurrency(receipt.amountCollected)
    ]);

    // Find next due date (could be from admission or calculated)
    const nextDueDate = admission.nextDueDate
      ? new Date(admission.nextDueDate).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'N/A';

    return {
      // Student info field
      billedToInput: studentInfo,

      // Receipt info object for multiVariableText field (must be JSON string)
      info: JSON.stringify({
        ReceiptNo: receipt.receiptNumber,
        Date: paymentDate,
      }),

      // Fee breakdown table (2D array)
      orders: feeBreakdown,

      // Balance information
      balance: formatCurrency(remainingBalance),
      balanceFormatted: formatCurrency(remainingBalance),

      // Due date
      dueDate: nextDueDate,

      // Payment date for footer
      date: paymentDate,

      // Amount paid for footer
      amountPaidFormatted: formatCurrency(receipt.amountCollected),
    };
  }

  /**
   * Validate that the receipt has the required data for PDF generation
   * @param receipt - Receipt to validate
   * @param admission - Admission data to validate
   * @returns True if valid, throws error if invalid
   */
  static validateReceiptData(
    receipt: Receipt,
    admission: AdmissionWithReceiptsAndCourse
  ): boolean {
    if (!receipt.receiptNumber) {
      throw new Error('Receipt number is required');
    }

    if (!receipt.paymentDate) {
      throw new Error('Payment date is required');
    }

    if (receipt.amountCollected <= 0) {
      throw new Error('Amount collected must be greater than 0');
    }

    if (!admission.candidateName || admission.candidateName.trim() === '') {
      throw new Error('Student name is required');
    }

    if (!admission.admissionNumber || admission.admissionNumber.trim() === '') {
      throw new Error('Admission number is required');
    }

    if (!admission.course || !admission.course.name) {
      throw new Error('Course information is required');
    }

    return true;
  }

  /**
   * Create a preview data object for testing template mapping
   * @param receipt - Receipt data
   * @param admission - Admission data
   * @returns Preview object with formatted data
   */
  static createPreviewData(
    receipt: Receipt,
    admission: AdmissionWithReceiptsAndCourse
  ): ReceiptPreviewData {
    const templateInputs = this.mapToTemplateInputs(receipt, admission);
    
    const courseFee = admission.course.courseFee || 0;
    const admissionFee = admission.course.admissionFee || 0;
    const semesterFee = admission.course.semesterFee || 0;
    const totalCourseFee = courseFee + admissionFee + semesterFee;
    
    const totalPaid = admission.receipts.reduce(
      (sum, r) => sum + r.amountCollected,
      0
    );

    return {
      templateInputs,
      computedValues: {
        totalCourseFee,
        totalPaid,
        remainingBalance: totalCourseFee - totalPaid,
      },
      hasMultiplePayments: admission.receipts.length > 1,
    };
  }
}