import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLogSentEmail } from './useSentEmails';
import { toast } from 'sonner';

export function useEmailActions() {
  const queryClient = useQueryClient();

  const updateEmailStatus = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { data, error } = await supabase
        .from('sent_emails')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
    },
    onError: (error: any) => {
      toast.error(`Operation failed: ${error.message}`);
    }
  });

  const { mutate: logEmail } = useLogSentEmail();

  const sendEmail = useMutation({
    mutationFn: async (payload: {
      to: string;
      subject: string;
      body: string;
      entity_type?: string;
      entity_id?: string;
    }) => {
      const response = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.to,
          subject: payload.subject,
          body: payload.body,
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send email');
      }

      const result = await response.json();

      // Log to DB
      logEmail({
        recipient_email: payload.to,
        subject: payload.subject,
        body_html: payload.body,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        folder: 'sent',
        is_starred: false,
        is_snoozed: false,
        is_read: true,
        labels: []
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
      toast.success('Email sent successfully');
    }
  });

  return {
    updateEmailStatus,
    sendEmail
  };
}
