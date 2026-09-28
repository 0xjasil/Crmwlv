import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ServiceBillPdfData {
  serviceBill: {
    id: string;
    billId: string;
    total: number;
    status: string;
    paid: number;
    balance: number;
    billDate: Date;
    updatedAt: Date;
  };
  services: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  admission: {
    candidateName: string;
    admissionNumber: string;
    mobileNumber: string;
    email?: string;
    address: string;
    course: {
      name: string;
    };
    createdBy: {
      name: string;
    };
  };
}

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

// Utility function to format date
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const exportServiceBillPdf = (
  data: ServiceBillPdfData,
  fileName?: string
) => {
  if (!data) return;

  const { serviceBill, services, admission } = data;
  
  // Create PDF document
  const doc = new jsPDF();
  
  // Set up colors
  const primaryColor = [0, 123, 255] as [number, number, number];
  const secondaryColor = [108, 117, 125] as [number, number, number];
  const successColor = [40, 167, 69] as [number, number, number];
  
  let yPosition = 20;

  // Header - Company/Institution Name
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Service Bill Invoice", 14, yPosition);
  
  yPosition += 15;
  
  // Bill Information Header
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Bill ID: ${serviceBill.billId}`, 14, yPosition);
  doc.text(`Date: ${formatDate(serviceBill.billDate)}`, 120, yPosition);
  
  yPosition += 10;
  doc.text(`Status: ${serviceBill.status}`, 14, yPosition);
  doc.text(`Total Amount: ${formatCurrency(serviceBill.total)}`, 120, yPosition);

  yPosition += 10;
  doc.text(`Amount Paid: ${formatCurrency(serviceBill.paid)}`, 14, yPosition);
  doc.text(`Balance Due: ${formatCurrency(serviceBill.balance)}`, 120, yPosition);
  
  yPosition += 20;

  // Student Information Section
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Student Information", 14, yPosition);
  
  yPosition += 10;
  
  // Student details table
  const studentDetails = [
    ["Student Name", admission.candidateName],
    ["Admission Number", admission.admissionNumber],
    ["Mobile Number", admission.mobileNumber],
    ["Email", admission.email || "N/A"],
    ["Course", admission.course.name],
    ["Address", admission.address],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [["Field", "Details"]],
    body: studentDetails,
    styles: { 
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: { 
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 120 }
    },
    theme: 'striped',
    margin: { left: 14, right: 14 }
  });

  // Update yPosition after table
 yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Services Section
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Services Included", 14, yPosition);
  
  yPosition += 10;

  // Services table
  const serviceTableData = services.map((service, index) => [
    (index + 1).toString(),
    service.name,
    service.id,
    formatCurrency(service.price)
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [["S.No", "Service Name", "Service ID", "Price"]],
    body: serviceTableData,
    styles: { 
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: { 
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { cellWidth: 80 },
      2: { cellWidth: 40, fontSize: 8 },
      3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
    },
    theme: 'striped',
    margin: { left: 14, right: 14 }
  });

  // Update yPosition after table
  yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Total calculation section
  const subtotal = services.reduce((sum, service) => sum + service.price, 0);
  
  autoTable(doc, {
    startY: yPosition,
    body: [
      ["", "", "Subtotal:", formatCurrency(subtotal)],
      ["", "", "Tax (if applicable):", "₹0.00"],
      ["", "", "Total Amount:", formatCurrency(serviceBill.total)]
    ],
    styles: { 
      fontSize: 11,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 80 },
      2: { 
        halign: 'right', 
        cellWidth: 40, 
        fontStyle: 'bold',
        textColor: secondaryColor
      },
      3: { 
        halign: 'right', 
        cellWidth: 30, 
        fontStyle: 'bold'
      }
    },
    theme: 'plain',
    margin: { left: 14, right: 14 }
  });

  // Final total row with highlight
  yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  
  autoTable(doc, {
    startY: yPosition,
    body: [
      ["", "", "GRAND TOTAL:", formatCurrency(serviceBill.total)]
    ],
    styles: { 
      fontSize: 12,
      cellPadding: 8,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 80 },
      2: { 
        halign: 'right', 
        cellWidth: 40, 
        fillColor: successColor,
        textColor: [255, 255, 255]
      },
      3: { 
        halign: 'right', 
        cellWidth: 30, 
        fillColor: successColor,
        textColor: [255, 255, 255]
      }
    },
    theme: 'plain',
    margin: { left: 14, right: 14 }
  });

  // Update yPosition for footer
  yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Footer information
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.text("Bill Details:", 14, yPosition);
  yPosition += 8;
  doc.text(`• Created By: ${admission.createdBy.name}`, 18, yPosition);
  yPosition += 6;
  doc.text(`• Created Date: ${formatDate(serviceBill.billDate)}`, 18, yPosition);
  yPosition += 6;
  doc.text(`• Last Updated: ${formatDate(serviceBill.updatedAt)}`, 18, yPosition);
  yPosition += 6;
  doc.text(`• Bill Status: ${serviceBill.status}`, 18, yPosition);

  // Footer note
  yPosition += 15;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("This is a computer-generated document. No signature required.", 14, yPosition);
  
  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }

  // Generate filename if not provided
  const defaultFileName = `service-bill-${serviceBill.billId}-${admission.candidateName.replace(/\s+/g, '-')}.pdf`;
  
  // Save the PDF
  doc.save(fileName || defaultFileName);
};
