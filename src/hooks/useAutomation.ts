import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AutomationRule } from '@/types/database';
import { toast } from 'sonner';

export function useAutomationRules() {
  return useQuery({
    queryKey: ['automation_rules'],
    queryFn: async (): Promise<AutomationRule[]> => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AutomationRule[];
    },
  });
}

export function useAutomationRule(id: string | undefined) {
  return useQuery({
    queryKey: ['automation_rules', id],
    queryFn: async (): Promise<AutomationRule | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as AutomationRule | null;
    },
    enabled: !!id,
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'last_executed_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation rule created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create automation rule: ' + error.message);
    },
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...rule }: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update(rule)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation rule updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update automation rule: ' + error.message);
    },
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation rule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete automation rule: ' + error.message);
    },
  });
}

export function useToggleAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success(variables.is_active ? 'Automation rule enabled' : 'Automation rule disabled');
    },
    onError: (error: Error) => {
      toast.error('Failed to toggle automation rule: ' + error.message);
    },
  });
}
