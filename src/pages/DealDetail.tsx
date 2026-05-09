// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDeal, useUpdateDeal, useDeleteDeal } from '@/hooks/useDeals';
import { useQuotations, useCreateQuotation, useGenerateQuoteNumber } from '@/hooks/useQuotations';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2, Plus, FileText, TrendingUp, Mail, Phone, ExternalLink, Edit2, Check, X, DollarSign, Calendar, Target, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { InteractionLogSection } from '@/components/activity/InteractionLogSection';
import { EmailDialog } from '@/components/email/EmailDialog';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'qualified', label: 'Qualified', probability: 25, color: 'bg-sky-50 text-sky-700 border-sky-200', bar: 'bg-sky-400' },
  { id: 'proposal', label: 'Proposal', probability: 50, color: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
  { id: 'negotiation', label: 'Negotiation', probability: 75, color: 'bg-violet-50 text-violet-700 border-violet-200', bar: 'bg-violet-500' },
  { id: 'won', label: 'Won', probability: 100, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', probability: 0, color: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-400' },
] as const;

type Stage = typeof STAGES[number]['id'];

// ── Inline field ─────────────────────────────────────────────────────────────
function InlineField({ label, value, onChange, onSave, type = 'text', placeholder = '—', icon: Icon }: any) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value ?? ''); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => { onChange(draft); setEditing(false); onSave(draft); };
  const cancel = () => { setDraft(value ?? ''); setEditing(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') cancel();
    if (e.key === 'Tab') { e.preventDefault(); commit(); }
  };

  return (
    <div className="group">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input ref={ref} type={type} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey}
            className="w-full text-sm border border-blue-400 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
          <button onClick={commit} className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0"><Check className="h-3.5 w-3.5" /></button>
          <button onClick={cancel} className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 flex-shrink-0"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <div onClick={() => setEditing(true)} className="cursor-pointer flex items-center gap-2 min-h-[26px] rounded px-2 py-1 -mx-2 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all group/f">
          <span className={cn('text-[11px] flex-1', draft ? 'text-slate-800' : 'text-slate-400 italic')}>{draft || placeholder}</span>
          <Edit2 className="h-2.5 w-2.5 text-slate-300 opacity-0 group-hover/f:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      )}
    </div>
  );
}

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
  const [showLostReason, setShowLostReason] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [stage, setStage] = useState<Stage>('qualified');
  const [probability, setProbability] = useState(25);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  useEffect(() => {
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
  const currency = settings?.currency || '₹';
  const currentStage = STAGES.find(s => s.id === stage)!;

  const saveField = useCallback((fields: Record<string, any>) => {
    if (!id) return;
    if (fields.stage === 'lost' && !lostReason.trim()) {
      setShowLostReason(true); return;
    }
    updateDeal.mutate({ id, ...fields });
  }, [id, updateDeal, lostReason]);

  const handleStageChange = (newStage: Stage) => {
    const s = STAGES.find(s => s.id === newStage)!;
    setStage(newStage);
    setProbability(s.probability);
    if (newStage === 'lost') { setShowLostReason(true); return; }
    updateDeal.mutate({ id, stage: newStage, probability: s.probability });
  };

  const handleLostConfirm = () => {
    if (!lostReason.trim()) { toast.error('Please enter a lost reason'); return; }
    updateDeal.mutate({ id, stage: 'lost', probability: 0, lost_reason: lostReason });
    setShowLostReason(false);
  };

  const handleDelete = () => {
    if (!id || !deal) return;
    deleteDeal.mutate({ id, leadId: deal.lead_id }, { onSuccess: () => navigate('/pipeline') });
  };

  const handleCreateQuotation = async () => {
    if (!id || !deal) return;
    const quoteNumber = await generateQuoteNumber.mutateAsync();
    createQuotation.mutate({
      quote_number: quoteNumber, lead_id: deal.lead_id, deal_id: id,
      invoice_id: null, status: 'draft',
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: null, subtotal: 0, tax: 0, total: 0, notes: null,
    }, { onSuccess: (data) => navigate(`/quotations/${data.id}`) });
  };

  if (isLoading) return <AppLayout><p className="text-muted-foreground p-8">Loading deal...</p></AppLayout>;
  if (!deal) return (
    <AppLayout>
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Deal not found</p>
        <Link to="/pipeline"><Button variant="outline">Back to Pipeline</Button></Link>
      </div>
    </AppLayout>
  );

  const stageIndex = STAGES.findIndex(s => s.id === stage);

  return (
    <AppLayout>
      <div className="bg-slate-50/60 -m-4 md:-m-6 min-h-[calc(100vh-3.5rem)]">

        {/* ── Header bar ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {deal.lead?.company_name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">{deal.lead?.company_name}</h1>
                  <p className="text-[10px] text-slate-500 leading-tight">{deal.lead?.contact_name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Select value={stage} onValueChange={(v: Stage) => handleStageChange(v)}>
                <SelectTrigger className={cn('h-8 text-xs font-semibold border rounded-full px-3 w-auto gap-1', currentStage.color)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {stage === 'won' && (
                <Button size="sm" onClick={() => navigate(`/invoices/new?deal_id=${id}`)} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-full px-4">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />Create Invoice
                </Button>
              )}
              <Button size="sm" onClick={handleCreateQuotation} variant="outline" className="h-8 text-xs rounded-full px-4">
                <Plus className="h-3.5 w-3.5 mr-1.5" />Quotation
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsDeleting(true)} className="h-8 text-red-500 hover:bg-red-50 rounded-full px-3">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>

              <div className="w-px h-6 bg-slate-200 mx-1" />

              <Link to="/pipeline">
                <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-slate-700 rounded-full px-3">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stage pipeline bar ── */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex items-center">
              {STAGES.filter(s => s.id !== 'lost').map((s, i) => {
                const isActive = s.id === stage;
                const isPast = i < stageIndex && stage !== 'lost';
                return (
                  <button key={s.id} onClick={() => handleStageChange(s.id as Stage)}
                    className={cn(
                      'flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all hover:bg-slate-50',
                      isActive ? `border-blue-500 text-blue-600` : isPast ? 'border-emerald-400 text-emerald-600' : 'border-transparent text-slate-400'
                    )}>
                    {s.label}
                    <span className="block text-[10px] font-normal opacity-70">{s.probability}%</span>
                  </button>
                );
              })}
              <button onClick={() => handleStageChange('lost')}
                className={cn('px-5 py-3 text-xs font-semibold border-b-2 transition-all hover:bg-red-50',
                  stage === 'lost' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-400')}>
                Lost
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Deal info */}
          <div className="lg:col-span-2 space-y-5">

            {/* Value & Probability */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-500" />Deal Details
                </h2>
              </div>
              <div className="p-5 grid md:grid-cols-3 gap-x-8 gap-y-5">
                <InlineField label={`Deal Value (${currency})`} value={dealValue} onChange={setDealValue}
                  onSave={(v: string) => saveField({ deal_value: v ? parseFloat(v) : null })}
                  type="number" placeholder="Enter value" icon={DollarSign} />
                <InlineField label="Win Probability (%)" value={String(probability)} onChange={(v: string) => setProbability(parseInt(v) || 0)}
                  onSave={(v: string) => saveField({ probability: parseInt(v) || 0 })}
                  type="number" placeholder="0–100" icon={Target} />
                <InlineField label="Expected Close Date" value={expectedCloseDate} onChange={setExpectedCloseDate}
                  onSave={(v: string) => saveField({ expected_close_date: v || null })}
                  type="date" icon={Calendar} />
              </div>

              {/* Probability bar */}
              <div className="px-5 pb-5">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Win probability</span><span className="font-semibold text-slate-600">{probability}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', currentStage.bar)} style={{ width: `${probability}%` }} />
                </div>
              </div>
            </div>

            {/* Interaction Logs (Follow-up Notes) */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <InteractionLogSection entityType="deal" entityId={id!} />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Internal Deal Notes</h2>
              </div>
              <div className="p-5">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  onBlur={() => saveField({ notes: notes || null })}
                  rows={4} placeholder="Add deal notes..."
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white" />
              </div>
            </div>

            {/* Contact info from Lead */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Lead Contact</h2>
                <Link to={`/leads/${deal.lead_id}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                  View Lead <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div className="p-5 grid md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                {[
                  { label: 'Company', value: deal.lead?.company_name },
                  { label: 'Contact', value: deal.lead?.contact_name },
                  { label: 'Email', value: deal.lead?.email },
                  { label: 'Phone', value: deal.lead?.phone },
                  { label: 'Address', value: deal.lead?.address },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                    <p className="text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* Deal at a glance */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">At a Glance</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="text-center py-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-2xl font-bold text-slate-900">{currency}{dealValue ? parseFloat(dealValue).toLocaleString('en-IN') : '—'}</p>
                  <p className="text-xs text-slate-400 mt-1">Deal Value</p>
                </div>
                {[
                  { label: 'Stage', value: currentStage.label },
                  { label: 'Probability', value: `${probability}%` },
                  { label: 'Close Date', value: expectedCloseDate ? format(new Date(expectedCloseDate), 'dd MMM yyyy') : '—' },
                  { label: 'Quotations', value: String(dealQuotations.length) },
                  { label: 'Created', value: deal.created_at ? format(new Date(deal.created_at), 'dd MMM yyyy') : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quotations */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Quotations</h2>
                <Button size="sm" onClick={handleCreateQuotation} disabled={createQuotation.isPending}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3">
                  <Plus className="h-3 w-3 mr-1" />New
                </Button>
              </div>
              <div className="divide-y divide-slate-100">
                {dealQuotations.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No quotations yet</p>
                    <button onClick={handleCreateQuotation} className="mt-2 text-xs text-blue-500 hover:underline">Create quotation →</button>
                  </div>
                ) : dealQuotations.map(q => (
                  <Link key={q.id} to={`/quotations/${q.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 group">
                    <div>
                      <p className="text-xs font-bold text-slate-700 font-mono">{q.quote_number}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{currency}{q.total.toLocaleString('en-IN')} · {format(new Date(q.quote_date), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <QuotationStatusBadge status={q.status} />
                      <ExternalLink className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-800">Quick Actions</h2></div>
              <div className="p-4 space-y-1">
                {stage === 'won' && (
                  <button onClick={() => navigate(`/invoices/new?deal_id=${id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-sm text-slate-600 transition-colors group">
                    <FileText className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />Create Invoice
                  </button>
                )}
                {deal.lead?.email && (
                  <button onClick={() => setShowEmailDialog(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-sky-50 hover:text-sky-700 text-sm text-slate-600 transition-colors group">
                    <Mail className="h-4 w-4 text-slate-400 group-hover:text-sky-500" />Email {deal.lead.company_name}
                  </button>
                )}
                {deal.lead?.phone && (
                  <a href={`tel:${deal.lead.phone}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-green-50 hover:text-green-700 text-sm text-slate-600 transition-colors group">
                    <Phone className="h-4 w-4 text-slate-400 group-hover:text-green-500" />{deal.lead.phone}
                  </a>
                )}
                <button onClick={() => setIsDeleting(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-red-50 hover:text-red-600 text-sm text-slate-400 transition-colors group">
                  <Trash2 className="h-4 w-4 group-hover:text-red-500" />Delete Deal
                </button>
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Activity History</h2>
              </div>
              <div className="p-5">
                <ActivityTimeline entityType="deal" entityId={id!} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Lost reason dialog */}
      <Dialog open={showLostReason} onOpenChange={setShowLostReason}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5" />Mark as Lost</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">Please provide a reason for losing this deal.</p>
            <textarea value={lostReason} onChange={e => setLostReason(e.target.value)} rows={3} placeholder="e.g. Budget constraints, competitor chosen..."
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowLostReason(false); setStage(deal.stage as Stage); }} className="rounded-md">Cancel</Button>
              <Button onClick={handleLostConfirm} className="rounded-md bg-red-600 hover:bg-red-700 text-white">Confirm Lost</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>This will delete the deal. Lead and quotations are preserved. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-md bg-red-600 hover:bg-red-700 text-white">Delete Deal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        type="general"
        entityId={id!}
        defaultRecipient={{
          email: deal.lead?.email || '',
          name: deal.lead?.contact_name || '',
          company_name: deal.lead?.company_name || ''
        }}
        defaultSubject={`Following up on our deal - ${settings?.company_name || 'The Genworks CRM'}`}
        defaultBody={`<p>Hi ${deal.lead?.contact_name || 'there'},</p>`}
      />
    </AppLayout>
  );
}
