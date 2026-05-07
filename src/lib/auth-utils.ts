import { supabase } from '@/integrations/supabase/client';

export async function getEffectiveCompanyId(contextCompanyId: string | null): Promise<string> {
  if (contextCompanyId) return contextCompanyId;

  // Fallback to direct check if context is not yet populated
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // Try profiles first
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (profileData?.company_id) {
      return profileData.company_id;
    }

    if (profileError) {
      console.error('Error fetching profile for company_id:', profileError);
    }

    // Try team_members if profiles failed or had no company_id
    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (teamData?.company_id) {
      return teamData.company_id;
    }

    if (teamError) {
      console.error('Error fetching team_member for company_id:', teamError);
    }

    // Last resort: If there is only one company in the system, use it
    const { data: companies } = await supabase
      .from('company_settings')
      .select('id')
      .limit(2);
    
    if (companies && companies.length === 1) {
      return companies[0].id;
    }
  }

  throw new Error('Company ID not found. Please ensure you are associated with a company.');
}
