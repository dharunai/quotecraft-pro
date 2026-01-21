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
import { ArrowLeft, Plus, Download, Save, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Product } from '@/types/database';

export default function QuotationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quotation, isLoading } = useQuotation(id);
  const { data: items = [], refetch: refetchItems } = useQuotationItems(id);
  const { data: settings } = useCompanySettings();
  const { data: products = [] } = useProducts();
  const updateQuotation = useUpdateQuotation();
  const createItem = useCreateQuotationItem();
  const updateItem = useUpdateQuotationItem();
  const deleteItem = useDeleteQuotationItem();

  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft');
  const [quoteDate, setQuoteDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [showProductBrowser, setShowProductBrowser] = useState(false);

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
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    updateQuotation.mutate({
      id,
      status,
      quote_date: quoteDate,
      valid_until: validUntil || null,
      notes: notes || null,
      subtotal,
      tax,
      total,
    }, {
      onSuccess: () => toast.success('Quotation saved'),
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
      sort_order: items.length,
    }, {
      onSuccess: () => refetchItems(),
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
      sort_order: items.length,
    }, {
      onSuccess: () => refetchItems(),
    });
  };

  const handleUpdateItem = (data: { id: string } & Record<string, unknown>) => {
    if (!id) return;
    updateItem.mutate({ ...data, quotation_id: id } as Parameters<typeof updateItem.mutate>[0]);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!id) return;
    deleteItem.mutate({ id: itemId, quotation_id: id });
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (isLoading || !settings) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Loading...</p>
      </AppLayout>
    );
  }

  if (!quotation || !quotation.lead) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Quotation not found</p>
          <Link to="/quotations">
            <Button variant="outline">Back to Quotations</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const currency = settings.currency || '₹';
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const taxRate = settings.tax_rate || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  return (
    <AppLayout>
      <div className="space-y-6 no-print">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/quotations">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{quotation.quote_number}</h1>
              <p className="text-muted-foreground">{quotation.lead.company_name}</p>
            </div>
            <QuotationStatusBadge status={status} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handleSave} disabled={updateQuotation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateQuotation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="editor" className="space-y-6">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Quotation Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={status} onValueChange={(v: typeof status) => setStatus(v)}>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quote Date</label>
                    <Input
                      type="date"
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valid Until</label>
                    <Input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Add notes..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Client Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{quotation.lead.company_name}</p>
                  <p className="text-sm text-muted-foreground">{quotation.lead.contact_name}</p>
                  {quotation.lead.email && (
                    <p className="text-sm text-muted-foreground">{quotation.lead.email}</p>
                  )}
                  {quotation.lead.phone && (
                    <p className="text-sm text-muted-foreground">{quotation.lead.phone}</p>
                  )}
                  {quotation.lead.address && (
                    <p className="text-sm text-muted-foreground">{quotation.lead.address}</p>
                  )}
                </CardContent>
              </Card>

              {/* Totals */}
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
                  {taxRate > 0 && (
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
                      {currency}{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Line Items</CardTitle>
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
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No items yet</p>
                    <Button variant="outline" className="mt-2" onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
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
                        <QuotationItemRow
                          key={item.id}
                          item={item}
                          currency={currency}
                          onUpdate={handleUpdateItem}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <QuotationPreview
              quotation={{ ...quotation, status, notes }}
              items={items}
              settings={settings}
              lead={quotation.lead}
            />
          </TabsContent>
        </Tabs>

        {/* Product Browser Dialog */}
        <ProductBrowserDialog
          open={showProductBrowser}
          onOpenChange={setShowProductBrowser}
          onSelectProduct={handleAddProduct}
        />
      </div>

      {/* Print-only content */}
      <div className="hidden print:block">
        {quotation.lead && (
          <QuotationPreview
            quotation={{ ...quotation, status, notes }}
            items={items}
            settings={settings}
            lead={quotation.lead}
          />
        )}
      </div>
    </AppLayout>
  );
}
