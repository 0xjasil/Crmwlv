import { InvoiceWithItems } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';

// Define specific types for template inputs to avoid using 'any'
interface TemplateInputs {
  billedToInput: string;
  info: string; // JSON string containing invoice info
  orders: string[][]; // 2D array for table data
  taxInput: string; // JSON string containing tax info
  date: string;
  subtotal: number;
  tax: number;
  total: number;
  // Add formatted currency values for PDF display
  subtotalFormatted: string;
  taxFormatted: string;
  totalFormatted: string;
  serviceChargeFormatted: string;
  otherChargesFormatted: string;
}

interface PreviewData {
  templateInputs: TemplateInputs;
  computedValues: {
    subtotalCalculated: number;
    taxCalculated: number;
    totalCalculated: number;
  };
  itemCount: number;
  hasMultiplePages: boolean;
}

/**
 * Maps invoice data to the specific template format used in invoice_template.json
 */
export class InvoiceTemplateMapper {
  /**
   * Map invoice data to template inputs that match the existing template structure
   * @param invoice - Invoice with items to map
   * @returns Template inputs object
   */
  static mapToTemplateInputs(invoice: InvoiceWithItems): TemplateInputs {
    // Format dates
    const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : invoiceDate;

    // Convert items to table format (2D array)
    // Template expects: [Item, Quantity, Unit Price, Total]
    const orderItems = invoice.items.map((item) => [
      item.itemDescription,
      item.quantity.toString(),
      formatCurrency(item.unitPrice), // Format unit price in INR
      formatCurrency(item.lineTotal), // Format line total in INR
    ]);

    // Prepare template inputs according to template field names
    return {
      // Billed to field
      billedToInput: invoice.billedTo,

      // Invoice info object for multiVariableText field (must be JSON string)
      info: JSON.stringify({
        InvoiceNo: invoice.invoiceNumber,
        Date: invoiceDate,
      }),

      // Orders table (2D array)
      orders: orderItems,

      // Tax input object for tax rate (must be JSON string)
      taxInput: JSON.stringify({
        rate: (invoice.taxRate * 100).toString(), // Convert 0.18 to "18"
      }),

      // For static footer calculations
      date: dueDate,

      // Additional computed values that might be referenced - format in INR
      subtotal: invoice.subtotal,
      tax: invoice.taxAmount,
      total: invoice.totalAmount,

      // Formatted currency values for PDF display
      subtotalFormatted: formatCurrency(invoice.subtotal),
      taxFormatted: formatCurrency(invoice.taxAmount),
      totalFormatted: formatCurrency(invoice.totalAmount),
      serviceChargeFormatted: formatCurrency(invoice.serviceCharge),
      otherChargesFormatted: formatCurrency(invoice.otherCharges),
    };
  }
  /**
   * Validate that the invoice has the required data for PDF generation
   * @param invoice - Invoice to validate
   * @returns True if valid, throws error if invalid
   */
  static validateInvoiceData(invoice: InvoiceWithItems): boolean {
    if (!invoice.invoiceNumber) {
      throw new Error('Invoice number is required');
    }

    if (!invoice.billedTo || invoice.billedTo.trim() === '') {
      throw new Error('Billed to information is required');
    }

    if (!invoice.invoiceDate) {
      throw new Error('Invoice date is required');
    }

    if (invoice.items.length === 0) {
      throw new Error('At least one invoice item is required');
    }

    // Validate each item
    invoice.items.forEach((item, index) => {
      if (!item.itemDescription || item.itemDescription.trim() === '') {
        throw new Error(`Item ${index + 1}: Description is required`);
      }
      if (item.quantity <= 0) {
        throw new Error(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.unitPrice < 0) {
        throw new Error(`Item ${index + 1}: Unit price cannot be negative`);
      }
    });

    return true;
  }

  /**
   * Create a preview data object for testing template mapping
   * @param invoice - Invoice data
   * @returns Preview object with formatted data
   */
  static createPreviewData(invoice: InvoiceWithItems): PreviewData {
    const templateInputs = this.mapToTemplateInputs(invoice);

    return {
      templateInputs,
      computedValues: {
        subtotalCalculated: invoice.items.reduce((sum, item) => sum + item.lineTotal, 0),
        taxCalculated: templateInputs.subtotal * invoice.taxRate,
        totalCalculated:
          templateInputs.subtotal +
          templateInputs.tax +
          invoice.serviceCharge +
          invoice.otherCharges,
      },
      itemCount: invoice.items.length,
      hasMultiplePages: invoice.items.length > 10, // Estimate based on template space
    };
  }
}
