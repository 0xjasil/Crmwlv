'use client';

export type InvoiceCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  gstin: string;
  savedCustomer: boolean;
  sourceType?: 'admission' | 'enquiry';
};

export type CreateInvoiceCustomerInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  gstin?: string;
};

export type CreateInvoiceInput = {
  invoiceNumber?: string;
  customerId?: string;
  billedTo: string;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  taxRate: number;
  discountAmount: number;
  withholdingAmount: number;
  withholdingType: 'TDS' | 'TCS';
  serviceCharge: number;
  otherCharges: number;
  status: 'DRAFT' | 'SENT';
  initialPayment?: Omit<PaymentInput, 'notes'>;
  items: Array<{ itemDescription: string; quantity: number; unitPrice: number }>;
};

export type InvoiceCatalogItem = { id: string; name: string; price: number };
export type InvoicePayment = { id: string; paymentNumber: string; paymentDate: string; amount: number; paymentMode: string; depositTo?: string | null; referenceNumber?: string | null; notes?: string | null };
export type PaymentInput = { amount: number; paymentNumber?: string; paymentDate: string; paymentMode: string; depositTo?: string; referenceNumber?: string; notes?: string };
export type PaymentNumberSettings = { autoGenerate: boolean; prefix: string; nextNumber: number; padding: number; restartEachFiscalYear: boolean; lastResetFiscalYear?: number | null };

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { message?: string };
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

const apiBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

async function invoiceApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Your session has expired. Sign in again to continue.');

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const payload = await response.json() as ApiEnvelope<T>;
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error?.message || payload.message || `Request failed (${response.status}).`);
  }
  return payload.data;
}

export function fetchInvoiceCustomers() {
  return invoiceApiRequest<InvoiceCustomer[]>('/customers/invoice-options');
}

export function fetchInvoiceCatalog() {
  return invoiceApiRequest<InvoiceCatalogItem[]>('/services?activeOnly=true');
}

export function createInvoiceCustomer(input: CreateInvoiceCustomerInput) {
  return invoiceApiRequest<InvoiceCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createInvoiceCustomerFromAdmission(admissionId: string) {
  return invoiceApiRequest<InvoiceCustomer>(`/customers/from-admission/${encodeURIComponent(admissionId)}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function saveInvoice(input: CreateInvoiceInput) {
  return invoiceApiRequest<{ id: string; invoiceNumber: string }>('/invoices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getInvoiceRecord(id: string) {
  return invoiceApiRequest<Record<string, unknown> & { id: string }>('/invoices/' + encodeURIComponent(id));
}

export async function fetchInvoicesPage(query: { page: number; limit: number; search?: string }) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Your session has expired. Sign in again to continue.');
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  if (query.search) params.set('search', query.search);
  const response = await fetch(`${apiBaseUrl()}/invoices?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  return await response.json() as ApiEnvelope<Array<Record<string, unknown>>>;
}

export function updateInvoiceRecord(id: string, input: Record<string, unknown>) {
  return invoiceApiRequest<Record<string, unknown>>('/invoices/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteInvoiceRecord(id: string) {
  return invoiceApiRequest<null>('/invoices/' + encodeURIComponent(id), { method: 'DELETE' });
}

export function addInvoiceItemRecord(invoiceId: string, item: { itemDescription: string; quantity: number; unitPrice: number }) {
  return invoiceApiRequest<Record<string, unknown>>(`/invoices/${encodeURIComponent(invoiceId)}/items`, { method: 'POST', body: JSON.stringify(item) });
}

export function updateInvoiceItemRecord(itemId: string, item: { itemDescription: string; quantity: number; unitPrice: number }) {
  return invoiceApiRequest<Record<string, unknown>>(`/invoices/items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: JSON.stringify(item) });
}

export function deleteInvoiceItemRecord(itemId: string) {
  return invoiceApiRequest<Record<string, unknown>>(`/invoices/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}

export function recordInvoicePayment(id: string, input: PaymentInput) {
  return invoiceApiRequest<{ payment: InvoicePayment; invoice: Record<string, unknown> }>(`/invoices/${encodeURIComponent(id)}/payments`, { method: 'POST', body: JSON.stringify(input) });
}

export function deleteInvoicePayment(invoiceId: string, paymentId: string) {
  return invoiceApiRequest<Record<string, unknown>>(`/invoices/${encodeURIComponent(invoiceId)}/payments/${encodeURIComponent(paymentId)}`, { method: 'DELETE' });
}

export function getPaymentSettings() {
  return invoiceApiRequest<PaymentNumberSettings>('/invoices/payment-settings');
}

export function savePaymentSettings(input: PaymentNumberSettings) {
  return invoiceApiRequest<PaymentNumberSettings>('/invoices/payment-settings', { method: 'PUT', body: JSON.stringify(input) });
}

export function getPaymentNumberPreview() {
  return invoiceApiRequest<{ paymentNumber: string; settings: PaymentNumberSettings }>('/invoices/payment-settings/next-number');
}

export function createInvoiceShare(id: string) {
  return invoiceApiRequest<{ shareToken: string; url: string }>(`/invoices/${encodeURIComponent(id)}/share`, { method: 'POST', body: JSON.stringify({}) });
}

export function revokeInvoiceShare(id: string) {
  return invoiceApiRequest<Record<string, unknown>>(`/invoices/${encodeURIComponent(id)}/share`, { method: 'DELETE' });
}

export function saveInvoiceReminders(id: string, remindersEnabled: boolean, reminderRules: string[]) {
  return invoiceApiRequest<Record<string, unknown>>(`/invoices/${encodeURIComponent(id)}/reminders`, { method: 'PUT', body: JSON.stringify({ remindersEnabled, reminderRules }) });
}

export function sendInvoiceEmail(id: string, email?: string) {
  return invoiceApiRequest<{ providerId: string }>(`/invoices/${encodeURIComponent(id)}/send`, { method: 'POST', body: JSON.stringify(email ? { email } : {}) });
}

export function sendInvoiceReminder(id: string, email?: string) {
  return invoiceApiRequest<{ providerId: string }>(`/invoices/${encodeURIComponent(id)}/reminders/send`, { method: 'POST', body: JSON.stringify(email ? { email } : {}) });
}

export async function fetchInvoicePdf(id: string, publicToken?: string) {
  const path = publicToken
    ? `/public/invoices/${encodeURIComponent(publicToken)}/pdf`
    : `/invoices/${encodeURIComponent(id)}/pdf`;
  const headers: Record<string, string> = {};
  if (!publicToken) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Your session has expired. Sign in again to continue.');
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${apiBaseUrl()}${path}`, { headers });
  if (!response.ok) throw new Error('Could not generate invoice PDF.');
  return response.blob();
}

export function fetchPublicInvoice(token: string) {
  return fetch(`${apiBaseUrl()}/public/invoices/${encodeURIComponent(token)}`).then(async (response) => {
    const payload = await response.json() as ApiEnvelope<Record<string, unknown>>;
    if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || 'This invoice link is no longer available.');
    return payload.data;
  });
}
