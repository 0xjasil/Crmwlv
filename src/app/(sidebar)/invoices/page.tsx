'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Eye, Edit, Trash2, MoreVertical, FileText, RotateCw, Receipt, Download } from 'lucide-react';
import { fetchInvoicesPage } from '@/lib/api/invoice-api';
import { downloadZohoInvoicePdf } from '@/lib/invoice-zoho-pdf';
import { ZohoInvoicePreviewDialog } from '@/components/invoice/zoho-invoice-preview-dialog';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { InvoiceWithItems } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

const InvoiceFormDialog = dynamic(
  () => import('@/components/invoice/invoice-form-dialog').then((mod) => mod.InvoiceFormDialog),
  { ssr: false }
);
const DeleteInvoiceDialog = dynamic(
  () => import('@/components/invoice/delete-invoice-dialog').then((mod) => mod.DeleteInvoiceDialog),
  { ssr: false }
);

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset page to 1 when search or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, pageSize]);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{
    id: string;
    invoiceNumber: string;
  } | null>(null);

  // Zoho Preview dialog state
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceWithItems | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Fetch invoices
  const fetchInvoicesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchInvoicesPage({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });

      if (result.success) {
        setInvoices((result.data || []) as unknown as InvoiceWithItems[]);
        const paginationData = result.pagination || {
          page: currentPage,
          limit: pageSize,
          total: result.data?.length || 0,
          totalPages: Math.ceil((result.data?.length || 0) / pageSize),
        };
        setPagination({
          page: paginationData.page,
          limit: paginationData.limit,
          total: paginationData.total,
          pages: paginationData.totalPages,
        });
      } else {
        toast.error(result.error?.message || result.message || 'Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  // Fetch invoices on component mount and when filters change
  useEffect(() => {
    fetchInvoicesData();
  }, [fetchInvoicesData]);

  // Refresh function to be called after successful invoice creation
  const refreshInvoices = useCallback(() => {
    fetchInvoicesData();
  }, [fetchInvoicesData]);

  // Action handlers for dropdown menu
  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  };

  const handleEditInvoice = (invoice: InvoiceWithItems) => {
    setSelectedInvoice(invoice);
    setEditDialogOpen(true);
  };

  const handleDeleteInvoice = (invoiceId: string, invoiceNumber: string) => {
    setInvoiceToDelete({ id: invoiceId, invoiceNumber });
    setDeleteDialogOpen(true);
  };

  const handlePreviewPdf = (inv: InvoiceWithItems) => {
    setPreviewInvoice(inv);
    setPreviewDialogOpen(true);
  };

  const handleDownloadPdf = (inv: InvoiceWithItems) => {
    try {
      downloadZohoInvoicePdf(inv);
      toast.success(`Invoice ${inv.invoiceNumber} PDF downloaded!`);
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
      toast.error('Failed to download invoice PDF.');
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Invoices"
        description="Create, monitor, and dispatch client billing statements and tax invoices."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={refreshInvoices}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/invoices/new')} variant="default" size="sm" className="h-9 gap-1.5 text-xs font-medium">
              + New
            </Button>
          </div>
        }
      />

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or client name..."
            className="pl-9 h-9 text-xs bg-background"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch('')}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Invoices Table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Invoice Records {pagination?.total ? `(${pagination.total})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-xs font-medium text-muted-foreground">Loading invoice entries...</p>
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices found"
              description="Generate a billing invoice or clear your active search."
              action={
                <Button onClick={() => router.push('/invoices/new')}>
                  + New Invoice
                </Button>
              }
            />
          ) : (
            <div className="relative overflow-x-auto">
              {isLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Invoice No.</TableHead>
                    <TableHead>Billed To</TableHead>
                    <TableHead className="w-[130px]">Invoice Date</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[130px] text-right">Total Amount</TableHead>
                    <TableHead className="w-[130px]">Created By</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => handleViewInvoice(invoice.id)}
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[220px] truncate text-xs font-medium text-foreground" title={invoice.billedTo}>
                          {invoice.billedTo.split('\n')[0]}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(invoice.invoiceDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        <div>{formatCurrency(invoice.totalAmount)}</div>
                        {Number(invoice.amountPaid ?? 0) > 0 && Number(invoice.balanceDue ?? 0) > 0 && (
                          <div className="mt-1 font-sans text-[11px] font-normal text-muted-foreground">Balance {formatCurrency(Number(invoice.balanceDue))}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {invoice.createdBy.name}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewInvoice(invoice.id)}
                              className="text-xs"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditInvoice(invoice)}
                              className="text-xs"
                            >
                              <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Edit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePreviewPdf(invoice)}
                              className="text-xs"
                            >
                              <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Preview PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownloadPdf(invoice)}
                              className="text-xs"
                            >
                              <Download className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                              className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && (
                <div className="p-3 border-t border-border/60 bg-muted/10">
                  <DataTablePagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages || 1}
                    pageSize={pageSize}
                    totalRecords={pagination.total}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Outside of dropdown to prevent unmounting */}
      {selectedInvoice && (
        <InvoiceFormDialog
          mode="edit"
          invoice={selectedInvoice}
          onSuccess={refreshInvoices}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Delete Dialog - Outside of dropdown to prevent unmounting */}
      {invoiceToDelete && (
        <DeleteInvoiceDialog
          invoiceId={invoiceToDelete.id}
          invoiceNumber={invoiceToDelete.invoiceNumber}
          onSuccess={() => {
            refreshInvoices();
            setInvoiceToDelete(null);
          }}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
      )}
      {/* Zoho Preview Dialog */}
      <ZohoInvoicePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        invoice={previewInvoice}
      />
    </PageContainer>
  );
}
