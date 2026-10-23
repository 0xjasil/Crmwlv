'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { deleteInvoicePayment } from '@/lib/api/invoice-api';
import { formatCurrency } from '@/lib/utils';
import { InvoiceWithItems } from '@/types/invoice';

export function InvoicePaymentHistory({ invoice, onChange }: { invoice: InvoiceWithItems; onChange: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const removePayment = async (id: string, number: string) => {
    if (!window.confirm(`Delete payment ${number}? The invoice balance and status will be recalculated.`)) return;
    setDeleting(id);
    try { await deleteInvoicePayment(invoice.id, id); toast.success('Payment deleted and invoice balance updated.'); onChange(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete payment.'); }
    finally { setDeleting(null); }
  };
  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle>Payments Received</CardTitle><CardDescription>Payments recorded against this invoice</CardDescription></CardHeader>
      <CardContent className="p-0">
        {invoice.payments?.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Payment #</TableHead><TableHead>Reference #</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-24" /></TableRow></TableHeader><TableBody>{invoice.payments.map((payment) => <TableRow key={payment.id}><TableCell>{new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell><TableCell className="font-medium">{payment.paymentNumber}</TableCell><TableCell>{payment.referenceNumber || '—'}</TableCell><TableCell>{payment.paymentMode}</TableCell><TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell><TableCell className="text-right"><Button type="button" variant="ghost" size="sm" disabled={deleting === payment.id} onClick={() => void removePayment(payment.id, payment.paymentNumber)}>{deleting === payment.id ? 'Deleting…' : 'Delete'}</Button></TableCell></TableRow>)}</TableBody></Table></div> : <p className="px-6 py-8 text-center text-sm text-muted-foreground">No payments have been recorded.</p>}
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Activity</CardTitle><CardDescription>Invoice and payment history</CardDescription></CardHeader><CardContent>{invoice.activities?.length ? <ol className="space-y-4">{invoice.activities.map((event) => <li key={event.id} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0 flex-1"><p className="text-sm">{event.message}</p><p className="mt-1 text-xs text-muted-foreground">{event.user?.name || 'CRM'} · {new Date(event.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p></div></li>)}</ol> : <p className="text-sm text-muted-foreground">No activity has been recorded.</p>}</CardContent></Card>
  </div>;
}
