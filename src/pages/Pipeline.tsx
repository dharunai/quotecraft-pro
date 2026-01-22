import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDeals, useUpdateDeal } from '@/hooks/useDeals';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Deal } from '@/types/database';
const STAGES = [{
  id: 'qualified',
  label: 'Qualified',
  probability: 25
}, {
  id: 'proposal',
  label: 'Proposal',
  probability: 50
}, {
  id: 'negotiation',
  label: 'Negotiation',
  probability: 75
}, {
  id: 'won',
  label: 'Won',
  probability: 100
}, {
  id: 'lost',
  label: 'Lost',
  probability: 0
}] as const;
type Stage = typeof STAGES[number]['id'];
export default function Pipeline() {
  const navigate = useNavigate();
  const {
    data: deals = [],
    isLoading
  } = useDeals();
  const {
    data: settings
  } = useCompanySettings();
  const updateDeal = useUpdateDeal();
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e: React.DragEvent, targetStage: Stage) => {
    e.preventDefault();
    if (!draggedDealId) return;
    const deal = deals.find(d => d.id === draggedDealId);
    if (!deal || deal.stage === targetStage) {
      setDraggedDealId(null);
      return;
    }

    // Don't allow moving to won/lost if already in won/lost
    if ((deal.stage === 'won' || deal.stage === 'lost') && (targetStage === 'won' || targetStage === 'lost')) {
      setDraggedDealId(null);
      return;
    }
    updateDeal.mutate({
      id: draggedDealId,
      stage: targetStage
    });
    setDraggedDealId(null);
  };
  const getDealsByStage = (stage: Stage) => {
    return deals.filter(deal => deal.stage === stage);
  };
  const getStageTotal = (stage: Stage) => {
    return getDealsByStage(stage).reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
  };
  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case 'qualified':
        return 'bg-info/10 border-info/30';
      case 'proposal':
        return 'bg-warning/10 border-warning/30';
      case 'negotiation':
        return 'bg-primary/10 border-primary/30';
      case 'won':
        return 'bg-success/10 border-success/30';
      case 'lost':
        return 'bg-destructive/10 border-destructive/30';
      default:
        return 'bg-muted';
    }
  };
  const getProbabilityBadge = (probability: number) => {
    if (probability === 100) return <Badge className="bg-success/20 text-success border-success/30">100%</Badge>;
    if (probability === 0) return <Badge variant="destructive">0%</Badge>;
    if (probability >= 75) return <Badge className="bg-primary/20 text-primary border-primary/30">{probability}%</Badge>;
    if (probability >= 50) return <Badge className="bg-warning/20 text-warning-foreground border-warning/30">{probability}%</Badge>;
    return <Badge variant="secondary">{probability}%</Badge>;
  };
  const currency = settings?.currency || '₹';
  const totalPipelineValue = deals.filter(d => d.stage !== 'lost').reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const weightedPipelineValue = deals.filter(d => d.stage !== 'lost' && d.stage !== 'won').reduce((sum, d) => sum + (d.deal_value || 0) * d.probability / 100, 0);
  if (isLoading) {
    return <AppLayout>
        <p className="text-muted-foreground">Loading pipeline...</p>
      </AppLayout>;
  }
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-sans">Sales Pipeline</h1>
            <p className="text-muted-foreground font-sans">
              {deals.length} deals | Total: {currency}{totalPipelineValue.toLocaleString('en-IN')} | Weighted: {currency}{weightedPipelineValue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Pipeline Board */}
        <div className="grid grid-cols-5 gap-4 min-h-[600px]">
          {STAGES.map(stage => {
          const stageDeals = getDealsByStage(stage.id);
          const stageTotal = getStageTotal(stage.id);
          return <div key={stage.id} className={`rounded-lg border-2 ${getStageColor(stage.id)} p-3`} onDragOver={handleDragOver} onDrop={e => handleDrop(e, stage.id)}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold font-sans">{stage.label}</h3>
                    <Badge variant="outline">{stageDeals.length}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    {currency}{stageTotal.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="space-y-3">
                  {stageDeals.map(deal => <Card key={deal.id} draggable onDragStart={e => handleDragStart(e, deal.id)} onClick={() => navigate(`/deals/${deal.id}`)} className={`cursor-pointer hover:shadow-md transition-shadow ${draggedDealId === deal.id ? 'opacity-50' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm line-clamp-1">
                            {deal.lead?.company_name}
                          </p>
                          {getProbabilityBadge(deal.probability)}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {deal.lead?.contact_name}
                        </p>
                        {deal.deal_value && <p className="font-semibold text-primary">
                            {currency}{deal.deal_value.toLocaleString('en-IN')}
                          </p>}
                        {deal.expected_close_date && <p className="text-xs text-muted-foreground mt-1">
                            Close: {format(new Date(deal.expected_close_date), 'dd MMM')}
                          </p>}
                      </CardContent>
                    </Card>)}
                </div>
              </div>;
        })}
        </div>
      </div>
    </AppLayout>;
}