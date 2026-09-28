// Invoice Status enum (matching Prisma schema exactly)
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

// Base interfaces
export interface Invoice {
  id: string;
  invoiceNumber: string;
  billedTo: string;
  invoiceDate: Date;
  dueDate: Date | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  otherCharges: number;
  totalAmount: number;
  status: InvoiceStatus;
  notes: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  invoiceId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended interfaces with relations
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface InvoiceWithRelations extends Invoice {
  items: InvoiceItem[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

// Form data types
export interface CreateInvoiceInput {
  billedTo: string;
  invoiceDate?: Date;
  dueDate?: Date | null;
  notes?: string | null;
  taxRate?: number;
}

export interface UpdateInvoiceInput {
  id: string;
  billedTo?: string;
  invoiceDate?: Date;
  dueDate?: Date | null;
  notes?: string | null;
  taxRate?: number;
  status?: InvoiceStatus;
}

export interface InvoiceFormData {
  billedTo: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  notes?: string | null;
  taxRate: number;
}

// Invoice item types
export interface CreateInvoiceItemInput {
  invoiceId: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
}

export interface UpdateInvoiceItemInput {
  id: string;
  itemDescription?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface InvoiceItemFormData {
  itemDescription: string;
  quantity: number;
  unitPrice: number;
}

// Calculation types
export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

// API response types
export interface CreateInvoiceResponse {
  success: boolean;
  data?: Invoice;
  message?: string;
  error?: string;
}

export interface GetInvoicesResponse {
  success: boolean;
  data?: InvoiceWithItems[];
  total?: number;
  message?: string;
  error?: string;
}

export interface GetInvoiceResponse {
  success: boolean;
  data?: InvoiceWithItems;
  message?: string;
  error?: string;
}

// Table column types
export interface InvoiceTableData {
  id: string;
  invoiceNumber: string;
  billedTo: string;
  invoiceDate: Date;
  status: InvoiceStatus;
  totalAmount: number;
  createdAt: Date;
}

// Filter and search types
export interface InvoiceFilters {
  status?: InvoiceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface InvoiceSearchParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: InvoiceFilters;
}

// PDF generation types
export interface InvoicePDFData {
  billedToInput: string;
  info: {
    InvoiceNo: string;
    Date: string;
  };
  orders: string[][];
  taxInput: {
    rate: string;
  };
}

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  download?: boolean;
  filename?: string;
}
