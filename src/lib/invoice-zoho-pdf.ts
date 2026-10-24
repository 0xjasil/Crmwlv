import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvoiceWithItems, InvoiceStatus } from "@/types/invoice";

// Format currency as Indian Rupees (₹)
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Format dates nicely
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

/**
 * Builds a Zoho-style Tax Invoice PDF using jsPDF and jspdf-autotable
 */
export function buildZohoInvoicePdf(invoice: InvoiceWithItems): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Color Palette (Zoho Navy / Slate theme)
  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800 / Navy
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600
  const darkTextColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const mutedTextColor: [number, number, number] = [100, 116, 139]; // Slate 500
  const lightBgColor: [number, number, number] = [248, 250, 252]; // Slate 50
  const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200

  // Status Colors
  const statusColors: Record<string, [number, number, number]> = {
    PAID: [22, 163, 74], // Green
    PARTIALLY_PAID: [217, 119, 6], // Amber
    SENT: [37, 99, 235], // Blue
    OVERDUE: [220, 38, 38], // Red
    DRAFT: [100, 116, 139], // Slate
    CANCELLED: [107, 114, 128], // Gray
  };

  const status = invoice.status || "DRAFT";
  const statusColor = statusColors[status] || primaryColor;

  let y = margin;

  // --- TOP ACCENT BAR ---
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, pageWidth, 4, "F");

  y += 4;

  // --- HEADER SECTION ---
  // Left: Company Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("ELEVATE SOLAR CRM", margin, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("Solar Rooftop EPC & Green Energy Solutions", margin, y + 11);
  doc.text("GSTIN: 32AABCU9603R1ZM | State: 32 - Kerala", margin, y + 16);
  doc.text("Email: billing@crm.elevate.com | Web: crm.elevate.com", margin, y + 21);

  // Right: TAX INVOICE Title & Meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TAX INVOICE", pageWidth - margin, y + 7, { align: "right" });

  // Status Badge Pill
  const statusLabel = status.replace(/_/g, " ");
  const badgeWidth = Math.max(26, doc.getTextWidth(statusLabel) + 8);
  const badgeHeight = 6.5;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = y + 11;

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, badgeX + badgeWidth / 2, badgeY + 4.5, { align: "center" });

  y += 28;

  // Divider Line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;

  // --- INVOICE META & BILL TO SECTION (2 Columns) ---
  const colWidth = (contentWidth - 8) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + 8;

  // Box 1: Billed To (Customer Details)
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(leftX, y, colWidth, 42, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("BILLED TO / SITE OWNER", leftX + 4, y + 6);

  const customerName = invoice.customer?.name || invoice.billedTo || "Customer";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(customerName.slice(0, 38), leftX + 4, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

  let addrY = y + 18;
  if (invoice.customer?.address) {
    const addressLines = doc.splitTextToSize(invoice.customer.address, colWidth - 8);
    doc.text(addressLines.slice(0, 2), leftX + 4, addrY);
    addrY += addressLines.slice(0, 2).length * 4;
  }

  const phone = invoice.customer?.phone;
  const email = invoice.customer?.email;
  const contactText = [phone ? `Tel: ${phone}` : null, email ? `Email: ${email}` : null]
    .filter(Boolean)
    .join(" | ");

  if (contactText) {
    doc.text(contactText.slice(0, 48), leftX + 4, addrY);
    addrY += 4.5;
  }

  if (invoice.customer?.gstin) {
    doc.text(`Customer GSTIN: ${invoice.customer.gstin}`, leftX + 4, addrY);
  }

  // Box 2: Invoice Details & Quick Numbers
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.roundedRect(rightX, y, colWidth, 42, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("INVOICE DETAILS", rightX + 4, y + 6);

  const metaItems = [
    { label: "Invoice Number:", val: `#${invoice.invoiceNumber}` },
    { label: "Invoice Date:", val: formatDate(invoice.invoiceDate) },
    { label: "Due Date:", val: formatDate(invoice.dueDate || invoice.invoiceDate) },
    {
      label: "Total Balance Due:",
      val: formatCurrency(Number(invoice.balanceDue ?? (invoice.totalAmount - (invoice.amountPaid || 0)))),
      isHighlight: true,
    },
  ];

  let metaY = y + 13;
  metaItems.forEach((item) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(item.label, rightX + 4, metaY);

    doc.setFont("helvetica", item.isHighlight ? "bold" : "bold");
    doc.setFontSize(item.isHighlight ? 9.5 : 8.5);
    if (item.isHighlight) {
      const balance = Number(invoice.balanceDue ?? (invoice.totalAmount - (invoice.amountPaid || 0)));
      if (balance > 0) {
        doc.setTextColor(220, 38, 38); // Red
      } else {
        doc.setTextColor(22, 163, 74); // Green
      }
    } else {
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    }
    doc.text(item.val, rightX + colWidth - 4, metaY, { align: "right" });
    metaY += 6.5;
  });

  y += 48;

  // --- ITEM TABLE (jspdf-autotable) ---
  const tableHeaders = [
    ["#", "Item & Description", "Qty", "Unit Price", "Total Amount"],
  ];

  const tableBody = (invoice.items && invoice.items.length > 0
    ? invoice.items
    : [
        {
          itemDescription: "Solar EPC Project & Installation Services",
          quantity: 1,
          unitPrice: invoice.subtotal || invoice.totalAmount,
          lineTotal: invoice.subtotal || invoice.totalAmount,
        },
      ]
  ).map((item, index) => [
    String(index + 1),
    item.itemDescription || "Service Item",
    String(item.quantity ?? 1),
    formatCurrency(Number(item.unitPrice || 0)),
    formatCurrency(Number(item.lineTotal ?? (item.quantity * item.unitPrice))),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableBody,
    theme: "striped",
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: darkTextColor,
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 18, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 36, halign: "right", fontStyle: "bold" },
    },
    styles: {
      overflow: "linebreak",
      lineColor: borderColor,
      lineWidth: 0.2,
    },
  });

  // Position after table
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  y = finalY;

  // --- TOTALS & SUMMARY SECTION ---
  const summaryBoxWidth = 82;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  const subtotal = Number(invoice.subtotal || 0);
  const taxRate = Number(invoice.taxRate || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const balanceDue = Number(invoice.balanceDue ?? (totalAmount - amountPaid));

  const summaryRows: Array<{ label: string; val: string; bold?: boolean; highlight?: boolean; color?: [number, number, number] }> = [
    { label: "Subtotal:", val: formatCurrency(subtotal) },
  ];

  if (taxAmount > 0 || taxRate > 0) {
    const rateText = taxRate > 0 ? ` (${(taxRate * 100).toFixed(0)}% GST)` : "";
    summaryRows.push({
      label: `Tax Amount${rateText}:`,
      val: formatCurrency(taxAmount),
    });
  }

  if (Number(invoice.serviceCharge || 0) > 0) {
    summaryRows.push({
      label: "Service Charge:",
      val: formatCurrency(Number(invoice.serviceCharge)),
    });
  }

  if (Number(invoice.otherCharges || 0) > 0) {
    summaryRows.push({
      label: "Other Charges:",
      val: formatCurrency(Number(invoice.otherCharges)),
    });
  }

  summaryRows.push({
    label: "Total Invoice Amount:",
    val: formatCurrency(totalAmount),
    bold: true,
  });

  summaryRows.push({
    label: "Amount Paid:",
    val: formatCurrency(amountPaid),
    color: [22, 163, 74],
  });

  summaryRows.push({
    label: "Balance Due:",
    val: formatCurrency(balanceDue),
    bold: true,
    highlight: true,
    color: balanceDue > 0 ? [220, 38, 38] : [22, 163, 74],
  });

  // Check if we need space or new page for summary
  if (y + summaryRows.length * 6 + 40 > pageHeight - margin) {
    doc.addPage();
    y = margin + 10;
  }

  // Left Section: Bank Details & Notes
  const leftInfoWidth = contentWidth - summaryBoxWidth - 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BANK & PAYMENT DETAILS", margin, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text("Bank Name: HDFC Bank / State Bank of India", margin, y + 10);
  doc.text("Account Name: Elevate Solar Energy Solutions", margin, y + 15);
  doc.text("Account Number: 50200084729103 | IFSC: HDFC0001824", margin, y + 20);
  doc.text("UPI ID: elevatesolar@upi (Mention Invoice # in remarks)", margin, y + 25);

  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("NOTES:", margin, y + 33);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(invoice.notes, leftInfoWidth);
    doc.text(noteLines.slice(0, 3), margin, y + 38);
  }

  // Right Section: Summary Box
  let rowY = y;
  summaryRows.forEach((row) => {
    if (row.highlight) {
      doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.roundedRect(summaryX - 2, rowY - 1, summaryBoxWidth + 2, 7.5, 1, 1, "FD");
    }

    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(row.bold ? 9.5 : 8.5);
    doc.setTextColor(row.color ? row.color[0] : mutedTextColor[0], row.color ? row.color[1] : mutedTextColor[1], row.color ? row.color[2] : mutedTextColor[2]);
    doc.text(row.label, summaryX, rowY + 4);

    doc.setFont("helvetica", "bold");
    doc.text(row.val, pageWidth - margin, rowY + 4, { align: "right" });

    rowY += 6.5;
  });

  // --- FOOTER & SIGNATURE ---
  const footerY = Math.max(rowY + 16, y + 48);

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(
    "Terms & Conditions: 1. Payment is due as per invoice terms. 2. Solar subsidy and net-metering approvals subject to discom rules. 3. This is a computer-generated tax invoice.",
    margin,
    footerY + 5
  );

  doc.text("Authorized Signatory: Elevate Solar Energy Solutions", pageWidth - margin, footerY + 5, {
    align: "right",
  });

  // Add Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  return doc;
}

/**
 * Downloads the Zoho-style PDF directly in the browser
 */
export function downloadZohoInvoicePdf(invoice: InvoiceWithItems, fileName?: string): void {
  const doc = buildZohoInvoicePdf(invoice);
  const cleanName = fileName || `Invoice-${invoice.invoiceNumber || invoice.id || "draft"}.pdf`;
  doc.save(cleanName);
}

/**
 * Returns a Blob URL for previewing the Zoho-style PDF in an iframe or new tab
 */
export function getZohoInvoicePdfBlobUrl(invoice: InvoiceWithItems): string {
  const doc = buildZohoInvoicePdf(invoice);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}
