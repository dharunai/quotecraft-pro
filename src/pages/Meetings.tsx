import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getAvatarUrl } from '@/lib/avatars';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Video,
  Phone,
  Users,
  Briefcase,
  FileText,
  Search,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO, setHours, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isBefore, isAfter } from 'date-fns';
import { useMeetings } from '@/hooks/useMeetings';
import { Meeting } from '@/types/database';
import { MeetingDialog } from '@/components/meetings/MeetingDialog';
import { supabase } from '@/integrations/supabase/client';

const timeSlots = Array.from({ length: 24 }, (_, i) => i);

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  rescheduled: 'bg-amber-50 text-amber-700 border-amber-200',
};

const meetingTypeIcon = (meeting: Meeting) => {
  if (meeting.meeting_link) return <Video className="h-3.5 w-3.5 text-blue-500" />;
  if (meeting.location) return <MapPin className="h-3.5 w-3.5 text-emerald-500" />;
  return <Phone className="h-3.5 w-3.5 text-slate-400" />;
};

export default function Meetings() {
  const { getMeetings, loading } = useMeetings();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isMounting, setIsMounting] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'Day' | 'Week' | 'Month' | 'Agenda'>('Week');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'video' | 'onsite' | 'phone' | null>(null);

  React.useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Calendar UI Refs and State
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to 8 AM on load or view change
  useEffect(() => {
    if (view === 'Week' || view === 'Day') {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const timeSlot8 = document.getElementById('time-slot-8');
        if (timeSlot8) {
          timeSlot8.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }, 100);
    }
  }, [view]);

  const fetchMeetings = useCallback(async () => {
    try {
      if (typeof getMeetings === 'function') {
        const data = await getMeetings();
        if (data) setMeetings(data);
      }
    } catch (e) {
      console.error("Failed to fetch meetings", e);
    } finally {
      setIsMounting(false);
    }
  }, []);

  // Fetch supporting data
  useEffect(() => {
    fetchMeetings();
    const fetchSupporting = async () => {
      const [leadsRes, dealsRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('id, company_name, contact_name'),
        (supabase as any).from('deals').select('id, stage, deal_value, lead:leads(company_name)'),
        supabase.from('profiles').select('*'),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (dealsRes.data) setDeals(dealsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    };
    fetchSupporting();
  }, [fetchMeetings]);

  const handleRefresh = () => {
    fetchMeetings();
  };

  // Helper lookups
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

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfMonth(monthEnd) });

  const navigateDate = (direction: 'prev' | 'next') => {
    if (view === 'Week') setDate(curr => direction === 'prev' ? addDays(curr, -7) : addDays(curr, 7));
    if (view === 'Day') setDate(curr => direction === 'prev' ? addDays(curr, -1) : addDays(curr, 1));
    if (view === 'Month') setDate(curr => direction === 'prev' ? subMonths(curr, 1) : addMonths(curr, 1));
  };

  // Next upcoming meeting
  const nextMeeting = useMemo(() => {
    const now = new Date();
    const upcoming = meetings
      .filter(m => {
        try { return isAfter(parseISO(m.start_time), now) && m.status === 'scheduled'; }
        catch { return false; }
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
    return upcoming[0] || null;
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (m.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = !statusFilter || m.status.toLowerCase() === statusFilter.toLowerCase();
      
      let matchesType = true;
      if (typeFilter === 'video') matchesType = !!m.meeting_link;
      else if (typeFilter === 'onsite') matchesType = !!m.location && !m.meeting_link;
      else if (typeFilter === 'phone') matchesType = !m.location && !m.meeting_link;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [meetings, searchTerm, statusFilter, typeFilter]);

  // Sorted meetings for sidebar
  const sortedMeetings = useMemo(() => {
    return [...filteredMeetings].sort((a, b) => {
      try { return parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime(); }
      catch { return 0; }
    });
  }, [filteredMeetings]);

  const getDayMeetings = (day: Date) => {
    return filteredMeetings.filter(m => {
      try {
        return isSameDay(parseISO(m.start_time), day);
      } catch (e) { return false; }
    });
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-2rem)] gap-6 p-2 font-sans overflow-hidden">
        {/* Left Sidebar — Filters, Types, Upcoming */}
        <div className="w-full lg:w-80 flex flex-col gap-4 lg:overflow-hidden shrink-0">
          
          {/* Quick Actions & Search */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setIsDialogOpen(true)} className="h-20 flex-col gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5" />
                <span className="text-[10px] font-bold">Schedule</span>
              </Button>
              <Button variant="outline" onClick={() => setDate(new Date())} className="h-20 flex-col gap-2 rounded-2xl border-slate-100 hover:bg-slate-50 text-slate-600">
                <CalendarIcon className="h-5 w-5" />
                <span className="text-[10px] font-bold">Jump Today</span>
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search events..."
                className="h-10 pl-9 text-xs bg-slate-50/50 border-slate-100 rounded-xl focus:ring-primary/10"
              />
            </div>
          </div>

          {/* Meeting Types & Filters */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-5">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Meeting Types</h3>
              <div className="space-y-2">
                <div 
                  onClick={() => setTypeFilter(typeFilter === 'video' ? null : 'video')}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${typeFilter === 'video' ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-100' : 'bg-blue-50/50 border-blue-100/50 hover:bg-blue-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center text-white"><Video className="h-4 w-4" /></div>
                    <span className="text-xs font-semibold text-blue-900">Video Call</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-none text-[10px]">{meetings.filter(m => m.meeting_link).length}</Badge>
                </div>
                <div 
                  onClick={() => setTypeFilter(typeFilter === 'onsite' ? null : 'onsite')}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${typeFilter === 'onsite' ? 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-100' : 'bg-emerald-50/50 border-emerald-100/50 hover:bg-emerald-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white"><MapPin className="h-4 w-4" /></div>
                    <span className="text-xs font-semibold text-emerald-900">On-site</span>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-none text-[10px]">{meetings.filter(m => m.location && !m.meeting_link).length}</Badge>
                </div>
                <div 
                  onClick={() => setTypeFilter(typeFilter === 'phone' ? null : 'phone')}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${typeFilter === 'phone' ? 'bg-slate-200 border-slate-300 ring-2 ring-slate-100' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-slate-400 flex items-center justify-center text-white"><Phone className="h-4 w-4" /></div>
                    <span className="text-xs font-semibold text-slate-700">Discovery Call</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-200 text-slate-600 border-none text-[10px]">{meetings.filter(m => !m.location && !m.meeting_link).length}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick Filters</h3>
              <div className="flex flex-wrap gap-2">
                {['Scheduled', 'Completed', 'Cancelled'].map(filter => {
                  const isActive = statusFilter === filter;
                  return (
                    <Badge 
                      key={filter} 
                      variant="outline" 
                      onClick={() => setStatusFilter(isActive ? null : filter)}
                      className={`px-3 py-1 rounded-full cursor-pointer transition-all text-[10px] font-bold ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                      {filter}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming Meetings List */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Upcoming</h3>
                <p className="text-[10px] text-muted-foreground font-medium">{meetings.filter(m => m.status === 'scheduled').length} events</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {sortedMeetings.filter(m => m.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <CalendarIcon className="h-6 w-6 text-slate-200" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">No upcoming meetings scheduled for this period.</p>
                  </div>
                ) : (
                  sortedMeetings.filter(m => m.status === 'scheduled').slice(0, 10).map(meeting => {
                    const isSelected = selectedMeetingId === meeting.id;
                    let startStr = '', dateStr = '';
                    try {
                      const s = parseISO(meeting.start_time);
                      startStr = format(s, 'h:mm a');
                      dateStr = format(s, 'MMM d');
                    } catch { }

                    return (
                      <div
                        key={meeting.id}
                        onClick={() => {
                          setSelectedMeetingId(meeting.id);
                          try { setDate(parseISO(meeting.start_time)); } catch { }
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer group ${isSelected ? 'bg-blue-50 border-blue-200 ring-4 ring-blue-50' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{dateStr.split(' ')[0]}</span>
                            <span className="text-sm font-black text-slate-900 leading-none">{dateStr.split(' ')[1]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{meeting.title}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{startStr} · {getLeadName(meeting.lead_id) || 'Internal'}</p>
                          </div>
                          <div className={`h-2 w-2 rounded-full shrink-0 ${isSelected ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Calendar Section */}
        <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Sticky Calendar Toolbar */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100">
            <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white transition-all shadow-none" onClick={() => navigateDate('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white transition-all shadow-none" onClick={() => navigateDate('next')}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  {view === 'Month' ? format(date, 'MMMM yyyy') :
                    view === 'Day' ? format(date, 'EEEE, MMM d, yyyy') :
                      view === 'Week' ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}` :
                        'All Upcoming'}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                  {(['Day', 'Week', 'Month', 'Agenda'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === v ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* --- WEEK VIEW --- */}
            {view === 'Week' && (
              <>
                <div className="grid grid-cols-8 border-b border-slate-100 bg-white z-10 pr-2 sticky top-0">
                  <div className="p-4 border-r border-slate-50"></div>
                  {weekDays.map(day => (
                    <div key={day.toString()} className="p-4 text-center border-r border-slate-50 last:border-0">
                      <div className="text-xs font-semibold text-slate-500 mb-1">{format(day, 'EEEE')}</div>
                      <div className={`text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isSameDay(day, new Date()) ? 'bg-black text-white' : 'text-slate-900'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollArea className="flex-1" ref={scrollAreaRef}>
                  <div className="grid grid-cols-8 relative min-h-[1200px]">
                    {/* Time labels column */}
                    <div className="border-r border-slate-50 bg-slate-50/30">
                      {timeSlots.map(hour => (
                        <div
                          key={hour}
                          id={`time-slot-${hour}`}
                          className="h-28 text-xs text-slate-400 font-medium p-4 border-b border-slate-100 text-center sticky left-0"
                        >
                          {format(setHours(new Date(), hour), 'h a')}
                        </div>
                      ))}
                    </div>

                    {/* Days columns */}
                    {weekDays.map(day => (
                      <div key={day.toString()} className="border-r border-slate-50 last:border-0 relative">
                        {/* Current time indicator line */}
                        {isSameDay(day, currentTime) && (
                          <div
                            className="absolute z-20 w-full border-t-2 border-red-500 pointer-events-none flex items-center"
                            style={{
                              top: `${(currentTime.getHours() + (currentTime.getMinutes() / 60)) * 112}px`
                            }}
                          >
                            <div className="absolute -left-1 w-2 h-2 bg-red-500 rounded-full" />
                          </div>
                        )}

                        {timeSlots.map(hour => (
                          <div key={hour} className="h-28 border-b border-slate-50/50"></div>
                        ))}
                        {getDayMeetings(day).map(meeting => {
                          try {
                            const start = parseISO(meeting.start_time);
                            const end = parseISO(meeting.end_time);
                            const startHour = start.getHours();
                            const startMinutes = start.getMinutes();
                            const duration = (end.getTime() - start.getTime()) / 3600000;
                            const top = (startHour + (startMinutes / 60)) * 112;
                            const height = duration * 112;
                            const isSelected = selectedMeetingId === meeting.id;

                            return (
                              <div key={meeting.id}
                                onClick={() => setSelectedMeetingId(meeting.id)}
                                className={`absolute left-1 right-1 p-2 rounded-xl border shadow-sm hover:shadow-md transition-all z-10 flex flex-col justify-between overflow-hidden cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-slate-100'
                                  }`}
                                style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6 border border-slate-100">
                                    <AvatarImage src={getAvatarUrl(getLeadName(meeting.lead_id) || meeting.title || 'Meeting')} />
                                    <AvatarFallback className="text-[9px]">{meeting.title?.substring(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-900 truncate">{meeting.title}</p>
                                    <p className="text-[9px] text-slate-500 truncate">{format(start, 'h:mm')} - {format(end, 'h:mm')}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          } catch (e) { return null; }
                        })}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* --- DAY VIEW --- */}
            {view === 'Day' && (
              <ScrollArea className="flex-1" ref={scrollAreaRef}>
                <div className="flex min-h-[1200px] relative">
                  <div className="w-20 border-r border-slate-50 bg-slate-50/30">
                    {timeSlots.map(hour => (
                      <div
                        key={hour}
                        id={`time-slot-${hour}`}
                        className="h-32 text-xs text-slate-400 font-medium p-4 border-b border-slate-100 text-center sticky left-0"
                      >
                        {format(setHours(new Date(), hour), 'h a')}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative bg-white">
                    {/* Current time indicator line */}
                    {isSameDay(date, currentTime) && (
                      <div
                        className="absolute z-20 w-full border-t-2 border-red-500 pointer-events-none flex items-center"
                        style={{
                          top: `${(currentTime.getHours() + (currentTime.getMinutes() / 60)) * 128}px`
                        }}
                      >
                        <div className="absolute -left-1 w-2 h-2 bg-red-500 rounded-full" />
                        <span className="absolute left-0 -top-6 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                          {format(currentTime, 'h:mm a')}
                        </span>
                      </div>
                    )}

                    {timeSlots.map(hour => (
                      <div key={hour} className="h-32 border-b border-slate-50/50 w-full"></div>
                    ))}
                    {getDayMeetings(date).map(meeting => {
                      try {
                        const start = parseISO(meeting.start_time);
                        const end = parseISO(meeting.end_time);
                        const startHour = start.getHours();
                        const startMinutes = start.getMinutes();
                        const duration = (end.getTime() - start.getTime()) / 3600000;
                        const top = (startHour + (startMinutes / 60)) * 128;
                        const height = duration * 128;
                        const isSelected = selectedMeetingId === meeting.id;

                        return (
                          <div key={meeting.id}
                            onClick={() => setSelectedMeetingId(meeting.id)}
                            className={`absolute left-4 right-4 p-4 rounded-xl border shadow-sm z-10 flex flex-col justify-between cursor-pointer ${isSelected ? 'bg-blue-50/70 border-blue-200 ring-2 ring-blue-200' : 'bg-indigo-50/50 border-indigo-100'
                              }`}
                            style={{ top: `${top}px`, height: `${height}px`, minHeight: '60px' }}>
                            <div>
                              <h3 className="font-bold text-indigo-900">{meeting.title}</h3>
                              <p className="text-sm text-indigo-700 mt-1">{meeting.description}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                              <Clock className="h-3 w-3" />
                              {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                            </div>
                          </div>
                        );
                      } catch (e) { return null; }
                    })}
                  </div>
                </div>
              </ScrollArea>
            )}

            {/* --- MONTH VIEW --- */}
            {view === 'Month' && (
              <div className="flex-1 p-4">
                <div className="grid grid-cols-7 h-full border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="p-3 bg-slate-50 text-xs font-semibold text-slate-500 text-center border-b border-slate-100 border-r last:border-r-0">{d}</div>
                  ))}
                  {monthDays.map(day => {
                    const dayMeetings = getDayMeetings(day);
                    const isCurrentMonth = isWithinInterval(day, { start: monthStart, end: monthEnd });
                    return (
                      <div key={day.toString()} className={`p-2 border-b border-r border-slate-100 last:border-r-0 min-h-[100px] hover:bg-slate-50/50 transition-colors ${!isCurrentMonth ? 'bg-slate-50/30' : ''}`}>
                        <div className={`text-xs font-medium mb-1 ${isSameDay(day, new Date()) ? 'bg-black text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayMeetings.slice(0, 3).map(m => (
                            <div key={m.id}
                              onClick={() => setSelectedMeetingId(m.id)}
                              className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-pointer ${selectedMeetingId === m.id ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}>
                              {m.title}
                            </div>
                          ))}
                          {dayMeetings.length > 3 && (
                            <div className="text-[9px] text-slate-400 pl-1">+{dayMeetings.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- AGENDA VIEW --- */}
            {view === 'Agenda' && (
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-3 max-w-3xl mx-auto">
                  {sortedMeetings.length === 0 ? (
                    <div className="text-center py-16">
                      <CalendarIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No meetings scheduled</p>
                    </div>
                  ) : sortedMeetings.map(m => {
                    let s = '', e = '';
                    try { s = format(parseISO(m.start_time), 'EEE, MMM d · h:mm a'); e = format(parseISO(m.end_time), 'h:mm a'); } catch {}
                    return (
                      <div key={m.id} onClick={() => setSelectedMeetingId(m.id)} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm bg-white transition-all cursor-pointer flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                          {meetingTypeIcon(m)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s} – {e}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${statusColors[m.status]}`}>{m.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}


          </div>
        </div>


      </div>

      {/* Meeting Dialog */}
      {isDialogOpen && (
        <MeetingDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleRefresh}
        />
      )}
    </AppLayout>
  );
}
