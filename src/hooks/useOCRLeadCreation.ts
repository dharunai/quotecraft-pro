import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtractedLeadInfo } from '@/components/leads/BusinessCardScanner';

export function useOCRLeadCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLeadFromOCR = async (extractedInfo: ExtractedLeadInfo) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!extractedInfo.Name || extractedInfo.Name === 'Not found') {
        throw new Error('Contact name is required');
      }
      if (!extractedInfo.Company || extractedInfo.Company === 'Not found') {
        throw new Error('Company name is required');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create the lead
      const { data, error: createError } = await supabase
        .from('leads')
        .insert([
          {
            company_name: extractedInfo.Company,
            contact_name: extractedInfo.Name,
            email: extractedInfo.Email !== 'Not found' ? extractedInfo.Email : null,
            phone: extractedInfo.Phone !== 'Not found' ? extractedInfo.Phone : null,
            address: extractedInfo.Address !== 'Not found' ? extractedInfo.Address : null,
            status: 'new',
            is_qualified: false,
            score: 0,
            notes: `Created from business card OCR. Website: ${extractedInfo.Website}`,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create lead from OCR';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createLeadFromOCR,
    isLoading,
    error,
  };
}
