import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuotations, useCreateQuotation, useDeleteQuotation, useGenerateQuoteNumber } from '@/hooks/useQuotations';
import { useLeads } from '@/hooks/useLeads';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Plus, Eye, Trash2 } from 'lucide-react';
export default function Quotations() {
  const navigate = useNavigate();
  const {
    data: quotations = [],
    isLoading
  } = useQuotations();
  const {
    data: leads = []
  } = useLeads();
  const {
    data: settings
  } = useCompanySettings();
  const createQuotation = useCreateQuotation();
  const deleteQuotation = useDeleteQuotation();
  const generateQuoteNumber = useGenerateQuoteNumber();
  const [isSelectingLead, setIsSelectingLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleCreateQuotation = async () => {
    if (!selectedLeadId) return;
    try {
      const quoteNumber = await generateQuoteNumber.mutateAsync();
      createQuotation.mutate({
        quote_number: quoteNumber,
        lead_id: selectedLeadId,
        deal_id: null,
        invoice_id: null,
        status: 'draft',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: null,
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: null
      }, {
        onSuccess: data => {
          setIsSelectingLead(false);
          setSelectedLeadId('');
          navigate(`/quotations/${data.id}`);
        }
      });
    } catch (error) {
      console.error('Failed to create quotation:', error);
    }
  };
  const handleDelete = () => {
    if (deleteId) {
      deleteQuotation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };
  const currency = settings?.currency || '₹';
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-sans">Quotations</h1>
          <Button onClick={() => setIsSelectingLead(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading quotations...</p> : quotations.length === 0 ? <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground mb-4">No quotations yet</p>
            <Button onClick={() => setIsSelectingLead(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Quotation
            </Button>
          </div> : <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Quote No.</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map(quotation => <tr key={quotation.id}>
                    <td className="font-medium">{quotation.quote_number}</td>
                    <td>{quotation.lead?.company_name || 'Unknown'}</td>
                    <td className="text-muted-foreground">
                      {format(new Date(quotation.quote_date), 'dd MMM yyyy')}
                    </td>
                    <td className="font-medium">
                      {currency}{quotation.total.toLocaleString('en-IN', {
                  minimumFractionDigits: 2
                })}
                    </td>
                    <td>
                      <QuotationStatusBadge status={quotation.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/quotations/${quotation.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(quotation.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
              <DialogTitle>Create New Quotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Lead</label>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(lead => <SelectItem key={lead.id} value={lead.id}>
                        {lead.company_name} - {lead.contact_name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {leads.length === 0 && <p className="text-sm text-muted-foreground">
                  No leads available.{' '}
                  <Link to="/leads" className="text-primary hover:underline">
                    Create a lead first
                  </Link>
                </p>}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsSelectingLead(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateQuotation} disabled={!selectedLeadId || createQuotation.isPending}>
                  {createQuotation.isPending ? 'Creating...' : 'Create Quotation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this quotation? This action cannot be undone.
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