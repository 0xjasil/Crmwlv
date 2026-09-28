import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfColumn<T> {
  header: string;
  key: keyof T | ((row: T) => string | number);
}

export const exportPdf = <T>(
  data: T[],
  columns: PdfColumn<T>[],
  fileName = "report.pdf",
  title?: string
) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();

  // Optional title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 20);
  }

  // Table headers
  const tableHead = columns.map((col) => col.header);

  // Table rows
  const tableBody = data.map((row) =>
    columns.map((col) => {
      const value = typeof col.key === "function" ? col.key(row) : row[col.key];
      return typeof value === "string" || typeof value === "number"
        ? value
        : String(value ?? "");
    })
  );

  autoTable(doc, {
    startY: title ? 30 : 20,
    head: [tableHead],
    body: tableBody,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 123, 255] },
  });

  doc.save(fileName);
};
