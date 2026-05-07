import React from 'react';
import { Invoice, InvoiceItem, CompanySettings, Lead } from '@/types/database';
import { format } from 'date-fns';
import { MapPin, Mail, Phone, Building2, Calendar, Hash, FileText, Receipt, CheckCircle2 } from 'lucide-react';

interface InvoicePreviewProps {
  invoice: Partial<Invoice>;
  items: InvoiceItem[];
  settings: CompanySettings;
  lead: Lead;
  isIgst?: boolean;
}

export function InvoicePreview({
  invoice,
  items,
  settings,
  lead,
  isIgst = false
}: InvoicePreviewProps) {
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxRate = invoice.tax_rate || 0;
  const taxAmount = invoice.tax_enabled ? (subtotal * taxRate) / 100 : 0;
  const grandTotal = subtotal + taxAmount;
  
  const fmt = (val: number) => 
    val.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    });

  return (
    <div className="bg-slate-50 p-4 md:p-8 min-h-screen print:bg-white print:p-0">
      <div className="bg-white max-w-[21cm] mx-auto shadow-2xl min-h-[29.7cm] p-8 md:p-12 text-slate-800 font-sans relative overflow-hidden print:shadow-none print:border-none" id="invoice-print">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: settings.theme_color }}></div>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-10 border-slate-100">
          <div className="space-y-6">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
            ) : (
              <h1 className="text-3xl font-black tracking-tight" style={{ color: settings.theme_color }}>
                {settings.company_name}
              </h1>
            )}
            <div className="text-[11px] text-slate-500 space-y-1.5 font-medium uppercase tracking-wider">
              {settings.address && <p className="flex items-start gap-2 max-w-[250px]"><MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" /> {settings.address}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {settings.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {settings.email}</p>}
                {settings.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {settings.phone}</p>}
              </div>
              {settings.gst_number && <p className="text-slate-900 font-black pt-1">GSTIN: {settings.gst_number}</p>}
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <h2 className="text-5xl font-black uppercase tracking-tighter mb-6 opacity-10 absolute right-12 top-12 select-none">Invoice</h2>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-6" style={{ color: settings.theme_color }}>Tax Invoice</h2>
            
            <div className="space-y-3">
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice #</p>
                <p className="text-lg font-black text-slate-900">{invoice.invoice_number || 'DRAFT'}</p>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                  <p className="font-bold text-slate-900">{invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy') : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</p>
                  <p className="font-bold text-slate-900">{invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12 px-2">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              <Building2 className="h-3 w-3" /> Bill To
            </h3>
            <p className="text-xl font-black text-slate-900 leading-tight">{lead.company_name}</p>
            <p className="text-sm font-bold text-slate-600 mt-1">{lead.contact_name}</p>
            <div className="mt-4 text-[12px] text-slate-500 space-y-1.5 leading-relaxed font-medium">
              {lead.address && <p className="max-w-[300px]">{lead.address}</p>}
              <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {lead.phone}</p>
              <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {lead.email}</p>
            </div>
          </div>
          
          <div className="flex flex-col justify-start items-end text-right">
             {invoice.payment_status === 'paid' && (
               <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Fully Paid
               </div>
             )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: settings.theme_color }}>
                <th className="py-4 px-6 w-12 text-center">#</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 text-center">Qty</th>
                <th className="py-4 px-6 text-right">Unit Price</th>
                <th className="py-4 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {items.map((item, index) => (
                <tr key={item.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 px-6 text-center text-slate-400 font-bold">{index + 1}</td>
                  <td className="py-6 px-6">
                    <p className="font-black text-slate-900 text-base">{item.item_title}</p>
                    {item.description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[400px]">{item.description}</p>}
                  </td>
                  <td className="py-6 px-6 text-center font-bold text-slate-700">{item.quantity}</td>
                  <td className="py-6 px-6 text-right text-slate-600 font-medium">{fmt(item.unit_price)}</td>
                  <td className="py-6 px-6 text-right font-black text-slate-900">{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            {(settings.bank_name || settings.account_number) && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
                  <Receipt className="h-3 w-3" /> Banking Details
                </h3>
                <div className="grid grid-cols-2 gap-y-2 text-[11px] font-bold">
                  {settings.bank_name && (
                    <div>
                      <p className="text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Bank Name</p>
                      <p className="text-slate-900">{settings.bank_name}</p>
                    </div>
                  )}
                  {settings.account_holder_name && (
                    <div>
                      <p className="text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Account Holder</p>
                      <p className="text-slate-900">{settings.account_holder_name}</p>
                    </div>
                  )}
                  {settings.account_number && (
                    <div>
                      <p className="text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Account Number</p>
                      <p className="text-slate-900">{settings.account_number}</p>
                    </div>
                  )}
                  {settings.ifsc_code && (
                    <div>
                      <p className="text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">IFSC Code</p>
                      <p className="text-slate-900">{settings.ifsc_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {invoice.payment_notes && (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
                  <Receipt className="h-3 w-3" /> Payment Instructions
                </h3>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{invoice.payment_notes}</p>
              </div>
            )}
            
            {invoice.terms_conditions && (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Terms & Conditions</h3>
                <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-relaxed italic">{invoice.terms_conditions}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-slate-900">{fmt(subtotal)}</span>
              </div>
              
              {invoice.tax_enabled && (
                <div className="pt-4 border-t border-slate-200/50 space-y-3">
                  {isIgst ? (
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase tracking-widest">IGST ({taxRate}%)</span>
                      <span className="text-slate-900">{fmt(taxAmount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">CGST ({taxRate/2}%)</span>
                        <span className="text-slate-900">{fmt(taxAmount/2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">SGST ({taxRate/2}%)</span>
                        <span className="text-slate-900">{fmt(taxAmount/2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs font-black pt-1">
                    <span className="text-slate-500">TOTAL TAX</span>
                    <span className="text-slate-900">{fmt(taxAmount)}</span>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t-2 border-slate-200 flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-widest text-slate-900">Grand Total</span>
                <span className="text-3xl font-black" style={{ color: settings.theme_color }}>{fmt(grandTotal)}</span>
              </div>
            </div>
            
            <div className="text-center pt-8 border-t border-slate-50">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Thank you for your business!</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
