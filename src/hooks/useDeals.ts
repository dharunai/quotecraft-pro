import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Deal, Lead } from '@/types/database';
import { toast } from 'sonner';

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
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Deal created');
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
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal updated');
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
