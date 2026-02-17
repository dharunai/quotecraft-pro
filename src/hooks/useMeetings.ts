import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Meeting, MeetingParticipant } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmail } from '@/lib/emailService';
import { format, parseISO } from 'date-fns';

// Meetings table may not exist in generated Supabase types yet.
// Use untyped client for meetings queries until the table is created and types regenerated.
const meetingsTable = () => (supabase as any).from('meetings');
const participantsTable = () => (supabase as any).from('meeting_participants');

/** Build a styled HTML email body for a meeting invitation */
function buildMeetingEmailBody(meeting: Record<string, any>): string {
  const startDate = parseISO(meeting.start_time);
  const endDate = parseISO(meeting.end_time);
  const dateStr = format(startDate, 'EEEE, MMMM d, yyyy');
  const timeStr = `${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`;
  const locationStr = meeting.meeting_link || meeting.location || 'TBD';

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 28px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 600;">📅 Meeting Invitation</h1>
      </div>
      <div style="padding: 28px 32px;">
        <h2 style="margin: 0 0 20px 0; font-size: 22px; color: #0f172a; font-weight: 700;">${meeting.title}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; width: 90px; vertical-align: top; font-weight: 600;">Date</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">Time</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${timeStr}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">Location</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">
              ${meeting.meeting_link
      ? `<a href="${meeting.meeting_link}" style="color: #2563eb; text-decoration: none;">${meeting.meeting_link}</a>`
      : locationStr}
            </td>
          </tr>
          ${meeting.description ? `
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">Notes</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 14px;">${meeting.description}</td>
          </tr>` : ''}
        </table>
      </div>
      <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">Sent via The Genworks CRM</p>
      </div>
    </div>`;
}

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

      // 3. Send email notification to participants (non-blocking)
      if (newMeeting) {
        const emailParticipants = participants.filter(p => p.email && p.email.includes('@'));
        if (emailParticipants.length > 0) {
          const emailBody = buildMeetingEmailBody(newMeeting);
          const emailSubject = `Meeting Invitation: ${newMeeting.title}`;

          // Send in background – don't block the UI
          Promise.all(
            emailParticipants.map(p =>
              sendEmail({
                to: p.email!,
                subject: emailSubject,
                body: emailBody,
              })
            )
          ).then(results => {
            const succeeded = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            if (succeeded > 0) {
              toast({
                title: "Email Sent",
                description: `Meeting invite sent to ${succeeded} participant(s).`,
              });
            }
            if (failed > 0) {
              console.error('Some meeting emails failed:', results.filter(r => !r.success));
              toast({
                title: "Email Warning",
                description: `Failed to send invite to ${failed} participant(s). Ensure the backend server is running.`,
                variant: "destructive",
              });
            }
          }).catch(err => {
            console.error('Error sending meeting emails:', err);
          });
        }
      }

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
