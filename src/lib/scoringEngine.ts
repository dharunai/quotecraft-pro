import { supabase } from '@/integrations/supabase/client';

export async function calculateLeadScore(leadId: string) {
    try {
        // 1. Fetch the lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) throw leadError || new Error('Lead not found');

        // 2. Fetch active scoring rules
        const { data: rules, error: rulesError } = await supabase
            .from('lead_scoring_rules')
            .select('*')
            .eq('is_active', true);

        if (rulesError) throw rulesError;

        let totalScore = 0;

        // 3. Evaluate rules
        for (const rule of (rules || [])) {
            if (evaluateCriteria(rule.criteria, lead)) {
                totalScore += rule.points;
            }
        }

        // 4. Update lead score
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                score: totalScore,
                score_updated_at: new Date().toISOString()
            })
            .eq('id', leadId);

        if (updateError) throw updateError;

        return totalScore;
    } catch (error) {
        console.error('Scoring Engine Error:', error);
        return null;
    }
}

function evaluateCriteria(criteria: any, lead: any): boolean {
    if (!criteria) return false;

    // Example criteria: { field: 'email', operator: 'not_null' }
    const { field, operator, value } = criteria;
    const actualValue = lead[field];

    switch (operator) {
        case 'not_null': return actualValue !== null && actualValue !== '';
        case 'equals': return actualValue === value;
        case 'contains': return String(actualValue).includes(String(value));
        case 'greater_than': return Number(actualValue) > Number(value);
        default: return false;
    }
}

// Helper to get score badge variant
export function getScoreLabel(score: number) {
    if (score >= 70) return { label: 'Hot', variant: 'destructive' as const };
    if (score >= 30) return { label: 'Warm', variant: 'default' as const };
    return { label: 'Cold', variant: 'secondary' as const };
}
