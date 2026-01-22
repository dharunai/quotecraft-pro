import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDeal, useUpdateDeal, useDeleteDeal } from '@/hooks/useDeals';
import { useQuotations, useCreateQuotation, useGenerateQuoteNumber } from '@/hooks/useQuotations';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STAGES = [
  { id: 'qualified', label: 'Qualified', probability: 25 },
  { id: 'proposal', label: 'Proposal', probability: 50 },
  { id: 'negotiation', label: 'Negotiation', probability: 75 },
  { id: 'won', label: 'Won', probability: 100 },
  { id: 'lost', label: 'Lost', probability: 0 },
] as const;

type Stage = typeof STAGES[number]['id'];

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id);
  const { data: quotations = [] } = useQuotations();
  const { data: settings } = useCompanySettings();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const createQuotation = useCreateQuotation();
  const generateQuoteNumber = useGenerateQuoteNumber();

  const [isDeleting, setIsDeleting] = useState(false);
  const [dealValue, setDealValue] = useState<string>('');
  const [stage, setStage] = useState<Stage>('qualified');
  const [probability, setProbability] = useState<number>(25);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>('');
  const [lostReason, setLostReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  React.useEffect(() => {
    if (deal) {
      setDealValue(deal.deal_value?.toString() || '');
      setStage(deal.stage as Stage);
      setProbability(deal.probability);
      setExpectedCloseDate(deal.expected_close_date || '');
      setLostReason(deal.lost_reason || '');
      setNotes(deal.notes || '');
    }
  }, [deal]);

  const dealQuotations = quotations.filter(q => q.deal_id === id);

  const handleStageChange = (newStage: Stage) => {
    setStage(newStage);
    const stageData = STAGES.find(s => s.id === newStage);
    if (stageData) {
      setProbability(stageData.probability);
    }
  };

  const handleSave = () => {
    if (!id) return;
    
    // Require lost_reason when marking as lost
    if (stage === 'lost' && !lostReason.trim()) {
      toast.error('Please provide a reason for losing this deal');
      return;
    }
    
    updateDeal.mutate({
      id,
      deal_value: dealValue ? parseFloat(dealValue) : null,
      stage,
      probability,
      expected_close_date: expectedCloseDate || null,
      lost_reason: stage === 'lost' ? lostReason : null,
      notes: notes || null,
    });
  };

  const handleDelete = () => {
    if (!id || !deal) return;
    deleteDeal.mutate({ id, leadId: deal.lead_id }, {
      onSuccess: () => navigate('/pipeline'),
    });
  };

  const handleCreateQuotation = async () => {
    if (!id || !deal) return;
    try {
      const quoteNumber = await generateQuoteNumber.mutateAsync();
      createQuotation.mutate({
        quote_number: quoteNumber,
        lead_id: deal.lead_id,
        deal_id: id,
        invoice_id: null,
        status: 'draft',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: null,
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: null,
      }, {
        onSuccess: (data) => navigate(`/quotations/${data.id}`),
      });
    } catch (error) {
      console.error('Failed to create quotation:', error);
    }
  };

  const handleCreateInvoice = () => {
    if (!id) return;
    navigate(`/invoices/new?deal_id=${id}`);
  };

  const currency = settings?.currency || '₹';

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Loading deal...</p>
      </AppLayout>
    );
  }

  if (!deal) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Deal not found</p>
          <Link to="/pipeline">
            <Button variant="outline">Back to Pipeline</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const getStageColor = () => {
    switch (stage) {
      case 'qualified': return 'bg-info/20 text-info';
      case 'proposal': return 'bg-warning/20 text-warning-foreground';
      case 'negotiation': return 'bg-primary/20 text-primary';
      case 'won': return 'bg-success/20 text-success';
      case 'lost': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/pipeline">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{deal.lead?.company_name}</h1>
              <p className="text-muted-foreground">{deal.lead?.contact_name}</p>
            </div>
            <Badge className={getStageColor()}>
              {STAGES.find(s => s.id === stage)?.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {stage === 'won' && (
              <Button onClick={handleCreateInvoice}>
                <FileText className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDeleting(true)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Deal
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Deal Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deal Value ({currency})</label>
                  <Input
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    placeholder="Enter deal value"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stage</label>
                  <Select value={stage} onValueChange={(v: Stage) => handleStageChange(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Win Probability (%)</label>
                  <Input
                    type="number"
                    value={probability}
                    onChange={(e) => setProbability(parseInt(e.target.value) || 0)}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected Close Date</label>
                  <Input
                    type="date"
                    value={expectedCloseDate}
                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                  />
                </div>
              </div>

              {stage === 'lost' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-destructive">Lost Reason *</label>
                  <Textarea
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    placeholder="Enter reason for losing this deal..."
                    rows={3}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this deal..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={updateDeal.isPending}>
                  {updateDeal.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lead Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{deal.lead?.company_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="font-medium">{deal.lead?.contact_name}</p>
              </div>
              {deal.lead?.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{deal.lead.email}</p>
                </div>
              )}
              {deal.lead?.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{deal.lead.phone}</p>
                </div>
              )}
              {deal.lead?.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{deal.lead.address}</p>
                </div>
              )}
              <div className="pt-3 border-t">
                <Link to={`/leads/${deal.lead_id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Full Lead
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quotations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Related Quotations</CardTitle>
            <Button size="sm" onClick={handleCreateQuotation} disabled={createQuotation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quotation
            </Button>
          </CardHeader>
          <CardContent>
            {dealQuotations.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No quotations yet</p>
            ) : (
              <div className="space-y-3">
                {dealQuotations.map((quotation) => (
                  <Link
                    key={quotation.id}
                    to={`/quotations/${quotation.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{quotation.quote_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(quotation.quote_date), 'dd MMM yyyy')} | {currency}{quotation.total.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <QuotationStatusBadge status={quotation.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium">Deal created</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(deal.created_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
              </div>
              {deal.won_date && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-success" />
                  <div>
                    <p className="text-sm font-medium">Deal won</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(deal.won_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
              )}
              {deal.lost_date && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-destructive" />
                  <div>
                    <p className="text-sm font-medium">Deal lost</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(deal.lost_date), 'dd MMM yyyy')}
                    </p>
                    {deal.lost_reason && (
                      <p className="text-sm text-muted-foreground mt-1">{deal.lost_reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Deal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this deal? This will not delete the associated lead or quotations. This action cannot be undone.
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
