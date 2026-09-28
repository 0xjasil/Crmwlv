import {
  AdmissionWithReceiptsAndCourse,
  CourseFee,
  FeeCalculationResult,
} from "@/types/fee-collection";

/**
 * Calculate fee details for an admission
 * @param admission The admission object with course and receipts
 * @returns FeeCalculationResult with detailed fee breakdown
 */
export function calculateFeeDetails(
  admission: AdmissionWithReceiptsAndCourse
): FeeCalculationResult {
  const admissionFee = admission.course.admissionFee || 0;
  const courseFee = admission.course.courseFee || 0;
  const balance = admission.balance || 0;
  const semesterFee = admission.course.semesterFee;

  const totalFee = calculateTotalFee(admission.course);

  return {
    totalFee,
    totalPaid: calculateTotalPaid(admission),
    balance,
    admissionFee,
    courseFee,
    semesterFee,
    nextDueDate: admission.nextDueDate,
  };
}

/**
 * Generate a receipt number
 * @returns A unique receipt number
 */
export function generateReceiptNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `RCP-${year}${month}${day}-${random}`;
}

export function calculateTotalFee(course: CourseFee) {
  const admissionFee = course.admissionFee ?? 0;
  const courseFee = course.courseFee ?? 0;
  const semesterFee = course.semesterFee ?? 0;

  let totalFee = admissionFee + courseFee + semesterFee;
  if(course.agentCommission) {
    totalFee -= course.agentCommission
  }

  return totalFee;
}


export function calculateBalance(balance: number, totalPaid: number) {
  if(totalPaid > balance) {
    return 0;
  }
  return balance - totalPaid;
}

export const calculateTotalPaid = (admission: AdmissionWithReceiptsAndCourse) =>
  admission.receipts.reduce((sum, receipt) => sum + receipt.amountCollected, 0);
