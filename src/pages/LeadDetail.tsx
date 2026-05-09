// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLead, useUpdateLead, useDeleteLead, useConvertLead } from '@/hooks/useLeads';
import { useQuotations, useCreateQuotation, useGenerateQuoteNumber } from '@/hooks/useQuotations';
import { useCreateDeal } from '@/hooks/useDeals';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { handleAutomationEvent } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays } from 'date-fns';
import { ArrowLeft, Trash2, Plus, TrendingUp, Mail, Phone, MapPin, Building2, User, FileText, Save, Edit2, Check, X, ExternalLink, ChevronDown, Tag } from 'lucide-react';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { InteractionLogSection } from '@/components/activity/InteractionLogSection';
import { EmailDialog } from '@/components/email/EmailDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Inline field component ──────────────────────────────────────────────────
function InlineField({ label, value, onChange, onSave, type = 'text', placeholder = '—', icon: Icon, fullWidth = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ComponentType<any>;
  fullWidth?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    onChange(draft);
    setEditing(false);
    onSave(draft);
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') cancel();
    if (e.key === 'Tab') { e.preventDefault(); commit(); }
  };

  return (
    <div className={cn('group relative', fullWidth ? 'col-span-2' : '')}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5 leading-none">
        {Icon && <Icon className="h-3 w-3 opacity-70" />}{label}
      </p>
      {editing ? (
        <div className="flex flex-col gap-2">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as any}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKey}
              rows={4}
              className="w-full text-sm border-2 border-blue-500 rounded-lg px-3 py-2.5 focus:outline-none bg-white shadow-lg z-10 transition-all"
            />
          ) : (
            <input
              ref={inputRef as any}
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKey}
              className="w-full text-sm border-2 border-blue-500 rounded-lg px-3 py-1.5 focus:outline-none bg-white shadow-lg z-10"
            />
          )}
          <div className="flex items-center justify-end gap-2 px-1">
            <Button size="sm" variant="outline" onClick={cancel} className="h-8 text-xs gap-1.5 border-slate-200">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={commit} className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Check className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="cursor-pointer group/field flex items-start gap-1.5 min-h-[28px] rounded px-1.5 py-1 -mx-1.5 hover:bg-blue-50/80 hover:ring-1 hover:ring-blue-100 transition-all"
        >
          <span className={cn('text-[11px] flex-1 leading-relaxed', value ? 'text-slate-800' : 'text-slate-400 italic font-normal')}>
            {value || placeholder}
          </span>
          <Edit2 className="h-2.5 w-2.5 text-slate-300 opacity-0 group-hover/field:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>
      )}
    </div>
  );
}

// ── Status selector ──────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'qualified', label: 'Qualified', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'lost', label: 'Lost', color: 'bg-red-50 text-red-700 border-red-200' },
];

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
  const { data: settings } = useCompanySettings();
  const convertLead = useConvertLead();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Field states
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('new');
  const [leadSource, setLeadSource] = useState('');
  const [website, setWebsite] = useState('');
  const [customerRequirement, setCustomerRequirement] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);

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
      setStatus(lead.status || 'new');
      setLeadSource(lead.lead_source || 'Website');
      setWebsite(lead.website || '');
      setCustomerRequirement(lead.customer_requirement || '');
      setIsDirty(false);
    }
  }, [lead]);

  const leadQuotations = quotations.filter(q => q.lead_id === id);

  const saveField = useCallback((fields: Record<string, any>) => {
    if (!id) return;
    updateLead.mutate({ id, ...fields });
  }, [id, updateLead]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (!id) return;
    updateLead.mutate({ id, status: newStatus as any });
  };

  const handleDelete = () => {
    if (!id) return;
    deleteLead.mutate(id, { onSuccess: () => navigate('/leads') });
  };

  const handleCreateQuotation = async () => {
    if (!id) return;
    try {
      const quoteNumber = await generateQuoteNumber.mutateAsync();
      createQuotation.mutate({
        quote_number: quoteNumber,
        lead_id: id,
        deal_id: null, invoice_id: null,
        status: 'draft',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: null, subtotal: 0, tax: 0, total: 0, notes: null,
      }, { onSuccess: (data) => navigate(`/quotations/${data.id}`) });
    } catch (error) { console.error(error); }
  };

  const handleQualifyLead = () => {
    if (!id) return;
    createDeal.mutate({
      lead_id: id,
      deal_value: dealValue ? parseFloat(dealValue) : null,
      stage: 'qualified', probability: 25,
      expected_close_date: expectedCloseDate || null,
      won_date: null, lost_date: null, lost_reason: null, notes: null, created_by: null,
    }, {
      onSuccess: async (deal) => {
        updateLead.mutate({ id, is_qualified: true });
        await handleAutomationEvent('lead_qualified', 'lead', id!, { ...lead, is_qualified: true });
        setIsQualifying(false);
        navigate(`/deals/${deal.id}`);
      },
    });
  };

  const handleConvert = () => {
    if (!id) return;
    if (!confirm('This will convert this lead into a permanent Account and Contact. All history will be moved. Proceed?')) return;
    
    convertLead.mutate(id, {
      onSuccess: (data) => {
        navigate(`/accounts/${data.account.id}`);
      }
    });
  };

  const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === status);

  if (isLoading) return <AppLayout><p className="text-muted-foreground p-8">Loading lead...</p></AppLayout>;
  if (!lead) return (
    <AppLayout>
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Lead not found</p>
        <Link to="/leads"><Button variant="outline">Back to Leads</Button></Link>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="bg-slate-50/60 -m-4 md:-m-6 min-h-[calc(100vh-3.5rem)]">
        {/* ── Top header bar ── */}
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {lead.company_name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">{lead.company_name}</h1>
                  <p className="text-[10px] text-slate-500 leading-tight">{lead.contact_name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Status selector */}
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className={cn('h-8 text-xs font-semibold border rounded-full px-3 w-auto gap-1', currentStatusConfig?.color)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {lead.is_qualified && (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold px-2.5 py-0.5">
                  ✓ Qualified
                </Badge>
              )}

              {!lead.is_qualified && (
                <Button size="sm" onClick={() => setIsQualifying(true)} className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full px-4">
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  Qualify
                </Button>
              )}

              <Button 
                size="sm" 
                onClick={handleConvert} 
                disabled={convertLead.isPending}
                className="h-8 bg-black hover:bg-slate-800 text-white text-xs rounded-full px-4"
              >
                {convertLead.isPending ? 'Converting...' : 'Convert to Account'}
              </Button>

              <Button size="sm" onClick={handleCreateQuotation} variant="outline" className="h-8 text-xs rounded-full px-4 border-slate-200">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Quotation
              </Button>

              <Button size="sm" variant="ghost" onClick={() => setIsDeleting(true)} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full px-3">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>

              <div className="w-px h-6 bg-slate-200 mx-1" />

              <Link to="/leads">
                <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-slate-700 rounded-full px-3">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Contact Information
                </h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <InlineField label="Company Name" value={companyName} onChange={setCompanyName} onSave={(v) => saveField({ company_name: v })} icon={Building2} placeholder="Enter company name" />
                <InlineField label="Contact Name" value={contactName} onChange={setContactName} onSave={(v) => saveField({ contact_name: v })} icon={User} placeholder="Enter contact name" />
                <InlineField label="Email Address" value={email} onChange={setEmail} onSave={(v) => saveField({ email: v })} type="email" icon={Mail} placeholder="email@company.com" />
                <InlineField label="Website" value={website} onChange={setWebsite} onSave={(v) => saveField({ website: v })} type="url" icon={ExternalLink} placeholder="https://www.example.com" />
                <InlineField label="Phone Number" value={phone} onChange={setPhone} onSave={(v) => saveField({ phone: v })} type="tel" icon={Phone} placeholder="+91 98765 43210" />
                <InlineField label="Office Address" value={address} onChange={setAddress} onSave={(v) => saveField({ address: v })} icon={MapPin} placeholder="Street, City, State — PIN" fullWidth />
                <div className="col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />Lead Source
                  </p>
                  <Select value={leadSource} onValueChange={(v) => { setLeadSource(v); saveField({ lead_source: v }); }}>
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-blue-500 rounded-md">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Cold Call">Cold Call</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Advertising">Advertising</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Interaction Logs (Follow-up Notes) */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <InteractionLogSection entityType="lead" entityId={id!} />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Internal Notes
                </h2>
              </div>
              <div className="p-5 space-y-6">
                <InlineField label="Customer Requirement" value={customerRequirement} onChange={setCustomerRequirement} onSave={(v) => saveField({ customer_requirement: v })} type="textarea" placeholder="What is the customer looking for?..." fullWidth />
                <div className="h-px bg-slate-100" />
                <InlineField label="Internal Notes" value={notes} onChange={setNotes} onSave={(v) => saveField({ notes: v })} type="textarea" placeholder="Add notes about this lead..." fullWidth />
              </div>
            </div>

            {/* Lead Metadata */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Lead Details</h2>
              </div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                {[
                  { label: 'Lead ID', value: `#${id?.slice(0,8).toUpperCase()}` },
                  { label: 'Source', value: lead.lead_source || 'Website' },
                  { label: 'Created', value: lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy') : '—' },
                  { label: 'Last Updated', value: lead.updated_at ? format(new Date(lead.updated_at), 'dd MMM yyyy') : '—' },
                  { label: 'Quotations', value: String(leadQuotations.length) },
                  { label: 'Qualified', value: lead.is_qualified ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                    <p className="text-slate-700 font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">

            {/* Quotations */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Quotations</h2>
                <Button size="sm" onClick={handleCreateQuotation} disabled={createQuotation.isPending}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3">
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              </div>
              <div className="divide-y divide-slate-100">
                {leadQuotations.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No quotations yet</p>
                    <button onClick={handleCreateQuotation} className="mt-2 text-xs text-blue-500 hover:underline">Create first quotation →</button>
                  </div>
                ) : leadQuotations.map((q) => (
                  <Link key={q.id} to={`/quotations/${q.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors group">
                    <div>
                      <p className="text-xs font-bold text-slate-700 font-mono">{q.quote_number}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{format(new Date(q.quote_date), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <QuotationStatusBadge status={q.status} />
                      <ExternalLink className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                {!lead.is_qualified && (
                  <button onClick={() => setIsQualifying(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-sm text-slate-600 transition-colors group">
                    <TrendingUp className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
                    Qualify & Create Deal
                  </button>
                )}
                <button onClick={handleConvert} disabled={convertLead.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-sm text-slate-600 transition-colors group">
                  <TrendingUp className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
                  {convertLead.isPending ? 'Converting...' : 'Convert to Account & Contact'}
                </button>
                <button onClick={handleCreateQuotation}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-blue-50 hover:text-blue-700 text-sm text-slate-600 transition-colors group">
                  <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                  Create Quotation
                </button>
                {email && (
                  <button onClick={() => setShowEmailDialog(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-sky-50 hover:text-sky-700 text-sm text-slate-600 transition-colors group">
                    <Mail className="h-4 w-4 text-slate-400 group-hover:text-sky-500" />
                    Send Email
                  </button>
                )}
                {phone && (
                  <a href={`tel:${phone}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-green-50 hover:text-green-700 text-sm text-slate-600 transition-colors group">
                    <Phone className="h-4 w-4 text-slate-400 group-hover:text-green-500" />
                    Call {phone}
                  </a>
                )}
                <button onClick={() => setIsDeleting(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-red-50 hover:text-red-600 text-sm text-slate-400 transition-colors group">
                  <Trash2 className="h-4 w-4 group-hover:text-red-500" />
                  Delete Lead
                </button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Activity History</h2>
              </div>
              <div className="p-5">
                <ActivityTimeline entityType="lead" entityId={id!} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Qualify Lead Dialog ── */}
      <Dialog open={isQualifying} onOpenChange={setIsQualifying}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Qualify Lead → Create Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">Convert <span className="font-semibold text-slate-700">{lead.company_name}</span> into a deal in your pipeline.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected Deal Value (₹)</label>
              <Input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="0.00" min="0" step="0.01" className="rounded-md" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected Close Date</label>
              <Input type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} className="rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsQualifying(false)} className="rounded-md">Cancel</Button>
              <Button onClick={handleQualifyLead} disabled={createDeal.isPending} className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">
                {createDeal.isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-bold text-slate-900">"{lead.company_name}"</span>? All associated quotations will also be deleted.{' '}
              <span className="text-red-600 font-medium">This cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-md bg-red-600 hover:bg-red-700 text-white">Delete Lead</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        type="general"
        entityId={id!}
        defaultRecipient={{
          email: email || '',
          name: contactName || '',
          company_name: companyName || ''
        }}
        defaultSubject={`Following up from ${settings?.company_name || 'The Genworks CRM'}`}
        defaultBody={`<p>Hi ${contactName || 'there'},</p>`}
      />
    </AppLayout>
  );
}
