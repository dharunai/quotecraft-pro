import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/database';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveCompanyId } from '@/lib/auth-utils';

export function useContacts(accountId?: string) {
  return useQuery({
    queryKey: accountId ? ['contacts', { accountId }] : ['contacts'],
    queryFn: async (): Promise<Contact[]> => {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          account:accounts(*)
        `)
        .order('last_name', { ascending: true });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Contact[];
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async (): Promise<Contact | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          account:accounts(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Contact | null;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentCompanyId = await getEffectiveCompanyId(companyId);

      const contactData = {
        ...contact,
        created_by: user?.id,
        company_id: currentCompanyId
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create contact: ' + error.message);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...contact }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(contact)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', data.id] });
      toast.success('Contact updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update contact: ' + error.message);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete contact: ' + error.message);
    },
  });
}
