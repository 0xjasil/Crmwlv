'use client';

import { useState, useEffect } from 'react';
import { useAction } from 'next-safe-action/hooks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteEnquiry } from '@/server/actions/enquiry-action';

interface DeleteEnquiryDialogProps {
  enquiryId: string;
  candidateName: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteEnquiryDialog({
  enquiryId,
  candidateName,
  onSuccess,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DeleteEnquiryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const { execute: deleteEnquiryAction, isExecuting, result } = useAction(deleteEnquiry);

  // Monitor action results
  useEffect(() => {
    if (!isProcessing) return;

    if (result?.data?.success) {
      toast.success(result.data.message || 'Enquiry deleted successfully');
      setOpen(false);
      setIsProcessing(false);
      onSuccess?.();
    } else if (result?.serverError) {
      toast.error(result.serverError);
      setIsProcessing(false);
    } else if (result?.validationErrors) {
      toast.error('Validation failed');
      setIsProcessing(false);
    }
  }, [result, isProcessing, onSuccess, setOpen]);

  const handleDelete = async () => {
    setIsProcessing(true);
    await deleteEnquiryAction({ id: enquiryId });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the enquiry for{' '}
            <span className="font-semibold text-foreground">{candidateName}</span>?
            <br />
            <br />
            This action cannot be undone. This will permanently delete the enquiry record and all
            associated data including follow-ups and call logs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExecuting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isExecuting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isExecuting ? 'Deleting...' : 'Delete Enquiry'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
