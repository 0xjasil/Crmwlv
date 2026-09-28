'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CalendarIcon, Plus } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createInvoice, updateInvoice } from '@/server/actions/invoice-actions';
import { InvoiceWithItems } from '@/types/invoice';
import { toast } from 'sonner';

// Form schema
const invoiceFormSchema = z.object({
  billedTo: z.string().min(1, 'Billed to is required'),
  invoiceDate: z.date({
    required_error: 'Invoice date is required',
  }),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1),
  serviceCharge: z.number().min(0).optional(),
  otherCharges: z.number().min(0).optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormDialogProps {
  mode?: 'create' | 'edit';
  invoice?: InvoiceWithItems;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InvoiceFormDialog({
  mode = 'create',
  invoice,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: InvoiceFormDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      billedTo: invoice?.billedTo || '',
      invoiceDate: invoice?.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : undefined,
      notes: invoice?.notes || '',
      taxRate: invoice?.taxRate || 0.18, // Default 18% GST
      serviceCharge: invoice?.serviceCharge || 0,
      otherCharges: invoice?.otherCharges || 0,
    },
  });

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (mode === 'edit' && invoice) {
        result = await updateInvoice({
          id: invoice.id,
          ...data,
        });
      } else {
        result = await createInvoice(data);
      }

      if (result.data?.success) {
        toast.success(`Invoice ${mode === 'edit' ? 'updated' : 'created'} successfully`);
        form.reset();
        setOpen(false);
        onSuccess?.();

        if (mode === 'create') {
          // Navigate to the created invoice
          router.push(`/invoices/${result.data.data?.id}`);
        }
      } else {
        toast.error(result.data?.message || `Failed to ${mode} invoice`);
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} invoice:`, error);
      toast.error(`Failed to ${mode} invoice`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      form.reset();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {mode === 'create' && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the invoice information below.'
              : 'Enter the basic information for this invoice. You can add items after creation.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Billed To */}
            <FormField
              control={form.control}
              name="billedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billed To</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter client name, address, and contact information\n\nExample:\nABC Company Ltd.\n123 Business Street\nCity, State 12345\nPhone: (555) 123-4567\nEmail: contact@abccompany.com"
                      className="min-h-[120px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice Date */}
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a due date</span>
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tax Rate */}
            <FormField
              control={form.control}
              name="taxRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        placeholder="0.18"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="pr-8"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Enter as decimal (e.g., 0.18 for 18% GST)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Charge */}
            <FormField
              control={form.control}
              name="serviceCharge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Charge</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Other Charges */}
            <FormField
              control={form.control}
              name="otherCharges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Charges</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional notes or terms and conditions..."
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? `${mode === 'edit' ? 'Updating' : 'Creating'}...`
                  : `${mode === 'edit' ? 'Update' : 'Create'} Invoice`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
