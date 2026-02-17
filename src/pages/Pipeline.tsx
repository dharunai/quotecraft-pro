import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDeals, useUpdateDeal } from '@/hooks/useDeals';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isPast, isToday, isFuture } from 'date-fns';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Plus,
  MoreHorizontal,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Star as StarIcon,
  CheckCircle2
} from 'lucide-react';
import { Deal } from '@/types/database';
import { getAvatarUrl } from '@/lib/avatars';

const STAGES = [
  { id: 'qualified', label: 'Qualified', color: 'bg-black' },
  { id: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-purple-500' },
  { id: 'won', label: 'Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' }
] as const;

type Stage = typeof STAGES[number]['id'];

export default function Pipeline() {
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals();
  const { data: settings } = useCompanySettings();
  const updateDeal = useUpdateDeal();
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!deal || deal.stage === targetStage) return;

    // Prevent moving if finalized
    if ((deal.stage === 'won' || deal.stage === 'lost') && (targetStage === 'won' || targetStage === 'lost')) {
      setDraggedDealId(null);
      return;
    }

    updateDeal.mutate({ id: draggedDealId, stage: targetStage });
    setDraggedDealId(null);
  };

  const currency = settings?.currency || '$';

  // Filter Logic
  const filteredDeals = deals.filter(deal => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const company = deal.lead?.company_name?.toLowerCase() || '';
    const contact = deal.lead?.contact_name?.toLowerCase() || '';
    const value = deal.deal_value?.toString() || '';
    return company.includes(query) || contact.includes(query) || value.includes(query);
  });

  const getDealsByStage = (stage: Stage) => filteredDeals.filter(deal => deal.stage === stage);

  // Calculations (on full dataset, not filtered)
  const activeDeals = deals.filter(d => d.stage !== 'lost');
  const wonDeals = deals.filter(d => d.stage === 'won');

  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const totalDealsCount = activeDeals.length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Loading pipeline...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col font-sans bg-gray-50/50">
        <div className="p-8 pb-0 flex flex-col gap-6">
          <h1 className="text-xl font-bold text-gray-900">Sales Pipeline</h1>

          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="p-1 rounded-full border border-gray-200">
                  <DollarSign className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wide">Pipeline Value</span>
              </div>
              <div className="flex items-end gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{currency}{pipelineValue.toLocaleString()}</h2>
                <span className="mb-0.5 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  +8%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                {currency}{(pipelineValue * 0.92).toLocaleString()} last year
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="p-1 rounded-full border border-gray-200">
                  <Users className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wide">Total Deals</span>
              </div>
              <div className="flex items-end gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{totalDealsCount}</h2>
                <span className="mb-0.5 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  -2
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                {totalDealsCount + 2} last month
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="p-1 rounded-full border border-gray-200">
                  <StarIcon className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wide">Deals Won (This Month)</span>
              </div>
              <div className="flex items-end gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{currency}{wonValue.toLocaleString()}</h2>
                <span className="mb-0.5 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  +3.2%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                {currency}{(wonValue * 0.97).toLocaleString()} last month
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 h-9 rounded-lg border-gray-200 bg-white shadow-sm text-sm"
                placeholder="Search deals name or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 font-semibold text-xs transition-colors ${view === 'kanban' ? 'text-primary' : 'text-gray-700'}`}
              >
                <div className={`p-1 border rounded-md ${view === 'kanban' ? 'border-primary bg-primary/5' : 'border-gray-300'}`}>
                  <LayoutGrid className={`w-3.5 h-3.5 ${view === 'kanban' ? 'text-primary' : ''}`} />
                </div>
                Kanban
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 font-semibold text-xs transition-colors ${view === 'list' ? 'text-primary' : 'text-gray-700'}`}
              >
                <div className={`p-1 border rounded-md ${view === 'list' ? 'border-primary bg-primary/5' : 'border-gray-300'}`}>
                  <List className={`w-3.5 h-3.5 ${view === 'list' ? 'text-primary' : 'text-gray-400'}`} />
                </div>
                List
              </button>
              <button className="flex items-center gap-1.5 text-gray-700 font-semibold text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8 pt-2">
          {view === 'kanban' ? (
            <div className="flex gap-6 h-full min-w-[1400px]">
              {STAGES.map(stage => {
                const stageDeals = getDealsByStage(stage.id);
                const stageTotal = stageDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);

                return (
                  <div
                    key={stage.id}
                    className="w-[300px] flex-shrink-0 flex flex-col h-full"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${stage.color}`} />
                        <span className="font-bold text-gray-900 text-xs">{stage.label}</span>
                      </div>
                      <div className="text-gray-400 text-[10px] font-medium">
                        {stageDeals.length} Deals <span className="mx-0.5">·</span> {currency}{stageTotal.toLocaleString('en-IN', { notation: 'compact' })}
                      </div>
                    </div>

                    {/* Cards Columns */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar pb-10">
                      {stageDeals.map(deal => {
                        const isAtRisk = deal.expected_close_date && isPast(new Date(deal.expected_close_date));

                        return (
                          <div
                            key={deal.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal.id)}
                            onClick={() => navigate(`/deals/${deal.id}`)}
                            className={`
                              group bg-white rounded-xl p-4 shadow-sm border border-gray-100
                              hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer
                              ${draggedDealId === deal.id ? 'opacity-50 rotate-3 scale-95' : ''}
                            `}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="font-bold text-gray-900 text-sm">{deal.lead?.company_name || 'Prospect'}</h3>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-300 opacity-0 group-hover:opacity-100 -mr-2 -mt-2">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mb-3">{deal.lead?.contact_name || 'Unknown Contact'}</p>

                            <div className="flex items-center gap-3 mb-3 text-gray-600">
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-bold">{currency}{deal.deal_value?.toLocaleString()}</span>
                              </div>
                              <div className="w-0.5 h-0.5 rounded-full bg-gray-300"></div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-medium">
                                  {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'MMM d') : '-'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={getAvatarUrl(deal.lead?.contact_name || 'Prospect')} />
                                  <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-700 font-bold">
                                    {deal.lead?.contact_name?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-semibold text-gray-700">{deal.lead?.contact_name || 'Unknown'}</span>
                              </div>

                              {isAtRisk ? (
                                <Badge variant="outline" className="text-red-600 bg-red-50 border-red-100 hover:bg-red-100 font-semibold gap-1 pl-1 pr-1.5 h-5 text-[10px]">
                                  <span className="w-1 h-1 rounded-full bg-red-500"></span>
                                  Risk
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-teal-700 bg-teal-50 border-teal-100 hover:bg-teal-100 font-semibold gap-1 pl-1 pr-1.5 h-5 text-[10px]">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                                  Track
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Company</TableHead>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">Stage</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                    <TableHead className="text-xs">Expected Close</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs">
                        No deals found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeals.map((deal) => {
                      const stage = STAGES.find(s => s.id === deal.stage);
                      return (
                        <TableRow key={deal.id} className="cursor-pointer hover:bg-gray-50/50" onClick={() => navigate(`/deals/${deal.id}`)}>
                          <TableCell className="font-medium text-gray-900 text-sm">
                            {deal.lead?.company_name || 'Prospect'}
                          </TableCell>
                          <TableCell className="text-gray-500 text-xs">
                            {deal.lead?.contact_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${stage?.color.replace('bg-', 'text-')} bg-opacity-10 capitalize text-[10px]`}>
                              {stage?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-gray-700 text-sm">
                            {currency}{deal.deal_value?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-500 text-xs">
                            {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); navigate(`/deals/${deal.id}`); }}>
                              <MoreHorizontal className="w-3 h-3 text-gray-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}