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
} from 'lucide-react';
import { getInvoiceById } from '@/server/actions/invoice-actions';
import { toast } from 'sonner';
import { InvoiceWithItems, InvoiceStatus } from '@/types/invoice';
import { InvoiceItemsSection } from '@/components/invoice/invoice-items-section';
import { InvoiceTotals } from '@/components/invoice/invoice-totals';
import { InvoiceStatusUpdate } from '@/components/invoice/invoice-status-update';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;

    setIsLoading(true);
    try {
      const result = await getInvoiceById({ id: invoiceId });

      if (result.data?.success) {
        setInvoice(result.data.data as InvoiceWithItems);
      } else {
        toast.error(result.data?.message || 'Failed to fetch invoice');
        router.push('/invoices');
      }
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

      // Open PDF in new tab for preview
      let previewUrl = `/api/invoices/${invoiceId}/pdf`;
      if (!download) previewUrl += '?preview=true';
      window.open(previewUrl, '_blank');

      toast.success('PDF preview opened in new tab!');
    } catch (error) {
      console.error('Error opening PDF preview:', error);
      toast.error(
        'Failed to open PDF preview: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setIsGeneratingPDF(false);
    }
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
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
