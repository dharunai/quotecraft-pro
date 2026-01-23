import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body: string;
  entity_id: string | null;
  entity_type: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  sent_by: string | null;
  created_at: string;
}

export function useEmailLogs(filters?: {
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['email-logs', filters],
    queryFn: async (): Promise<EmailLog[]> => {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('email_type', filters.type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(
          `recipient_email.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`
        );
      }

      query = query.limit(filters?.limit || 100);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
}
