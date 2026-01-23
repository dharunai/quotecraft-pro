import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInvoice, useInvoiceItems, useUpdateInvoice, useCreateInvoice, useCreateInvoiceItem, useUpdateInvoiceItem, useDeleteInvoiceItem, useGenerateInvoiceNumber, useBulkCreateInvoiceItems } from '@/hooks/useInvoices';
import { useLeads } from '@/hooks/useLeads';
import { useQuotation, useQuotationItems } from '@/hooks/useQuotations';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductBrowserDialog } from '@/components/products/ProductBrowserDialog';
import { ArrowLeft, Plus, Download, Save, Lock, Unlock, Package, AlertTriangle, Mail } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Product } from '@/types/database';
import { EmailDialog } from '@/components/email/EmailDialog';
import { generateInvoicePDF, getPDFBase64 } from '@/lib/pdfGenerator';

export default function InvoiceEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const quotationId = searchParams.get('quotation_id');
  const dealId = searchParams.get('deal_id');
  const leadIdParam = searchParams.get('lead_id');

  const { data: invoice, isLoading } = useInvoice(isNew ? undefined : id);
  const { data: items = [], refetch: refetchItems } = useInvoiceItems(isNew ? undefined : id);
  const { data: settings } = useCompanySettings();
  const { data: leads = [] } = useLeads();
  const { data: sourceQuotation } = useQuotation(quotationId || undefined);
  const { data: sourceQuotationItems = [] } = useQuotationItems(quotationId || undefined);

  const generateInvoiceNumber = useGenerateInvoiceNumber();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const createItem = useCreateInvoiceItem();
  const updateItem = useUpdateInvoiceItem();
  const deleteItem = useDeleteInvoiceItem();
  const bulkCreateItems = useBulkCreateInvoiceItems();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [leadId, setLeadId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(18);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [pdfData, setPdfData] = useState<string>('');

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoice_number);
      setLeadId(invoice.lead_id);
      setInvoiceDate(invoice.invoice_date);
      setDueDate(invoice.due_date);
      setTaxEnabled(invoice.tax_enabled);
      setTaxRate(invoice.tax_rate);
      setAmountPaid(invoice.amount_paid);
      setPaymentNotes(invoice.payment_notes || '');
      setNotes(invoice.notes || '');
      setTermsConditions(invoice.terms_conditions || '');
      setIsLocked(invoice.is_locked);
    }
  }, [invoice]);

  useEffect(() => {
    if (isNew && settings) {
      const defaultDueDays = settings.default_due_days || 30;
      setDueDate(addDays(new Date(), defaultDueDays).toISOString().split('T')[0]);
      setTaxRate(settings.tax_rate || 18);
      setTermsConditions(settings.invoice_terms || settings.terms || '');

      if (leadIdParam) {
        setLeadId(leadIdParam);
      } else if (sourceQuotation) {
        setLeadId(sourceQuotation.lead_id);
      }
    }
  }, [isNew, settings, sourceQuotation, leadIdParam]);

  const handleCreate = async () => {
    if (!leadId) {
      toast.error('Please select a lead');
      return;
    }

    try {
      const newInvoiceNumber = await generateInvoiceNumber.mutateAsync();

      const subtotal = sourceQuotationItems.reduce((sum, item) => sum + item.line_total, 0);
      const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
      const grandTotal = subtotal + taxAmount;

      const newInvoice = await createInvoice.mutateAsync({
        invoice_number: newInvoiceNumber,
        lead_id: leadId,
        deal_id: dealId || null,
        quotation_id: quotationId || null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal,
        tax_enabled: taxEnabled,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        amount_paid: 0,
        payment_status: 'unpaid',
        payment_notes: null,
        terms_conditions: termsConditions || null,
        notes: notes || null,
        is_locked: false,
        created_by: null,
      });

      // If converting from quotation, copy items
      if (quotationId && sourceQuotationItems.length > 0) {
        const invoiceItems = sourceQuotationItems.map((item, index) => ({
          invoice_id: newInvoice.id,
          product_id: null,
          item_title: item.title,
          description: item.description || null,
          hsn_sac_code: null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          sort_order: index,
        }));

        await bulkCreateItems.mutateAsync(invoiceItems);
      }

      navigate(`/invoices/${newInvoice.id}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const handleSave = () => {
    if (!id || isNew) return;

    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
    const grandTotal = subtotal + taxAmount;

    updateInvoice.mutate({
      id,
      invoice_date: invoiceDate,
      due_date: dueDate,
      tax_enabled: taxEnabled,
      tax_rate: taxRate,
      subtotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      amount_paid: amountPaid,
      payment_notes: paymentNotes || null,
      terms_conditions: termsConditions || null,
      notes: notes || null,
    });
  };

  const handleLockToggle = () => {
    if (!id || isNew) return;
    updateInvoice.mutate({
      id,
      is_locked: !isLocked,
    }, {
      onSuccess: () => setIsLocked(!isLocked),
    });
  };

  const handleAddItem = () => {
    if (!id || isNew || isLocked) return;
    createItem.mutate({
      invoice_id: id,
      product_id: null,
      item_title: 'New Item',
      description: null,
      hsn_sac_code: null,
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      sort_order: items.length,
    }, {
      onSuccess: () => refetchItems(),
    });
  };

  const handleAddProduct = (product: Product) => {
    if (!id || isNew || isLocked) return;
    createItem.mutate({
      invoice_id: id,
      product_id: product.id,
      item_title: product.name,
      description: product.description || null,
      hsn_sac_code: null,
      quantity: 1,
      unit_price: product.unit_price,
      line_total: product.unit_price,
      sort_order: items.length,
    }, {
      onSuccess: () => {
        refetchItems();
        setShowProductBrowser(false);
      },
    });
  };

  const handleUpdateItem = (itemId: string, field: string, value: unknown) => {
    if (!id || isLocked) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const updateData: Record<string, unknown> = { [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : item.quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : item.unit_price;
      updateData.line_total = quantity * unitPrice;
    }

    updateItem.mutate({ id: itemId, invoice_id: id, ...updateData } as Parameters<typeof updateItem.mutate>[0], {
      onSuccess: () => refetchItems(),
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!id || isLocked) return;
    deleteItem.mutate({ id: itemId, invoice_id: id }, {
      onSuccess: () => refetchItems(),
    });
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!invoice || !settings || !selectedLead || !id) return;

    try {
      // Calculate totals for PDF
      const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
      const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
      const grandTotal = subtotal + taxAmount;

      const doc = await generateInvoicePDF({
        invoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        items: items,
        subtotal: subtotal,
        taxEnabled: taxEnabled,
        taxRate: taxRate,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        notes: notes || null,
        termsConditions: termsConditions || null
      }, settings, selectedLead);

      const base64 = getPDFBase64(doc);
      setPdfData(base64);
      setShowEmailDialog(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF for email');
    }
  };

  const handleMarkAsPaid = () => {
    if (!id || isNew) return;
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
    const grandTotal = subtotal + taxAmount;

    updateInvoice.mutate({
      id,
      amount_paid: grandTotal,
      grand_total: grandTotal,
    }, {
      onSuccess: () => setAmountPaid(grandTotal),
    });
  };

  const currency = settings?.currency || '₹';
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
  const grandTotal = subtotal + taxAmount;
  const balanceDue = grandTotal - amountPaid;

  const getPaymentStatus = () => {
    if (amountPaid >= grandTotal && grandTotal > 0) return 'paid';
    if (amountPaid > 0) return 'partial';
    return 'unpaid';
  };

  const paymentStatus = getPaymentStatus();

  if (!isNew && isLoading) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Loading...</p>
      </AppLayout>
    );
  }

  if (!isNew && !invoice) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Invoice not found</p>
          <Link to="/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const selectedLead = leads.find(l => l.id === leadId);

  return (
    <AppLayout>
      <div className="space-y-6 no-print">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/invoices">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? 'New Invoice' : invoiceNumber}
              </h1>
              {!isNew && selectedLead && (
                <p className="text-muted-foreground">{selectedLead.company_name}</p>
              )}
            </div>
            {!isNew && (
              <div className="flex items-center gap-2">
                <Badge variant={paymentStatus === 'paid' ? 'default' : paymentStatus === 'partial' ? 'secondary' : 'destructive'}>
                  {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'partial' ? 'Partially Paid' : 'Unpaid'}
                </Badge>
                {isLocked && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handleSendEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline" onClick={handleLockToggle}>
                  {isLocked ? (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlock
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Lock
                    </>
                  )}
                </Button>
              </>
            )}
            {isNew ? (
              <Button onClick={handleCreate} disabled={createInvoice.isPending || !leadId}>
                <Save className="h-4 w-4 mr-2" />
                {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={updateInvoice.isPending || isLocked}>
                <Save className="h-4 w-4 mr-2" />
                {updateInvoice.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNew && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer *</label>
                  <Select value={leadId} onValueChange={setLeadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.company_name} - {lead.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Invoice Date</label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tax Enabled</label>
                <Select value={taxEnabled ? 'yes' : 'no'} onValueChange={(v) => setTaxEnabled(v === 'yes')} disabled={isLocked}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {taxEnabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Rate (%)</label>
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    disabled={isLocked}
                    min="0"
                    max="100"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedLead ? (
                <>
                  <p className="font-medium">{selectedLead.company_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedLead.contact_name}</p>
                  {selectedLead.email && (
                    <p className="text-sm text-muted-foreground">{selectedLead.email}</p>
                  )}
                  {selectedLead.phone && (
                    <p className="text-sm text-muted-foreground">{selectedLead.phone}</p>
                  )}
                  {selectedLead.address && (
                    <p className="text-sm text-muted-foreground">{selectedLead.address}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Select a customer</p>
              )}
            </CardContent>
          </Card>

          {/* Totals & Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {currency}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({taxRate}%)</span>
                  <span className="font-medium">
                    {currency}{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {currency}{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {!isNew && (
                <>
                  <div className="pt-3 border-t space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount Paid</label>
                      <Input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Balance Due</span>
                      <span className={balanceDue > 0 ? 'text-destructive' : 'text-success'}>
                        {currency}{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {balanceDue > 0 && (
                      <Button variant="outline" size="sm" className="w-full" onClick={handleMarkAsPaid}>
                        Mark as Fully Paid
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        {!isNew && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Line Items</CardTitle>
              {!isLocked && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowProductBrowser(true)}>
                    <Package className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                  <Button size="sm" onClick={handleAddItem} disabled={createItem.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items yet</p>
                  {!isLocked && (
                    <Button variant="outline" className="mt-2" onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  )}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Item</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground w-24">Qty</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground w-32">Unit Price</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground w-32">Total</th>
                      <th className="p-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="p-3">
                          <Input
                            value={item.item_title}
                            onChange={(e) => handleUpdateItem(item.id, 'item_title', e.target.value)}
                            disabled={isLocked}
                            className="font-medium"
                          />
                          <Input
                            value={item.description || ''}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            disabled={isLocked}
                            placeholder="Description (optional)"
                            className="mt-1 text-sm"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={isLocked}
                            min="0"
                            step="0.01"
                            className="text-right"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            disabled={isLocked}
                            min="0"
                            step="0.01"
                            className="text-right"
                          />
                        </td>
                        <td className="p-3 text-right font-medium">
                          {currency}{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          {!isLocked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes & Terms */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add payment notes..."
                rows={3}
                disabled={isNew}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                placeholder="Enter terms and conditions..."
                rows={3}
                disabled={isLocked}
              />
            </CardContent>
          </Card>
        </div>

        {/* Product Browser */}
        <ProductBrowserDialog
          open={showProductBrowser}
          onOpenChange={setShowProductBrowser}
          onSelectProduct={handleAddProduct}
        />

        {/* Email Dialog */}
        {invoice && settings && selectedLead && (
          <EmailDialog
            open={showEmailDialog}
            onClose={() => setShowEmailDialog(false)}
            type="invoice"
            entityId={id!}
            defaultRecipient={{
              email: selectedLead.email || '',
              name: selectedLead.company_name
            }}
            defaultSubject={settings.invoice_email_subject
              ?.replace('{invoice_number}', invoiceNumber)
              .replace('{company_name}', settings.company_name) || `Invoice ${invoiceNumber}`}
            defaultBody={settings.invoice_email_body
              ?.replace('{contact_name}', selectedLead.contact_name)
              .replace('{invoice_number}', invoiceNumber)
              .replace('{due_date}', dueDate ? format(new Date(dueDate), 'dd MMM yyyy') : '')
              .replace('{total}', grandTotal.toFixed(2))
              .replace('{company_name}', settings.company_name) || "Please find attached invoice."}
            pdfData={pdfData}
            pdfFilename={`Invoice-${invoiceNumber}.pdf`}
            onSuccess={() => {
              // Optionally update invoice status or log
            }}
          />
        )}

        {/* Locked Invoice Warning */}
        {isLocked && (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            <AlertDescription className="text-warning-foreground">
              This invoice is locked and cannot be edited. Unlock it to make changes.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AppLayout>
  );
}
