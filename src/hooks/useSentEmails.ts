import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveCompanyId } from '@/lib/auth-utils';
import { toast } from 'sonner';

export interface SentEmail {
  id: string;
  company_id: string;
  sender_id: string;
  recipient_email: string;
  cc_emails?: string[];
  subject: string;
  body_html: string;
  attachments?: any;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
  // New fields
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'starred' | 'snoozed';
  is_starred: boolean;
  is_snoozed: boolean;
  snoozed_until?: string | null;
  is_read: boolean;
  labels: string[];
}

export function useSentEmails() {
  const { companyId } = useAuth();

  return useQuery({
    queryKey: ['sent-emails'],
    queryFn: async (): Promise<SentEmail[]> => {
      const currentCompanyId = await getEffectiveCompanyId(companyId);
      
      const { data, error } = await supabase
        .from('sent_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SentEmail[];
    },
  });
}

export function useLogSentEmail() {
  const queryClient = useQueryClient();
  const { user, companyId } = useAuth();

  return useMutation({
    mutationFn: async (email: Omit<SentEmail, 'id' | 'created_at' | 'sender_id' | 'company_id'>) => {
      const currentCompanyId = await getEffectiveCompanyId(companyId);
      
      const { data, error } = await supabase
        .from('sent_emails')
        .insert({
          ...email,
          company_id: currentCompanyId,
          sender_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
    },
  });
}
