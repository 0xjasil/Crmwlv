import { z } from 'zod';
import { ExpenseCategory } from '@/types/expense';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseFormData } from '@/types/expense';

// Base expense validation schemas
export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional().nullable(),
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(999999.99, 'Amount is too large'),
  category: z.nativeEnum(ExpenseCategory, {
    required_error: 'Please select a category',
    invalid_type_error: 'Please select a valid category',
  }),
  expenseDate: z.date().optional().default(() => new Date()),
  notes: z.string().optional().nullable(),
}) satisfies z.ZodType<CreateExpenseInput>;

export const updateExpenseSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters').optional(),
  description: z.string().optional().nullable(),
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(999999.99, 'Amount is too large').optional(),
  category: z.nativeEnum(ExpenseCategory, {
    invalid_type_error: 'Please select a valid category',
  }).optional(),
  expenseDate: z.date().optional(),
  notes: z.string().optional().nullable(),
}) satisfies z.ZodType<UpdateExpenseInput>;

export const deleteExpenseSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
});

export const getExpenseSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
});

export const getExpensesSchema = z.object({
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  createdBy: z.string().optional(),
});

// Form-specific schema for client-side validation
export const expenseFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0').max(999999.99, 'Amount is too large'),
  category: z.nativeEnum(ExpenseCategory, {
    required_error: 'Please select a category',
    invalid_type_error: 'Please select a valid category',
  }),
  expenseDate: z.date({
    required_error: 'Expense date is required',
  }),
  notes: z.string().optional().nullable(),
}) satisfies z.ZodType<ExpenseFormData>;

// Duplicate expense schema (for creating from existing)
export const duplicateExpenseSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
});

// Bulk delete schema
export const bulkDeleteExpensesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one expense must be selected'),
});

// Expense filters schema
export const expenseFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  createdBy: z.string().optional(),
}).refine((data) => {
  // Ensure dateFrom is not after dateTo
  if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
    return false;
  }
  return true;
}, {
  message: 'Start date cannot be after end date',
  path: ['dateFrom'],
});