import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem, Lead, Deal, Quotation, Product } from '@/types/database';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, lead:leads(*), deal:deals(*), quotation:quotations!invoices_quotation_id_fkey(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Invoice & { lead: Lead; deal: Deal | null; quotation: Quotation | null })[];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('*, lead:leads(*), deal:deals(*), quotation:quotations!invoices_quotation_id_fkey(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as (Invoice & { lead: Lead; deal: Deal | null; quotation: Quotation | null }) | null;
    },
    enabled: !!id,
  });
}

export function useInvoiceItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoiceItems', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*, product:products(*)')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as (InvoiceItem & { product: Product | null })[];
    },
    enabled: !!invoiceId,
  });
}

export function useGenerateInvoiceNumber() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_invoice_number');
      if (error) throw error;
      return data as string;
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'lead' | 'deal' | 'quotation'>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoice)
        .select('*, lead:leads(*)')
        .single();
      if (error) throw error;
      return data as Invoice & { lead: Lead };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
      
      const invoiceData = {
        id: data.id,
        invoice_number: data.invoice_number,
        grand_total: data.grand_total,
      };
      
      // Trigger automation for invoice_created
      await triggerAutomation('invoice_created', {
        invoice: invoiceData,
        lead: data.lead ? {
          id: data.lead.id,
          company_name: data.lead.company_name,
          contact_name: data.lead.contact_name,
          email: data.lead.email || undefined,
          phone: data.lead.phone || undefined,
        } : undefined,
      });
      
      // Trigger workflows for invoice_created
      await triggerWorkflows('invoice_created', 'invoice', data.id, invoiceData);
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Invoice> & { id: string }) => {
      // Get current invoice to check for payment status changes
      const { data: currentInvoice } = await supabase
        .from('invoices')
        .select('*, lead:leads(*)')
        .eq('id', id)
        .single();

      // Auto-update payment status based on amount_paid
      const updateData: Record<string, unknown> = { ...data };

      if (data.amount_paid !== undefined && data.grand_total !== undefined) {
        if (data.amount_paid >= data.grand_total) {
          updateData.payment_status = 'paid';
          updateData.is_locked = true; // Auto-lock when fully paid
        } else if (data.amount_paid > 0) {
          updateData.payment_status = 'partial';
        } else {
          updateData.payment_status = 'unpaid';
        }
      }

      const { data: result, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select('*, lead:leads(*)')
        .single();
      if (error) throw error;
      return { updated: result as Invoice & { lead: Lead }, previous: currentInvoice };
    },
    onSuccess: async ({ updated, previous }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
      
      // Check if invoice was just marked as paid
      if (updated.payment_status === 'paid' && previous?.payment_status !== 'paid') {
        const invoiceData = {
          id: updated.id,
          invoice_number: updated.invoice_number,
          grand_total: updated.grand_total,
        };
        await triggerAutomation('invoice_paid', {
          invoice: invoiceData,
          lead: updated.lead ? {
            id: updated.lead.id,
            company_name: updated.lead.company_name,
            contact_name: updated.lead.contact_name,
            email: updated.lead.email || undefined,
            phone: updated.lead.phone || undefined,
          } : undefined,
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Get invoice items with product references
      const { data: items } = await supabase
        .from('invoice_items')
        .select('product_id, quantity')
        .eq('invoice_id', id);

      // Restore stock quantities for product-based items
      if (items) {
        for (const item of items) {
          if (item.product_id) {
            const { data: product } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();

            if (product) {
              await supabase
                .from('products')
                .update({ stock_quantity: product.stock_quantity + item.quantity })
                .eq('id', item.product_id);
            }
          }
        }
      }

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Invoice deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete invoice: ' + error.message);
    },
  });
}

// Invoice Items
export function useCreateInvoiceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<InvoiceItem, 'id' | 'created_at' | 'product'>) => {
      const { data, error } = await supabase
        .from('invoice_items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;

      // Reduce stock quantity for product-based items
      if (item.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
            .eq('id', item.product_id);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoiceItems', variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error('Failed to create item: ' + error.message);
    },
  });
}

export function useUpdateInvoiceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, invoice_id, ...data }: Partial<InvoiceItem> & { id: string; invoice_id: string }) => {
      const { data: result, error } = await supabase
        .from('invoice_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...result, invoice_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoiceItems', data.invoice_id] });
    },
    onError: (error) => {
      toast.error('Failed to update item: ' + error.message);
    },
  });
}

export function useDeleteInvoiceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, invoice_id }: { id: string; invoice_id: string }) => {
      // Get item to restore stock
      const { data: item } = await supabase
        .from('invoice_items')
        .select('product_id, quantity')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('invoice_items')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Restore stock quantity for product-based items
      if (item?.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq('id', item.product_id);
        }
      }

      return { invoice_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoiceItems', data.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error('Failed to delete item: ' + error.message);
    },
  });
}

// Bulk create invoice items (for converting from quotation)
export function useBulkCreateInvoiceItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Omit<InvoiceItem, 'id' | 'created_at' | 'product'>[]) => {
      const { data, error } = await supabase
        .from('invoice_items')
        .insert(items)
        .select();
      if (error) throw error;

      // Reduce stock quantities for product-based items
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
              .eq('id', item.product_id);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceItems'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error('Failed to create items: ' + error.message);
    },
  });
}
