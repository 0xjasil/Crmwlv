"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AdmissionWithReceiptsAndCourse,
  FeeCalculationResult,
  Receipt,
} from "@/types/fee-collection";
import { PaymentFormDialog } from "./payment-form-dialog";
import { DeletePaymentConfirmationDialog } from "./delete-payment-confirmation-dialog";
import { Separator } from "../ui/separator";

interface PaymentsTableProps {
  admission: AdmissionWithReceiptsAndCourse;
  feeDetails: FeeCalculationResult;
}

export const PaymentsTable = ({
  admission,
  feeDetails,
}: PaymentsTableProps) => {
  const [receiptToEdit, setReceiptToEdit] = useState<Receipt | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);

  const handleGenerateReceiptPDF = async (receiptId: string) => {
    try {
      toast.info("Opening receipt PDF preview...");

      // Open PDF in new tab for preview
      const previewUrl = `/api/receipts/${receiptId}/pdf?preview=true`;
      window.open(previewUrl, "_blank");

      toast.success("Receipt PDF preview opened in new tab!");
    } catch (error) {
      console.error("Error opening receipt PDF preview:", error);
      toast.error(
        "Failed to open receipt PDF preview: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  if (!admission || !admission.receipts || admission.receipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground mb-4">No payment records found</p>
      </div>
    );
  }

  const { receipts } = admission;

  return (
    <div>
      {/* Desktop view */}
      <div className="hidden md:block">
        <Separator />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead className="hidden lg:table-cell">
                Payment Mode
              </TableHead>
              <TableHead className="hidden lg:table-cell">Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell className="font-medium">
                  {receipt.receiptNumber}
                </TableCell>
                <TableCell>{formatDate(receipt.paymentDate)}</TableCell>
                <TableCell>{formatCurrency(receipt.amountCollected)}</TableCell>
                <TableCell>
                  {receipt.collectedTowards.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {receipt.paymentMode || "-"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {receipt.createdBy?.name || "System"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleGenerateReceiptPDF(receipt.id)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Preview PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setReceiptToEdit(receipt)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setReceiptToDelete(receipt)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view - card layout */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {receipts.map((receipt) => (
          <div
            key={receipt.id}
            className="bg-card rounded-lg border shadow-sm p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-sm">{receipt.receiptNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(receipt.paymentDate)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleGenerateReceiptPDF(receipt.id)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Preview PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setReceiptToEdit(receipt)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setReceiptToDelete(receipt)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">
                  {formatCurrency(receipt.amountCollected)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p>{receipt.collectedTowards.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Mode</p>
                <p>{receipt.paymentMode || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created By</p>
                <p>{receipt.createdBy?.name || "System"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {receiptToEdit && (
        <PaymentFormDialog
          admissionId={admission.id}
          course={admission.course}
          receipt={receiptToEdit}
          feeDetails={feeDetails}
          onClose={() => setReceiptToEdit(null)}
          defaultOpen={true}
        />
      )}

      {receiptToDelete && (
        <DeletePaymentConfirmationDialog
          receipt={receiptToDelete}
          onClose={() => setReceiptToDelete(null)}
          defaultOpen={true}
        />
      )}
    </div>
  );
};
