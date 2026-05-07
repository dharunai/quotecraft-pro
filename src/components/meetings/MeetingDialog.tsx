import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetings } from '@/hooks/useMeetings';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Briefcase, UserCircle, Calendar as CalendarIcon, Clock, Video, MapPin, Link2, FileText, Type } from 'lucide-react';
import { Meeting, Lead, Deal } from '@/types/database';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialDate?: Date;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground/80 mt-0.5">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, icon: Icon, required, children }: { label: string; icon?: React.ElementType; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function MeetingDialog({ open, onOpenChange, onSuccess, initialDate }: MeetingDialogProps) {
  const { createMeeting } = useMeetings();
  const [loading, setLoading] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<(Deal & { lead?: Lead })[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate ? initialDate.toISOString().split('T')[0] : '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [meetingType, setMeetingType] = useState('online');
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled' | 'rescheduled'>('scheduled');
  const [location, setLocation] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [linkType, setLinkType] = useState<'none' | 'lead' | 'deal'>('none');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [conductedBy, setConductedBy] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const [leadsRes, dealsRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('*').order('company_name'),
        (supabase as any).from('deals').select('*, lead:leads(id, company_name, contact_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
      if (dealsRes.data) setDeals(dealsRes.data as (Deal & { lead?: Lead })[]);
      if (profilesRes.data) setProfiles(profilesRes.data as any[]);
    };
    fetchData();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    const meetingData: any = {
      title,
      description: [description, notes].filter(Boolean).join('\n---\n') || null,
      start_time: startDateTime,
      end_time: endDateTime,
      location: meetingType === 'online' ? location || 'Google Meet' : location,
      meeting_link: meetingType === 'online' ? location : null,
      status,
      organizer_id: conductedBy || null,
      lead_id: linkType === 'lead' ? selectedLeadId || null : null,
      deal_id: linkType === 'deal' ? selectedDealId || null : null,
    };

    if (linkType === 'deal' && selectedDealId) {
      const deal = deals.find(d => d.id === selectedDealId);
      if (deal) meetingData.lead_id = deal.lead_id;
    }

    const participants = participantEmail
      ? participantEmail.split(',').map(email => ({ name: null, email: email.trim(), user_id: null })).filter(p => p.email.includes('@'))
      : [];

    const result = await createMeeting(meetingData, participants);
    setLoading(false);
    if (result) {
      onOpenChange(false);
      resetForm();
      if (onSuccess) onSuccess();
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setDate(''); setLocation('');
    setParticipantEmail(''); setLinkType('none');
    setSelectedLeadId(''); setSelectedDealId(''); setConductedBy(''); setNotes('');
    setStatus('scheduled');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <DialogTitle className="text-lg font-semibold tracking-tight">Schedule Meeting</DialogTitle>
          <DialogDescription className="text-xs">Add details below to create a new meeting on your calendar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(92vh-130px)]">
          <div className="overflow-y-auto px-6 py-5 space-y-6">

            <Section title="Meeting Details">
              <Field label="Title" icon={Type} required>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sales Follow-up Call" required />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Meeting Type" icon={Video}>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online Meeting</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={status} onValueChange={v => setStatus(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Section title="Date & Time">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Date" icon={CalendarIcon} required>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </Field>
                <Field label="Start" icon={Clock} required>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </Field>
                <Field label="End" icon={Clock} required>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </Field>
              </div>
            </Section>

            <Section title="Location & Platform">
              <Field label={meetingType === 'online' ? 'Meeting Link' : 'Location'} icon={meetingType === 'online' ? Link2 : MapPin}>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={meetingType === 'online' ? 'https://meet.google.com/…' : 'Office address or room'} />
              </Field>
            </Section>

            <Section title="Relations & Ownership">
              <Field label="Conducted By" icon={UserCircle}>
                <Select value={conductedBy} onValueChange={setConductedBy}>
                  <SelectTrigger><SelectValue placeholder="Select team member…" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || 'Unknown'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Link to Lead / Deal" icon={Briefcase}>
                <div className="grid grid-cols-3 gap-3">
                  <Select value={linkType} onValueChange={(v: any) => { setLinkType(v); setSelectedLeadId(''); setSelectedDealId(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="deal">Deal</SelectItem>
                    </SelectContent>
                  </Select>
                  {linkType === 'lead' && (
                    <div className="col-span-2">
                      <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                        <SelectTrigger><SelectValue placeholder="Select a lead…" /></SelectTrigger>
                        <SelectContent>
                          {leads.map(lead => (
                            <SelectItem key={lead.id} value={lead.id}>{lead.company_name} — {lead.contact_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {linkType === 'deal' && (
                    <div className="col-span-2">
                      <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                        <SelectTrigger><SelectValue placeholder="Select a deal…" /></SelectTrigger>
                        <SelectContent>
                          {deals.map(deal => (
                            <SelectItem key={deal.id} value={deal.id}>
                              {deal.lead?.company_name || 'Unknown'} — {deal.stage} {deal.deal_value ? `(₹${deal.deal_value.toLocaleString()})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Guest Email(s)" icon={Users}>
                <Input value={participantEmail} onChange={e => setParticipantEmail(e.target.value)} placeholder="email1@example.com, email2@example.com" />
                <p className="text-[11px] text-muted-foreground mt-1">Separate multiple emails with commas. Invites will be sent automatically.</p>
              </Field>
            </Section>

            <Section title="Description & Notes">
              <Field label="Description" icon={FileText}>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the meeting" />
              </Field>
              <Field label="Meeting Notes">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Agenda, talking points, actions…" rows={3} className="resize-none" />
              </Field>
            </Section>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-muted/30 sticky bottom-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="min-w-[130px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Meeting
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
