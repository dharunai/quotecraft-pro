import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatars';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  addDays,
} from 'date-fns';
import { useMeetings } from '@/hooks/useMeetings';
import { Meeting } from '@/types/database';
import { MeetingDialog } from '@/components/meetings/MeetingDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useConfirm } from '@/contexts/ConfirmContext';

// Status styling (Text-based, no icon fonts)
const statusPillColors: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  cancelled: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  rescheduled: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
};

const statusDotColors: Record<string, string> = {
  scheduled: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
  rescheduled: 'bg-amber-500',
};

// RSVP styling
const rsvpBadgeColors: Record<string, string> = {
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  declined: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  pending: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

// Duration calculation helper
function getDurationLabel(start: string, end: string) {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    const diffMins = Math.round((e.getTime() - s.getTime()) / 60000);
    if (diffMins < 60) return `${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } catch {
    return '';
  }
}

// Next Meeting countdown label helper
function getCountdownLabel(startTimeStr: string, endTimeStr: string) {
  try {
    const now = new Date();
    const start = parseISO(startTimeStr);
    const end = parseISO(endTimeStr);
    
    if (now >= start && now <= end) {
      return 'Active Now';
    }
    
    if (now > end) {
      return 'Ended';
    }
    
    const diffMs = start.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return `Starts in ${diffMins}m`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      const mins = diffMins % 60;
      return `Starts in ${diffHours}h ${mins}m`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `Starts in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } catch {
    return '';
  }
}

// Parsing description for notes and RSVPs
function parseMeetingNotesAndRsvp(description: string | null) {
  if (!description) return { mainDescription: '', notes: '', rsvps: {} as Record<string, string> };
  const parts = description.split('\n---\n');
  
  const rsvpPart = parts.find(p => p.startsWith('RSVPs: '));
  let rsvps: Record<string, string> = {};
  if (rsvpPart) {
    try {
      rsvps = JSON.parse(rsvpPart.substring(7));
    } catch (e) {
      console.error('Failed to parse RSVPs', e);
    }
  }

  const nonRsvpParts = parts.filter(p => !p.startsWith('RSVPs: '));
  const mainDescription = nonRsvpParts[0] || '';
  const notes = nonRsvpParts.slice(1).join('\n---\n') || '';

  return { mainDescription, notes, rsvps };
}

function serializeMeetingDescription(mainDescription: string, notes: string, rsvps: Record<string, string>) {
  const parts = [mainDescription.trim(), notes.trim()];
  if (Object.keys(rsvps).length > 0) {
    parts.push(`RSVPs: ${JSON.stringify(rsvps)}`);
  }
  return parts.filter(Boolean).join('\n---\n') || null;
}

export default function Meetings() {
  const { user } = useAuth();
  const { getMeetings, deleteMeeting, updateMeeting, loading } = useMeetings();
  const confirm = useConfirm();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Dialog / Edit states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [cloneMeeting, setCloneMeeting] = useState<Meeting | null>(null);
  
  // Custom View Selector / Search / Filters
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'today' | 'week' | 'completed' | 'cancelled' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'video' | 'onsite' | 'phone' | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Mark as Held Modal
  const [heldMeeting, setHeldMeeting] = useState<Meeting | null>(null);
  const [outcomeText, setOutcomeText] = useState('');

  // Clock updates for countdowns
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      const data = await getMeetings();
      if (data) setMeetings(data);
    } catch (e) {
      console.error('Failed to load meetings', e);
    }
  }, [getMeetings]);

  useEffect(() => {
    fetchMeetings();
    const fetchSupportingData = async () => {
      const [leadsRes, dealsRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('id, company_name, contact_name'),
        (supabase as any).from('deals').select('id, stage, deal_value, lead:leads(company_name)'),
        supabase.from('profiles').select('*'),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (dealsRes.data) setDeals(dealsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    };
    fetchSupportingData();
  }, [fetchMeetings]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditMeeting(null);
      setCloneMeeting(null);
      setIsDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Lookup helpers
  const getLeadName = (leadId: string | null) => {
    if (!leadId) return null;
    const lead = leads.find((l: any) => l.id === leadId);
    return lead ? lead.company_name : null;
  };

  const getDealInfo = (dealId: string | null) => {
    if (!dealId) return null;
    const deal = deals.find((d: any) => d.id === dealId);
    return deal ? `${deal.lead?.company_name || 'Deal'} — ${deal.stage}` : null;
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    const profile = profiles.find((p: any) => p.id === userId);
    return profile ? (profile.full_name || profile.email || 'Unknown') : null;
  };

  // Next Meeting Calculator
  const nextMeeting = useMemo(() => {
    const now = new Date();
    return meetings
      .filter(m => m.status === 'scheduled' || m.status === 'rescheduled')
      .filter(m => {
        try {
          return parseISO(m.end_time) > now;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
        } catch {
          return 0;
        }
      })[0] || null;
  }, [meetings]);

  // KPI summary calculations
  const stats = useMemo(() => {
    const today = new Date();
    const weekS = startOfWeek(today, { weekStartsOn: 1 });
    const weekE = endOfWeek(today, { weekStartsOn: 1 });
    return {
      today: meetings.filter(m => {
        try { return isSameDay(parseISO(m.start_time), today); } catch { return false; }
      }).length,
      thisWeek: meetings.filter(m => {
        try {
          const d = parseISO(m.start_time);
          return isWithinInterval(d, { start: weekS, end: weekE });
        } catch {
          return false;
        }
      }).length,
      completed: meetings.filter(m => m.status === 'completed').length,
      cancelled: meetings.filter(m => m.status === 'cancelled').length,
      scheduled: meetings.filter(m => m.status === 'scheduled' || m.status === 'rescheduled').length,
    };
  }, [meetings]);

  // Filter & Search Implementation
  const filteredMeetings = useMemo(() => {
    const today = new Date();
    const weekS = startOfWeek(today, { weekStartsOn: 1 });
    const weekE = endOfWeek(today, { weekStartsOn: 1 });

    return meetings.filter(m => {
      // 1. Search Query
      const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description?.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Tab filter
      let matchesTab = true;
      if (activeTab === 'my') {
        matchesTab = m.organizer_id === user?.id;
      } else if (activeTab === 'today') {
        try { matchesTab = isSameDay(parseISO(m.start_time), today); } catch { matchesTab = false; }
      } else if (activeTab === 'week') {
        try {
          matchesTab = isWithinInterval(parseISO(m.start_time), { start: weekS, end: weekE });
        } catch { matchesTab = false; }
      } else if (activeTab === 'completed') {
        matchesTab = m.status === 'completed';
      } else if (activeTab === 'cancelled') {
        matchesTab = m.status === 'cancelled';
      } else if (activeTab === 'pending') {
        matchesTab = m.status === 'scheduled' || m.status === 'rescheduled';
      }

      // 3. Status select filter
      const matchesStatus = !statusFilter || m.status.toLowerCase() === statusFilter.toLowerCase();

      // 4. Type select filter
      let matchesType = true;
      if (typeFilter === 'video') matchesType = !!m.meeting_link;
      else if (typeFilter === 'onsite') matchesType = !!m.location && !m.meeting_link;
      else if (typeFilter === 'phone') matchesType = !m.location && !m.meeting_link;

      return matchesSearch && matchesTab && matchesStatus && matchesType;
    });
  }, [meetings, activeTab, searchTerm, statusFilter, typeFilter, user]);

  const sortedMeetings = useMemo(() => {
    return [...filteredMeetings].sort((a, b) => {
      try {
        return parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime();
      } catch {
        return 0;
      }
    });
  }, [filteredMeetings]);

  const selectedMeeting = useMemo(() => {
    return selectedMeetingId ? meetings.find(m => m.id === selectedMeetingId) || null : null;
  }, [selectedMeetingId, meetings]);

  // Actions
  const handleMarkAsHeldOpen = (meeting: Meeting) => {
    const parsed = parseMeetingNotesAndRsvp(meeting.description);
    setHeldMeeting(meeting);
    setOutcomeText(parsed.notes);
  };

  const handleMarkAsHeldSubmit = async () => {
    if (!heldMeeting) return;
    const parsed = parseMeetingNotesAndRsvp(heldMeeting.description);
    const updatedDesc = serializeMeetingDescription(parsed.mainDescription, outcomeText, parsed.rsvps);
    
    const result = await updateMeeting(heldMeeting.id, {
      status: 'completed',
      description: updatedDesc
    });

    if (result) {
      setHeldMeeting(null);
      setOutcomeText('');
      fetchMeetings();
    }
  };

  const handleCancelMeeting = async (meeting: Meeting) => {
    if (!await confirm('Are you sure you want to cancel this meeting?')) return;
    const result = await updateMeeting(meeting.id, { status: 'cancelled' });
    if (result) fetchMeetings();
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!await confirm('Are you sure you want to delete this meeting record permanently?')) return;
    const result = await deleteMeeting(id);
    if (result) {
      setSelectedMeetingId(null);
      fetchMeetings();
    }
  };

  const handleReschedule = (meeting: Meeting) => {
    setCloneMeeting(null);
    setEditMeeting(meeting);
    setIsDialogOpen(true);
  };

  const handleClone = (meeting: Meeting) => {
    setEditMeeting(null);
    setCloneMeeting(meeting);
    setIsDialogOpen(true);
  };

  const handleRsvpToggle = async (meeting: Meeting, participantEmail: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      pending: 'accepted',
      accepted: 'declined',
      declined: 'pending',
    };
    const nextStatus = nextStatusMap[currentStatus || 'pending'] || 'pending';
    
    const parsed = parseMeetingNotesAndRsvp(meeting.description);
    const updatedRsvps = { ...parsed.rsvps, [participantEmail]: nextStatus };
    const updatedDesc = serializeMeetingDescription(parsed.mainDescription, parsed.notes, updatedRsvps);

    const result = await updateMeeting(meeting.id, {
      description: updatedDesc
    });

    if (result) {
      fetchMeetings();
      toast.success(`RSVP updated to ${nextStatus} for ${participantEmail}`);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] gap-0 p-0 font-sans overflow-hidden bg-background">
        
        {/* ═══ TOP HEADER & CONTROLS ═══ */}
        <div className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Meetings
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {meetings.length} total
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Zoho CRM Meetings module with action outcomes and participant RSVPs
            </p>
          </div>
          <Button
            onClick={() => { setEditMeeting(null); setCloneMeeting(null); setIsDialogOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-lg shadow-primary/10 rounded-xl"
            size="sm"
          >
            + Create Meeting
          </Button>
        </div>

        {/* ═══ TOP METRICS & COUNTDOWN WIDGETS ═══ */}
        <div className="p-6 border-b border-border bg-muted/20 shrink-0 grid lg:grid-cols-12 gap-5">
          {/* Next Meeting Hero countdown block */}
          <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[120px]">
            {nextMeeting ? (
              <>
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold tracking-widest text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                      {getCountdownLabel(nextMeeting.start_time, nextMeeting.end_time)}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1 cursor-pointer hover:underline" onClick={() => setSelectedMeetingId(nextMeeting.id)}>
                      {nextMeeting.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(nextMeeting.start_time), 'EEEE, MMMM d, h:mm a')} · conducted by {getProfileName(nextMeeting.organizer_id)}
                    </p>
                  </div>
                  {nextMeeting.meeting_link && (
                    <a
                      href={nextMeeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow"
                    >
                      Join Meeting
                    </a>
                  )}
                </div>
                <div className="border-t border-border mt-3 pt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex gap-4">
                    {nextMeeting.lead_id && (
                      <span>Lead: <strong className="text-foreground">{getLeadName(nextMeeting.lead_id)}</strong></span>
                    )}
                    {nextMeeting.deal_id && (
                      <span>Deal: <strong className="text-foreground">{getDealInfo(nextMeeting.deal_id)}</strong></span>
                    )}
                  </div>
                  <button className="text-primary font-bold hover:underline" onClick={() => setSelectedMeetingId(nextMeeting.id)}>
                    View Details
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 h-full text-center">
                <p className="text-sm font-semibold text-muted-foreground">No upcoming meetings scheduled</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">Keep your pipeline active by reaching out to your leads</p>
              </div>
            )}
          </div>

          {/* Quick counters strip */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Today', value: stats.today, color: 'text-foreground', bg: 'bg-card' },
              { label: 'Weekly Total', value: stats.thisWeek, color: 'text-blue-600', bg: 'bg-card' },
              { label: 'Completed (Held)', value: stats.completed, color: 'text-emerald-600', bg: 'bg-card' },
              { label: 'Cancelled / Missed', value: stats.cancelled, color: 'text-red-500', bg: 'bg-card' }
            ].map((c, i) => (
              <div key={i} className={`${c.bg} border border-border rounded-xl p-4 flex flex-col justify-center shadow-sm`}>
                <p className={`text-xl font-black tracking-tight leading-none ${c.color}`}>{c.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-2">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ FILTER BAR ROWS ═══ */}
        <div className="px-6 py-3 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          {/* Custom list views selector */}
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'my', label: 'My Meetings' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'pending', label: 'Scheduled' },
              { id: 'completed', label: 'Completed (Held)' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                  ${activeTab === tab.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & inline category selectors */}
          <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by subject..."
              className="h-8 text-xs bg-muted/40 border-border rounded-xl flex-1 sm:w-60"
            />
            
            <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? null : v as any)}>
              <SelectTrigger className="h-8 text-xs bg-muted/40 border-border rounded-xl w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video Call</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ═══ MAIN CRM GRID VIEW ═══ */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-auto p-6">
            {sortedMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border border-dashed rounded-2xl">
                <p className="text-5xl opacity-20">📅</p>
                <h4 className="text-sm font-semibold text-muted-foreground mt-4">No meetings matching your selection</h4>
                <p className="text-xs text-muted-foreground/70 mt-1">Change your filters or create a new meeting to get started.</p>
              </div>
            ) : (
              <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-bold text-foreground text-xs pl-5 py-3">Subject / Host</TableHead>
                      <TableHead className="font-bold text-foreground text-xs py-3">Related To</TableHead>
                      <TableHead className="font-bold text-foreground text-xs py-3">Date & Time</TableHead>
                      <TableHead className="font-bold text-foreground text-xs py-3">Duration</TableHead>
                      <TableHead className="font-bold text-foreground text-xs py-3">Type</TableHead>
                      <TableHead className="font-bold text-foreground text-xs py-3">Status</TableHead>
                      <TableHead className="font-bold text-foreground text-xs pr-5 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMeetings.map(meeting => {
                      const isSelected = selectedMeetingId === meeting.id;
                      const hasLink = !!meeting.meeting_link;
                      const typeL = hasLink ? 'Video' : meeting.location ? 'On-site' : 'Phone';
                      const start = parseISO(meeting.start_time);
                      const relativeLead = getLeadName(meeting.lead_id);
                      const relativeDeal = getDealInfo(meeting.deal_id);
                      
                      return (
                        <TableRow
                          key={meeting.id}
                          className={`border-border/60 hover:bg-muted/20 transition-all cursor-pointer
                            ${isSelected ? 'bg-primary/5 hover:bg-primary/5' : ''}`}
                          onClick={() => setSelectedMeetingId(meeting.id)}
                        >
                          <TableCell className="pl-5 py-4">
                            <div>
                              <p className="text-xs font-bold text-foreground hover:underline">
                                {meeting.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Conducted by: {getProfileName(meeting.organizer_id)}
                              </p>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-4">
                            {relativeDeal ? (
                              <div className="text-[11px]">
                                <span className="text-[9px] font-bold text-violet-500 uppercase mr-1">Deal</span>
                                <span className="font-medium text-foreground">{relativeDeal}</span>
                              </div>
                            ) : relativeLead ? (
                              <div className="text-[11px]">
                                <span className="text-[9px] font-bold text-blue-500 uppercase mr-1">Lead</span>
                                <span className="font-medium text-foreground">{relativeLead}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="py-4">
                            <div className="text-xs">
                              <p className="font-semibold text-foreground">{format(start, 'dd MMM yyyy')}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {format(start, 'hh:mm a')} – {format(parseISO(meeting.end_time), 'hh:mm a')}
                              </p>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-4 text-xs font-semibold text-foreground/80">
                            {getDurationLabel(meeting.start_time, meeting.end_time)}
                          </TableCell>
                          
                          <TableCell className="py-4 text-xs font-medium text-foreground/75">
                            {typeL}
                          </TableCell>
                          
                          <TableCell className="py-4">
                            <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider border py-0.5 px-2 ${statusPillColors[meeting.status]}`}>
                              {meeting.status}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="pr-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {(meeting.status === 'scheduled' || meeting.status === 'rescheduled') && (
                                <>
                                  <button
                                    onClick={() => handleMarkAsHeldOpen(meeting)}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-2 py-1 rounded"
                                  >
                                    Log Outcome
                                  </button>
                                  <button
                                    onClick={() => handleReschedule(meeting)}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-2 py-1 rounded"
                                  >
                                    Reschedule
                                  </button>
                                </>
                              )}
                              
                              <Select
                                onValueChange={value => {
                                  if (value === 'clone') handleClone(meeting);
                                  if (value === 'cancel') handleCancelMeeting(meeting);
                                  if (value === 'delete') handleDeleteMeeting(meeting.id);
                                }}
                              >
                                <SelectTrigger className="h-7 w-7 border-none shadow-none p-0 focus:ring-0">
                                  <span className="text-xs text-muted-foreground font-black hover:text-foreground">⋯</span>
                                </SelectTrigger>
                                <SelectContent align="end">
                                  <SelectItem value="clone">Clone Meeting</SelectItem>
                                  {(meeting.status === 'scheduled' || meeting.status === 'rescheduled') && (
                                    <SelectItem value="cancel">Cancel Meeting</SelectItem>
                                  )}
                                  <SelectItem value="delete" className="text-red-600 focus:bg-red-50 focus:text-red-700">Delete Permanently</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* ═══ DETAIL SLIDE-OUT PANEL ═══ */}
          {selectedMeeting && (
            <div className="w-[380px] bg-card border-l border-border flex flex-col h-full animate-in slide-in-from-right-5 duration-200 shadow-xl shrink-0">
              {/* Panel Header */}
              <div className="px-6 py-5 border-b border-border bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold tracking-tight text-foreground truncate">{selectedMeeting.title}</h2>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(parseISO(selectedMeeting.start_time), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMeetingId(null)}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider border ${statusPillColors[selectedMeeting.status]}`}>
                    {selectedMeeting.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {selectedMeeting.meeting_link ? 'Video Call' : selectedMeeting.location ? 'On-site' : 'Phone Call'}
                  </span>
                </div>
              </div>

              {/* Panel Scrollable Body */}
              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-6">
                  {/* Time & Duration */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Time & Duration</p>
                    <p className="text-xs font-semibold text-foreground">
                      {format(parseISO(selectedMeeting.start_time), 'hh:mm a')} – {format(parseISO(selectedMeeting.end_time), 'hh:mm a')} ({getDurationLabel(selectedMeeting.start_time, selectedMeeting.end_time)})
                    </p>
                  </div>

                  {/* Location or Link */}
                  {(selectedMeeting.meeting_link || selectedMeeting.location) && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        {selectedMeeting.meeting_link ? 'Meeting Link' : 'Location'}
                      </p>
                      {selectedMeeting.meeting_link ? (
                        <a
                          href={selectedMeeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors break-all"
                        >
                          {selectedMeeting.meeting_link}
                        </a>
                      ) : (
                        <p className="text-xs font-medium text-foreground">{selectedMeeting.location}</p>
                      )}
                    </div>
                  )}

                  {/* Agenda/Description */}
                  {parseMeetingNotesAndRsvp(selectedMeeting.description).mainDescription && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Agenda / Description</p>
                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {parseMeetingNotesAndRsvp(selectedMeeting.description).mainDescription}
                      </p>
                    </div>
                  )}

                  {/* Outcome and Notes */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Meeting Notes & Outcomes</p>
                    {selectedMeeting.status === 'completed' ? (
                      <p className="text-xs text-foreground/85 italic bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                        {parseMeetingNotesAndRsvp(selectedMeeting.description).notes || 'No outcome logged.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Log meeting outcome notes here..."
                          value={outcomeText}
                          onChange={e => setOutcomeText(e.target.value)}
                          rows={3}
                          className="text-xs border-border/80 rounded-xl resize-none"
                        />
                        <button
                          onClick={async () => {
                            const parsed = parseMeetingNotesAndRsvp(selectedMeeting.description);
                            const desc = serializeMeetingDescription(parsed.mainDescription, outcomeText, parsed.rsvps);
                            const res = await updateMeeting(selectedMeeting.id, { description: desc });
                            if (res) {
                              fetchMeetings();
                              toast.success('Meeting notes updated successfully');
                            }
                          }}
                          className="text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/95 px-3 py-1.5 rounded-lg w-full"
                        >
                          Update Notes
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Conducted By */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Conducted By</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-border">
                        <AvatarImage src={getAvatarUrl(getProfileName(selectedMeeting.organizer_id) || '')} />
                        <AvatarFallback className="text-[8px] font-bold">
                          {getProfileName(selectedMeeting.organizer_id)?.substring(0, 2).toUpperCase() || 'US'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-foreground">{getProfileName(selectedMeeting.organizer_id)}</span>
                    </div>
                  </div>

                  {/* Related To Lead/Deal */}
                  {(selectedMeeting.lead_id || selectedMeeting.deal_id) && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Related To</p>
                      {selectedMeeting.deal_id ? (
                        <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900 text-xs font-semibold text-violet-900 dark:text-violet-300">
                          Deal: {getDealInfo(selectedMeeting.deal_id)}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-xs font-semibold text-blue-900 dark:text-blue-300">
                          Lead: {getLeadName(selectedMeeting.lead_id)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Participants and RSVPs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Participants RSVP
                      </p>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Click pills to cycle RSVP status
                      </span>
                    </div>
                    {selectedMeeting.participants && selectedMeeting.participants.length > 0 ? (
                      <div className="space-y-2">
                        {selectedMeeting.participants.map((p, i) => {
                          const parsed = parseMeetingNotesAndRsvp(selectedMeeting.description);
                          const rsvp = parsed.rsvps[p.email || ''] || 'pending';
                          
                          return (
                            <div key={p.id || i} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 border border-border">
                                  <AvatarImage src={getAvatarUrl(p.name || p.email || 'G')} />
                                  <AvatarFallback className="text-[8px] font-bold">
                                    {(p.name || p.email || 'G').substring(0,2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{p.name || p.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRsvpToggle(selectedMeeting, p.email || '', rsvp)}
                                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full transition-all
                                  ${rsvpBadgeColors[rsvp]}`}
                              >
                                {rsvp}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">No external participants registered.</p>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Panel Footer Actions */}
              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => handleReschedule(selectedMeeting)}>
                  Edit Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700"
                  onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                >
                  Delete Record
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meeting outcomes dialog / Mark as Held */}
      {heldMeeting && (
        <Dialog open={!!heldMeeting} onOpenChange={open => !open && setHeldMeeting(null)}>
          <DialogContent className="sm:max-w-[420px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Log Meeting Outcome</DialogTitle>
              <DialogDescription className="text-xs">
                Mark the meeting "{heldMeeting.title}" as completed and log notes/minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Outcome / Meeting Notes</Label>
                <Textarea
                  placeholder="e.g. Lead was very interested in QuoteCraft Pro. Wants pricing proposal by Monday."
                  value={outcomeText}
                  onChange={e => setOutcomeText(e.target.value)}
                  rows={4}
                  className="text-xs border-border/80 rounded-xl resize-none"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button size="sm" variant="outline" onClick={() => setHeldMeeting(null)}>Cancel</Button>
              <Button size="sm" onClick={handleMarkAsHeldSubmit}>Mark as Completed</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Schedule / Edit / Clone Meeting Dialog */}
      {isDialogOpen && (
        <MeetingDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={() => {
            fetchMeetings();
            setEditMeeting(null);
            setCloneMeeting(null);
          }}
          editMeeting={editMeeting}
          cloneMeeting={cloneMeeting}
        />
      )}
    </AppLayout>
  );
}
