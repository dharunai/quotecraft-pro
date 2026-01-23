import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CreateActivityParams {
  entityType: 'lead' | 'deal' | 'quotation' | 'invoice' | 'product';
  entityId: string;
  action: string;
  description: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      action,
      description,
      oldValue,
      newValue,
    }: CreateActivityParams) => {
      const { data, error } = await supabase.from('activities').insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        description,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        performed_by: user?.id || null,
        performed_by_name: user?.user_metadata?.full_name || user?.email || null,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', variables.entityType, variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    },
  });
}

export function useActivityLogger() {
  const logActivity = useLogActivity();

  const log = async (params: CreateActivityParams) => {
    try {
      await logActivity.mutateAsync(params);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  return { log };
}
