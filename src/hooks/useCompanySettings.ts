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
        .maybeSingle();

      if (error) {
        console.error("Error fetching company settings:", error);
        throw error;
      }

      if (!data) return null;

      // Map DB columns to our CompanySettings type
      return {
        id: data.id,
        company_id: '',
        company_name: data.company_name,
        logo_url: data.logo_url,
        address: data.address,
        email: data.email,
        phone: data.phone,
        gst_number: data.gst_number,
        pan: data.pan,
        currency: data.currency,
        tax_rate: data.tax_rate,
        terms: data.terms,
        theme_color: data.theme_color,
        bank_name: data.bank_name,
        account_number: data.account_number,
        ifsc_code: data.ifsc_code,
        account_holder_name: data.account_holder_name,
        invoice_prefix: data.invoice_prefix,
        default_due_days: data.default_due_days,
        invoice_terms: data.invoice_terms,
        created_at: data.created_at,
        updated_at: data.updated_at,
        email_signature: data.email_signature,
        quotation_email_subject: data.quotation_email_subject,
        quotation_email_body: data.quotation_email_body,
        invoice_email_subject: data.invoice_email_subject,
        invoice_email_body: data.invoice_email_body,
        enable_stock_alerts: data.enable_stock_alerts,
        stock_alert_email: data.stock_alert_email,
        alert_on_low_stock: data.alert_on_low_stock,
        alert_on_out_of_stock: data.alert_on_out_of_stock,
        show_logo_on_pdf: data.show_logo_on_pdf,
        include_hsn_sac: data.include_hsn_sac,
        pdf_footer_text: data.pdf_footer_text,
      } as CompanySettings;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CompanySettings> & { id: string }) => {
      const { id, company_id, ...rest } = settings as any;
      const { data, error } = await supabase
        .from('company_settings')
        .update(rest)
        .eq('id', id)
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
      try {
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
