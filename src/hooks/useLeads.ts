import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/database';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveCompanyId } from '@/lib/auth-utils';
// import { triggerWorkflows } from '@/lib/workflowEngine'; // Deprecated client-side engine

// API Trigger Helper
async function triggerWorkflowAPI(event: string, data: any) {
  try {
    await fetch('http://localhost:3001/api/workflows/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data })
    });
  } catch (err) {
    console.error('Failed to trigger workflow API:', err);
  }
}

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
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentCompanyId = await getEffectiveCompanyId(companyId);

      const leadData = {
        ...lead,
        created_by: user?.id,
        company_id: currentCompanyId
      };

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

      // Trigger workflows for lead_created (Server-side)
      console.log('[Hook] Triggering server-side workflows...');
      triggerWorkflowAPI('lead_created', {
        entity_type: 'lead',
        entity_id: data.id,
        ...leadData
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
    onSuccess: async ({ updated, previous }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', updated.id] });
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
        triggerWorkflowAPI('lead_qualified', {
          entity_type: 'lead',
          entity_id: updated.id,
          ...leadData
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

export function useConvertLead() {
  const queryClient = useQueryClient();
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data: lead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchError) throw fetchError;

      const currentCompanyId = await getEffectiveCompanyId(companyId);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create Account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: lead.company_name,
          website: lead.website,
          industry: lead.industry,
          billing_address: lead.address,
          phone: lead.phone,
          company_id: currentCompanyId,
          created_by: user?.id
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // 2. Create Contact
      const [firstName, ...lastNameParts] = lead.contact_name.split(' ');
      const lastName = lastNameParts.join(' ') || '.';

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          account_id: account.id,
          first_name: firstName,
          last_name: lastName,
          email: lead.email,
          phone: lead.phone,
          mailing_address: lead.address,
          job_title: lead.designation,
          company_id: currentCompanyId,
          created_by: user?.id
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // 3. Update related entities (Deals, Quotations, Invoices) if they exist
      // Note: In some workflows, deals might already exist for the lead
      await supabase.from('deals').update({ account_id: account.id, contact_id: contact.id }).eq('lead_id', leadId);
      await supabase.from('quotations').update({ account_id: account.id, contact_id: contact.id }).eq('lead_id', leadId);
      await supabase.from('invoices').update({ account_id: account.id, contact_id: contact.id }).eq('lead_id', leadId);

      // 4. Update Lead status to 'won' or delete it? 
      // Zoho usually keeps the lead but marks it converted, or deletes it.
      // We'll mark it as won and keep it for history, or just delete it if requested.
      // For now, let's just delete it to keep it clean.
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (deleteError) throw deleteError;

      return { account, contact };
    },
    onSuccess: (data) => {
      console.log('[Hook] useConvertLead onSuccess - Lead converted:', data.account.id, data.contact.id);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Lead converted to Account and Contact successfully!');
    },
    onError: (error: Error) => {
      console.error('[Hook] useConvertLead onError:', error);
      toast.error('Failed to convert lead: ' + error.message);
    },
  });
}
