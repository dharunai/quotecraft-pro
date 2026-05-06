import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuotation, useQuotationItems, useUpdateQuotation, useCreateQuotationItem, useUpdateQuotationItem, useDeleteQuotationItem } from '@/hooks/useQuotations';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useProducts } from '@/hooks/useProducts';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { QuotationItemRow } from '@/components/quotations/QuotationItemRow';
import { QuotationPreview } from '@/components/quotations/QuotationPreview';
import { ProductBrowserDialog } from '@/components/products/ProductBrowserDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Download, Save, Package, FileText, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Product } from '@/types/database';
import { EmailDialog } from '@/components/email/EmailDialog';
import { generateQuotationPDF, getPDFBase64 } from '@/lib/pdfGenerator';
export default function QuotationEditor() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    data: quotation,
    isLoading
  } = useQuotation(id);
  const {
    data: items = [],
    refetch: refetchItems
  } = useQuotationItems(id);
  const {
    data: settings
  } = useCompanySettings();
  const {
    data: products = []
  } = useProducts();
  const updateQuotation = useUpdateQuotation();
  const createItem = useCreateQuotationItem();
  const updateItem = useUpdateQuotationItem();
  const deleteItem = useDeleteQuotationItem();
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft');
  const [quoteDate, setQuoteDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [pdfData, setPdfData] = useState<string>('');
  const handleConvertToInvoice = () => {
    if (!quotation) return;
    navigate(`/invoices/new?quotation_id=${quotation.id}&lead_id=${quotation.lead_id}${quotation.deal_id ? `&deal_id=${quotation.deal_id}` : ''}`);
  };
  useEffect(() => {
    if (quotation) {
      setStatus(quotation.status);
      setQuoteDate(quotation.quote_date);
      setValidUntil(quotation.valid_until || '');
      setNotes(quotation.notes || '');
    }
  }, [quotation]);
  const handleSave = () => {
    if (!id) return;
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const taxRate = settings?.tax_rate || 0;
    const tax = subtotal * taxRate / 100;
    const total = subtotal + tax;
    updateQuotation.mutate({
      id,
      status,
      quote_date: quoteDate,
      valid_until: validUntil || null,
      notes: notes || null,
      subtotal,
      tax,
      total
    }, {
      onSuccess: () => toast.success('Quotation saved')
    });
  };
  const handleAddItem = () => {
    if (!id) return;
    createItem.mutate({
      quotation_id: id,
      title: 'New Item',
      description: null,
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      sort_order: items.length
    }, {
      onSuccess: () => refetchItems()
    });
  };
  const handleAddProduct = (product: Product) => {
    if (!id) return;
    createItem.mutate({
      quotation_id: id,
      title: product.name,
      description: product.description || null,
      quantity: 1,
      unit_price: product.unit_price,
      line_total: product.unit_price,
      sort_order: items.length
    }, {
      onSuccess: () => refetchItems()
    });
  };
  const handleUpdateItem = (data: {
    id: string;
  } & Record<string, unknown>) => {
    if (!id) return;
    updateItem.mutate({
      ...data,
      quotation_id: id
    } as Parameters<typeof updateItem.mutate>[0]);
  };
  const handleDeleteItem = (itemId: string) => {
    if (!id) return;
    deleteItem.mutate({
      id: itemId,
      quotation_id: id
    });
  };
  const handleDownloadPDF = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!quotation || !settings || !quotation.lead || !id) return;

    try {
      // Calculate totals for PDF
      const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
      const taxRate = settings.tax_rate || 0;
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;

      const doc = await generateQuotationPDF({
        quoteNumber: quotation.quote_number,
        quoteDate: quoteDate,
        validUntil: validUntil || null,
        items: items,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: total,
        notes: notes || null
      }, settings, quotation.lead);

      const base64 = getPDFBase64(doc);
      setPdfData(base64);
      setShowEmailDialog(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF for email');
    }
  };
  if (isLoading || !settings) {
    return <AppLayout>
      <p className="text-muted-foreground">Loading...</p>
    </AppLayout>;
  }
  if (!quotation || !quotation.lead) {
    return <AppLayout>
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Quotation not found</p>
        <Link to="/quotations">
          <Button variant="outline">Back to Quotations</Button>
        </Link>
      </div>
    </AppLayout>;
  }
  const currency = settings.currency || '₹';
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxRate = settings.tax_rate || 0;
  const taxAmount = subtotal * taxRate / 100;
  const total = subtotal + taxAmount;
  const fmt = (n: number) => `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return <AppLayout>
    <div className="space-y-5 no-print">
      {/* Header bar */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/quotations">
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quotes
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold tracking-tight truncate">{quotation.quote_number}</h1>
                <QuotationStatusBadge status={status} />
              </div>
              <p className="text-sm text-muted-foreground truncate">{quotation.lead.company_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {status === 'accepted' && !quotation.invoice_id && (
              <Button onClick={handleConvertToInvoice} size="sm" className="bg-success hover:bg-success/90">
                <FileText className="h-4 w-4 mr-2" />
                Convert to Invoice
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateQuotation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateQuotation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border border-b border-border">
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Status</p>
            <Select value={status} onValueChange={(v: typeof status) => setStatus(v)}>
              <SelectTrigger className="h-8 border-0 px-0 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Quote Date</p>
            <Input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" />
          </div>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Valid Until</p>
            <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" />
          </div>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Total</p>
            <p className="text-base font-semibold text-primary">{fmt(total)}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="editor" className="space-y-5">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            {/* From / Bill To */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bill To</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
                  <p className="font-medium text-sm">{settings.company_name}</p>
                  {settings.address && <p className="text-sm text-muted-foreground whitespace-pre-line">{settings.address}</p>}
                  {settings.gst_number && <p className="text-xs text-muted-foreground">GSTIN: {settings.gst_number}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="font-medium text-sm">{quotation.lead.company_name}</p>
                  <p className="text-sm text-muted-foreground">{quotation.lead.contact_name}</p>
                  {quotation.lead.email && <p className="text-sm text-muted-foreground">{quotation.lead.email}</p>}
                  {quotation.lead.phone && <p className="text-sm text-muted-foreground">{quotation.lead.phone}</p>}
                  {quotation.lead.address && <p className="text-sm text-muted-foreground whitespace-pre-line">{quotation.lead.address}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">At a Glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Qty</span>
                  <span className="font-medium">{totalQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued</span>
                  <span className="font-medium">{quoteDate ? format(new Date(quoteDate), 'dd MMM yyyy') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span className="font-medium">{validUntil ? format(new Date(validUntil), 'dd MMM yyyy') : '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items grid */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Item Details</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowProductBrowser(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
                <Button size="sm" onClick={handleAddItem} disabled={createItem.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm mb-3">No items added yet</p>
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-y border-border">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-10">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item & Description</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-24">Qty</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">Rate</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">Amount</th>
                        <th className="px-2 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <QuotationItemRow
                          key={item.id}
                          item={item}
                          currency={currency}
                          onUpdate={handleUpdateItem}
                          onDelete={handleDeleteItem}
                          index={idx + 1}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes + Totals */}
          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={6}
                  placeholder="Terms and conditions, payment instructions, delivery notes…"
                  className="resize-none"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{fmt(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <>
                    <div className="pt-2 border-t border-dashed border-border">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">GST Breakdown ({taxRate}%)</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CGST ({(taxRate / 2).toFixed(1)}%)</span>
                        <span className="font-medium">{fmt(cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGST ({(taxRate / 2).toFixed(1)}%)</span>
                        <span className="font-medium">{fmt(sgst)}</span>
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-border">
                        <span className="text-muted-foreground">Total Tax</span>
                        <span className="font-medium">{fmt(taxAmount)}</span>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-3 mt-1 border-t border-border text-base font-semibold">
                  <span>Grand Total</span>
                  <span className="text-primary">{fmt(total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <QuotationPreview quotation={{
            ...quotation,
            status,
            notes
          }} items={items} settings={settings} lead={quotation.lead} />
        </TabsContent>
      </Tabs>

      {/* Product Browser Dialog */}
      <ProductBrowserDialog open={showProductBrowser} onOpenChange={setShowProductBrowser} onSelectProduct={handleAddProduct} />

      {/* Email Dialog */}
      {quotation && settings && quotation.lead && (
        <EmailDialog
          open={showEmailDialog}
          onClose={() => setShowEmailDialog(false)}
          type="quotation"
          entityId={id!}
          defaultRecipient={{
            email: quotation.lead.email || '',
            name: quotation.lead.company_name
          }}
          defaultSubject={settings.quotation_email_subject
            ?.replace('{quote_number}', quotation.quote_number)
            .replace('{company_name}', settings.company_name) || `Quotation ${quotation.quote_number}`}
          defaultBody={settings.quotation_email_body
            ?.replace('{contact_name}', quotation.lead.contact_name)
            .replace('{quote_number}', quotation.quote_number)
            .replace('{company_name}', settings.company_name) || "Please find attached quotation."}
          pdfData={pdfData}
          pdfFilename={`Quotation-${quotation.quote_number}.pdf`}
          onSuccess={() => {
            if (status === 'draft') setStatus('sent');
          }}
        />
      )}
    </div>

    {/* Print-only content */}
    <div className="hidden print:block">
      {quotation.lead && <QuotationPreview quotation={{
        ...quotation,
        status,
        notes
      }} items={items} settings={settings} lead={quotation.lead} />}
    </div>
  </AppLayout>;
}