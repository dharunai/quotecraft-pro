import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveCompanyId } from '@/lib/auth-utils';
import { toast } from 'sonner';

export interface EmailTemplate {
  id: string;
  company_id: string;
  name: string;
  subject: string | null;
  body_html: string;
  category: string;
  created_at: string;
}

export function useEmailTemplates() {
  const { companyId } = useAuth();

  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const currentCompanyId = await getEffectiveCompanyId(companyId);
      
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('name');

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  const { user, companyId } = useAuth();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'company_id'>) => {
      const currentCompanyId = await getEffectiveCompanyId(companyId);
      
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...template,
          company_id: currentCompanyId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template created successfully');
    },
  });
}
