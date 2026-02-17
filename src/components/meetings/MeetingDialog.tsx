import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetings } from '@/hooks/useMeetings';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Briefcase, UserCircle } from 'lucide-react';
import { Meeting, Lead, Deal } from '@/types/database';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialDate?: Date;
}

export function MeetingDialog({ open, onOpenChange, onSuccess, initialDate }: MeetingDialogProps) {
  const { createMeeting } = useMeetings();
  const [loading, setLoading] = useState(false);

  // Data lists
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<(Deal & { lead?: Lead })[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate ? initialDate.toISOString().split('T')[0] : '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [meetingType, setMeetingType] = useState('online');
  const [location, setLocation] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [linkType, setLinkType] = useState<'none' | 'lead' | 'deal'>('none');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [conductedBy, setConductedBy] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Fetch leads, deals, and profiles when dialog opens
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

    const meetingData = {
      title,
      description: [description, notes].filter(Boolean).join('\n---\n') || null,
      start_time: startDateTime,
      end_time: endDateTime,
      location: meetingType === 'online' ? location || 'Google Meet' : location,
      meeting_link: meetingType === 'online' ? location : null,
      status: 'scheduled' as const,
      organizer_id: conductedBy || null,
      lead_id: linkType === 'lead' ? selectedLeadId || null : linkType === 'deal' ? null : null,
      deal_id: linkType === 'deal' ? selectedDealId || null : null,
    };

    // If linked to a deal, also set its lead_id
    if (linkType === 'deal' && selectedDealId) {
      const deal = deals.find(d => d.id === selectedDealId);
      if (deal) {
        meetingData.lead_id = deal.lead_id;
      }
    }

    const participants = participantEmail
      ? participantEmail.split(',').map(email => ({
        name: null,
        email: email.trim(),
        user_id: null,
      })).filter(p => p.email.includes('@'))
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
    setTitle('');
    setDescription('');
    setDate('');
    setLocation('');
    setParticipantEmail('');
    setLinkType('none');
    setSelectedLeadId('');
    setSelectedDealId('');
    setConductedBy('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Schedule Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-slate-600">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sales Follow-up Call"
              required
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Start *</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">End *</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Type & Location Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Meeting Type</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">🖥️ Online Meeting</SelectItem>
                  <SelectItem value="in_person">📍 In Person</SelectItem>
                  <SelectItem value="phone">📞 Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">
                {meetingType === 'online' ? 'Meeting Link / Platform' : 'Location'}
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={meetingType === 'online' ? 'https://meet.google.com/...' : 'Office address'}
              />
            </div>
          </div>

          {/* Link to Lead or Deal */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> Link to Lead / Deal
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <Select value={linkType} onValueChange={(v: any) => { setLinkType(v); setSelectedLeadId(''); setSelectedDealId(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                </SelectContent>
              </Select>

              {linkType === 'lead' && (
                <div className="col-span-2">
                  <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.company_name} — {lead.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {linkType === 'deal' && (
                <div className="col-span-2">
                  <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a deal..." />
                    </SelectTrigger>
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
          </div>

          {/* Conducted By */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <UserCircle className="h-3.5 w-3.5" /> Conducted By
            </Label>
            <Select value={conductedBy} onValueChange={setConductedBy}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Guest Email(s) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Guest Email(s)
            </Label>
            <Input
              type="text"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-[10px] text-muted-foreground">Separate multiple emails with commas. Invites will be sent automatically.</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the meeting"
            />
          </div>

          {/* Meeting Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Meeting Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agenda, talking points, actions..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
