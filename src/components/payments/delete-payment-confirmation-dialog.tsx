"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Receipt } from "@/types/fee-collection";
import { deleteReceipt } from "@/server/actions/fee-collection-actions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface DeletePaymentConfirmationDialogProps {
  receipt: Receipt;
  onClose: () => void;
  defaultOpen?: boolean;
}

export const DeletePaymentConfirmationDialog = ({
  receipt,
  onClose,
  defaultOpen = false,
}: DeletePaymentConfirmationDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteReceipt(receipt.id);

      if (result.error) {
        toast.error("Error deleting payment record", {
          description: result.error,
        });
      } else {
        toast.success("Success", {
          description: "Payment record deleted successfully",
        });
        onClose();
      }
    } catch (error) {
      console.error("Error deleting payment record:", error);
      toast.error("Error deleting payment record", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={defaultOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the payment record{" "}
            <strong>{receipt.receiptNumber}</strong> for{" "}
            <strong>{formatCurrency(receipt.amountCollected)}</strong>.
            <br />
            <br />
            This action cannot be undone and may affect fee calculations for
            this admission.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
