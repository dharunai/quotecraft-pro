import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveCompanyId } from '@/lib/auth-utils';
import { toast } from 'sonner';
import { EmailTemplate, DEFAULT_TEMPLATES } from '@/lib/emailTemplates';

export function useEmailTemplates() {
  const { companyId } = useAuth();

  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const currentCompanyId = await getEffectiveCompanyId(companyId);
      
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Combine user templates with defaults
      const userTemplates = (data || []) as EmailTemplate[];
      return [...userTemplates, ...DEFAULT_TEMPLATES];
    },
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id'>) => {
      const currentCompanyId = await getEffectiveCompanyId(companyId);
      
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...template,
          company_id: currentCompanyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save template: ' + error.message);
    },
  });
}
