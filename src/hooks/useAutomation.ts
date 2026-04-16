import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AutomationRule } from '@/types/database';
import { toast } from 'sonner';

const automationTable = () => (supabase as any).from('automation_rules');

export function useAutomationRules() {
  return useQuery({
    queryKey: ['automation_rules'],
    queryFn: async (): Promise<AutomationRule[]> => {
      const { data, error } = await automationTable()
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
      const { data, error } = await automationTable()
        .select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as AutomationRule | null;
    },
    enabled: !!id,
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { data, error } = await automationTable().insert(rule).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation rule created');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rule }: any) => {
      const { data, error } = await automationTable().update(rule).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation rule updated');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await automationTable().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Automation rule deleted');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useToggleAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await automationTable().update({ is_active }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success(variables.is_active ? 'Rule enabled' : 'Rule disabled');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
