'use server';

import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import {
  createExpenseSchema,
  updateExpenseSchema,
  deleteExpenseSchema,
  getExpenseSchema,
  getExpensesSchema,
  duplicateExpenseSchema,
} from '@/schema/expense-schema';
import type { ExpenseWithRelations } from '@/types/expense';

/**
 * Create a new expense
 */
export const createExpenseAction = authActionClient
  .inputSchema(createExpenseSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const expense = await prisma.expense.create({
        data: {
          title: parsedInput.title,
          description: parsedInput.description,
          amount: parsedInput.amount,
          category: parsedInput.category,
          expenseDate: parsedInput.expenseDate || new Date(),
          notes: parsedInput.notes,
          createdById: ctx.userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      revalidatePath('/expenses');
      return {
        success: true,
        data: expense as ExpenseWithRelations,
        message: 'Expense created successfully',
      };
    } catch (error) {
      console.error('Error creating expense:', error);
      throw new Error('Failed to create expense');
    }
  });

/**
 * Update an existing expense
 */
export const updateExpenseAction = authActionClient
  .inputSchema(updateExpenseSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { id, ...updateData } = parsedInput;

      // Check if expense exists and user has permission
      const existingExpense = await prisma.expense.findUnique({
        where: { id },
        select: { createdById: true },
      });

      if (!existingExpense) {
        throw new Error('Expense not found');
      }

      // Check if user owns the expense or is admin
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (existingExpense.createdById !== ctx.userId && user?.role !== 'admin') {
        throw new Error('Unauthorized to update this expense');
      }

      const expense = await prisma.expense.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      revalidatePath('/expenses');
      revalidatePath(`/expenses/${id}`);
      return {
        success: true,
        data: expense as ExpenseWithRelations,
        message: 'Expense updated successfully',
      };
    } catch (error) {
      console.error('Error updating expense:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update expense');
    }
  });

/**
 * Delete an expense
 */
export const deleteExpenseAction = authActionClient
  .inputSchema(deleteExpenseSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      // Check if expense exists and user has permission
      const existingExpense = await prisma.expense.findUnique({
        where: { id: parsedInput.id },
        select: { createdById: true, title: true },
      });

      if (!existingExpense) {
        throw new Error('Expense not found');
      }

      // Check if user owns the expense or is admin
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (existingExpense.createdById !== ctx.userId && user?.role !== 'admin') {
        throw new Error('Unauthorized to delete this expense');
      }

      await prisma.expense.delete({
        where: { id: parsedInput.id },
      });

      revalidatePath('/expenses');
      return {
        success: true,
        message: `Expense "${existingExpense.title}" deleted successfully`,
      };
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete expense');
    }
  });

/**
 * Get expenses with pagination and filtering
 */
export const getExpensesAction = authActionClient
  .inputSchema(getExpensesSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const page = parsedInput.page || 1;
      const limit = parsedInput.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ExpenseWhereInput = {};

      // Search functionality
      if (parsedInput.search) {
        where.OR = [
          { title: { contains: parsedInput.search, mode: 'insensitive' } },
          { description: { contains: parsedInput.search, mode: 'insensitive' } },
          { notes: { contains: parsedInput.search, mode: 'insensitive' } },
        ];
      }

      // Category filter
      if (parsedInput.category) {
        where.category = parsedInput.category;
      }

      // Date range filter
      if (parsedInput.dateFrom || parsedInput.dateTo) {
        where.expenseDate = {};
        if (parsedInput.dateFrom) {
          where.expenseDate.gte = parsedInput.dateFrom;
        }
        if (parsedInput.dateTo) {
          where.expenseDate.lte = parsedInput.dateTo;
        }
      }

      // Created by filter
      if (parsedInput.createdBy) {
        where.createdById = parsedInput.createdBy;
      }

      // Role-based filtering: non-admin users can only see their own expenses
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true, branch: true },
      });

      const role = (user?.role || '').toLowerCase();
      if (role === 'telecaller') {
        where.createdById = ctx.userId;
      } else if ((role === 'executive' || role === 'manager' || role === 'branch manager') && user?.branch) {
        where.createdBy = {
          branch: user.branch,
        };
      }

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take: limit,
          orderBy: { expenseDate: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.expense.count({ where }),
      ]);

      return {
        success: true,
        data: expenses as ExpenseWithRelations[],
        total,
        message: 'Expenses fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw new Error('Failed to fetch expenses');
    }
  });

/**
 * Get single expense by ID
 */
export const getExpenseByIdAction = authActionClient
  .inputSchema(getExpenseSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const expense = await prisma.expense.findUnique({
        where: { id: parsedInput.id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      // Check if user can view this expense
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (expense.createdById !== ctx.userId && user?.role !== 'admin') {
        throw new Error('Unauthorized to view this expense');
      }

      return {
        success: true,
        data: expense as ExpenseWithRelations,
        message: 'Expense fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch expense');
    }
  });

/**
 * Get expenses by user (for dashboard or user-specific views)
 */
export const getExpensesByUserAction = authActionClient
  .inputSchema(getExpensesSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const page = parsedInput.page || 1;
      const limit = parsedInput.limit || 10;
      const skip = (page - 1) * limit;

      const where: Prisma.ExpenseWhereInput = {
        createdById: ctx.userId,
      };

      // Apply other filters
      if (parsedInput.category) {
        where.category = parsedInput.category;
      }

      if (parsedInput.dateFrom || parsedInput.dateTo) {
        where.expenseDate = {};
        if (parsedInput.dateFrom) {
          where.expenseDate.gte = parsedInput.dateFrom;
        }
        if (parsedInput.dateTo) {
          where.expenseDate.lte = parsedInput.dateTo;
        }
      }

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take: limit,
          orderBy: { expenseDate: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.expense.count({ where }),
      ]);

      return {
        success: true,
        data: expenses as ExpenseWithRelations[],
        total,
        message: 'User expenses fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching user expenses:', error);
      throw new Error('Failed to fetch user expenses');
    }
  });

/**
 * Get expenses by date range
 */
export const getExpensesByDateRangeAction = authActionClient
  .inputSchema(getExpensesSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const where: Prisma.ExpenseWhereInput = {};

      // Date range is required for this action
      if (!parsedInput.dateFrom || !parsedInput.dateTo) {
        throw new Error('Date range is required');
      }

      where.expenseDate = {
        gte: parsedInput.dateFrom,
        lte: parsedInput.dateTo,
      };

      // Role-based filtering
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true, branch: true },
      });

      const role = (user?.role || '').toLowerCase();
      if (role === 'admin') {
        // Admin sees all
      } else if ((role === 'executive' || role === 'manager' || role === 'branch manager') && user?.branch) {
        where.createdBy = {
          branch: user.branch,
        };
      } else {
        where.createdById = ctx.userId;
      }

      const expenses = await prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        data: expenses as ExpenseWithRelations[],
        message: 'Expenses by date range fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching expenses by date range:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch expenses by date range'
      );
    }
  });

/**
 * Get expenses by category
 */
export const getExpensesByCategoryAction = authActionClient
  .inputSchema(getExpensesSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      if (!parsedInput.category) {
        throw new Error('Category is required');
      }

      const where: Prisma.ExpenseWhereInput = {
        category: parsedInput.category,
      };

      // Role-based filtering
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true, branch: true },
      });

      const role = (user?.role || '').toLowerCase();
      if (role === 'admin') {
        // Admin sees all
      } else if ((role === 'executive' || role === 'manager' || role === 'branch manager') && user?.branch) {
        where.createdBy = {
          branch: user.branch,
        };
      } else {
        where.createdById = ctx.userId;
      }

      const expenses = await prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        data: expenses as ExpenseWithRelations[],
        message: 'Expenses by category fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      throw new Error('Failed to fetch expenses by category');
    }
  });

/**
 * Duplicate an expense
 */
export const duplicateExpenseAction = authActionClient
  .inputSchema(duplicateExpenseSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const originalExpense = await prisma.expense.findUnique({
        where: { id: parsedInput.id },
      });

      if (!originalExpense) {
        throw new Error('Expense not found');
      }

      // Check permissions
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (originalExpense.createdById !== ctx.userId && user?.role !== 'admin') {
        throw new Error('Unauthorized to duplicate this expense');
      }

      const duplicatedExpense = await prisma.expense.create({
        data: {
          title: `${originalExpense.title} (Copy)`,
          description: originalExpense.description,
          amount: originalExpense.amount,
          category: originalExpense.category,
          expenseDate: new Date(), // Use current date for the duplicate
          notes: originalExpense.notes,
          createdById: ctx.userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      revalidatePath('/expenses');
      return {
        success: true,
        data: duplicatedExpense as ExpenseWithRelations,
        message: 'Expense duplicated successfully',
      };
    } catch (error) {
      console.error('Error duplicating expense:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to duplicate expense');
    }
  });
