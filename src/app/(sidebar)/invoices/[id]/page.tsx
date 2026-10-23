'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Download,
  Calendar,
  User,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Circle,
  Eye,
  IndianRupee,
  Pencil,
  Send,
  Share2,
  Bell,
} from 'lucide-react';
import { getInvoiceRecord, createInvoiceShare, revokeInvoiceShare, fetchInvoicePdf, sendInvoiceEmail } from '@/lib/api/invoice-api';
import { toast } from 'sonner';
import { InvoiceWithItems, InvoiceStatus } from '@/types/invoice';
import { InvoiceItemsSection } from '@/components/invoice/invoice-items-section';
import { InvoiceTotals } from '@/components/invoice/invoice-totals';
import { InvoiceStatusUpdate } from '@/components/invoice/invoice-status-update';
import { InvoiceFormDialog } from '@/components/invoice/invoice-form-dialog';
import { InvoicePaymentHistory } from '@/components/invoice/invoice-payment-history';
import { RecordPaymentDialog, RemindersDialog } from '@/components/invoice/invoice-payments';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;

    setIsLoading(true);
    try {
      const result = await getInvoiceRecord(invoiceId);
      setInvoice(result as unknown as InvoiceWithItems);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to fetch invoice');
      router.push('/invoices');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleBack = () => {
    router.push('/invoices');
  };

  const handleGeneratePDF = async (download: boolean = false) => {
    try {
      setIsGeneratingPDF(true);
      toast.info('Opening PDF preview...');

      const pdf = await fetchInvoicePdf(invoiceId);
      const url = URL.createObjectURL(pdf);
      if (download) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Invoice-${invoice?.invoiceNumber || invoiceId}.pdf`;
        anchor.click();
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(download ? 'Invoice PDF downloaded.' : 'Invoice PDF opened. Use the PDF viewer to print.');
    } catch (error) {
      console.error('Error opening PDF preview:', error);
      toast.error(
        'Failed to open PDF preview: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    try {
      let token = invoice?.shareToken;
      if (!token) {
        const result = await createInvoiceShare(invoiceId);
        token = result.shareToken;
        setInvoice((current) => current ? { ...current, shareToken: token } : current);
        toast.success('Public invoice link created.');
      }
      const url = `${window.location.origin}/public/invoices/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create share link.'); }
  };

  const handleRevokeShare = async () => {
    try {
      await revokeInvoiceShare(invoiceId);
      setInvoice((current) => current ? { ...current, shareToken: null } : current);
      toast.success('Public invoice link revoked.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not revoke share link.'); }
  };

  const handleSendInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    try {
      await sendInvoiceEmail(invoiceId, sendEmail.trim() || undefined);
      toast.success('Invoice emailed with the PDF attached.');
      setSendOpen(false);
      await fetchInvoice();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send invoice.'); }
    finally { setIsSending(false); }
  };

  const getStatusConfig = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return {
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Circle,
          label: 'Draft',
        };
      case InvoiceStatus.SENT:
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Clock,
          label: 'Sent',
        };
      case InvoiceStatus.PARTIALLY_PAID:
        return { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock, label: 'Partially Paid' };
      case InvoiceStatus.PAID:
        return {
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle,
          label: 'Paid',
        };
      case InvoiceStatus.OVERDUE:
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertCircle,
          label: 'Overdue',
        };
      case InvoiceStatus.CANCELLED:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: XCircle,
          label: 'Cancelled',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Circle,
          label: status,
        };
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Invoice not found</h3>
            <p className="text-muted-foreground">
              The invoice you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="relative @container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
              <Badge variant="outline" className={`${statusConfig.color} border px-2.5 py-1`}>
                <StatusIcon className="mr-1.5 h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created on {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => { setSendEmail(invoice.customer?.email || ''); setSendOpen(true); }}><Send className="mr-2 h-4 w-4" />Send</Button>
          <Button variant="outline" onClick={() => void handleShare()}><Share2 className="mr-2 h-4 w-4" />{invoice.shareToken ? 'Copy Share Link' : 'Share'}</Button>
          {invoice.shareToken && <Button variant="ghost" onClick={() => void handleRevokeShare()}>Revoke</Button>}
          <Button variant="outline" onClick={() => setRemindersOpen(true)}><Bell className="mr-2 h-4 w-4" />Reminders</Button>
          {Number(invoice.balanceDue ?? invoice.totalAmount - (invoice.amountPaid ?? 0)) > 0 && ![InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED].includes(invoice.status) && <Button onClick={() => setPaymentOpen(true)}> <IndianRupee className="mr-2 h-4 w-4" />Record Payment</Button>}
          <Button
            variant="outline"
            onClick={() => handleGeneratePDF()}
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Opening...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Preview PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {Number(invoice.amountPaid ?? 0) > 0 && Number(invoice.balanceDue ?? 0) > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <span>Invoice has been partially paid. Balance due: {formatCurrency(Number(invoice.balanceDue))}.</span>
          <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>Record payment</Button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Invoice Details and Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Information Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoice Details
              </CardTitle>
              <CardDescription>Basic information and billing details</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Billing Information */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Billed To</h4>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-sm font-medium whitespace-pre-wrap text-foreground leading-relaxed">
                        {invoice.billedTo}
                      </pre>
                    </div>
                  </div>

                  {invoice.notes && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                        Additional Notes
                      </h4>
                      <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                        {invoice.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice Metadata */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Invoice Date</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-900">
                        {formatDate(invoice.invoiceDate)}
                      </span>
                    </div>

                    {invoice.dueDate && (
                      <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-900">Due Date</span>
                        </div>
                        <span className="text-sm font-semibold text-orange-900">
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Tax Rate</span>
                      </div>
                      <span className="text-sm font-semibold text-green-900">
                        {(invoice.taxRate * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Created By</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-900">
                        {invoice.createdBy.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <InvoiceItemsSection
            invoiceId={invoice.id}
            items={invoice.items}
            onItemsChange={fetchInvoice}
          />
          <InvoicePaymentHistory invoice={invoice} onChange={fetchInvoice} />
        </div>

        {/* Right Column - Summary and Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Manage this invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invoice Status Update */}
              <InvoiceStatusUpdate
                invoiceId={invoice.id}
                currentStatus={invoice.status}
                onStatusUpdate={fetchInvoice}
              />

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Actions</h4>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleGeneratePDF()}
                  disabled={isGeneratingPDF}
                >
                  <Eye className="h-4 w-4" />
                  {isGeneratingPDF ? 'Opening PDF...' : 'Preview PDF'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleGeneratePDF(true)}
                  disabled={isGeneratingPDF}
                >
                  <Download className="h-4 w-4" />
                  {isGeneratingPDF ? 'Opening PDF...' : 'Download PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Summary - Sticky */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <InvoiceTotals
              subtotal={invoice.subtotal}
              taxRate={invoice.taxRate}
              taxAmount={invoice.taxAmount}
              serviceCharge={invoice.serviceCharge}
              otherCharges={invoice.otherCharges}
              totalAmount={invoice.totalAmount}
              amountPaid={invoice.amountPaid ?? 0}
              balanceDue={invoice.balanceDue ?? invoice.totalAmount - (invoice.amountPaid ?? 0)}
            />
          </div>
        </div>
      </div>
      <InvoiceFormDialog mode="edit" invoice={invoice} open={editOpen} onOpenChange={setEditOpen} onSuccess={fetchInvoice} />
      <RecordPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} invoiceId={invoice.id} customerName={invoice.customer?.name || invoice.billedTo.split('\n')[0]} balanceDue={Number(invoice.balanceDue ?? invoice.totalAmount - (invoice.amountPaid ?? 0))} onSuccess={fetchInvoice} />
      <RemindersDialog open={remindersOpen} onOpenChange={setRemindersOpen} invoiceId={invoice.id} remindersEnabled={invoice.remindersEnabled ?? false} reminderRules={invoice.reminderRules ?? []} email={invoice.customer?.email} onSuccess={fetchInvoice} />
      <Dialog open={sendOpen} onOpenChange={(open) => { if (!isSending) setSendOpen(open); }}>
        <DialogContent><DialogHeader><DialogTitle>Send Invoice</DialogTitle><DialogDescription>Send the invoice PDF to your customer by email.</DialogDescription></DialogHeader><form onSubmit={(event) => void handleSendInvoice(event)} className="space-y-4"><label className="grid gap-2 text-sm font-medium">To<Input type="email" required value={sendEmail} onChange={(event) => setSendEmail(event.target.value)} placeholder="customer@example.com" /></label><DialogFooter><Button type="button" variant="outline" onClick={() => setSendOpen(false)} disabled={isSending}>Cancel</Button><Button type="submit" disabled={isSending}>{isSending ? 'Sending…' : 'Send with PDF'}</Button></DialogFooter></form></DialogContent>
      </Dialog>
    </div>
  );
}
