import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLeads } from '@/hooks/useLeads';
import { useDeals } from '@/hooks/useDeals';
import { useTasks } from '@/hooks/useTasks';

export interface AIInsight {
    id: string;
    type: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
}

export interface NextBestAction {
    id: string;
    entityType: 'deal' | 'lead' | 'task';
    entityId: string;
    action: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}

export interface LeadScore {
    id: string;
    score: number;         // 0-100
    label: 'Hot' | 'Warm' | 'Cold';
    probability: number;
}

export interface DealWinPrediction {
    id: string;
    win_probability: number;  // 0-100
    probability: number;
}

export interface ForecastSeries {
    date: string;
    value: number;
    lower?: number;
    upper?: number;
}

export interface RevenueForecast {
    forecast_30: number;
    forecast_90: number;
    series: ForecastSeries[];
}

const AI_SERVICE_URL = 'http://localhost:8000';

// ──────────────────────────────────────
// Hook 1: Full Insights + Next Best Actions
// ──────────────────────────────────────
export function useAIInsights() {
    const { data: leads = [] } = useLeads();
    const { data: deals = [] } = useDeals();
    const { data: tasks = [] } = useTasks();

    const isDataReady = deals.length > 0 || leads.length > 0 || tasks.length > 0;

    const { data, isLoading, error } = useQuery({
        queryKey: ['ai-insights', deals.length, leads.length, tasks.length],
        queryFn: async () => {
            const response = await fetch(`${AI_SERVICE_URL}/api/generate-insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deals, leads, tasks }),
            });
            if (!response.ok) throw new Error('AI service request failed');
            return response.json() as Promise<{ insights: AIInsight[]; nextBestActions: NextBestAction[] }>;
        },
        enabled: isDataReady,
        staleTime: 60 * 1000,
        retry: 2,
    });

    const isServiceDown = !!error;

    const renderMessage = (msg: string): React.ReactNode => {
        const parts = msg.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
        );
    };

    const insights = (data?.insights ?? []).map(insight => ({
        ...insight,
        message: renderMessage(insight.message),
    }));

    const nextBestActions = data?.nextBestActions ?? [];

    return { insights, nextBestActions, isLoading, isServiceDown };
}

// ──────────────────────────────────────
// Hook 2: Lead AI Scores (batch call)
// ──────────────────────────────────────
export function useLeadScores(leads: any[]) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['ai-lead-scores', leads.map(l => l.id).join(',')],
        queryFn: async () => {
            if (!leads.length) return { scores: [] as LeadScore[] };
            const payload = {
                leads: leads.map(lead => ({
                    id: lead.id,
                    // Derive source proxy from status since Lead has no lead_source column
                    lead_source: lead.status === 'qualified' ? 'referral' :
                        lead.status === 'contacted' ? 'website' :
                            lead.status === 'proposal' ? 'partner' : 'other',
                    // is_qualified maps to company maturity
                    company_size: (lead as any).is_qualified ? 'mid' : 'small',
                    lead_activity_count: lead.status !== 'new' ? 3 : 0,
                    response_time: lead.status === 'new' ? 5.0 : 1.5,
                }))
            };
            const response = await fetch(`${AI_SERVICE_URL}/predict/lead-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Lead score request failed');
            return response.json() as Promise<{ scores: LeadScore[] }>;
        },
        enabled: leads.length > 0,
        staleTime: 5 * 60 * 1000,  // 5 min cache
        retry: 1,
    });

    // Build a quick lookup map: id → score object
    const scoreMap = new Map<string, LeadScore>();
    (data?.scores ?? []).forEach(s => scoreMap.set(s.id, s));

    return { scoreMap, isLoading, isServiceDown: !!error };
}

// ──────────────────────────────────────
// Hook 3: Deal Win Predictions (batch call)
// ──────────────────────────────────────
export function useDealWinPredictions(deals: any[]) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['ai-deal-wins', deals.map(d => d.id).join(',')],
        queryFn: async () => {
            if (!deals.length) return { predictions: [] as DealWinPrediction[] };
            const payload = {
                deals: deals.map(d => ({
                    id: d.id,
                    deal_value: d.deal_value || 0,
                    pipeline_stage: d.stage || 'new',
                    days_in_stage: d.days_open || 0,
                    interaction_count: 5,
                }))
            };
            const response = await fetch(`${AI_SERVICE_URL}/predict/deal-win`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Deal win prediction request failed');
            return response.json() as Promise<{ predictions: DealWinPrediction[] }>;
        },
        enabled: deals.length > 0,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });

    const predMap = new Map<string, DealWinPrediction>();
    (data?.predictions ?? []).forEach(p => predMap.set(p.id, p));

    return { predMap, isLoading, isServiceDown: !!error };
}

// ──────────────────────────────────────
// Hook 4: Revenue Forecast (Prophet)
// ──────────────────────────────────────
export function useRevenueForecast(wonDeals: any[]) {
    // Build monthly revenue series from won deals
    const revenueSeries = React.useMemo(() => {
        const monthly: Record<string, number> = {};
        wonDeals.forEach(d => {
            if (!d.won_date || !d.deal_value) return;
            const key = d.won_date.slice(0, 7) + '-01';  // YYYY-MM-01
            monthly[key] = (monthly[key] || 0) + d.deal_value;
        });
        return Object.entries(monthly)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({ date, revenue }));
    }, [wonDeals]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['ai-revenue-forecast', revenueSeries.length, revenueSeries[revenueSeries.length - 1]?.date],
        queryFn: async () => {
            if (revenueSeries.length < 2) {
                return { forecast_30: 0, forecast_90: 0, series: [] } as RevenueForecast;
            }
            const response = await fetch(`${AI_SERVICE_URL}/forecast/revenue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revenue_history: revenueSeries, periods: 30 }),
            });
            if (!response.ok) throw new Error('Forecast request failed');
            return response.json() as Promise<RevenueForecast>;
        },
        enabled: revenueSeries.length >= 2,
        staleTime: 10 * 60 * 1000,
        retry: 1,
    });

    return {
        forecast: data ?? { forecast_30: 0, forecast_90: 0, series: [] },
        isLoading,
        isServiceDown: !!error,
        hasEnoughData: revenueSeries.length >= 2,
    };
}
