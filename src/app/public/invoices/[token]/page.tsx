'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Printer, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchInvoicePdf, fetchPublicInvoice } from '@/lib/api/invoice-api';
import { formatCurrency } from '@/lib/utils';
import { downloadZohoInvoicePdf, getZohoInvoicePdfBlobUrl } from '@/lib/invoice-zoho-pdf';

type PublicInvoice = {
  id: string; invoiceNumber: string; billedTo: string; invoiceDate: string; dueDate?: string | null;
  subtotal: number; taxRate: number; taxAmount: number; serviceCharge: number; otherCharges: number;
  totalAmount: number; amountPaid: number; balanceDue: number; status: string; notes?: string | null;
  items: Array<{ id: string; itemDescription: string; quantity: number; unitPrice: number; lineTotal: number }>;
};

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchPublicInvoice(token).then((data) => setInvoice(data as unknown as PublicInvoice)).catch((error) => toast.error(error instanceof Error ? error.message : 'This invoice is unavailable.')).finally(() => setLoading(false)); }, [token]);
  const getPdf = async (download: boolean) => {
    if (!invoice) return;
    try {
      if (download) {
        downloadZohoInvoicePdf(invoice as any);
        toast.success(`Invoice ${invoice.invoiceNumber} PDF downloaded.`);
        return;
      } else {
        const url = getZohoInvoicePdfBlobUrl(invoice as any);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
    } catch {
      try {
        const blob = await fetchInvoicePdf(invoice.id, token);
        const url = URL.createObjectURL(blob);
        if (download) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
          a.click();
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load invoice PDF.');
      }
    }
  };
  if (loading) return <main className="mx-auto max-w-4xl p-4 md:p-8"><Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Loading invoice…</CardContent></Card></main>;
  if (!invoice) return <main className="mx-auto max-w-4xl p-4 md:p-8"><Card><CardContent className="py-16 text-center"><Receipt className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">Invoice link unavailable</p><p className="mt-1 text-sm text-muted-foreground">This link may have been revoked.</p></CardContent></Card></main>;
  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1><p className="text-sm text-muted-foreground">Issued {formatDate(invoice.invoiceDate)}{invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ''}</p></div><div className="flex gap-2"><Badge variant="outline">{invoice.status.replaceAll('_', ' ')}</Badge><Button variant="outline" onClick={() => void getPdf(true)}><Download className="mr-2 size-4" />Download PDF</Button><Button onClick={() => void getPdf(false)}><Printer className="mr-2 size-4" />Print / Preview</Button></div></header>
    <Card><CardHeader><CardTitle>Bill To</CardTitle></CardHeader><CardContent><pre className="whitespace-pre-wrap font-sans text-sm">{invoice.billedTo}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Invoice Items</CardTitle><CardDescription>Itemized charges</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{invoice.items.map((item) => <TableRow key={item.id}><TableCell>{item.itemDescription}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell><TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent className="ml-auto max-w-sm space-y-2 text-sm"><Line label="Subtotal" value={invoice.subtotal} /><Line label="Tax" value={invoice.taxAmount} /><Line label="Service charge" value={invoice.serviceCharge} /><Line label="Other charges" value={invoice.otherCharges} /><Line label="Total" value={invoice.totalAmount} bold /><Line label="Payment made" value={invoice.amountPaid} /><Line label="Balance due" value={invoice.balanceDue} bold /></CardContent></Card>
    {invoice.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm">{invoice.notes}</CardContent></Card>}
  </main>;
}

function Line({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) { return <div className={`flex justify-between ${bold ? 'font-semibold' : 'text-muted-foreground'}`}><span>{label}</span><span>{formatCurrency(value)}</span></div>; }
function formatDate(value: string) { return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
