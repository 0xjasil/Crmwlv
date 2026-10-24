import { PaymentsTable } from "@/components/payments/payments-table";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { getAdmissionWithFeeDetails } from "@/server/actions/fee-collection-actions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Suspense } from "react";
import { PaymentsPageSkeleton } from "@/components/payments/payments-skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar, CreditCard, DollarSign, TrendingUp } from "lucide-react";

export default async function Payments({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <Suspense fallback={<PaymentsPageSkeleton />}>
        <PaymentsContent id={id} />
      </Suspense>
    </div>
  );
}

async function PaymentsContent({ id }: { id: string }) {
  const { data, error } = await getAdmissionWithFeeDetails(id);

  if (error) {
    return <div className="p-4">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-4">No data found</div>;
  }

  const { admission, feeDetails } = data;

  // Calculate payment progress
  const paymentProgress =
    feeDetails.totalFee > 0
      ? (feeDetails.totalPaid / feeDetails.totalFee) * 100
      : 0;

  // Determine payment status
  const getPaymentStatus = () => {
    if (feeDetails.balance <= 0)
      return {
        status: "paid",
        label: "Fully Paid",
        variant: "default" as const,
      };
    if (feeDetails.totalPaid === 0)
      return {
        status: "pending",
        label: "Payment Pending",
        variant: "secondary" as const,
      };
    return {
      status: "partial",
      label: "Partially Paid",
      variant: "outline" as const,
    };
  };

  const paymentStatus = getPaymentStatus();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Payment Management
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              {admission.candidateName} • {admission.admissionNumber} •{" "}
              {admission.course.name}
            </p>
            <Badge variant={paymentStatus.variant} className="ml-2">
              {paymentStatus.label}
            </Badge>
          </div>
        </div>
        <PaymentFormDialog
          admissionId={id}
          course={admission.course}
          feeDetails={feeDetails}
        />
      </div>

      {/* Payment Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Fee</CardDescription>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(feeDetails.totalFee)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Paid</CardDescription>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(feeDetails.totalPaid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Outstanding Balance</CardDescription>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(feeDetails.balance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Next Due Date</CardDescription>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {feeDetails.nextDueDate
                ? formatDate(feeDetails.nextDueDate)
                : "Not set"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      {feeDetails.totalFee > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Progress</CardTitle>
            <CardDescription>
              {paymentProgress.toFixed(1)}% of total fee paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={paymentProgress} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Fee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Structure</CardTitle>
          <CardDescription>Course: {admission.course.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Admission Fee
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(feeDetails.admissionFee)}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Course Fee
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(feeDetails.courseFee)}
              </p>
            </div>

            {feeDetails.semesterFee && feeDetails.semesterFee > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Semester Fee
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(feeDetails.semesterFee)}
                </p>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Fee
              </p>
              <p className="text-3xl font-bold">
                {formatCurrency(feeDetails.totalFee)}
              </p>
            </div>
            <Badge variant={paymentStatus.variant}>{paymentStatus.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {admission.receipts?.length || 0}{" "}
                {admission.receipts?.length === 1 ? "payment" : "payments"}{" "}
                recorded
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PaymentsTable admission={admission} feeDetails={feeDetails} />
        </CardContent>
      </Card>
    </div>
  );
}
