import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Quotation, QuotationItem } from '@/types/database';
import { toast } from 'sonner';

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
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('quotations')
        .update(quotation)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
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
