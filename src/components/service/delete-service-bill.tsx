import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import { deleteServiceBilling } from "@/server/actions/service-actions";
import { ServiceBillingWithAdmission } from "@/types/service-billing";

interface DeleteServiceBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceBill: ServiceBillingWithAdmission | null;
  onSuccess: () => void;
}

export default function DeleteServiceBillModal({
  open,
  onOpenChange,
  serviceBill,
  onSuccess,
}: DeleteServiceBillModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!serviceBill) return;

    setIsDeleting(true);
    try {
      const result = await deleteServiceBilling({ id: serviceBill.id });
      
      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Failed to delete service bill", error);
      toast.error("Failed to delete service bill");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to format service names for display
  const formatServiceNames = (services?: Array<{ name: string }>) => {
    if (!services || services.length === 0) return "No services";
    return services.map((s) => s.name).join(", ");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this service bill?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This action cannot be undone. This will permanently delete the
                service bill with the following details:
              </p>
              
              {serviceBill && (
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Bill ID:</span>
                    <span className="font-mono text-xs">{serviceBill.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Student:</span>
                    <span className="font-semibold">
                      {serviceBill.admission.candidateName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Services:</span>
                    <span className="text-right max-w-[200px] text-wrap">
                      {serviceBill.services 
                        ? formatServiceNames(serviceBill.services)
                        : `${serviceBill.serviceIds.length} services`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(serviceBill.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created Date:</span>
                    <span>{formatDate(serviceBill.billDate)}</span>
                  </div>
                </div>
              )}
              
              <p className="text-destructive font-medium">
                This will remove all billing records and cannot be recovered.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting...
              </>
            ) : (
              "Delete Service Bill"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}