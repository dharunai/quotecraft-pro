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
}

function formatCurrency(amount: number, currency = '₹'): string {
  return currency + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
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
  let yPos = margin;
  const currency = settings.currency || '₹';
  const themeColor = settings.theme_color || '#166534';

  // Header with logo
  doc.setFontSize(20);
  doc.setTextColor(themeColor);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', margin, yPos + 8);

  // Company logo (if available)
  if (settings.logo_url && settings.show_logo_on_pdf !== false) {
    try {
      const logoBase64 = await loadImageAsBase64(settings.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth - margin - 40, yPos, 40, 20);
      }
    } catch (e) {
      console.log('Could not load logo');
    }
  }

  yPos += 20;

  // Company Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name, margin, yPos);
  yPos += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (settings.address) {
    const addressLines = doc.splitTextToSize(settings.address, 80);
    doc.text(addressLines, margin, yPos);
    yPos += addressLines.length * 4;
  }

  const contactInfo: string[] = [];
  if (settings.email) contactInfo.push(settings.email);
  if (settings.phone) contactInfo.push(settings.phone);
  if (contactInfo.length) {
    doc.text(contactInfo.join(' | '), margin, yPos);
    yPos += 5;
  }

  const taxInfo: string[] = [];
  if (settings.gst_number) taxInfo.push(`GST: ${settings.gst_number}`);
  if (settings.pan) taxInfo.push(`PAN: ${settings.pan}`);
  if (taxInfo.length) {
    doc.text(taxInfo.join(' | '), margin, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Divider
  doc.setDrawColor(themeColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Quote Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Quote #: ${data.quoteNumber}`, margin, yPos);
  doc.text(`Date: ${formatDate(data.quoteDate)}`, pageWidth - margin - 50, yPos);
  yPos += 5;
  if (data.validUntil) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Valid Until: ${formatDate(data.validUntil)}`, margin, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Divider
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILL TO:', margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(lead.company_name, margin, yPos);
  yPos += 4;
  doc.text(lead.contact_name, margin, yPos);
  yPos += 4;
  if (lead.address) {
    const addressLines = doc.splitTextToSize(lead.address, 80);
    doc.text(addressLines, margin, yPos);
    yPos += addressLines.length * 4;
  }
  const leadContact: string[] = [];
  if (lead.email) leadContact.push(lead.email);
  if (lead.phone) leadContact.push(lead.phone);
  if (leadContact.length) {
    doc.text(leadContact.join(' | '), margin, yPos);
  }

  yPos += 10;

  // Items Table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.title,
    item.description || '',
    item.quantity.toString(),
    formatCurrency(item.unit_price, currency),
    formatCurrency(item.line_total, currency),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Item/Service', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: themeColor,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals
  const totalsX = pageWidth - margin - 60;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(formatCurrency(data.subtotal, currency), pageWidth - margin, yPos, { align: 'right' });
  yPos += 5;

  if (data.taxRate > 0) {
    doc.text(`Tax (${data.taxRate}%):`, totalsX, yPos);
    doc.text(formatCurrency(data.taxAmount, currency), pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
  }

  doc.setLineWidth(0.3);
  doc.line(totalsX, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Grand Total:', totalsX, yPos);
  doc.setTextColor(themeColor);
  doc.text(formatCurrency(data.total, currency), pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;
  doc.setTextColor(0, 0, 0);

  // Terms
  if (settings.terms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TERMS & CONDITIONS:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const termsLines = doc.splitTextToSize(settings.terms, pageWidth - margin * 2);
    doc.text(termsLines, margin, yPos);
    yPos += termsLines.length * 4 + 5;
  }

  // Notes
  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Notes:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 4 + 10;
  }

  // Footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });

  if (settings.pdf_footer_text) {
    yPos += 10;
    doc.setFontSize(8);
    doc.text(settings.pdf_footer_text, pageWidth / 2, yPos, { align: 'center' });
  }

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
  let yPos = margin;
  const currency = settings.currency || '₹';
  const themeColor = settings.theme_color || '#166534';

  // Header
  doc.setFontSize(18);
  doc.setTextColor(themeColor);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth / 2, yPos + 8, { align: 'center' });

  // Company logo
  if (settings.logo_url && settings.show_logo_on_pdf !== false) {
    try {
      const logoBase64 = await loadImageAsBase64(settings.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth - margin - 40, yPos, 40, 20);
      }
    } catch (e) {
      console.log('Could not load logo');
    }
  }

  yPos += 20;

  // Company Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name, margin, yPos);
  yPos += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (settings.address) {
    const addressLines = doc.splitTextToSize(settings.address, 80);
    doc.text(addressLines, margin, yPos);
    yPos += addressLines.length * 4;
  }

  const contactInfo: string[] = [];
  if (settings.email) contactInfo.push(settings.email);
  if (settings.phone) contactInfo.push(settings.phone);
  if (contactInfo.length) {
    doc.text(contactInfo.join(' | '), margin, yPos);
    yPos += 5;
  }

  const taxInfo: string[] = [];
  if (settings.gst_number) taxInfo.push(`GST: ${settings.gst_number}`);
  if (settings.pan) taxInfo.push(`PAN: ${settings.pan}`);
  if (taxInfo.length) {
    doc.text(taxInfo.join(' | '), margin, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Divider
  doc.setDrawColor(themeColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Invoice Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: ${data.invoiceNumber}`, margin, yPos);
  doc.text(`Date: ${formatDate(data.invoiceDate)}`, pageWidth - margin - 50, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Due Date: ${formatDate(data.dueDate)}`, margin, yPos);

  yPos += 8;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILL TO:', margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(lead.company_name, margin, yPos);
  yPos += 4;
  doc.text(lead.contact_name, margin, yPos);
  yPos += 4;
  if (lead.address) {
    const addressLines = doc.splitTextToSize(lead.address, 80);
    doc.text(addressLines, margin, yPos);
    yPos += addressLines.length * 4;
  }
  const leadContact: string[] = [];
  if (lead.email) leadContact.push(lead.email);
  if (lead.phone) leadContact.push(lead.phone);
  if (leadContact.length) {
    doc.text(leadContact.join(' | '), margin, yPos);
  }

  yPos += 10;

  // Items Table with HSN/SAC if enabled
  const showHsn = settings.include_hsn_sac !== false;
  const tableHead = showHsn
    ? [['#', 'Item/Service', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Amt']]
    : [['#', 'Item/Service', 'Qty', 'Rate', 'Taxable Amt']];

  const tableData = data.items.map((item, index) => {
    const row = [
      (index + 1).toString(),
      item.item_title + (item.description ? `\n${item.description}` : ''),
    ];
    if (showHsn) row.push(item.hsn_sac_code || '');
    row.push(
      item.quantity.toString(),
      formatCurrency(item.unit_price, currency),
      formatCurrency(item.line_total, currency)
    );
    return row;
  });

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: themeColor,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: showHsn
      ? {
          0: { cellWidth: 10 },
          1: { cellWidth: 55 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
        }
      : {
          0: { cellWidth: 10 },
          1: { cellWidth: 75 },
          2: { cellWidth: 15, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 28, halign: 'right' },
        },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals section
  const totalsX = pageWidth - margin - 70;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Taxable Value:', totalsX, yPos);
  doc.text(formatCurrency(data.subtotal, currency), pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;

  // GST Breakdown
  if (data.taxEnabled && data.taxRate > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('GST BREAKDOWN:', totalsX, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');

    // For simplicity, assume intra-state (CGST + SGST)
    const halfRate = data.taxRate / 2;
    const halfTax = data.taxAmount / 2;

    doc.text(`CGST @ ${halfRate}%:`, totalsX, yPos);
    doc.text(formatCurrency(halfTax, currency), pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;

    doc.text(`SGST @ ${halfRate}%:`, totalsX, yPos);
    doc.text(formatCurrency(halfTax, currency), pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;

    doc.setLineWidth(0.3);
    doc.line(totalsX, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.text('Total Tax:', totalsX, yPos);
    doc.text(formatCurrency(data.taxAmount, currency), pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
  }

  doc.setLineWidth(0.5);
  doc.line(totalsX, yPos, pageWidth - margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Grand Total:', totalsX, yPos);
  doc.setTextColor(themeColor);
  doc.text(formatCurrency(data.grandTotal, currency), pageWidth - margin, yPos, { align: 'right' });

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Amount in Words:', margin, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  const amountWords = numberToWords(data.grandTotal);
  const wordsLines = doc.splitTextToSize(amountWords, pageWidth - margin * 2);
  doc.text(wordsLines, margin, yPos);
  yPos += wordsLines.length * 4 + 8;

  // Bank Details
  if (settings.bank_name || settings.account_number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAYMENT DETAILS:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    if (settings.bank_name) {
      doc.text(`Bank Name: ${settings.bank_name}`, margin, yPos);
      yPos += 4;
    }
    if (settings.account_number) {
      doc.text(`Account Number: ${settings.account_number}`, margin, yPos);
      yPos += 4;
    }
    if (settings.ifsc_code) {
      doc.text(`IFSC Code: ${settings.ifsc_code}`, margin, yPos);
      yPos += 4;
    }
    if (settings.account_holder_name) {
      doc.text(`Account Holder: ${settings.account_holder_name}`, margin, yPos);
      yPos += 4;
    }
    yPos += 5;
  }

  // Terms
  if (data.termsConditions || settings.invoice_terms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TERMS & CONDITIONS:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const terms = data.termsConditions || settings.invoice_terms || '';
    const termsLines = doc.splitTextToSize(terms, pageWidth - margin * 2);
    doc.text(termsLines, margin, yPos);
    yPos += termsLines.length * 4 + 5;
  }

  // Notes
  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Notes:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 4 + 10;
  }

  // Signature area
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`For ${settings.company_name}`, pageWidth - margin - 50, yPos);
  yPos += 20;
  doc.setLineWidth(0.3);
  doc.line(pageWidth - margin - 60, yPos, pageWidth - margin, yPos);
  yPos += 4;
  doc.setFontSize(8);
  doc.text('Authorized Signatory', pageWidth - margin - 35, yPos);

  // Footer
  if (settings.pdf_footer_text) {
    yPos = doc.internal.pageSize.height - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(settings.pdf_footer_text, pageWidth / 2, yPos, { align: 'center' });
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

export function getPDFBase64(doc: jsPDF): string {
  return doc.output('datauristring').split(',')[1];
}
