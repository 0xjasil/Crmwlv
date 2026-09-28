"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CollectedTowards,
  Receipt,
  ReceiptFormData,
  receiptFormSchema,
  FeeCalculationResult,
  CourseFee,
} from "@/types/fee-collection";
import {
  createReceipt,
  updateReceipt,
} from "@/server/actions/fee-collection-actions";
import { generateReceiptNumber } from "@/lib/fee-utils";
import { toast } from "sonner";

interface PaymentFormDialogProps {
  admissionId?: string;
  course?: CourseFee;
  receipt?: Receipt;
  feeDetails: FeeCalculationResult;
  onClose?: () => void;
  defaultOpen?: boolean;
}

export const PaymentFormDialog = ({
  admissionId,
  course,
  receipt,
  feeDetails,
  onClose,
  defaultOpen = false,
}: PaymentFormDialogProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!receipt;

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(
      receiptFormSchema(feeDetails.balance, feeDetails.admissionFee)
    ),
    defaultValues: {
      receiptNumber: "",
      amountCollected: 0,
      collectedTowards: CollectedTowards.ADMISSION_FEE,
      paymentDate: new Date(),
      nextDueDate: new Date(),
      paymentMode: "CASH",
      transactionId: "",
      notes: "",
    },
  });

  // Calculate if admission fee is fully collected
  const isAdmissionFeeFullyCollected = useCallback(() => {
    if (!course?.admissionFee || !feeDetails) return false;
    // If balance is 0 and course has admission fee, it means admission fee is fully paid
    // Or we can check if total paid equals or exceeds admission fee
    const totalPaid = feeDetails.totalPaid;
    return totalPaid >= course.admissionFee;
  }, [course?.admissionFee, feeDetails]);

  // Set form values when editing
  useEffect(() => {
    if (receipt && feeDetails) {
      form.reset({
        receiptNumber: receipt.receiptNumber,
        amountCollected: receipt.amountCollected,
        collectedTowards: receipt.collectedTowards,
        paymentDate: receipt.paymentDate,
        nextDueDate: feeDetails.nextDueDate,
        paymentMode: receipt.paymentMode,
        transactionId: receipt.transactionId || "",
        notes: receipt.notes || "",
      });
    } else if (feeDetails) {
      form.setValue("receiptNumber", generateReceiptNumber());
      // If admission fee is fully collected, default to course fee
      if (isAdmissionFeeFullyCollected() && course?.courseFee) {
        form.setValue("collectedTowards", CollectedTowards.COURSE_FEE);
      }
    }
  }, [receipt, feeDetails, form, course, isAdmissionFeeFullyCollected]);

  const handleClose = () => {
    setOpen(false);
    form.reset({
      receiptNumber: generateReceiptNumber(),
      amountCollected: 0,
      collectedTowards: isAdmissionFeeFullyCollected()
        ? CollectedTowards.COURSE_FEE
        : CollectedTowards.ADMISSION_FEE,
      paymentDate: new Date(),
      nextDueDate: new Date(),
      paymentMode: "CASH",
      transactionId: "",
      notes: "",
    });
    if (onClose) {
      onClose();
    }
  };

  const onSubmit = async (data: ReceiptFormData) => {
    if (!admissionId || !course?.id) {
      toast.error("Missing", {
        description: "Missing required information",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && receipt) {
        // Update existing receipt
        const result = await updateReceipt({
          id: receipt.id,
          ...data,
        });

        if (result.error) {
          toast.error("Error", {
            description: result.error,
          });
        } else {
          toast.success("Success", {
            description: "Payment updated successfully",
          });
          handleClose();
        }
      } else {
        // Create new receipt
        const result = await createReceipt({
          ...data,
          admissionId,
          courseId: course.id,
        });

        if (result.error) {
          toast.error("Error", {
            description: result.error,
          });
        } else {
          toast.success("Success", {
            description: "Payment created successfully",
          });
          handleClose();
        }
      }
    } catch (error) {
      console.log("Error creating payment:", error);
      toast.error("Error", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleClose();
        } else {
          setOpen(newOpen);
        }
      }}
    >
      {!defaultOpen && (
        <DialogTrigger asChild>
          <Button disabled={feeDetails.balance === 0}>
            <Plus className="mr-1 size-4" />
            Create Payment
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Payment" : "Create Payment"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update payment details" : "Add a new payment record"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="receiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amountCollected"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="collectedTowards"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select fee type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {course?.admissionFee &&
                          (receipt || !isAdmissionFeeFullyCollected()) && (
                            <SelectItem value={CollectedTowards.ADMISSION_FEE}>
                              Admission Fee
                            </SelectItem>
                          )}
                        {course?.courseFee && (
                          <SelectItem value={CollectedTowards.COURSE_FEE}>
                            Course Fee
                          </SelectItem>
                        )}
                        {course?.semesterFee && (
                          <SelectItem value={CollectedTowards.SEMESTER_FEE}>
                            Semester Fee
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMM dd, yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="nextDueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMM dd, yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="BANK_TRANSFER">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("paymentMode") !== "CASH" && (
              <FormField
                control={form.control}
                name="transactionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Transaction ID
                      {form.watch("paymentMode") !== "CASH" && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={
                          form.watch("paymentMode") !== "CASH"
                            ? "Required for non-cash payments"
                            : "Optional"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes here"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
