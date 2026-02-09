import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLead, useUpdateLead, useDeleteLead } from '@/hooks/useLeads';
import { useQuotations, useCreateQuotation, useGenerateQuoteNumber } from '@/hooks/useQuotations';
import { useCreateDeal } from '@/hooks/useDeals';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { handleAutomationEvent } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, addDays } from 'date-fns';
import { ArrowLeft, Trash2, Plus, TrendingUp, Mail, Phone, MapPin, Calendar, FileText, Save } from 'lucide-react';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const { data: quotations = [] } = useQuotations();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createQuotation = useCreateQuotation();
  const generateQuoteNumber = useGenerateQuoteNumber();
  const createDeal = useCreateDeal();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);

  // Inline Edit States
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [dealValue, setDealValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    addDays(new Date(), 30).toISOString().split('T')[0]
  );

  useEffect(() => {
    if (lead) {
      setCompanyName(lead.company_name || '');
      setContactName(lead.contact_name || '');
      setEmail(lead.email || '');
      setPhone(lead.phone || '');
      setAddress(lead.address || '');
      setNotes(lead.notes || '');
    }
  }, [lead]);

  const leadQuotations = quotations.filter(q => q.lead_id === id);

  const handleSave = () => {
    if (!id) return;
    updateLead.mutate({
      id,
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      address,
      notes
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

  const handleQualifyLead = () => {
    if (!id) return;

    createDeal.mutate({
      lead_id: id,
      deal_value: dealValue ? parseFloat(dealValue) : null,
      stage: 'qualified',
      probability: 25,
      expected_close_date: expectedCloseDate || null,
      won_date: null,
      lost_date: null,
      lost_reason: null,
      notes: null,
      created_by: null,
    }, {
      onSuccess: async (deal) => {
        updateLead.mutate({ id, is_qualified: true });
        await handleAutomationEvent('lead_qualified', 'lead', id!, {
          ...lead,
          is_qualified: true,
          deal_value: dealValue ? parseFloat(dealValue) : null
        });
        await triggerWorkflows('lead_qualified', 'lead', id!, {
          is_qualified: true,
          deal_value: dealValue ? parseFloat(dealValue) : null
        });
        setIsQualifying(false);
        navigate(`/deals/${deal.id}`);
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-muted-foreground p-8">Loading lead...</p>
      </AppLayout>
    );
  }

  if (!lead) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Lead not found</p>
          <Link to="/leads">
            <Button variant="outline" className="rounded-sm">Back to Leads</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto p-4 font-sans">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{lead.company_name}</h1>
              <p className="text-muted-foreground">{lead.contact_name}</p>
            </div>
            <LeadStatusBadge status={lead.status} />
            {lead.is_qualified && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0 rounded-sm">Qualified</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/leads">
              <Button variant="outline" size="sm" className="rounded-sm bg-white hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>

            {!lead.is_qualified && (
              <Button onClick={() => setIsQualifying(true)} className="rounded-sm bg-slate-900 hover:bg-slate-800 text-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Qualify Lead
              </Button>
            )}

            <Button variant="outline" onClick={() => setIsDeleting(true)} className="rounded-sm border-slate-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Lead
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Main Info Column (Left) - INLINE EDITOR */}
          <Card className="lg:col-span-2 rounded-sm border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Name</label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Office Address</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="rounded-sm"
                    placeholder="Add notes about this lead..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button onClick={handleSave} disabled={updateLead.isPending} className="rounded-sm bg-slate-900 text-white hover:bg-slate-800">
                  <Save className="h-4 w-4 mr-2" />
                  {updateLead.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Column (Right) */}
          <div className="space-y-6">
            {/* Quotations Card */}
            <Card className="rounded-sm border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-slate-900">Quotations</CardTitle>
                <Button size="sm" onClick={handleCreateQuotation} disabled={createQuotation.isPending} className="rounded-sm h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-3 w-3 mr-1.5" />
                  Create
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leadQuotations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No quotations found
                    </div>
                  ) : (
                    leadQuotations.map((quotation) => (
                      <Link
                        key={quotation.id}
                        to={`/quotations/${quotation.id}`}
                        className="block p-3 rounded-sm border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-slate-700">{quotation.quote_number}</span>
                          <QuotationStatusBadge status={quotation.status} />
                        </div>
                        <div className="text-xs text-slate-500">
                          {format(new Date(quotation.quote_date), 'MMM d, yyyy')}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="rounded-sm border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline entityType="lead" entityId={id!} />
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Dialogs */}
        <Dialog open={isQualifying} onOpenChange={setIsQualifying}>
          <DialogContent className="rounded-sm">
            <DialogHeader>
              <DialogTitle>Qualify Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Convert this lead into a deal in your sales pipeline.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Deal Value</label>
                <Input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  placeholder="Enter estimated value..."
                  min="0"
                  step="0.01"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Close Date</label>
                <Input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="rounded-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsQualifying(false)} className="rounded-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleQualifyLead}
                  disabled={createDeal.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-sm text-white"
                >
                  {createDeal.isPending ? 'Creating Deal...' : 'Create Deal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
          <AlertDialogContent className="rounded-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-bold text-slate-900">"{lead.company_name}"</span>? This will also delete all associated quotations. <br /><br /><span className="text-red-600 font-medium">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-sm text-white">
                Delete Lead
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
