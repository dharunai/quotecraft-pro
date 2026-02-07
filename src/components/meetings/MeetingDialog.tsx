import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetings } from '@/hooks/useMeetings';
import { Loader2 } from 'lucide-react';
import { Meeting } from '@/types/database';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialDate?: Date;
}

export function MeetingDialog({ open, onOpenChange, onSuccess, initialDate }: MeetingDialogProps) {
  const { createMeeting } = useMeetings();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate ? initialDate.toISOString().split('T')[0] : '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [meetingType, setMeetingType] = useState('online'); // online, in_person
  const [location, setLocation] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    const meetingData = {
      title,
      description,
      start_time: startDateTime,
      end_time: endDateTime,
      location: meetingType === 'online' ? location || 'Google Meet' : location,
      meeting_link: meetingType === 'online' ? location : null,
      status: 'scheduled' as const,
      organizer_id: null, // set by hook
      lead_id: null,
      deal_id: null,
    };

    const participants = participantEmail ? [{
      name: null,
      email: participantEmail,
      user_id: null
    }] : [];

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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              Time
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <span className="self-center">to</span>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online Meeting</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              {meetingType === 'online' ? 'Link/Platform' : 'Location'}
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="col-span-3"
              placeholder={meetingType === 'online' ? 'e.g. Google Meet Link' : 'Address'}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="guest" className="text-right">
              Guest Email
            </Label>
            <Input
              id="guest"
              type="email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
              className="col-span-3"
              placeholder="client@example.com"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
