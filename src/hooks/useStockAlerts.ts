import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StockAlert {
  id: string;
  product_id: string;
  alert_type: string;
  stock_quantity: number;
  threshold: number;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async (): Promise<StockAlert[]> => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useActiveStockAlertsCount() {
  return useQuery({
    queryKey: ['stock-alerts-count'],
    queryFn: async (): Promise<{ lowStock: number; outOfStock: number }> => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select('alert_type')
        .is('resolved_at', null);

      if (error) throw error;

      const lowStock = data?.filter((a) => a.alert_type === 'low_stock').length || 0;
      const outOfStock = data?.filter((a) => a.alert_type === 'out_of_stock').length || 0;

      return { lowStock, outOfStock };
    },
  });
}

export function useCreateStockAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      alertType,
      stockQuantity,
      threshold,
    }: {
      productId: string;
      alertType: 'low_stock' | 'out_of_stock';
      stockQuantity: number;
      threshold: number;
    }) => {
      // Check if an unresolved alert already exists for this product
      const { data: existing } = await supabase
        .from('stock_alerts')
        .select('id')
        .eq('product_id', productId)
        .is('resolved_at', null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing alert
        const { data, error } = await supabase
          .from('stock_alerts')
          .update({
            alert_type: alertType,
            stock_quantity: stockQuantity,
            threshold,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Create new alert
      const { data, error } = await supabase
        .from('stock_alerts')
        .insert({
          product_id: productId,
          alert_type: alertType,
          stock_quantity: stockQuantity,
          threshold,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts-count'] });
    },
  });
}

export function useResolveStockAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('stock_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('product_id', productId)
        .is('resolved_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alerts-count'] });
    },
  });
}

export function checkStockLevels(
  stockQuantity: number,
  lowStockThreshold: number
): { shouldAlert: boolean; alertType: 'low_stock' | 'out_of_stock' | null } {
  if (stockQuantity <= 0) {
    return { shouldAlert: true, alertType: 'out_of_stock' };
  }
  if (stockQuantity <= lowStockThreshold) {
    return { shouldAlert: true, alertType: 'low_stock' };
  }
  return { shouldAlert: false, alertType: null };
}
