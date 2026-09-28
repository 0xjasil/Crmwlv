'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAction } from 'next-safe-action/hooks';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Edit2, ArrowUpCircle } from 'lucide-react';

import { updateEnquiryStatusWithActivity, updateEnquiryStatusDirectToEnrolled } from '@/server/actions/enquiry-status-actions';
import { EnquiryStatus } from '@/types/enquiry';

// Form schema - fixed to make directEnrollment required
const statusUpdateSchema = z.object({
  newStatus: z.nativeEnum(EnquiryStatus),
  statusRemarks: z.string().optional(),
  directEnrollment: z.boolean(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

interface StatusUpdateDialogProps {
  enquiryId: string;
  currentStatus: EnquiryStatus;
  candidateName: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StatusUpdateDialog({
  enquiryId,
  currentStatus,
  candidateName,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: StatusUpdateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Actions
  const {
    execute: updateStatusAction,
    result: updateResult,
    isExecuting: isUpdating,
  } = useAction(updateEnquiryStatusWithActivity);

  const {
    execute: directEnrollmentAction,
    result: directResult,
    isExecuting: isDirectEnrolling,
  } = useAction(updateEnquiryStatusDirectToEnrolled);

  const isExecuting = isUpdating || isDirectEnrolling;

  // Form
  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      newStatus: currentStatus || EnquiryStatus.NEW,
      statusRemarks: '',
      directEnrollment: false,
    },
  });

  const watchedStatus = form.watch('newStatus');
  const watchedDirectEnrollment = form.watch('directEnrollment');

  // Status options - exclude current status
  const getStatusOptions = () => {
    return Object.values(EnquiryStatus).filter(status => status !== currentStatus);
  };

  // Status display names
  const getStatusDisplayName = (status: EnquiryStatus) => {
    switch (status) {
      case EnquiryStatus.NEW:
        return 'New';
      case EnquiryStatus.CONTACTED:
        return 'Contacted';
      case EnquiryStatus.INTERESTED:
        return 'Interested';
      case EnquiryStatus.NOT_INTERESTED:
        return 'Not Interested';
      case EnquiryStatus.FOLLOW_UP:
        return 'Follow Up';
      case EnquiryStatus.ENROLLED:
        return 'Enrolled';
      case EnquiryStatus.DROPPED:
        return 'Dropped';
      case EnquiryStatus.INVALID:
        return 'Invalid';
      default:
        return status;
    }
  };

  // Monitor action results
  useEffect(() => {
    if (!isProcessingAction) return;

    const result = updateResult || directResult;
    if (result?.data?.success) {
      const message = result.data.message || 'Status updated successfully';
      toast.success(message);
      setOpen(false);
      form.reset();
      setIsProcessingAction(false);
      onSuccess?.();
    } else if (result?.serverError) {
      toast.error(`Error updating status: ${result.serverError}`);
      setIsProcessingAction(false);
    } else if (result?.validationErrors) {
      const errorMessages = Object.entries(result.validationErrors)
        .flat()
        .join(', ');
      toast.error(`Validation error: ${errorMessages}`);
      setIsProcessingAction(false);
    }
  }, [updateResult, directResult, form, setOpen, onSuccess, isProcessingAction]);

  const onSubmit = async (data: StatusUpdateFormData) => {
    try {
      setIsProcessingAction(true);

      if (data.directEnrollment && data.newStatus === EnquiryStatus.ENROLLED) {
        // Use direct enrollment action
        directEnrollmentAction({
          id: enquiryId,
          statusRemarks: data.statusRemarks,
        });
      } else {
        // Use regular status update action
        updateStatusAction({
          id: enquiryId,
          newStatus: data.newStatus,
          statusRemarks: data.statusRemarks,
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      setIsProcessingAction(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isExecuting) {
      setOpen(newOpen);
      if (!newOpen) {
        form.reset({
          newStatus: currentStatus,
          statusRemarks: '',
          directEnrollment: false,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}

      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" />
            Update Status
          </DialogTitle>
          <DialogDescription>
            Update the status for <strong>{candidateName}</strong>.
            Current status: <strong>{getStatusDisplayName(currentStatus)}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="newStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getStatusOptions().map((status) => (
                          <SelectItem key={status} value={status}>
                            {getStatusDisplayName(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedStatus === EnquiryStatus.ENROLLED && (
                <FormField
                  control={form.control}
                  name="directEnrollment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Direct Enrollment
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Check this if the candidate enrolled directly without going through the admission form process.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="statusRemarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Remarks (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={
                          watchedDirectEnrollment
                            ? "Add any notes about the direct enrollment..."
                            : "Add any remarks about this status change..."
                        }
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
                    {watchedDirectEnrollment ? 'Processing Direct Enrollment...' : 'Updating Status...'}
                  </>
                ) : (
                  <>
                    <Edit2 className="mr-2 h-4 w-4" />
                    {watchedDirectEnrollment ? 'Complete Direct Enrollment' : 'Update Status'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}