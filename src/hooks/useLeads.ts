import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/database';
import { toast } from 'sonner';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Lead[];
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async (): Promise<Lead | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create lead: ' + error.message);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(lead)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update lead: ' + error.message);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete lead: ' + error.message);
    },
  });
}
