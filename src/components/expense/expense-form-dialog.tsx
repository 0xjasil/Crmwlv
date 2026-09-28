'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { expenseFormSchema } from '@/schema/expense-schema';
import { createExpenseAction, updateExpenseAction } from '@/server/actions/expense-actions';
import {
  ExpenseFormData,
  ExpenseWithRelations,
  ExpenseCategory,
  ExpenseCategoryLabels,
} from '@/types/expense';

interface ExpenseFormDialogProps {
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  expense?: ExpenseWithRelations | null;
  mode?: 'create' | 'edit';
  trigger?: React.ReactNode;
}

export function ExpenseFormDialog({
  open,
  onClose,
  onSuccess,
  expense,
  mode = 'create',
  trigger,
}: ExpenseFormDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const isEdit = mode === 'edit';

  // Form setup
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      amount: 0,
      category: ExpenseCategory.OTHER,
      expenseDate: new Date(),
      notes: '',
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  // Handle dialog open/close
  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  // Reset form when expense changes
  useEffect(() => {
    if (expense && isEdit) {
      form.reset({
        title: expense.title,
        description: expense.description || '',
        amount: expense.amount,
        category: expense.category,
        expenseDate: new Date(expense.expenseDate),
        notes: expense.notes || '',
      });
    } else if (!isEdit) {
      form.reset({
        title: expense?.title || '',
        description: expense?.description || '',
        amount: expense?.amount || 0,
        category: expense?.category || ExpenseCategory.OTHER,
        expenseDate: expense?.expenseDate ? new Date(expense.expenseDate) : new Date(),
        notes: expense?.notes || '',
      });
    }
  }, [expense, isEdit, form]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
    if (!isEdit) {
      form.reset();
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    try {
      let result;
      if (isEdit && expense?.id) {
        result = await updateExpenseAction({
          id: expense.id,
          ...data,
        });
      } else {
        result = await createExpenseAction(data);
      }

      if (result?.data?.success) {
        toast.success(result.data.message || `Expense ${isEdit ? 'updated' : 'created'} successfully`);
        form.reset();
        handleClose();
        onSuccess?.();
      } else {
        toast.error(`Failed to ${isEdit ? 'update' : 'create'} expense`);
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} expense:`, error);
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} expense`);
    } finally {
      setIsLoading(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>
          {isEdit ? 'Edit Expense' : 'Create New Expense'}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Update the expense details below.'
            : 'Fill in the details to create a new expense record.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter expense title"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter expense description"
                    className="resize-none"
                    rows={3}
                    {...field}
                    value={field.value || ''}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount and Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ExpenseCategoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Expense Date */}
          <FormField
            control={form.control}
            name="expenseDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expense Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={isLoading}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
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
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes or comments"
                    className="resize-none"
                    rows={2}
                    {...field}
                    value={field.value || ''}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEdit
                  ? 'Updating...'
                  : 'Creating...'
                : isEdit
                ? 'Update Expense'
                : 'Create Expense'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {dialogContent}
    </Dialog>
  );
}

// Default trigger component for create mode
ExpenseFormDialog.defaultProps = {
  trigger: (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add Expense
    </Button>
  ),
};