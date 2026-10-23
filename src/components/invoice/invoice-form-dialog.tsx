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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { CalendarIcon, Plus, Settings2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createInvoice, updateInvoice } from '@/server/actions/invoice-actions';
import { InvoiceWithItems } from '@/types/invoice';
import { toast } from 'sonner';
import { updateInvoiceRecord, getPaymentNumberPreview } from '@/lib/api/invoice-api';
import { Checkbox } from '@/components/ui/checkbox';
import { PaymentNumberSettingsDialog } from '@/components/invoice/invoice-payments';

// Form schema
const invoiceFormSchema = z.object({
  billedTo: z.string().min(1, 'Billed to is required'),
  invoiceDate: z.date({
    required_error: 'Invoice date is required',
  }),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1),
  taxRounding: z.string().optional(),
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
  const [receivedPayment, setReceivedPayment] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedMode, setReceivedMode] = useState('UPI');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedDepositTo, setReceivedDepositTo] = useState('');
  const [receivedReference, setReceivedReference] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentAutoGenerate, setPaymentAutoGenerate] = useState(true);
  const [paymentSettingsOpen, setPaymentSettingsOpen] = useState(false);

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
      taxRounding: invoice?.taxRounding || 'exact',
      serviceCharge: invoice?.serviceCharge || 0,
      otherCharges: invoice?.otherCharges || 0,
    },
  });

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (mode === 'edit' && invoice) {
        const updateData = { ...data, ...(receivedPayment ? { initialPayment: { amount: Number(receivedAmount), ...(!paymentAutoGenerate ? { paymentNumber } : {}), paymentDate: new Date(`${receivedDate}T00:00:00`).toISOString(), paymentMode: receivedMode, depositTo: receivedDepositTo, referenceNumber: receivedReference } } : {}) };
        await updateInvoiceRecord(invoice.id, updateData as unknown as Record<string, unknown>);
        result = { data: { success: true } };
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
    <>
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

            {/* Tax Rounding */}
            <FormField
              control={form.control}
              name="taxRounding"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rounding</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rounding" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="exact">Exact</SelectItem>
                      <SelectItem value="round_off">Round off</SelectItem>
                    </SelectContent>
                  </Select>
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

            {mode === 'edit' && !(invoice?.payments?.length) && (
              <div className="space-y-4 rounded-lg border p-4">
                <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={receivedPayment} onCheckedChange={(checked) => { setReceivedPayment(checked === true); if (checked === true) { setReceivedAmount(String(invoice?.balanceDue ?? invoice?.totalAmount ?? 0)); void getPaymentNumberPreview().then((preview) => { setPaymentNumber(preview.paymentNumber); setPaymentAutoGenerate(preview.settings.autoGenerate); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load payment preferences.')); } }} />I have received the payment</label>
                {receivedPayment && <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Amount Received<Input type="number" min="0.01" max={invoice?.balanceDue ?? invoice?.totalAmount} step="0.01" required value={receivedAmount} onChange={(event) => setReceivedAmount(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-medium">Payment Mode<select value={receivedMode} onChange={(event) => setReceivedMode(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">{['UPI','Bank Transfer','Cash','Cheque','Card','Other'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Payment Date<Input type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-medium">Deposit To<Input value={receivedDepositTo} onChange={(event) => setReceivedDepositTo(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-medium">Reference #<Input value={receivedReference} onChange={(event) => setReceivedReference(event.target.value)} /></label>{!paymentAutoGenerate && <label className="grid gap-1.5 text-sm font-medium">Payment #<div className="flex gap-2"><Input required value={paymentNumber} onChange={(event) => setPaymentNumber(event.target.value)} /><Button type="button" variant="outline" size="icon" onClick={() => setPaymentSettingsOpen(true)}><Settings2 className="size-4" /></Button></div></label>}</div>}
              </div>
            )}

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
    <PaymentNumberSettingsDialog open={paymentSettingsOpen} onOpenChange={setPaymentSettingsOpen} onSaved={(settings) => { setPaymentAutoGenerate(settings.autoGenerate); void getPaymentNumberPreview().then((preview) => setPaymentNumber(preview.paymentNumber)); }} />
    </>
  );
}
