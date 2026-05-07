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
import { ArrowLeft, Plus, Download, Save, Lock, Unlock, Package, AlertTriangle, Mail, Calendar, User, Building2, Phone, FileText, Clock, CheckCircle2, Hash, Receipt, Trash2, ExternalLink, IndianRupee } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Product } from '@/types/database';
import { EmailDialog } from '@/components/email/EmailDialog';
import { generateInvoicePDF, getPDFBase64, downloadPDF } from '@/lib/pdfGenerator';
import { InvoicePreview } from '@/components/invoices/InvoicePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [isIgst, setIsIgst] = useState(false);
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
      if (!paymentNotes && settings.bank_name) {
        setPaymentNotes(settings.bank_name);
      }

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

  const [localItems, setLocalItems] = useState<typeof items>([]);

  useEffect(() => {
    if (items.length > 0) {
      setLocalItems(items);
    }
  }, [items]);

  const handleUpdateLocalItem = (itemId: string, field: string, value: unknown) => {
    setLocalItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          const quantity = field === 'quantity' ? Number(value) : updatedItem.quantity;
          const unitPrice = field === 'unit_price' ? Number(value) : updatedItem.unit_price;
          updatedItem.line_total = quantity * unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSyncItem = (itemId: string, field: string, value: unknown) => {
    if (!id || isLocked) return;
    const item = localItems.find(i => i.id === itemId);
    if (!item) return;

    const updateData: Record<string, unknown> = { [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : item.quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : item.unit_price;
      updateData.line_total = quantity * unitPrice;
    }

    updateItem.mutate({ id: itemId, invoice_id: id, ...updateData } as any);
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

  const handleDeleteItem = (itemId: string) => {
    if (!id || isLocked) return;
    deleteItem.mutate({ id: itemId, invoice_id: id }, {
      onSuccess: () => refetchItems(),
    });
  };

  const handleDownloadPDF = async () => {
    if (!settings || !selectedLead) return;

    try {
      const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
      const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
      const grandTotal = subtotal + taxAmount;

      const doc = await generateInvoicePDF({
        invoiceNumber,
        invoiceDate,
        dueDate,
        items,
        subtotal,
        taxEnabled,
        taxRate,
        taxAmount,
        grandTotal,
        notes: notes || null,
        termsConditions: termsConditions || null,
        payment_notes: paymentNotes || null
      }, settings, selectedLead);

      downloadPDF(doc, `Invoice-${invoiceNumber || 'New'}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF');
    }
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
        termsConditions: termsConditions || null,
        payment_notes: paymentNotes || null
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
  const subtotal = localItems.reduce((sum, item) => sum + item.line_total, 0);
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
  const fmt = (n: number) => `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const daysUntilDue = dueDate ? differenceInDays(new Date(dueDate), new Date()) : 0;
  const paymentPercent = grandTotal > 0 ? Math.min(100, Math.round((amountPaid / grandTotal) * 100)) : 0;
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <AppLayout>
      <div className="bg-slate-50/60 min-h-screen no-print -mx-4 md:-mx-6 -mt-4 md:-mt-6 pt-4 md:pt-6">

        {/* ── Sticky Header Bar ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-30">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200 flex-shrink-0 border border-slate-800">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg font-black text-slate-900 truncate tracking-tight">
                    {isNew ? 'New Invoice' : invoiceNumber}
                  </h1>
                  {!isNew && (
                    <Badge className={cn('rounded-full text-[10px] font-semibold px-2.5 py-0.5 border',
                      paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      paymentStatus === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    )}>
                      {paymentStatus === 'paid' ? '● Paid' : paymentStatus === 'partial' ? '● Partial' : '● Unpaid'}
                    </Badge>
                  )}
                  {isLocked && (
                    <Badge variant="outline" className="rounded-full text-[10px] font-semibold px-2 py-0.5 gap-1 border-slate-300 text-slate-500">
                      <Lock className="h-2.5 w-2.5" /> Locked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-tight truncate">
                  {selectedLead ? selectedLead.company_name : 'No customer selected'}
                  {!isNew && invoice?.created_at && <> · Created {format(new Date(invoice.created_at), 'dd MMM yyyy')}</>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isNew && (
                <>
                  <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="h-8 text-xs rounded-full px-3 border-slate-200">
                    <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleSendEmail} className="h-8 text-xs rounded-full px-3 border-slate-200">
                    <Mail className="h-3.5 w-3.5 mr-1.5" /> Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLockToggle} className="h-8 text-xs rounded-full px-3 border-slate-200">
                    {isLocked ? <><Unlock className="h-3.5 w-3.5 mr-1.5" /> Unlock</> : <><Lock className="h-3.5 w-3.5 mr-1.5" /> Lock</>}
                  </Button>
                </>
              )}
              {isNew ? (
                <Button size="sm" onClick={handleCreate} disabled={createInvoice.isPending || !leadId} className="h-8 text-xs rounded-full px-4 bg-slate-900 hover:bg-slate-800 text-white">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {createInvoice.isPending ? 'Creating…' : 'Create Invoice'}
                </Button>
              ) : (
                <Button size="sm" onClick={handleSave} disabled={updateInvoice.isPending || isLocked} className="h-8 text-xs rounded-full px-4 bg-slate-900 hover:bg-slate-800 text-white">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {updateInvoice.isPending ? 'Saving…' : 'Save'}
                </Button>
              )}
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <Link to="/invoices">
                <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-slate-700 rounded-full px-3 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Locked Warning ── */}
        {isLocked && (
          <div className="max-w-[1400px] mx-auto px-6 pt-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              This invoice is locked. Unlock it to make changes.
            </div>
          </div>
        )}

        {/* ── Meta Strip ── */}
        {!isNew && (
          <div className="bg-white border-b border-slate-200 shadow-sm relative z-20">
            <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
              <div className="px-6 py-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Invoice Date</p>
                <p className="text-sm font-bold text-slate-900">{invoiceDate ? format(new Date(invoiceDate), 'dd MMM yyyy') : '—'}</p>
              </div>
              <div className="px-6 py-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Clock className="h-3 w-3" /> Due Date</p>
                <p className={cn('text-sm font-bold', daysUntilDue < 0 ? 'text-red-600' : daysUntilDue <= 7 ? 'text-amber-600' : 'text-slate-900')}>
                  {dueDate ? format(new Date(dueDate), 'dd MMM yyyy') : '—'}
                  {dueDate && <span className="text-[10px] ml-2 font-normal text-slate-400">({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`})</span>}
                </p>
              </div>
              <div className="px-6 py-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Hash className="h-3 w-3" /> Line Items</p>
                <p className="text-sm font-bold text-slate-900">{localItems.length} items <span className="text-slate-400 font-normal">· {localItems.reduce((s, i) => s + (i.quantity || 0), 0)} qty</span></p>
              </div>
              <div className="px-6 py-6 bg-slate-50/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><IndianRupee className="h-3 w-3" /> Grand Total</p>
                <p className="text-base font-black text-slate-900">{fmt(grandTotal)}</p>
              </div>
            </div>
          </div>
        )}
        {/* ── Main Workspace ── */}
        <Tabs defaultValue="editor" className="w-full">
          <div className="bg-slate-50 border-b border-slate-200 sticky top-[136px] z-20">
            <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between">
              <TabsList className="bg-transparent border-none p-0 h-auto gap-8">
                <TabsTrigger 
                  value="editor" 
                  className="px-0 py-3 h-auto text-[11px] font-bold uppercase tracking-[0.2em] rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-slate-900 transition-all"
                >
                  Document Editor
                </TabsTrigger>
                <TabsTrigger 
                  value="preview" 
                  className="px-0 py-3 h-auto text-[11px] font-bold uppercase tracking-[0.2em] rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-400 data-[state=active]:text-slate-900 transition-all"
                >
                  Live Preview
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3">
                <p className="text-[10px] font-medium text-slate-400 hidden sm:block italic">Draft saves automatically</p>
              </div>
            </div>
          </div>

          <TabsContent value="editor" className="m-0 p-0">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 px-6 pt-8 pb-12">
              {/* LEFT: Editor Workspace (2/3) */}
              <div className="lg:col-span-2 space-y-8">
            
            {/* Invoice Details Card */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" /> Invoice Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                      <Hash className="h-3 w-3" /> Invoice Number
                    </label>
                    <Input 
                      value={invoiceNumber} 
                      onChange={(e) => setInvoiceNumber(e.target.value)} 
                      disabled={isLocked || !isNew}
                      className="h-10 text-sm border-slate-200 focus:ring-slate-900 bg-slate-50/30 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                      <User className="h-3 w-3" /> Customer
                    </label>
                    {isNew ? (
                      <Select value={leadId} onValueChange={setLeadId}>
                        <SelectTrigger className="h-10 text-sm border-slate-200 bg-white">
                          <SelectValue placeholder="Select customer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {leads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id} className="text-sm">
                              {lead.company_name} - {lead.contact_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-10 px-3 flex items-center text-sm font-bold bg-slate-50 border border-slate-100 rounded-md text-slate-600">
                        {selectedLead?.company_name || '—'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3 w-3" /> Invoice Date
                    </label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      disabled={isLocked}
                      className="h-10 text-sm border-slate-200 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                      <Clock className="h-3 w-3" /> Due Date
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={isLocked}
                      className="h-10 text-sm border-slate-200 font-medium"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tax Enabled</label>
                      <Select value={taxEnabled ? 'yes' : 'no'} onValueChange={(v) => setTaxEnabled(v === 'yes')} disabled={isLocked}>
                        <SelectTrigger className="w-20 h-8 text-xs border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes" className="text-xs">Yes</SelectItem>
                          <SelectItem value="no" className="text-xs">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Enable tax calculations for this invoice.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Tax Type</label>
                    <Select value={isIgst ? 'igst' : 'cgst_sgst'} onValueChange={(v) => setIsIgst(v === 'igst')} disabled={!taxEnabled || isLocked}>
                      <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cgst_sgst" className="text-xs">CGST + SGST (Intra-state)</SelectItem>
                        <SelectItem value="igst" className="text-xs">IGST (Inter-state)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">GST Rate (%)</label>
                    <Select value={taxRate.toString()} onValueChange={(v) => setTaxRate(Number(v))} disabled={!taxEnabled || isLocked}>
                      <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5" className="text-xs">5%</SelectItem>
                        <SelectItem value="12" className="text-xs">12%</SelectItem>
                        <SelectItem value="18" className="text-xs">18%</SelectItem>
                        <SelectItem value="28" className="text-xs">28%</SelectItem>
                        <SelectItem value="40" className="text-xs">40%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items Card */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-400" /> Line Items
                </CardTitle>
                {!isLocked && !isNew && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowProductBrowser(true)} className="h-7 text-[10px] font-bold uppercase tracking-wider rounded-md border-slate-200 hover:bg-slate-50">
                      <Plus className="h-3 w-3 mr-1" /> Browse Products
                    </Button>
                    <Button size="sm" onClick={handleAddItem} disabled={createItem.isPending} className="h-7 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-900 hover:bg-slate-800 text-white">
                      <Plus className="h-3 w-3 mr-1" /> Custom Item
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {isNew ? (
                  <div className="p-16 text-center bg-slate-50/30">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Package className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Create invoice to add items</h3>
                    <p className="text-sm text-slate-500 max-w-[280px] mx-auto">
                      Once you save this invoice, you can start adding products and services.
                    </p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-16 text-center bg-slate-50/30">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Package className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">No items yet</h3>
                    <p className="text-sm text-slate-500 mb-8 max-w-[280px] mx-auto">
                      Start adding products or custom items to this invoice to calculate the total.
                    </p>
                    {!isLocked && (
                      <div className="flex justify-center gap-3">
                        <Button size="sm" variant="outline" onClick={() => setShowProductBrowser(true)} className="h-10 px-6 text-xs font-bold uppercase tracking-widest rounded-full border-slate-200">
                          Browse Products
                        </Button>
                        <Button size="sm" onClick={handleAddItem} className="h-10 px-6 text-xs font-bold uppercase tracking-widest rounded-full bg-slate-900 text-white hover:bg-slate-800">
                          Add Custom Item
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="text-left p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-12">#</th>
                          <th className="text-left p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Product / Service</th>
                          <th className="text-right p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">Qty</th>
                          <th className="text-right p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32">Unit Price</th>
                          <th className="text-right p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32">Amount</th>
                          <th className="p-4 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {localItems.map((item, idx) => (
                          <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-xs font-medium text-slate-400">{idx + 1}</td>
                            <td className="p-4">
                              <Input
                                value={item.item_title}
                                onChange={(e) => handleUpdateLocalItem(item.id, 'item_title', e.target.value)}
                                onBlur={(e) => handleSyncItem(item.id, 'item_title', e.target.value)}
                                disabled={isLocked}
                                className="h-8 text-sm font-semibold border-transparent group-hover:border-slate-200 bg-transparent px-2 -ml-2 mb-1"
                                placeholder="Item name"
                              />
                              <Input
                                value={item.description || ''}
                                onChange={(e) => handleUpdateLocalItem(item.id, 'description', e.target.value)}
                                onBlur={(e) => handleSyncItem(item.id, 'description', e.target.value)}
                                disabled={isLocked}
                                placeholder="Add a description..."
                                className="h-7 text-[11px] border-transparent group-hover:border-slate-200 bg-transparent px-2 -ml-2 text-slate-500"
                              />
                            </td>
                            <td className="p-4">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateLocalItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                onBlur={(e) => handleSyncItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                disabled={isLocked}
                                className="h-8 text-sm text-right border-transparent group-hover:border-slate-200 bg-transparent px-2"
                              />
                            </td>
                            <td className="p-4">
                              <div className="relative">
                                <span className="absolute left-1 top-1.5 text-[10px] text-slate-400 font-medium">{currency}</span>
                                <Input
                                  type="number"
                                  value={item.unit_price}
                                  onChange={(e) => handleUpdateLocalItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  onBlur={(e) => handleSyncItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  disabled={isLocked}
                                  className="h-8 text-sm text-right border-transparent group-hover:border-slate-200 bg-transparent pl-4 pr-2"
                                />
                              </div>
                            </td>
                            <td className="p-4 text-right text-sm font-bold text-slate-900">
                              {fmt(item.line_total)}
                            </td>
                            <td className="p-4">
                              {!isLocked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes & Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" /> Payment Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Enter bank details, UPI ID, or other instructions..."
                    disabled={isLocked}
                    className="min-h-[300px] text-xs border-none focus-visible:ring-0 resize-none p-6 bg-transparent"
                  />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-slate-400" /> Terms & Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Textarea
                    value={termsConditions}
                    onChange={(e) => setTermsConditions(e.target.value)}
                    placeholder="Enter your standard terms..."
                    disabled={isLocked}
                    className="min-h-[300px] text-xs border-none focus-visible:ring-0 resize-none p-6 bg-transparent"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT: Sidebar Financials & Actions (1/3) */}
          <div className="space-y-6 sticky top-[80px]">
            
            {/* Financial Summary Card */}
            <Card className="border-none shadow-md bg-white overflow-hidden ring-1 ring-slate-100">
              <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 relative z-10">Balance Due</p>
                <h2 className="text-4xl font-black relative z-10">{fmt(balanceDue)}</h2>
                <div className="mt-6 space-y-2 relative z-10">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-slate-400">Paid: {fmt(amountPaid)}</span>
                    <span className="text-white">{paymentPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div 
                      className={cn('h-full transition-all duration-700 ease-out rounded-full', 
                        paymentStatus === 'paid' ? 'bg-emerald-400' : 
                        paymentStatus === 'partial' ? 'bg-amber-400' : 'bg-slate-600'
                      )}
                      style={{ width: `${paymentPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Subtotal</span>
                    <span className="font-bold text-slate-900">{fmt(subtotal)}</span>
                  </div>
                  {taxEnabled && (
                    <>
                      {isIgst ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">IGST ({taxRate}%)</span>
                          <span className="font-bold text-slate-900">{fmt(taxAmount)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">CGST ({taxRate / 2}%)</span>
                            <span className="font-bold text-slate-900">{fmt(taxAmount / 2)}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-slate-500 font-medium">SGST ({taxRate / 2}%)</span>
                            <span className="font-bold text-slate-900">{fmt(taxAmount / 2)}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <div className="h-px bg-slate-100 my-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Grand Total</span>
                    <span className="text-2xl font-black text-slate-900 leading-none">{fmt(grandTotal)}</span>
                  </div>
                </div>

                {!isNew && (
                  <div className="pt-4 space-y-4 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" /> Record Payment
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs text-slate-400">{currency}</span>
                        <Input
                          type="number"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          disabled={isLocked}
                          className="h-9 pl-6 text-sm font-bold border-slate-200"
                        />
                      </div>
                    </div>
                    {balanceDue > 0 && !isLocked && (
                      <Button variant="outline" size="sm" className="w-full h-9 text-xs font-bold uppercase tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" onClick={handleMarkAsPaid}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark as Fully Paid
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Quick Card */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" /> Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {selectedLead ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-black">
                        {selectedLead.company_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate leading-none">{selectedLead.company_name}</p>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">{selectedLead.contact_name}</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      {selectedLead.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Mail className="h-3 w-3 text-slate-300" /> {selectedLead.email}
                        </div>
                      )}
                      {selectedLead.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone className="h-3 w-3 text-slate-300" /> {selectedLead.phone}
                        </div>
                      )}
                      {selectedLead.address && (
                        <div className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                          <Building2 className="h-3 w-3 text-slate-300 mt-0.5" /> {selectedLead.address}
                        </div>
                      )}
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-50">
                      <Link to={`/leads/${selectedLead.id}`}>
                        <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900">
                          <ExternalLink className="h-3 w-3 mr-1.5" /> View Full Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400 italic">No customer selected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-4 space-y-2">
                {!isNew && (
                  <>
                    <Button variant="outline" onClick={handleDownloadPDF} className="w-full h-9 justify-start text-xs border-slate-200">
                      <Download className="h-3.5 w-3.5 mr-2 text-slate-400" /> Export as PDF
                    </Button>
                    <Button variant="outline" onClick={handleSendEmail} className="w-full h-9 justify-start text-xs border-slate-200">
                      <Mail className="h-3.5 w-3.5 mr-2 text-slate-400" /> Send via Email
                    </Button>
                    <Button variant="outline" onClick={handleLockToggle} className="w-full h-9 justify-start text-xs border-slate-200">
                      {isLocked ? (
                        <><Unlock className="h-3.5 w-3.5 mr-2 text-slate-400" /> Unlock for Editing</>
                      ) : (
                        <><Lock className="h-3.5 w-3.5 mr-2 text-slate-400" /> Lock Invoice</>
                      )}
                    </Button>
                  </>
                )}
                {isNew ? (
                  <Button onClick={handleCreate} disabled={createInvoice.isPending || !leadId} className="w-full h-10 bg-slate-900 text-white font-bold uppercase tracking-widest text-[11px]">
                    Create Invoice
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={updateInvoice.isPending || isLocked} className="w-full h-10 bg-slate-900 text-white font-bold uppercase tracking-widest text-[11px]">
                    Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

          <TabsContent value="preview" className="m-0 p-0 bg-slate-100 min-h-screen">
            {selectedLead && settings && (
                <InvoicePreview 
                  invoice={{
                    invoice_number: invoiceNumber,
                    invoice_date: invoiceDate,
                    due_date: dueDate,
                    tax_enabled: taxEnabled,
                    tax_rate: taxRate,
                    payment_notes: paymentNotes,
                    terms_conditions: termsConditions,
                  }}
                  items={localItems}
                  settings={settings}
                  lead={selectedLead}
                  isIgst={isIgst}
                />
            )}
            {!selectedLead && (
              <div className="flex items-center justify-center h-[500px] text-slate-400 italic">
                Please select a customer to see the preview
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Additional Sections ── */}
        <div className="max-w-[1400px] mx-auto px-6 pb-12">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" /> Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private notes for your team (not visible on PDF)..."
                rows={3}
                className="text-xs border-slate-200 resize-none"
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
      </div>
    </AppLayout>
  );
}
