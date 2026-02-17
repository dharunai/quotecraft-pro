import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [view, setView] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Week');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

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

  const getDayMeetings = (day: Date) => {
    return meetings.filter(m => {
      try {
        return isSameDay(parseISO(m.start_time), day);
      } catch (e) { return false; }
    });
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

  // Sorted meetings for sidebar
  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => {
      try { return parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime(); }
      catch { return 0; }
    });
  }, [meetings]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-2rem)] gap-6 p-2 font-sans overflow-hidden">

        {/* Main Calendar Section */}
        <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Calendar Header */}
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
              <div className="flex items-center gap-2 mt-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateDate('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                <p className="text-sm font-medium text-slate-700 w-32 text-center">
                  {view === 'Month' ? format(date, 'MMMM yyyy') :
                    view === 'Day' ? format(date, 'MMM d, yyyy') :
                      view === 'Week' ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d')}` :
                        format(date, 'yyyy')}
                </p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateDate('next')}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-1 rounded-full flex gap-1">
                {['Day', 'Week', 'Month', 'Year'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${view === v ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Button onClick={() => setIsDialogOpen(true)} className="rounded-full px-5 h-9 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm">
                Add New <Plus className="ml-2 h-4 w-4" />
              </Button>
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
                                  <Avatar className="h-6 w-6 border border-slate-100"><AvatarFallback className="text-[9px]">{meeting.title?.substring(0, 2)}</AvatarFallback></Avatar>
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

            {/* --- YEAR VIEW --- */}
            {view === 'Year' && (
              <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-2">
                <CalendarIcon className="h-12 w-12 opacity-20" />
                <span className="text-sm">Year view coming soon</span>
              </div>
            )}

          </div>
        </div>

        {/* Sidebar — Meetings List */}
        <div className="w-80 flex flex-col gap-4 overflow-hidden">

          {/* Next Meeting Card */}
          {nextMeeting && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Next Meeting</p>
              <h3 className="font-bold text-base">{nextMeeting.title}</h3>
              <div className="flex items-center gap-2 mt-2 text-slate-300 text-xs">
                <CalendarIcon className="h-3 w-3" />
                {(() => {
                  try { return format(parseISO(nextMeeting.start_time), 'EEE, MMM d · h:mm a'); }
                  catch { return 'TBD'; }
                })()}
              </div>
              {(nextMeeting.meeting_link || nextMeeting.location) && (
                <div className="flex items-center gap-2 mt-1 text-slate-400 text-xs">
                  {nextMeeting.meeting_link ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                  <span className="truncate">{nextMeeting.meeting_link || nextMeeting.location}</span>
                </div>
              )}
              {nextMeeting.lead_id && getLeadName(nextMeeting.lead_id) && (
                <div className="flex items-center gap-2 mt-1 text-slate-400 text-xs">
                  <Briefcase className="h-3 w-3" />
                  <span className="truncate">{getLeadName(nextMeeting.lead_id)}</span>
                </div>
              )}
            </div>
          )}

          {/* Meetings List */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Meetings</h3>
                <p className="text-[10px] text-muted-foreground">{meetings.length} total</p>
              </div>
              <Button
                onClick={() => setIsDialogOpen(true)}
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full border-slate-200"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {sortedMeetings.length === 0 ? (
                  <div className="text-center py-10">
                    <CalendarIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No meetings yet</p>
                    <Button variant="link" size="sm" onClick={() => setIsDialogOpen(true)} className="text-xs mt-1">
                      Schedule your first meeting
                    </Button>
                  </div>
                ) : (
                  sortedMeetings.map(meeting => {
                    const isSelected = selectedMeetingId === meeting.id;
                    let startStr = '', dateStr = '';
                    try {
                      const s = parseISO(meeting.start_time);
                      const e = parseISO(meeting.end_time);
                      startStr = `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
                      dateStr = format(s, 'EEE, MMM d');
                    } catch { }

                    const leadName = getLeadName(meeting.lead_id);
                    const dealInfo = getDealInfo(meeting.deal_id);
                    const organizer = getProfileName(meeting.organizer_id);

                    return (
                      <div
                        key={meeting.id}
                        onClick={() => {
                          setSelectedMeetingId(meeting.id);
                          // Navigate calendar to meeting date
                          try { setDate(parseISO(meeting.start_time)); } catch { }
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-200'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{meeting.title}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{dateStr} · {startStr}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${statusColors[meeting.status]}`}>
                            {meeting.status}
                          </Badge>
                        </div>

                        {/* Meeting details */}
                        <div className="mt-2 space-y-1">
                          {(meeting.meeting_link || meeting.location) && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              {meetingTypeIcon(meeting)}
                              <span className="truncate">{meeting.meeting_link || meeting.location}</span>
                            </div>
                          )}
                          {leadName && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <Briefcase className="h-3 w-3 shrink-0 text-amber-500" />
                              <span className="truncate">Lead: {leadName}</span>
                            </div>
                          )}
                          {dealInfo && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <Briefcase className="h-3 w-3 shrink-0 text-emerald-500" />
                              <span className="truncate">Deal: {dealInfo}</span>
                            </div>
                          )}
                          {organizer && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <Users className="h-3 w-3 shrink-0 text-violet-500" />
                              <span className="truncate">By: {organizer}</span>
                            </div>
                          )}
                          {meeting.description && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate">{meeting.description.split('\n')[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
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
