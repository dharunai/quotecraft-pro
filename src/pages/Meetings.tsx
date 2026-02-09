import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Phone,
  Mail,
  Maximize2,
  Clock,
  MapPin,
  MoreHorizontal
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO, setHours, setMinutes, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { useMeetings } from '@/hooks/useMeetings';
import { Meeting } from '@/types/database';
import { MeetingDialog } from '@/components/meetings/MeetingDialog';

// Mock data for Quick Connects to match reference
const quickConnects = [
  { id: 1, name: 'Adams, andrew', role: 'Customer call', time: 'Su, 12.03 2:30 pm', status: 'Created', avatar: '/avatars/01.png' },
  { id: 2, name: 'Andrew, Sal', role: 'Follow up mail', time: 'Su, 12.03 2:30 pm', status: 'Was Assigned', avatar: '/avatars/02.png' },
  { id: 3, name: 'Araujo, Stan', role: 'Customer call', time: 'Su, 12.03 2:30 pm', status: 'Created', avatar: '/avatars/03.png' },
  { id: 4, name: 'Attard, Mark', role: 'Flow up mail', time: 'Su, 12.03 2:30 pm', status: '', avatar: '/avatars/04.png' },
  { id: 5, name: 'Hasan Azan', role: 'Customer call', time: 'Su, 12.03 2:30 pm', status: '', avatar: '/avatars/05.png' },
];

// UPDATED: Full 24-hour range
const timeSlots = Array.from({ length: 24 }, (_, i) => i);

export default function Meetings() {
  const { getMeetings, loading } = useMeetings();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isMounting, setIsMounting] = useState(true);

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Week');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleRefresh = () => {
    fetchMeetings();
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

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-2rem)] gap-6 p-2 font-sans overflow-hidden">

        {/* Main Calendar Section (75%) */}
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
                <div className="grid grid-cols-8 border-b border-slate-100 bg-white z-10 pr-2"> {/* Added pr-2 for scrollbar alignment */}
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
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-8">
                    <div className="border-r border-slate-50 bg-slate-50/30">
                      {timeSlots.map(hour => (
                        <div key={hour} className="h-28 text-xs text-slate-400 font-medium p-4 border-b border-slate-100 text-center">
                          {format(setHours(new Date(), hour), 'HH:00')}
                        </div>
                      ))}
                    </div>
                    {weekDays.map(day => (
                      <div key={day.toString()} className="border-r border-slate-50 last:border-0 relative">
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

                            // UPDATED: Logic for 24h view 
                            // Top is simply hours * 112 (plus minutes proportion)
                            // 112px is row height
                            const top = (startHour + (startMinutes / 60)) * 112;
                            const height = duration * 112;

                            return (
                              <div key={meeting.id}
                                className="absolute left-1 right-1 p-2 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow z-10 flex flex-col justify-between overflow-hidden"
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
              <ScrollArea className="flex-1">
                <div className="flex">
                  <div className="w-20 border-r border-slate-50 bg-slate-50/30">
                    {timeSlots.map(hour => (
                      <div key={hour} className="h-32 text-xs text-slate-400 font-medium p-4 border-b border-slate-100 text-center">
                        {format(setHours(new Date(), hour), 'HH:00')}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative bg-white">
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

                        // 128px per hour in Day view
                        const top = (startHour + (startMinutes / 60)) * 128;
                        const height = duration * 128;

                        return (
                          <div key={meeting.id}
                            className="absolute left-4 right-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 shadow-sm z-10 flex flex-col justify-between"
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
                            <div key={m.id} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 truncate font-medium">
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

            {/* --- YEAR VIEW (Placeholder) --- */}
            {view === 'Year' && (
              <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-2">
                <CalendarIcon className="h-12 w-12 opacity-20" />
                <span className="text-sm">Year view coming soon</span>
              </div>
            )}

          </div>
        </div>

        {/* Sidebar (25%) */}
        <div className="w-80 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">All Contacts</h2>
              <span className="text-xs text-muted-foreground">(398)</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4 text-slate-400" />
            </Button>
          </div>

          {/* Featured Card */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10">
              <Badge variant="secondary" className="bg-white/80 backdrop-blur text-slate-800 shadow-sm border-0 font-medium">Sale</Badge>
            </div>
            <div className="h-32 bg-slate-100 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <MapPin className="h-8 w-8 text-slate-300" />
            </div>

            <h3 className="font-bold text-slate-900">Big Residential</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">2:30 pm</p>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="rounded-full border-slate-200 text-slate-600 font-normal">Property viewed</Badge>
              <div className="flex -space-x-2">
                <Avatar className="h-6 w-6 border-2 border-white"><AvatarFallback className="bg-slate-200 text-[8px]">JD</AvatarFallback></Avatar>
                <Avatar className="h-6 w-6 border-2 border-white"><AvatarFallback className="bg-slate-300 text-[8px]">+12</AvatarFallback></Avatar>
              </div>
            </div>
          </div>

          {/* Quick Connects List */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900">Quick Connects</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-100"><Search className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-100"><Settings className="h-3 w-3" /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {quickConnects.map(contact => (
                  <div key={contact.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-slate-50">
                        <AvatarFallback className="text-xs font-bold text-slate-700">{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{contact.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{contact.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-slate-100 text-slate-400 hover:text-primary hover:border-primary/20">
                        <Phone className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Existing Dialog Integration */}
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
