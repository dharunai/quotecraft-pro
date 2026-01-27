import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Deal, Lead } from '@/types/database';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Deal & { lead: Lead })[];
    },
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as (Deal & { lead: Lead }) | null;
    },
    enabled: !!id,
  });
}

export function useDealByLeadId(leadId: string | undefined) {
  return useQuery({
    queryKey: ['deals', 'lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('lead_id', leadId)
        .maybeSingle();
      if (error) throw error;
      return data as (Deal & { lead: Lead }) | null;
    },
    enabled: !!leadId,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deal: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'lead'>) => {
      const { data, error } = await supabase
        .from('deals')
        .insert(deal)
        .select('*, lead:leads(*)')
        .single();
      if (error) throw error;

      // Update lead is_qualified status
      await supabase
        .from('leads')
        .update({ is_qualified: true })
        .eq('id', deal.lead_id);

      return data as Deal & { lead: Lead };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Deal created');
      
      const dealData = {
        id: data.id,
        deal_value: data.deal_value || undefined,
        stage: data.stage,
      };
      
      // Trigger automation for deal_created
      await triggerAutomation('deal_created', {
        deal: dealData,
        lead: data.lead ? {
          id: data.lead.id,
          company_name: data.lead.company_name,
          contact_name: data.lead.contact_name,
          email: data.lead.email || undefined,
          phone: data.lead.phone || undefined,
        } : undefined,
      });
      
      // Trigger workflows for deal_created
      await triggerWorkflows('deal_created', 'deal', data.id, dealData);
    },
    onError: (error) => {
      toast.error('Failed to create deal: ' + error.message);
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Deal> & { id: string }) => {
      // Get current deal to check for stage changes
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('id', id)
        .single();

      // Auto-set dates based on stage
      const updateData: Record<string, unknown> = { ...data };

      if (data.stage === 'won' && !data.won_date) {
        updateData.won_date = new Date().toISOString().split('T')[0];
        updateData.probability = 100;
      } else if (data.stage === 'lost' && !data.lost_date) {
        updateData.lost_date = new Date().toISOString().split('T')[0];
        updateData.probability = 0;
      }

      // Set probability based on stage if not manually set
      if (data.stage && !updateData.probability) {
        const stageProbability: Record<string, number> = {
          qualified: 25,
          proposal: 50,
          negotiation: 75,
          won: 100,
          lost: 0,
        };
        updateData.probability = stageProbability[data.stage] || 25;
      }

      const { data: result, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', id)
        .select('*, lead:leads(*)')
        .single();
      if (error) throw error;
      
      return { updated: result as Deal & { lead: Lead }, previous: currentDeal };
    },
    onSuccess: async ({ updated, previous }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal updated');
      
      // Check for stage changes and trigger automations
      if (updated.stage !== previous?.stage) {
        const lead = updated.lead;
        const eventData = {
          deal: {
            id: updated.id,
            deal_value: updated.deal_value || undefined,
            stage: updated.stage,
          },
          lead: lead ? {
            id: lead.id,
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            email: lead.email || undefined,
            phone: lead.phone || undefined,
          } : undefined,
        };

        if (updated.stage === 'won') {
          await triggerAutomation('deal_won', eventData);
          await triggerWorkflows('deal_won', 'deal', updated.id, eventData.deal || {});
        } else if (updated.stage === 'lost') {
          await triggerAutomation('deal_lost', eventData);
          await triggerWorkflows('deal_lost', 'deal', updated.id, eventData.deal || {});
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to update deal: ' + error.message);
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Reset lead is_qualified status
      await supabase
        .from('leads')
        .update({ is_qualified: false })
        .eq('id', leadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Deal deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete deal: ' + error.message);
    },
  });
}
