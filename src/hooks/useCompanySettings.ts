import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompanySettings } from '@/types/database';
import { toast } from 'sonner';

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings | null> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CompanySettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('company_settings')
        .update(settings)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, settingsId }: { file: File; settingsId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ logo_url: publicUrl })
        .eq('id', settingsId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Logo uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to upload logo: ' + error.message);
    },
  });
}
