import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/database';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';

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
      const { data: { user } } = await supabase.auth.getUser();
      const leadData = { ...lead, created_by: user?.id };
      
      const { data, error } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      console.log('[Hook] useCreateLead onSuccess - Lead created:', data.id, data.company_name);
      
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
      
      const leadData = {
        id: data.id,
        company_name: data.company_name,
        contact_name: data.contact_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
      };
      
      console.log('[Hook] Triggering automations and workflows for lead_created...');
      
      // Trigger automation for lead_created
      try {
        await triggerAutomation('lead_created', { lead: leadData });
        console.log('[Hook] ✅ Automations triggered');
      } catch (error) {
        console.error('[Hook] ❌ Automation trigger error:', error);
      }
      
      // Trigger workflows for lead_created
      try {
        await triggerWorkflows('lead_created', 'lead', data.id, leadData);
        console.log('[Hook] ✅ Workflows triggered');
      } catch (error) {
        console.error('[Hook] ❌ Workflow trigger error:', error);
      }
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
    onSuccess: async ({ updated, previous }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated successfully');
      
      // Check if lead was just qualified
      if (updated.is_qualified && !previous?.is_qualified) {
        const leadData = {
          id: updated.id,
          company_name: updated.company_name,
          contact_name: updated.contact_name,
          email: updated.email || undefined,
          phone: updated.phone || undefined,
        };
        await triggerAutomation('lead_qualified', { lead: leadData });
        await triggerWorkflows('lead_qualified', 'lead', updated.id, leadData);
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
