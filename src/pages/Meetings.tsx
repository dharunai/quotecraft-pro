import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Clock, Plus, Video, MapPin, Users } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { Meeting } from '@/types/database';
import { MeetingDialog } from '@/components/meetings/MeetingDialog';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function Meetings() {
  const { getMeetings, loading: meetingsLoading } = useMeetings();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState('upcoming');

  const fetchMeetings = async () => {
    const data = await getMeetings();
    setMeetings(data);
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const upcomingMeetings = meetings.filter(m => new Date(m.start_time) >= new Date());
  const pastMeetings = meetings.filter(m => new Date(m.start_time) < new Date());

  const MeetingCard = ({ meeting }: { meeting: Meeting }) => {
    const start = parseISO(meeting.start_time);
    const end = parseISO(meeting.end_time);
    
    let dateLabel = format(start, 'EEE, MMM d');
    if (isToday(start)) dateLabel = 'Today';
    if (isTomorrow(start)) dateLabel = 'Tomorrow';

    return (
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center justify-center min-w-[60px] bg-primary/10 rounded-lg p-2 text-primary">
              <span className="text-sm font-bold uppercase">{format(start, 'MMM')}</span>
              <span className="text-2xl font-bold">{format(start, 'd')}</span>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{meeting.title}</h3>
              <div className="flex items-center text-sm text-muted-foreground gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-1">
                    {meeting.meeting_link ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    {meeting.location}
                  </div>
                )}
              </div>
              {meeting.participants && meeting.participants.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground pt-1">
                  <Users className="h-4 w-4" />
                  {meeting.participants.map(p => p.name || p.email).join(', ')}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Badge variant={meeting.status === 'completed' ? 'secondary' : 'default'}>
              {meeting.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">Manage your schedule and appointments</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full" onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          {meetingsLoading ? (
            <div className="text-center py-10">Loading meetings...</div>
          ) : upcomingMeetings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              No upcoming meetings found.
            </div>
          ) : (
            upcomingMeetings.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-6">
          {pastMeetings.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
             No past meetings found.
           </div>
          ) : (
            pastMeetings.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))
          )}
        </TabsContent>

        <TabsContent value="calendar">
           <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
             Calendar view coming soon.
           </div>
        </TabsContent>
      </Tabs>

      <MeetingDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchMeetings}
      />
    </div>
  );
}
