import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from './activityLogger';
import { CompanySettings, Lead, QuotationItem, InvoiceItem } from '@/types/database';
import { format } from 'date-fns';

interface QuotationPDFData {
  quoteNumber: string;
  quoteDate: string;
  validUntil: string | null;
  items: QuotationItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  isIgst?: boolean;
}

interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  notes: string | null;
  termsConditions: string | null;
  payment_notes?: string | null;
}

function formatCurrency(amount: number, currency = 'Rs. '): string {
  return currency + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateQuotationPDF(
  data: QuotationPDFData,
  settings: CompanySettings,
  lead: Lead
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let yPos = 15;
  const currency = settings.currency === '₹' ? 'Rs. ' : (settings.currency || 'Rs. ');
  const themeColor = settings.theme_color || '#166534';

  // Top Accent Bar
  doc.setFillColor(themeColor);
  doc.rect(0, 0, pageWidth, 2, 'F');

  // Header Area
  if (settings.logo_url && settings.show_logo_on_pdf !== false) {
    try {
      const logoBase64 = await loadImageAsBase64(settings.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, yPos, 25, 25);
        yPos += 30; // Increased spacing slightly
      }
    } catch (e) {
      yPos += 5;
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(themeColor);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.company_name, margin, yPos + 10);
    yPos += 20;
  }

  // Company Details
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  if (settings.address) {
    const addressLines = doc.splitTextToSize(settings.address, 60);
    doc.text(addressLines, margin, yPos);
    yPos += addressLines.length * 4;
  }
  doc.text(`${settings.email || ''} | ${settings.phone || ''}`, margin, yPos);
  yPos += 5;
  if (settings.gst_number) {
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${settings.gst_number}`, margin, yPos);
    yPos += 5;
  }

  // Right Header Info
  let metaY = 25;
  doc.setFontSize(28);
  doc.setTextColor(themeColor);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', pageWidth - margin, metaY, { align: 'right' });
  
  metaY += 12;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Quote #', pageWidth - margin, metaY, { align: 'right' });
  metaY += 6;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(data.quoteNumber, pageWidth - margin, metaY, { align: 'right' });
  
  metaY += 10;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('DATE', pageWidth - margin - 30, metaY, { align: 'right' });
  doc.text('VALID UNTIL', pageWidth - margin, metaY, { align: 'right' });
  metaY += 4;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(data.quoteDate), pageWidth - margin - 30, metaY, { align: 'right' });
  doc.text(data.validUntil ? formatDate(data.validUntil) : '—', pageWidth - margin, metaY, { align: 'right' });

  yPos = Math.max(yPos + 10, metaY + 15);

  // Bill To Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('BILL TO', margin, yPos);
  yPos += 6;
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(lead.company_name, margin, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(lead.contact_name, margin, yPos);
  yPos += 5;
  
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  if (lead.address) {
    const billToLines = doc.splitTextToSize(lead.address, 80);
    doc.text(billToLines, margin, yPos);
    yPos += billToLines.length * 4;
  }
  doc.text(`${lead.phone || ''} | ${lead.email || ''}`, margin, yPos);
  
  yPos += 15;

  // Items Table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.title + (item.description ? `\n${item.description}` : ''),
    item.quantity.toString(),
    formatCurrency(item.unit_price, currency),
    formatCurrency(item.line_total, currency)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: themeColor,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals Section
  const totalsWidth = 75;
  const totalsX = pageWidth - margin - totalsWidth;
  const boxPadding = 5;
  const rowHeight = 7;
  
  let boxHeight = rowHeight * 2;
  if (data.taxRate > 0) {
    boxHeight += data.isIgst ? rowHeight * 2 : rowHeight * 4;
  }
  
  doc.setFillColor(248, 250, 252);
  doc.rect(totalsX, yPos - 5, totalsWidth, boxHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(totalsX, yPos - 5, totalsWidth, boxHeight, 'D');

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');

  const drawRow = (label: string, value: number) => {
    doc.text(label.toUpperCase(), totalsX + boxPadding, yPos);
    doc.text(formatCurrency(value, currency), pageWidth - margin - boxPadding, yPos, { align: 'right' });
    yPos += rowHeight;
  };

  drawRow('Subtotal', data.subtotal);

  if (data.taxRate > 0) {
    if (data.isIgst) {
      drawRow(`IGST (${data.taxRate}%)`, data.taxAmount);
    } else {
      const halfRate = data.taxRate / 2;
      const halfTax = data.taxAmount / 2;
      drawRow(`CGST (${halfRate}%)`, halfTax);
      drawRow(`SGST (${halfRate}%)`, halfTax);
    }
    doc.setTextColor(50, 50, 50);
    drawRow('Total Tax', data.taxAmount);
  }

  // Grand Total Bar
  doc.setFillColor(themeColor);
  doc.rect(totalsX, yPos - 5, totalsWidth, rowHeight + 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('TOTAL', totalsX + boxPadding, yPos);
  doc.text(formatCurrency(data.total, currency), pageWidth - margin - boxPadding, yPos, { align: 'right' });

  yPos += 15;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Amount in words:', margin, yPos);
  yPos += 4;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'bold');
  doc.text(numberToWords(data.total), margin, yPos);
  
  // Banking Details (from Settings)
  if (settings.bank_name || settings.account_number) {
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('BANKING DETAILS', margin, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    const bankDetails = [
      settings.bank_name ? `Bank: ${settings.bank_name}` : null,
      settings.account_holder_name ? `A/C Holder: ${settings.account_holder_name}` : null,
      settings.account_number ? `A/C Number: ${settings.account_number}` : null,
      settings.ifsc_code ? `IFSC: ${settings.ifsc_code}` : null,
    ].filter(Boolean).join('  |  ');
    
    doc.text(bankDetails, margin, yPos);
    yPos += 10;
  }

  // Notes & Terms
  if (data.notes) {
    yPos += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('NOTES & TERMS', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, yPos);
    yPos += noteLines.length * 4 + 10;
  }

  // Footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

export async function generateInvoicePDF(
  data: InvoicePDFData,
  settings: CompanySettings,
  lead: Lead
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let yPos = 15;
  const currency = settings.currency === '₹' ? 'Rs. ' : (settings.currency || 'Rs. ');
  const themeColor = settings.theme_color || '#166534';

  // Top Accent Bar
  doc.setFillColor(themeColor);
  doc.rect(0, 0, pageWidth, 2, 'F');

  // Header Area
  if (settings.logo_url && settings.show_logo_on_pdf !== false) {
    try {
      const logoBase64 = await loadImageAsBase64(settings.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, yPos, 25, 25);
        yPos += 30; // Increased spacing slightly
      }
    } catch (e) {
      yPos += 5;
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(themeColor);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.company_name, margin, yPos + 10);
    yPos += 20;
  }

  // Company Details
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  if (settings.address) {
    const addressLines = doc.splitTextToSize(settings.address, 60);
    doc.text(addressLines, margin, yPos);
    yPos += addressLines.length * 4;
  }
  doc.text(`${settings.email || ''} | ${settings.phone || ''}`, margin, yPos);
  yPos += 5;
  if (settings.gst_number) {
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${settings.gst_number}`, margin, yPos);
    yPos += 5;
  }

  // Right Header Info
  let metaY = 25;
  doc.setFontSize(28);
  doc.setTextColor(themeColor);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth - margin, metaY, { align: 'right' });
  
  metaY += 12;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Invoice #', pageWidth - margin, metaY, { align: 'right' });
  metaY += 6;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(data.invoiceNumber, pageWidth - margin, metaY, { align: 'right' });
  
  metaY += 10;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('DATE', pageWidth - margin - 30, metaY, { align: 'right' });
  doc.text('DUE DATE', pageWidth - margin, metaY, { align: 'right' });
  metaY += 4;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(data.invoiceDate), pageWidth - margin - 30, metaY, { align: 'right' });
  doc.text(formatDate(data.dueDate), pageWidth - margin, metaY, { align: 'right' });

  yPos = Math.max(yPos + 10, metaY + 15);

  // Bill To Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('BILL TO', margin, yPos);
  yPos += 6;
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(lead.company_name, margin, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(lead.contact_name, margin, yPos);
  yPos += 5;
  
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  if (lead.address) {
    const billToLines = doc.splitTextToSize(lead.address, 80);
    doc.text(billToLines, margin, yPos);
    yPos += billToLines.length * 4;
  }
  doc.text(`${lead.phone || ''} | ${lead.email || ''}`, margin, yPos);
  
  yPos += 15;

  // Items Table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.item_title + (item.description ? `\n${item.description}` : ''),
    item.quantity.toString(),
    formatCurrency(item.unit_price, currency),
    formatCurrency(item.line_total, currency)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: themeColor,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals Section
  const totalsWidth = 75;
  const totalsX = pageWidth - margin - totalsWidth;
  const boxPadding = 5;
  const rowHeight = 7;
  
  let boxHeight = rowHeight * 2;
  if (data.taxEnabled && data.taxRate > 0) {
    boxHeight += rowHeight * 3;
  }
  
  doc.setFillColor(248, 250, 252);
  doc.rect(totalsX, yPos - 5, totalsWidth, boxHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(totalsX, yPos - 5, totalsWidth, boxHeight, 'D');

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');

  const drawRow = (label: string, value: number) => {
    doc.text(label.toUpperCase(), totalsX + boxPadding, yPos);
    doc.text(formatCurrency(value, currency), pageWidth - margin - boxPadding, yPos, { align: 'right' });
    yPos += rowHeight;
  };

  drawRow('Subtotal', data.subtotal);

  if (data.taxEnabled && data.taxRate > 0) {
    const halfRate = data.taxRate / 2;
    const halfTax = data.taxAmount / 2;
    drawRow(`CGST (${halfRate}%)`, halfTax);
    drawRow(`SGST (${halfRate}%)`, halfTax);
    doc.setTextColor(50, 50, 50);
    drawRow('Total Tax', data.taxAmount);
  }

  // Grand Total Bar
  doc.setFillColor(themeColor);
  doc.rect(totalsX, yPos - 5, totalsWidth, rowHeight + 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('TOTAL', totalsX + boxPadding, yPos);
  doc.text(formatCurrency(data.grandTotal, currency), pageWidth - margin - boxPadding, yPos, { align: 'right' });

  yPos += 15;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Amount in words:', margin, yPos);
  yPos += 4;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'bold');
  doc.text(numberToWords(data.grandTotal), margin, yPos);
  
  yPos += 15;

  // Banking Details (from Settings)
  if (settings.bank_name || settings.account_number) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('BANKING DETAILS', margin, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    const bankDetails = [
      settings.bank_name ? `Bank: ${settings.bank_name}` : null,
      settings.account_holder_name ? `A/C Holder: ${settings.account_holder_name}` : null,
      settings.account_number ? `A/C Number: ${settings.account_number}` : null,
      settings.ifsc_code ? `IFSC: ${settings.ifsc_code}` : null,
    ].filter(Boolean).join('  |  ');
    
    doc.text(bankDetails, margin, yPos);
    yPos += 10;
  }

  // Footer Info
  if (data.payment_notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('PAYMENT INSTRUCTIONS', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const pNotesLines = doc.splitTextToSize(data.payment_notes, pageWidth - margin * 2);
    doc.text(pNotesLines, margin, yPos);
    yPos += pNotesLines.length * 4 + 8;
  }
  
  if (data.termsConditions) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text('TERMS & CONDITIONS', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const termsLines = doc.splitTextToSize(data.termsConditions, pageWidth - margin * 2);
    doc.text(termsLines, margin, yPos);
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

export function getPDFBase64(doc: jsPDF): string {
  return doc.output('datauristring').split(',')[1];
}
