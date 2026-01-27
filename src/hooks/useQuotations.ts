import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Quotation, QuotationItem, Lead } from '@/types/database';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';

export function useQuotations() {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: async (): Promise<Quotation[]> => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          lead:leads(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Quotation[];
    },
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: ['quotations', id],
    queryFn: async (): Promise<Quotation | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          lead:leads(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Quotation | null;
    },
    enabled: !!id,
  });
}

export function useQuotationItems(quotationId: string | undefined) {
  return useQuery({
    queryKey: ['quotation-items', quotationId],
    queryFn: async (): Promise<QuotationItem[]> => {
      if (!quotationId) return [];
      const { data, error } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!quotationId,
  });
}

export function useGenerateQuoteNumber() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('generate_quote_number');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotation: Omit<Quotation, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'lead'>) => {
      const { data, error } = await supabase
        .from('quotations')
        .insert(quotation)
        .select(`*, lead:leads(*)`)
        .single();

      if (error) throw error;
      return data as Quotation & { lead: Lead };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create quotation: ' + error.message);
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...quotation }: Partial<Quotation> & { id: string }) => {
      // Get current quotation to check for status changes
      const { data: currentQuotation } = await supabase
        .from('quotations')
        .select(`*, lead:leads(*)`)
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('quotations')
        .update(quotation)
        .eq('id', id)
        .select(`*, lead:leads(*)`)
        .single();

      if (error) throw error;
      return { updated: data as Quotation & { lead: Lead }, previous: currentQuotation };
    },
    onSuccess: async ({ updated, previous }) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      
      // Check for status changes and trigger automations
      if (updated.status !== previous?.status) {
        const lead = updated.lead;
        const eventData = {
          quotation: {
            id: updated.id,
            quote_number: updated.quote_number,
            total: updated.total,
          },
          lead: lead ? {
            id: lead.id,
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            email: lead.email || undefined,
            phone: lead.phone || undefined,
          } : undefined,
        };

        if (updated.status === 'sent' && previous?.status === 'draft') {
          await triggerAutomation('quotation_sent', eventData);
          await triggerWorkflows('quotation_sent', 'quotation', updated.id, eventData.quotation || {});
        } else if (updated.status === 'accepted') {
          await triggerAutomation('quotation_accepted', eventData);
          await triggerWorkflows('quotation_accepted', 'quotation', updated.id, eventData.quotation || {});
        } else if (updated.status === 'rejected') {
          await triggerAutomation('quotation_rejected', eventData);
          await triggerWorkflows('quotation_rejected', 'quotation', updated.id, eventData.quotation || {});
        }
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to update quotation: ' + error.message);
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete quotation: ' + error.message);
    },
  });
}

export function useCreateQuotationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<QuotationItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('quotation_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotation-items', variables.quotation_id] });
    },
    onError: (error: Error) => {
      toast.error('Failed to add item: ' + error.message);
    },
  });
}

export function useUpdateQuotationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quotation_id, ...item }: Partial<QuotationItem> & { id: string; quotation_id: string }) => {
      const { data, error } = await supabase
        .from('quotation_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotation-items', variables.quotation_id] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update item: ' + error.message);
    },
  });
}

export function useDeleteQuotationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quotation_id }: { id: string; quotation_id: string }) => {
      const { error } = await supabase
        .from('quotation_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotation-items', variables.quotation_id] });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete item: ' + error.message);
    },
  });
}
