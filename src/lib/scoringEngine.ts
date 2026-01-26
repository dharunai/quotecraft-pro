// Lead Scoring Engine - Placeholder
// Currently disabled as lead_scoring_rules table is not in the schema

export async function calculateLeadScore(leadId: string): Promise<number | null> {
    // Scoring engine is currently disabled
    // To enable, create lead_scoring_rules table with criteria and points columns
    console.log('Lead scoring triggered for:', leadId);
    return null;
}

// Helper to get score badge variant
export function getScoreLabel(score: number) {
    if (score >= 70) return { label: 'Hot', variant: 'destructive' as const };
    if (score >= 30) return { label: 'Warm', variant: 'default' as const };
    return { label: 'Cold', variant: 'secondary' as const };
}
