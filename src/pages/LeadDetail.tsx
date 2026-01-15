import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLead, useUpdateLead, useDeleteLead } from '@/hooks/useLeads';
import { useQuotations, useCreateQuotation, useGenerateQuoteNumber } from '@/hooks/useQuotations';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { LeadForm } from '@/components/leads/LeadForm';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react';
import { Lead } from '@/types/database';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const { data: quotations = [] } = useQuotations();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createQuotation = useCreateQuotation();
  const generateQuoteNumber = useGenerateQuoteNumber();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const leadQuotations = quotations.filter(q => q.lead_id === id);

  const handleUpdate = (data: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!id) return;
    updateLead.mutate({ id, ...data }, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const handleDelete = () => {
    if (!id) return;
    deleteLead.mutate(id, {
      onSuccess: () => navigate('/leads'),
    });
  };

  const handleCreateQuotation = async () => {
    if (!id) return;
    try {
      const quoteNumber = await generateQuoteNumber.mutateAsync();
      createQuotation.mutate({
        quote_number: quoteNumber,
        lead_id: id,
        deal_id: null,
        invoice_id: null,
        status: 'draft',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: null,
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: null,
      }, {
        onSuccess: (data) => {
          navigate(`/quotations/${data.id}`);
        },
      });
    } catch (error) {
      console.error('Failed to create quotation:', error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Loading lead...</p>
      </AppLayout>
    );
  }

  if (!lead) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Lead not found</p>
          <Link to="/leads">
            <Button variant="outline">Back to Leads</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/leads">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{lead.company_name}</h1>
              <p className="text-muted-foreground">{lead.contact_name}</p>
            </div>
            <LeadStatusBadge status={lead.status} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setIsDeleting(true)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Lead Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{lead.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{lead.phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{lead.address || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{lead.notes || '-'}</p>
                </div>
              </div>
              <div className="pt-4 border-t text-sm text-muted-foreground">
                Created on {format(new Date(lead.created_at), 'dd MMM yyyy')}
              </div>
            </CardContent>
          </Card>

          {/* Quotations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Quotations</CardTitle>
              <Button size="sm" onClick={handleCreateQuotation} disabled={createQuotation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
              </Button>
            </CardHeader>
            <CardContent>
              {leadQuotations.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No quotations yet</p>
              ) : (
                <div className="space-y-3">
                  {leadQuotations.map((quotation) => (
                    <Link
                      key={quotation.id}
                      to={`/quotations/${quotation.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{quotation.quote_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(quotation.quote_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <QuotationStatusBadge status={quotation.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            <LeadForm
              lead={lead}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isLoading={updateLead.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{lead.company_name}"? This will also delete all associated quotations. This action cannot be undone.
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
    </AppLayout>
  );
}
