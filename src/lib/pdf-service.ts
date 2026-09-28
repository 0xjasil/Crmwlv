import { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { text, table, svg, line, multiVariableText } from '@pdfme/schemas';
import { InvoiceWithItems } from '@/types/invoice';
import { Receipt, AdmissionWithReceiptsAndCourse } from '@/types/fee-collection';
import { InvoiceTemplateMapper as TemplateMapper } from './invoice-template-mapper';
import { ReceiptTemplateMapper } from './receipt-template-mapper';
import fs from 'fs';
import path from 'path';

/**
 * PDF Service for generating invoice PDFs using pdfme
 */
export class PDFService {
  /**
   * Generate a PDF from an invoice
   * @param invoice - Invoice with items to generate PDF for
   * @returns Promise<Uint8Array> - The generated PDF as Uint8Array
   */
  static async generateInvoicePDF(invoice: InvoiceWithItems): Promise<Uint8Array> {
    try {
      // Validate invoice data
      TemplateMapper.validateInvoiceData(invoice);

      // Load the invoice template
      const template = await this.loadInvoiceTemplate();

      // Map invoice data to template inputs
      const templateInputs = TemplateMapper.mapToTemplateInputs(invoice);
      const inputs = [templateInputs];

      // Generate the PDF
      const pdf = await generate({
        template,
        inputs,
        plugins: {
          text,
          table,
          svg,
          line,
          multiVariableText,
        },
      });

      return pdf;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  /**
   * Load the invoice template from the public directory
   * @returns Promise<Template> - The pdfme template
   */
  private static async loadInvoiceTemplate(): Promise<Template> {
    try {
      // Get the path to the template file in the public directory
      const templatePath = path.join(process.cwd(), 'public', 'pdf', 'invoice_template.json');

      // Check if file exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found at: ${templatePath}`);
      }

      // Read and parse the template file
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template = JSON.parse(templateContent);

      return template as Template;
    } catch (error) {
      console.error('Error loading invoice template:', error);
      throw new Error('Failed to load invoice template');
    }
  }

  /**
   * Get PDF as downloadable blob (for browser)
   * @param pdfBuffer - PDF Uint8Array
   * @returns Blob for download
   */
static createDownloadableBlob(pdfBuffer: Uint8Array): Blob {
  const properBuffer = Buffer.from(pdfBuffer);
  return new Blob([properBuffer], { type: 'application/pdf' });
}

  /**
   * Generate preview URL for invoice PDF
   * @param invoiceId - Invoice ID
   * @returns Preview URL string
   */
  static generatePreviewUrl(invoiceId: string): string {
    return `/api/invoices/${invoiceId}/pdf?preview=true`;
  }

  /**
   * Generate download URL for invoice PDF
   * @param invoiceId - Invoice ID
   * @returns Download URL string
   */
  static generateDownloadUrl(invoiceId: string): string {
    return `/api/invoices/${invoiceId}/pdf`;
  }

  /**
   * Generate filename for invoice PDF
   * @param invoice - Invoice data
   * @returns Filename string
   */
  static generateFileName(invoice: InvoiceWithItems): string {
    const date = new Date(invoice.invoiceDate).toISOString().split('T')[0];
    const clientName = invoice.billedTo.split('\n')[0].replace(/[^a-zA-Z0-9]/g, '_');
    return `Invoice_${invoice.invoiceNumber}_${clientName}_${date}.pdf`;
  }

  /**
   * Generate a PDF from a receipt
   * @param receipt - Receipt data to generate PDF for
   * @param admission - Admission with course and receipts data
   * @returns Promise<Uint8Array> - The generated PDF as Uint8Array
   */
  static async generateReceiptPDF(
    receipt: Receipt,
    admission: AdmissionWithReceiptsAndCourse
  ): Promise<Uint8Array> {
    try {
      // Validate receipt data
      ReceiptTemplateMapper.validateReceiptData(receipt, admission);

      // Load the receipt template
      const template = await this.loadReceiptTemplate();

      // Map receipt data to template inputs
      const templateInputs = ReceiptTemplateMapper.mapToTemplateInputs(receipt, admission);
      const inputs = [templateInputs];

      // Generate the PDF
      const pdf = await generate({
        template,
        inputs,
        plugins: {
          text,
          table,
          svg,
          line,
          multiVariableText,
        },
      });

      return pdf;
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      throw new Error('Failed to generate receipt PDF');
    }
  }

  /**
   * Load the receipt template from the public directory
   * @returns Promise<Template> - The pdfme template
   */
  private static async loadReceiptTemplate(): Promise<Template> {
    try {
      // Get the path to the template file in the public directory
      const templatePath = path.join(process.cwd(), 'public', 'pdf', 'receipt_template.json');

      // Check if file exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found at: ${templatePath}`);
      }

      // Read and parse the template file
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template = JSON.parse(templateContent);

      return template as Template;
    } catch (error) {
      console.error('Error loading receipt template:', error);
      throw new Error('Failed to load receipt template');
    }
  }

  /**
   * Generate preview URL for receipt PDF
   * @param receiptId - Receipt ID
   * @returns Preview URL string
   */
  static generateReceiptPreviewUrl(receiptId: string): string {
    return `/api/receipts/${receiptId}/pdf?preview=true`;
  }

  /**
   * Generate download URL for receipt PDF
   * @param receiptId - Receipt ID
   * @returns Download URL string
   */
  static generateReceiptDownloadUrl(receiptId: string): string {
    return `/api/receipts/${receiptId}/pdf`;
  }

  /**
   * Generate filename for receipt PDF
   * @param receipt - Receipt data
   * @param admission - Admission data
   * @returns Filename string
   */
  static generateReceiptFileName(
    receipt: Receipt,
    admission: AdmissionWithReceiptsAndCourse
  ): string {
    const date = new Date(receipt.paymentDate).toISOString().split('T')[0];
    const studentName = admission.candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    return `Receipt_${receipt.receiptNumber}_${studentName}_${date}.pdf`;
  }
}
