import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInvoices, useDeleteInvoice, useGenerateInvoiceNumber, useCreateInvoice } from '@/hooks/useInvoices';
import { useLeads } from '@/hooks/useLeads';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, addDays } from 'date-fns';
import { Plus, Eye, Trash2, FileText, AlertTriangle } from 'lucide-react';
export default function Invoices() {
  const navigate = useNavigate();
  const {
    data: invoices = [],
    isLoading,
    error
  } = useInvoices();
  const {
    data: leads = []
  } = useLeads();
  const {
    data: settings
  } = useCompanySettings();
  const deleteInvoice = useDeleteInvoice();
  const createInvoice = useCreateInvoice();
  const generateInvoiceNumber = useGenerateInvoiceNumber();
  const [isSelectingLead, setIsSelectingLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleCreateInvoice = async () => {
    if (!selectedLeadId) return;
    try {
      const invoiceNumber = await generateInvoiceNumber.mutateAsync();
      const dueDays = settings?.default_due_days || 30;
      createInvoice.mutate({
        invoice_number: invoiceNumber,
        lead_id: selectedLeadId,
        deal_id: null,
        quotation_id: null,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: addDays(new Date(), dueDays).toISOString().split('T')[0],
        subtotal: 0,
        tax_enabled: true,
        tax_rate: settings?.tax_rate || 18,
        tax_amount: 0,
        grand_total: 0,
        payment_status: 'unpaid',
        amount_paid: 0,
        payment_notes: null,
        terms_conditions: settings?.invoice_terms || settings?.terms || null,
        notes: null,
        is_locked: false,
        created_by: null
      }, {
        onSuccess: data => {
          setIsSelectingLead(false);
          setSelectedLeadId('');
          navigate(`/invoices/${data.id}`);
        }
      });
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };
  const handleDelete = () => {
    if (deleteId) {
      const invoice = invoices.find(i => i.id === deleteId);
      if (invoice?.is_locked || invoice?.payment_status === 'paid') {
        return;
      }
      deleteInvoice.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };
  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/20 text-success border-success/30">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-warning/20 text-warning-foreground border-warning/30">Partial</Badge>;
      default:
        return <Badge variant="destructive">Unpaid</Badge>;
    }
  };
  const currency = settings?.currency || '₹';
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-sans">Invoices</h1>
          <Button onClick={() => setIsSelectingLead(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        {error ? <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load invoices: {error.message}
            </AlertDescription>
          </Alert> : isLoading ? <p className="text-muted-foreground">Loading invoices...</p> : invoices.length === 0 ? <div className="text-center py-12 bg-card rounded-lg border border-border">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No invoices yet</p>
            <Button onClick={() => setIsSelectingLead(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Invoice
            </Button>
          </div> : <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => <tr key={invoice.id}>
                    <td className="font-medium">{invoice.invoice_number}</td>
                    <td>{invoice.lead?.company_name || 'Unknown'}</td>
                    <td className="text-muted-foreground">
                      {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                    </td>
                    <td className="text-muted-foreground">
                      {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                    </td>
                    <td className="font-medium">
                      {currency}{invoice.grand_total.toLocaleString('en-IN', {
                  minimumFractionDigits: 2
                })}
                    </td>
                    <td>{getPaymentBadge(invoice.payment_status)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {!invoice.is_locked && invoice.payment_status !== 'paid' && <Button variant="ghost" size="sm" onClick={() => setDeleteId(invoice.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}

        {/* Select Lead Dialog */}
        <Dialog open={isSelectingLead} onOpenChange={setIsSelectingLead}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Customer</label>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(lead => <SelectItem key={lead.id} value={lead.id}>
                        {lead.company_name} - {lead.contact_name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsSelectingLead(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvoice} disabled={!selectedLeadId || createInvoice.isPending}>
                  {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this invoice? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>;
}