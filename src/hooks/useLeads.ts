import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/database';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automationEngine';

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
      
      // Trigger automation for lead_created
      triggerAutomation('lead_created', {
        lead: {
          id: data.id,
          company_name: data.company_name,
          contact_name: data.contact_name,
          email: data.email || undefined,
          phone: data.phone || undefined,
        },
      });
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
      // Get current lead to check for status changes
      const { data: currentLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('leads')
        .update(lead)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Return both current and updated for comparison
      return { updated: data, previous: currentLead };
    },
    onSuccess: ({ updated, previous }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated successfully');
      
      // Check if lead was just qualified
      if (updated.is_qualified && !previous?.is_qualified) {
        triggerAutomation('lead_qualified', {
          lead: {
            id: updated.id,
            company_name: updated.company_name,
            contact_name: updated.contact_name,
            email: updated.email || undefined,
            phone: updated.phone || undefined,
          },
        });
      }
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
