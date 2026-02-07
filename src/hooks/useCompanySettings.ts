import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompanySettings } from '@/types/database';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useCompanySettings() {
  const { companyId } = useAuth();
  
  return useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async (): Promise<CompanySettings | null> => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching company settings:", error);
        throw error;
      };
      
      return data;
    },
    enabled: !!companyId
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
      // Try Supabase Storage first
      try {
        // Ensure bucket exists by attempting upload
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${settingsId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(fileName, file, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('company-assets')
            .getPublicUrl(fileName);

          const { error: updateError } = await supabase
            .from('company_settings')
            .update({ logo_url: publicUrl })
            .eq('id', settingsId);

          if (updateError) throw updateError;
          return publicUrl;
        }

        console.warn('Storage upload failed, falling back to base64:', uploadError.message);
      } catch (storageErr) {
        console.warn('Storage not available, using base64 fallback:', storageErr);
      }

      // Fallback: Convert to base64 data URL and store directly
      const base64Url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ logo_url: base64Url })
        .eq('id', settingsId);

      if (updateError) throw updateError;
      return base64Url;
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
