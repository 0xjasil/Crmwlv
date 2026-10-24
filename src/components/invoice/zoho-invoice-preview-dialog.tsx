"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Printer,
  ExternalLink,
  Receipt,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { InvoiceWithItems, InvoiceStatus } from "@/types/invoice";
import { formatCurrency } from "@/lib/utils";
import { downloadZohoInvoicePdf, getZohoInvoicePdfBlobUrl } from "@/lib/invoice-zoho-pdf";
import { toast } from "sonner";

interface ZohoInvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithItems | null;
}

export function ZohoInvoicePreviewDialog({
  open,
  onOpenChange,
  invoice,
}: ZohoInvoicePreviewDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!invoice) return null;

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(date);
    }
  };

  const handleDownload = () => {
    try {
      setIsExporting(true);
      downloadZohoInvoicePdf(invoice);
      toast.success("Invoice PDF downloaded successfully!");
    } catch (err: any) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenPdfTab = () => {
    try {
      const url = getZohoInvoicePdfBlobUrl(invoice);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success("PDF opened in new tab");
    } catch (err: any) {
      console.error("Failed to open PDF tab:", err);
      toast.error("Failed to open PDF tab.");
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> PAID
          </Badge>
        );
      case InvoiceStatus.PARTIALLY_PAID:
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            <Clock className="w-3 h-3 mr-1" /> PARTIALLY PAID
          </Badge>
        );
      case InvoiceStatus.OVERDUE:
        return (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-semibold">
            <AlertCircle className="w-3 h-3 mr-1" /> OVERDUE
          </Badge>
        );
      case InvoiceStatus.SENT:
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            <Clock className="w-3 h-3 mr-1" /> SENT
          </Badge>
        );
      case InvoiceStatus.CANCELLED:
        return (
          <Badge variant="secondary" className="text-muted-foreground font-semibold">
            <XCircle className="w-3 h-3 mr-1" /> CANCELLED
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-semibold">
            DRAFT
          </Badge>
        );
    }
  };

  const subtotal = Number(invoice.subtotal || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const balanceDue = Number(
    invoice.balanceDue ?? (totalAmount - amountPaid)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-muted/40">
        {/* Modal Top Bar */}
        <DialogHeader className="p-4 bg-background border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Zoho Invoice Preview
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  #{invoice.invoiceNumber}
                </span>
              </DialogTitle>
            </div>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenPdfTab}
              className="h-8 text-xs gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open PDF
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Paper Sheet Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center">
          <div className="w-full max-w-3xl bg-white text-slate-900 shadow-xl rounded-lg border border-slate-200 p-8 space-y-6">
            {/* Top Brand Banner */}
            <div className="h-1.5 bg-blue-600 -mx-8 -mt-8 rounded-t-lg" />

            {/* Header: Company & Tax Invoice */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">
                    ELEVATE SOLAR CRM
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Solar Rooftop EPC & Green Energy Solutions
                </p>
                <p className="text-xs text-slate-500">
                  GSTIN: <span className="font-mono">32AABCU9603R1ZM</span> | State: 32 - Kerala
                </p>
                <p className="text-xs text-slate-500">
                  Email: billing@crm.elevate.com | Web: crm.elevate.com
                </p>
              </div>

              <div className="sm:text-right space-y-1.5">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  TAX INVOICE
                </h2>
                <div>{getStatusBadge(invoice.status)}</div>
                <div className="pt-1 text-xs text-slate-600 space-y-0.5">
                  <div>
                    <span className="text-slate-400">Invoice No: </span>
                    <strong className="font-mono text-slate-900">
                      #{invoice.invoiceNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Invoice Date: </span>
                    <strong className="text-slate-900">
                      {formatDate(invoice.invoiceDate)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Due Date: </span>
                    <strong className="text-slate-900">
                      {formatDate(invoice.dueDate || invoice.invoiceDate)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-200" />

            {/* 2-Column Info: Customer & Payment Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billed To / Site Owner
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {invoice.customer?.name || invoice.billedTo}
                </p>
                {invoice.customer?.address && (
                  <p className="text-xs text-slate-600 whitespace-pre-line">
                    {invoice.customer.address}
                  </p>
                )}
                {invoice.customer?.phone && (
                  <p className="text-xs text-slate-600">
                    Tel: <span className="font-medium">{invoice.customer.phone}</span>
                  </p>
                )}
                {invoice.customer?.email && (
                  <p className="text-xs text-slate-600">
                    Email: <span className="font-medium">{invoice.customer.email}</span>
                  </p>
                )}
                {invoice.customer?.gstin && (
                  <p className="text-xs text-slate-600 font-mono">
                    GSTIN: {invoice.customer.gstin}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Payment Summary
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Amount:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Balance Due:</span>
                    <span
                      className={`font-bold ${
                        balanceDue > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-white uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-4">Item & Description</th>
                    <th className="py-2.5 px-3 text-right w-16">Qty</th>
                    <th className="py-2.5 px-4 text-right w-28">Rate</th>
                    <th className="py-2.5 px-4 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(invoice.items && invoice.items.length > 0
                    ? invoice.items
                    : [
                        {
                          id: "default",
                          itemDescription: "Solar EPC Project & Installation Services",
                          quantity: 1,
                          unitPrice: invoice.subtotal || invoice.totalAmount,
                          lineTotal: invoice.subtotal || invoice.totalAmount,
                        },
                      ]
                  ).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={idx % 2 === 1 ? "bg-slate-50/50" : ""}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {item.itemDescription}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-mono">
                        {formatCurrency(Number(item.unitPrice || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                        {formatCurrency(Number(item.lineTotal || (item.quantity * item.unitPrice)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Bank Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Bank Details */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Bank & Payment Details
                </h4>
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1 text-slate-600">
                  <p>
                    <span className="text-slate-400">Bank Name:</span> HDFC Bank / State Bank of India
                  </p>
                  <p>
                    <span className="text-slate-400">Account Name:</span> Elevate Solar Energy Solutions
                  </p>
                  <p>
                    <span className="text-slate-400">Account Number:</span>{" "}
                    <span className="font-mono font-medium text-slate-900">50200084729103</span>
                  </p>
                  <p>
                    <span className="text-slate-400">IFSC Code:</span>{" "}
                    <span className="font-mono font-medium text-slate-900">HDFC0001824</span>
                  </p>
                  <p>
                    <span className="text-slate-400">UPI ID:</span>{" "}
                    <span className="font-mono font-medium text-slate-900">elevatesolar@upi</span>
                  </p>
                </div>

                {invoice.notes && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Notes:
                    </span>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 mt-0.5">
                      {invoice.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>
                      Tax Amount{invoice.taxRate ? ` (${(invoice.taxRate * 100).toFixed(0)}%)` : ""}:
                    </span>
                    <span className="font-mono font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                {Number(invoice.serviceCharge || 0) > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Service Charge:</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(Number(invoice.serviceCharge))}
                    </span>
                  </div>
                )}
                {Number(invoice.otherCharges || 0) > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Other Charges:</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(Number(invoice.otherCharges))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t border-b border-slate-300 font-bold text-sm text-slate-900">
                  <span>Total Amount:</span>
                  <span className="font-mono text-base">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-600 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">{formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between py-1.5 bg-slate-50 px-2 rounded font-bold text-sm">
                  <span className="text-slate-800">Balance Due:</span>
                  <span
                    className={`font-mono ${
                      balanceDue > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-2">
              <p>
                Terms & Conditions: 1. Payment due upon presentation. 2. Solar subsidy subject to discom rules. 3. Computer generated invoice.
              </p>
              <p className="font-semibold text-slate-600 whitespace-nowrap">
                Authorized Signatory: Elevate Solar Energy Solutions
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
