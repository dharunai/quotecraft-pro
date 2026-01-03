import React from 'react';
import { Quotation, QuotationItem, CompanySettings, Lead } from '@/types/database';
import { format } from 'date-fns';

interface QuotationPreviewProps {
  quotation: Quotation;
  items: QuotationItem[];
  settings: CompanySettings;
  lead: Lead;
}

export function QuotationPreview({ quotation, items, settings, lead }: QuotationPreviewProps) {
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxRate = settings.tax_rate || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  return (
    <div className="quotation-preview bg-white text-gray-900 max-w-4xl mx-auto" id="quotation-print">
      {/* Header */}
      <div className="quotation-header flex justify-between items-start" style={{ borderColor: settings.theme_color }}>
        <div>
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.company_name} className="h-16 mb-4 object-contain" />
          ) : (
            <h1 className="text-2xl font-bold mb-4" style={{ color: settings.theme_color }}>
              {settings.company_name}
            </h1>
          )}
          <div className="text-sm text-gray-600 space-y-1">
            {settings.address && <p>{settings.address}</p>}
            {settings.email && <p>{settings.email}</p>}
            {settings.phone && <p>{settings.phone}</p>}
            {settings.gst_number && <p>GST: {settings.gst_number}</p>}
            {settings.pan && <p>PAN: {settings.pan}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold mb-4" style={{ color: settings.theme_color }}>
            QUOTATION
          </h2>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Quote No:</span> {quotation.quote_number}</p>
            <p><span className="text-gray-500">Date:</span> {format(new Date(quotation.quote_date), 'dd MMM yyyy')}</p>
            {quotation.valid_until && (
              <p><span className="text-gray-500">Valid Until:</span> {format(new Date(quotation.valid_until), 'dd MMM yyyy')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Client Details */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">BILL TO</h3>
        <p className="font-semibold text-lg">{lead.company_name}</p>
        <p className="text-gray-700">{lead.contact_name}</p>
        {lead.email && <p className="text-gray-600 text-sm">{lead.email}</p>}
        {lead.phone && <p className="text-gray-600 text-sm">{lead.phone}</p>}
        {lead.address && <p className="text-gray-600 text-sm">{lead.address}</p>}
      </div>

      {/* Items Table */}
      <div className="p-6">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: settings.theme_color }}>
              <th className="text-left px-4 py-3 text-white font-medium">#</th>
              <th className="text-left px-4 py-3 text-white font-medium">Item</th>
              <th className="text-right px-4 py-3 text-white font-medium">Qty</th>
              <th className="text-right px-4 py-3 text-white font-medium">Unit Price</th>
              <th className="text-right px-4 py-3 text-white font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-gray-500">{item.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">
                  {settings.currency}{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {settings.currency}{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-6">
          <div className="w-72 space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">
                {settings.currency}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">GST ({taxRate}%)</span>
                <span className="font-medium">
                  {settings.currency}{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between py-3 text-lg font-bold" style={{ color: settings.theme_color }}>
              <span>Total</span>
              <span>
                {settings.currency}{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="px-6 pb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">NOTES</h3>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{quotation.notes}</p>
        </div>
      )}

      {/* Terms */}
      {settings.terms && (
        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">TERMS & CONDITIONS</h3>
          <p className="text-gray-600 text-sm whitespace-pre-wrap">{settings.terms}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 text-center text-sm text-gray-500 border-t border-gray-200" style={{ backgroundColor: `${settings.theme_color}10` }}>
        Thank you for your business
      </div>
    </div>
  );
}
