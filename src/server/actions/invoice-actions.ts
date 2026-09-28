'use server';

import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { InvoiceStatus } from '@/types/invoice';
import { Prisma } from '@prisma/client';
import { invalidateDashboardCache } from '@/lib/cache/cache-invalidation';

// Helper function to get current user
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user;
}

// Create safe action client
const action = createSafeActionClient();

// Helper function to generate invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
}

// Helper function to calculate invoice totals
function calculateTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number,
  serviceCharge: number = 0,
  otherCharges: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxableAmount = subtotal + serviceCharge + otherCharges;
  const taxAmount = taxableAmount * taxRate;
  const totalAmount = subtotal + taxAmount + serviceCharge + otherCharges;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

// Schema for creating invoice
const createInvoiceSchema = z.object({
  billedTo: z.string().min(1, 'Billed to is required'),
  invoiceDate: z.date().optional(),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1),
  serviceCharge: z.number().min(0).optional(),
  otherCharges: z.number().min(0).optional(),
});

// Schema for updating invoice
const updateInvoiceSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
  billedTo: z.string().optional(),
  invoiceDate: z.date().optional(),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  serviceCharge: z.number().min(0).optional(),
  otherCharges: z.number().min(0).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
});

// Schema for deleting invoice
const deleteInvoiceSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
});

// Schema for invoice items
const createInvoiceItemSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
});

const updateInvoiceItemSchema = z.object({
  id: z.string().min(1, 'Invoice item ID is required'),
  itemDescription: z.string().optional(),
  quantity: z.number().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
});

const deleteInvoiceItemSchema = z.object({
  id: z.string().min(1, 'Invoice item ID is required'),
});

const getInvoicesSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

const getInvoiceByIdSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
});

// Safe action for creating invoice
export const createInvoice = action.schema(createInvoiceSchema).action(async ({ parsedInput }) => {
  try {
    const user = await getCurrentUser();

    // Generate unique invoice number
    let invoiceNumber: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      invoiceNumber = generateInvoiceNumber();
      const existing = await prisma.invoice.findUnique({
        where: { invoiceNumber },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Could not generate unique invoice number');
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        billedTo: parsedInput.billedTo,
        invoiceDate: parsedInput.invoiceDate || new Date(),
        dueDate: parsedInput.dueDate,
        notes: parsedInput.notes,
        taxRate: parsedInput.taxRate,
        serviceCharge: parsedInput.serviceCharge || 0,
        otherCharges: parsedInput.otherCharges || 0,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        status: InvoiceStatus.DRAFT,
        createdBy: { connect: { id: user.id } },
      },
      include: {
        items: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await invalidateDashboardCache();
    revalidatePath('/invoices');
    return { success: true, data: invoice, message: 'Invoice created successfully' };
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw new Error('Failed to create invoice');
  }
});

// Safe action for updating invoice
export const updateInvoice = action.schema(updateInvoiceSchema).action(async ({ parsedInput }) => {
  try {
    const { id, ...updateData } = parsedInput;

    // Check if invoice exists and user has permission
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }

    // Build update data
    const data: Record<string, unknown> = {};

    if (updateData.billedTo) data.billedTo = updateData.billedTo;
    if (updateData.invoiceDate) data.invoiceDate = updateData.invoiceDate;
    if (updateData.dueDate !== undefined) data.dueDate = updateData.dueDate;
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.status) data.status = updateData.status;

    // If tax rate, service charge, or other charges are updated, recalculate totals
    if (
      updateData.taxRate !== undefined ||
      updateData.serviceCharge !== undefined ||
      updateData.otherCharges !== undefined
    ) {
      data.taxRate = updateData.taxRate ?? existingInvoice.taxRate;
      data.serviceCharge = updateData.serviceCharge ?? existingInvoice.serviceCharge;
      data.otherCharges = updateData.otherCharges ?? existingInvoice.otherCharges;
      const totals = calculateTotals(
        existingInvoice.items,
        data.taxRate as number,
        data.serviceCharge as number,
        data.otherCharges as number
      );
      data.subtotal = totals.subtotal;
      data.taxAmount = totals.taxAmount;
      data.totalAmount = totals.totalAmount;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: {
        items: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await invalidateDashboardCache();
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return { success: true, data: invoice, message: 'Invoice updated successfully' };
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw new Error('Failed to update invoice');
  }
});

// Safe action for deleting invoice
export const deleteInvoice = action.schema(deleteInvoiceSchema).action(async ({ parsedInput }) => {
  try {
    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: parsedInput.id },
    });

    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }

    // Delete all invoice items first, then the invoice
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: parsedInput.id },
    });

    await prisma.invoice.delete({
      where: { id: parsedInput.id },
    });

    await invalidateDashboardCache();
    revalidatePath('/invoices');
    return { success: true, message: 'Invoice deleted successfully' };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw new Error('Failed to delete invoice');
  }
});

import {
  normalizePagination,
  validateSortField,
  validateSortOrder,
  buildPaginationResult,
} from '@/lib/pagination-utils';

const INVOICE_SORT_FIELDS = [
  'createdAt',
  'invoiceDate',
  'invoiceNumber',
  'billedTo',
  'totalAmount',
  'status',
  'dueDate',
  'updatedAt',
];

// Safe action for getting invoices with pagination
export const getInvoices = action.schema(getInvoicesSchema).action(async ({ parsedInput }) => {
  try {
    const { page, limit, skip } = normalizePagination({
      page: parsedInput.page,
      limit: parsedInput.limit,
    });

    const sortBy = validateSortField(parsedInput.sortBy, INVOICE_SORT_FIELDS, 'createdAt');
    const sortOrder = validateSortOrder(parsedInput.sortOrder, 'desc');

    // Build where clause
    const where: Prisma.InvoiceWhereInput = {};

    const user = await getCurrentUser();
    const role = (user.role || '').toLowerCase();

    if (role === 'telecaller') {
      where.createdByUserId = user.id;
    } else if ((role === 'manager' || role === 'executive' || role === 'branch manager') && user.branch) {
      where.createdBy = {
        branch: user.branch,
      };
    }

    if (parsedInput.search && parsedInput.search.trim()) {
      const query = parsedInput.search.trim();
      where.OR = [
        { invoiceNumber: { contains: query, mode: 'insensitive' } },
        { billedTo: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (parsedInput.status) {
      where.status = parsedInput.status;
    }

    if (parsedInput.dateFrom || parsedInput.dateTo) {
      where.invoiceDate = {};
      if (parsedInput.dateFrom) where.invoiceDate.gte = parsedInput.dateFrom;
      if (parsedInput.dateTo) where.invoiceDate.lte = parsedInput.dateTo;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          invoiceNumber: true,
          billedTo: true,
          invoiceDate: true,
          dueDate: true,
          subtotal: true,
          taxRate: true,
          taxAmount: true,
          serviceCharge: true,
          otherCharges: true,
          totalAmount: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const pagination = buildPaginationResult(total, page, limit);

    return {
      success: true,
      data: invoices,
      total,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
      message: 'Invoices fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw new Error('Failed to fetch invoices');
  }
});

// Safe action for getting single invoice
export const getInvoiceById = action
  .schema(getInvoiceByIdSchema)
  .action(async ({ parsedInput }) => {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: parsedInput.id },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return { success: true, data: invoice, message: 'Invoice fetched successfully' };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw new Error('Failed to fetch invoice');
    }
  });

// Safe action for adding invoice item
export const addInvoiceItem = action
  .schema(createInvoiceItemSchema)
  .action(async ({ parsedInput }) => {
    try {
      const lineTotal = parsedInput.quantity * parsedInput.unitPrice;

      const invoiceItem = await prisma.invoiceItem.create({
        data: {
          itemDescription: parsedInput.itemDescription,
          quantity: parsedInput.quantity,
          unitPrice: parsedInput.unitPrice,
          lineTotal: Math.round(lineTotal * 100) / 100,
          invoice: { connect: { id: parsedInput.invoiceId } },
        },
      });

      // Recalculate invoice totals
      await recalculateInvoiceTotals(parsedInput.invoiceId);

      revalidatePath(`/invoices/${parsedInput.invoiceId}`);
      return { success: true, data: invoiceItem, message: 'Invoice item added successfully' };
    } catch (error) {
      console.error('Error adding invoice item:', error);
      throw new Error('Failed to add invoice item');
    }
  });

// Safe action for updating invoice item
export const updateInvoiceItem = action
  .schema(updateInvoiceItemSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { id, ...updateData } = parsedInput;

      // Get current item to calculate new line total
      const currentItem = await prisma.invoiceItem.findUnique({
        where: { id },
      });

      if (!currentItem) {
        throw new Error('Invoice item not found');
      }

      const quantity = updateData.quantity ?? currentItem.quantity;
      const unitPrice = updateData.unitPrice ?? currentItem.unitPrice;
      const lineTotal = Math.round(quantity * unitPrice * 100) / 100;

      const invoiceItem = await prisma.invoiceItem.update({
        where: { id },
        data: {
          ...updateData,
          lineTotal,
        },
      });

      // Recalculate invoice totals
      await recalculateInvoiceTotals(currentItem.invoiceId);

      revalidatePath(`/invoices/${currentItem.invoiceId}`);
      return { success: true, data: invoiceItem, message: 'Invoice item updated successfully' };
    } catch (error) {
      console.error('Error updating invoice item:', error);
      throw new Error('Failed to update invoice item');
    }
  });

// Safe action for deleting invoice item
export const deleteInvoiceItem = action
  .schema(deleteInvoiceItemSchema)
  .action(async ({ parsedInput }) => {
    try {
      const item = await prisma.invoiceItem.findUnique({
        where: { id: parsedInput.id },
      });

      if (!item) {
        throw new Error('Invoice item not found');
      }

      await prisma.invoiceItem.delete({
        where: { id: parsedInput.id },
      });

      // Recalculate invoice totals
      await recalculateInvoiceTotals(item.invoiceId);

      revalidatePath(`/invoices/${item.invoiceId}`);
      return { success: true, message: 'Invoice item deleted successfully' };
    } catch (error) {
      console.error('Error deleting invoice item:', error);
      throw new Error('Failed to delete invoice item');
    }
  });

// Helper function to recalculate invoice totals
async function recalculateInvoiceTotals(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const totals = calculateTotals(
    invoice.items,
    invoice.taxRate,
    invoice.serviceCharge,
    invoice.otherCharges
  );

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    },
  });
}

// Safe action for recalculating invoice totals (public)
export const calculateInvoiceTotals = action
  .schema(getInvoiceByIdSchema)
  .action(async ({ parsedInput }) => {
    try {
      await recalculateInvoiceTotals(parsedInput.id);

      revalidatePath(`/invoices/${parsedInput.id}`);
      return { success: true, message: 'Invoice totals recalculated successfully' };
    } catch (error) {
      console.error('Error recalculating invoice totals:', error);
      throw new Error('Failed to recalculate invoice totals');
    }
  });
