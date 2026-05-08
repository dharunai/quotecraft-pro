import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveCompanyId } from '@/lib/auth-utils';
import { toast } from 'sonner';

export interface InteractionLog {
  id: string;
  company_id: string;
  deal_id?: string;
  lead_id?: string;
  interaction_type: 'call' | 'meeting' | 'email' | 'note' | 'other';
  notes: string;
  interaction_date: string;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
  updated_at: string;
}

export function useInteractionLogs(entityType: 'lead' | 'deal', entityId: string) {
  return useQuery({
    queryKey: ['interaction-logs', entityType, entityId],
    queryFn: async (): Promise<InteractionLog[]> => {
      const query = supabase
        .from('interaction_logs')
        .select('*')
        .order('interaction_date', { ascending: false });

      if (entityType === 'lead') {
        query.eq('lead_id', entityId);
      } else {
        query.eq('deal_id', entityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InteractionLog[];
    },
    enabled: !!entityId,
  });
}

export function useCreateInteractionLog() {
  const queryClient = useQueryClient();
  const { user, companyId } = useAuth();

  return useMutation({
    mutationFn: async (log: Omit<InteractionLog, 'id' | 'created_at' | 'updated_at' | 'performed_by' | 'performed_by_name' | 'company_id'>) => {
      const currentCompanyId = await getEffectiveCompanyId(companyId);
      
      const { data, error } = await supabase
        .from('interaction_logs')
        .insert({
          ...log,
          company_id: currentCompanyId,
          performed_by: user?.id,
          performed_by_name: user?.user_metadata?.full_name || user?.email || 'Unknown',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['interaction-logs', 'lead', data.lead_id] });
      }
      if (data.deal_id) {
        queryClient.invalidateQueries({ queryKey: ['interaction-logs', 'deal', data.deal_id] });
      }
      toast.success('Note added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add note: ' + error.message);
    },
  });
}

export function useDeleteInteractionLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: { id: string; entityType: 'lead' | 'deal'; entityId: string }) => {
      const { error } = await supabase
        .from('interaction_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: ({ entityType, entityId }) => {
      queryClient.invalidateQueries({ queryKey: ['interaction-logs', entityType, entityId] });
      toast.success('Note deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete note: ' + error.message);
    },
  });
}
