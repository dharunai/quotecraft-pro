import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Meeting, MeetingParticipant } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Meetings table may not exist in generated Supabase types yet.
// Use untyped client for meetings queries until the table is created and types regenerated.
const meetingsTable = () => (supabase as any).from('meetings');
const participantsTable = () => (supabase as any).from('meeting_participants');

export function useMeetings() {
  const { toast } = useToast();
  const { user, companyId } = useAuth();
  const [loading, setLoading] = useState(false);

  const createMeeting = async (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>, participants: Omit<MeetingParticipant, 'id' | 'meeting_id'>[]) => {
    setLoading(true);
    try {
      // 1. Create the meeting
      const { data: newMeeting, error: meetingError } = await meetingsTable()
        .insert({
          ...meeting,
          organizer_id: user?.id,
          company_id: companyId
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // 2. Add participants
      if (participants.length > 0 && newMeeting) {
        const participantData = participants.map(p => ({
          meeting_id: newMeeting.id,
          ...p
        }));

        const { error: participantError } = await participantsTable()
          .insert(participantData);

        if (participantError) throw participantError;
      }

      toast({
        title: "Success",
        description: "Meeting scheduled successfully.",
      });

      return newMeeting;
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create meeting.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getMeetings = async (startRange?: string, endRange?: string) => {
    setLoading(true);
    try {
      let query = meetingsTable()
        .select(`
          *,
          participants:meeting_participants(*)
        `)
        .order('start_time', { ascending: true });

      if (startRange) {
        query = query.gte('start_time', startRange);
      }
      if (endRange) {
        query = query.lte('start_time', endRange);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Meeting[];
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    setLoading(true);
    try {
      const { error } = await meetingsTable()
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting updated successfully.",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating meeting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update meeting.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await meetingsTable()
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting cancelled successfully.",
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error",
        description: "Failed to cancel meeting.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createMeeting,
    getMeetings,
    updateMeeting,
    deleteMeeting,
    loading
  };
}
