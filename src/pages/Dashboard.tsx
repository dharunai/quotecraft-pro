import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLeads } from '@/hooks/useLeads';
import { useQuotations } from '@/hooks/useQuotations';
import { useDeals } from '@/hooks/useDeals';
import { useProducts } from '@/hooks/useProducts';
import { useInvoices } from '@/hooks/useInvoices';
import { useTasks } from '@/hooks/useTasks';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useAIInsights, useRevenueForecast } from '@/hooks/useAIInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, subMonths, isSameMonth, addMonths, parseISO, startOfMonth, isWithinInterval, addDays, startOfYear, endOfYear } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar
} from 'recharts';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Edit, Save, PlusCircle, Sparkles, Trophy, Activity,
  ArrowUpRight, ArrowDownRight, Users, Target, FileText,
  Calendar, CheckSquare, Briefcase, TrendingUp, GripHorizontal,
  AlertTriangle, Layers, TrendingDown
} from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']; // Modern SaaS palette

// --- Drag & Drop Generic Component ---
function SortableItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: props.id,
    disabled: !props.isEditMode // Disable if not in edit mode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    cursor: props.isEditMode ? 'grab' : 'default', // Change cursor based on mode
  };

  // Only attach listeners if in Edit Mode
  const dragListeners = props.isEditMode ? listeners : {};

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...dragListeners} className={`${props.className} relative group h-full`}>
      {props.isEditMode && (
        <div className="absolute top-2 right-2 z-20">
          <div className="bg-slate-100 p-1 rounded-md hover:bg-slate-200 transition-colors shadow-sm cursor-grab">
            <GripHorizontal className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      )}
      {props.children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: leads = [] } = useLeads();
  const { data: quotations = [] } = useQuotations();
  const { data: deals = [] } = useDeals();
  const { data: products = [] } = useProducts();
  const { data: tasks = [] } = useTasks();
  const { data: settings } = useCompanySettings();
  const { allProfiles } = useTeamHierarchy();
  const currency = settings?.currency || '₹';
  const { insights, nextBestActions, isLoading: aiLoading, isServiceDown } = useAIInsights();
  const wonDeals = useMemo(() => deals.filter(d => d.stage === 'won'), [deals]);
  const { forecast, isLoading: forecastLoading, hasEnoughData } = useRevenueForecast(wonDeals);

  // --- Real-time Activities Data ---
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-activities-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // --- State ---
  const [isEditMode, setIsEditMode] = useState(false);

  // --- Date Filter State ---
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  });

  // --- Drag & Drop State ---
  const [kpiOrder, setKpiOrder] = useState([
    'totalSales', 'openDeals', 'winRate', 'pipelineValue', 'weightedValue', 'avgDaysToClose'
  ]);

  const [chartOrder, setChartOrder] = useState([
    'wonDealsTrend', 'salesPipeline', 'dealsProjection', 'dealLossReasons',
    'stalledDeals', 'leadSourcePerformance', 'revenueForecast',
    'upcomingTasks', 'recentActivity', 'leaderboard'
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- KPI Metrics Calculation ---
  const pipelineMetrics = useMemo(() => {
    const from = dateRange?.from || new Date(0);
    const to = dateRange?.to || new Date(2100, 0, 1);

    const activeDeals = deals.filter(d => d.stage !== 'lost' && d.stage !== 'won');

    const wonDealsInPeriod = deals.filter(d =>
      d.stage === 'won' &&
      d.won_date &&
      isWithinInterval(parseISO(d.won_date), { start: from, end: to })
    );

    const lostDealsInPeriod = deals.filter(d =>
      d.stage === 'lost' &&
      d.lost_date &&
      isWithinInterval(parseISO(d.lost_date), { start: from, end: to })
    );

    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
    const weightedValue = activeDeals.reduce((sum, d) => sum + ((d.deal_value || 0) * (d.probability / 100)), 0);

    const winRate = (wonDealsInPeriod.length + lostDealsInPeriod.length) > 0
      ? Math.round((wonDealsInPeriod.length / (wonDealsInPeriod.length + lostDealsInPeriod.length)) * 100)
      : 0;

    const closedDealsWithDates = wonDealsInPeriod.filter(d => d.won_date && d.created_at);
    const totalDaysToClose = closedDealsWithDates.reduce((sum, d) => {
      const created = new Date(d.created_at);
      const won = new Date(d.won_date!);
      return sum + (won.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);

    const avgDaysToClose = closedDealsWithDates.length > 0
      ? Math.max(0, Math.round(totalDaysToClose / closedDealsWithDates.length))
      : 0;

    return {
      totalSales: wonDealsInPeriod.reduce((sum, d) => sum + (d.deal_value || 0), 0),
      wonDealsCount: wonDealsInPeriod.length,
      winRate,
      avgDaysToClose,
      pipelineValue,
      openDealsCount: activeDeals.length,
      weightedValue,
    };
  }, [deals, dateRange]);

  // --- Dynamic KPI Trends ---
  const kpiTrends = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const lastMonthStart = subMonths(currentMonthStart, 1);

    // Revenue
    const currentMonthWon = deals.filter(d => d.stage === 'won' && d.won_date && parseISO(d.won_date) >= currentMonthStart);
    const lastMonthWon = deals.filter(d => d.stage === 'won' && d.won_date && parseISO(d.won_date) >= lastMonthStart && parseISO(d.won_date) < currentMonthStart);
    const currentRev = currentMonthWon.reduce((s, d) => s + (d.deal_value || 0), 0);
    const lastRev = lastMonthWon.reduce((s, d) => s + (d.deal_value || 0), 0);
    const revTrend = lastRev > 0 ? ((currentRev - lastRev) / lastRev) * 100 : 0;

    // Win Rate
    const currentClosed = deals.filter(d => (d.stage === 'won' || d.stage === 'lost') && (d.won_date || d.lost_date) && parseISO(d.won_date || d.lost_date || '') >= currentMonthStart);
    const lastClosed = deals.filter(d => (d.stage === 'won' || d.stage === 'lost') && (d.won_date || d.lost_date) && parseISO(d.won_date || d.lost_date || '') >= lastMonthStart && parseISO(d.won_date || d.lost_date || '') < currentMonthStart);
    const currentWinRate = currentClosed.length ? (currentMonthWon.length / currentClosed.length) * 100 : 0;
    const lastWinRate = lastClosed.length ? (lastMonthWon.length / lastClosed.length) * 100 : 0;
    const winRateTrend = currentWinRate - lastWinRate;

    return {
      revenue: { value: revTrend, text: `${revTrend >= 0 ? '+' : ''}${revTrend.toFixed(1)}% from last month` },
      winRate: { value: winRateTrend, text: `${winRateTrend >= 0 ? '+' : ''}${winRateTrend.toFixed(1)}% from last month` },
    };
  }, [deals]);


  // --- Chart Data Preparation ---

  const pipelineData = useMemo(() => {
    const stages = ['qualified', 'proposal', 'negotiation', 'won', 'lost'];
    const data = stages.map(stage => ({
      name: stage.charAt(0).toUpperCase() + stage.slice(1),
      value: deals.filter(d => d.stage === stage).length
    })).filter(d => d.value > 0);
    return data;
  }, [deals]);

  const wonDealsTrend = useMemo(() => {
    const data = [];
    const endDate = dateRange?.to || new Date();

    for (let i = 11; i >= 0; i--) {
      const date = subMonths(endDate, i);
      const monthStart = startOfMonth(date);
      const monthDeals = deals.filter(d =>
        d.stage === 'won' &&
        d.won_date &&
        isSameMonth(parseISO(d.won_date), date)
      );

      data.push({
        month: format(date, 'MMM'),
        value: monthDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0),
        count: monthDeals.length
      });
    }
    return data;
  }, [deals, dateRange]);

  const dealsProjection = useMemo(() => {
    const data = [];
    const startDate = dateRange?.to ? dateRange.to : new Date();

    for (let i = 0; i < 12; i++) {
      const date = addMonths(startDate, i);
      const monthDeals = deals.filter(d =>
        d.stage !== 'won' && d.stage !== 'lost' &&
        d.expected_close_date &&
        isSameMonth(parseISO(d.expected_close_date), date)
      );

      data.push({
        month: format(date, 'MMM'),
        value: monthDeals.reduce((sum, d) => sum + ((d.deal_value || 0) * (d.probability / 100)), 0),
        count: monthDeals.length
      });
    }
    return data;
  }, [deals, dateRange]);

  const lossReasonsData = useMemo(() => {
    const from = dateRange?.from || new Date(0);
    const to = dateRange?.to || new Date(2100, 0, 1);

    const lostDeals = deals.filter(d =>
      d.stage === 'lost' &&
      (!d.lost_date || isWithinInterval(parseISO(d.lost_date), { start: from, end: to }))
    );

    const reasons: Record<string, number> = {};
    lostDeals.forEach(d => {
      const reason = d.lost_reason || 'Unknown';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });

    return Object.keys(reasons).map(key => ({
      name: key,
      value: reasons[key]
    }));
  }, [deals, dateRange]);

  const upcomingTasksData = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  // Stalled Deals: no update in last 5 days
  const stalledDeals = useMemo(() => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    return deals.filter(
      d => !['won', 'lost'].includes(d.stage) &&
        d.updated_at && new Date(d.updated_at) < fiveDaysAgo
    ).slice(0, 5);
  }, [deals]);

  // Lead Source Performance — grouped by lead status (no lead_source field in DB)
  // We track conversion from contacted/qualified → won stages
  const leadSourceData = useMemo(() => {
    const groups: Record<string, { total: number; converted: number }> = {};
    leads.forEach(lead => {
      // Use company_name initial letter bucket OR just use status-based grouping
      // Since there's no lead_source field, we group by how the lead came in:
      // The notes field or just show meaningful segments
      // Best proxy: group by 'is_qualified' and 'status' stages
      const bucket =
        lead.status === 'won' ? 'Won Leads' :
          lead.status === 'qualified' ? 'Qualified' :
            lead.status === 'proposal' ? 'Proposal' :
              lead.status === 'contacted' ? 'Contacted' :
                lead.status === 'lost' ? 'Lost' :
                  'New';
      if (!groups[bucket]) groups[bucket] = { total: 0, converted: 0 };
      groups[bucket].total++;
      if (lead.status === 'won' || lead.status === 'qualified') groups[bucket].converted++;
    });
    return Object.entries(groups)
      .map(([name, v]) => ({
        name,
        total: v.total,
        converted: v.converted,
        rate: v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [leads]);

  const leaderboardData = useMemo(() => {
    const from = dateRange?.from || new Date(0);
    const to = dateRange?.to || new Date(2100, 0, 1);

    const wonDealsInPeriod = deals.filter(d =>
      d.stage === 'won' &&
      d.won_date &&
      isWithinInterval(parseISO(d.won_date), { start: from, end: to })
    );

    const revenueByUser = wonDealsInPeriod.reduce((acc, deal) => {
      const userId = deal.created_by; // Use created_by as owner of deal based on db schema
      if (!userId) return acc;
      acc[userId] = (acc[userId] || 0) + (deal.deal_value || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(revenueByUser)
      .map(([userId, revenue]) => {
        const profile = allProfiles.find(p => p.user_id === userId);
        return {
          id: userId,
          name: profile?.full_name || profile?.email || 'Unknown User',
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [deals, dateRange, allProfiles]);

  // --- Handlers ---
  function handleDragEnd(event: DragEndEvent) {
    if (!isEditMode) return;

    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      if (kpiOrder.includes(active.id as string)) {
        setKpiOrder((items) => {
          const oldIndex = items.indexOf(active.id as string);
          const newIndex = items.indexOf(over?.id as string);
          return arrayMove(items, oldIndex, newIndex);
        });
      } else if (chartOrder.includes(active.id as string)) {
        setChartOrder((items) => {
          const oldIndex = items.indexOf(active.id as string);
          const newIndex = items.indexOf(over?.id as string);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  }

  // --- Render Functions for Dynamic Widgets ---
  const renderKpiCard = (id: string) => {
    let title = '';
    let value: string | number = '';
    let trend = '';
    let isPositive = true;

    switch (id) {
      case 'totalSales':
        title = 'Total Revenue';
        value = `${currency}${pipelineMetrics.totalSales.toLocaleString('en-IN')}`;
        trend = kpiTrends.revenue.text;
        isPositive = kpiTrends.revenue.value >= 0;
        break;
      case 'openDeals':
        title = 'Open Deals';
        value = pipelineMetrics.openDealsCount;
        trend = 'Active opportunities';
        isPositive = true;
        break;
      case 'winRate':
        title = 'Win Rate';
        value = `${pipelineMetrics.winRate}%`;
        trend = kpiTrends.winRate.text;
        isPositive = kpiTrends.winRate.value >= 0;
        break;
      case 'pipelineValue':
        title = 'Pipeline Value';
        value = `${currency}${pipelineMetrics.pipelineValue.toLocaleString('en-IN')}`;
        trend = `${deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length} active deals`;
        isPositive = true;
        break;
      case 'weightedValue': // Used as Forecast Revenue
        title = 'Forecast Revenue';
        value = `${currency}${Math.round(pipelineMetrics.weightedValue).toLocaleString('en-IN')}`;
        trend = `Expected value based on prob.`;
        isPositive = true;
        break;
      case 'avgDaysToClose':
        title = 'Avg Days to Close';
        value = pipelineMetrics.avgDaysToClose;
        trend = 'Average sales cycle';
        isPositive = true;
        break;
      default: return null;
    }

    return (
      <Card className={`h-full border border-border bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all overflow-hidden relative ${isEditMode ? 'ring-2 ring-primary/20' : ''}`}>
        <CardHeader className="pb-1 pt-4 px-5">
          <CardTitle className="text-[13px] font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-5">
          <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
          <div className="flex items-center mt-1.5 text-[11px] font-medium">
            {trend.includes('%') || trend.includes('days') ? (
              <span className={`inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend}
              </span>
            ) : (
              <span className="text-muted-foreground">{trend}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderChartCard = (id: string) => {
    const ChartWrapper = ({ title, icon, children, className = '' }: any) => (
      <Card className={`h-full border border-border bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all overflow-hidden flex flex-col ${isEditMode ? 'ring-2 ring-primary/20' : ''} ${className}`}>
        <CardHeader className="py-3 px-5 flex flex-row items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-[14px] font-semibold text-foreground flex items-center gap-2">
            {icon && <span>{icon}</span>}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-5 pb-5 flex-1 h-full w-full">
          {children}
        </CardContent>
      </Card>
    );

    switch (id) {
      case 'wonDealsTrend':
        return (
          <ChartWrapper title="Revenue Trend" icon={<TrendingUp className="h-4 w-4 text-indigo-500" />} className={chartOrder.indexOf(id) === 0 ? 'md:col-span-2' : ''}>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wonDealsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value >= 1000 ? (value / 1000) + 'k' : value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>
        );
      case 'salesPipeline':
        return (
          <ChartWrapper title="Pipeline Distribution" icon={<PieChart className="h-4 w-4 text-emerald-500" />}>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>
        );
      case 'dealsProjection':
        return (
          <ChartWrapper title="Deal Forecast" icon={<Target className="h-4 w-4 text-amber-500" />} className={chartOrder.indexOf(id) === 0 ? 'md:col-span-2' : ''}>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealsProjection} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value >= 1000 ? (value / 1000) + 'k' : value}`} />
                  <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>
        );
      case 'dealLossReasons':
        return (
          <ChartWrapper title="Deal Loss Reasons" icon={<TrendingUp className="h-4 w-4 text-rose-500" />}>
            <div className="h-[250px] w-full">
              {lossReasonsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lossReasonsData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={90} />
                    <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No lost deals data</div>
              )}
            </div>
          </ChartWrapper>
        );
      case 'upcomingTasks':
        return (
          <ChartWrapper title="Upcoming Tasks" icon={<CheckSquare className="h-4 w-4 text-sky-500" />}>
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex-1 space-y-3">
                {upcomingTasksData.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground text-center py-8">No upcoming tasks</p>
                ) : (
                  upcomingTasksData.map(task => (
                    <div key={task.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${task.priority === 'high' || task.priority === 'urgent' ? 'bg-rose-500' : 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{task.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No date'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <Link to="/tasks">View All Tasks</Link>
              </Button>
            </div>
          </ChartWrapper>
        );
      case 'recentActivity':
        return (
          <ChartWrapper title="Recent Activity" icon={<Activity className="h-4 w-4 text-muted-foreground" />}>
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex-1 space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground text-center py-8">No recent activity</p>
                ) : (
                  recentActivities.map((activity: any) => {
                    let iconColor = 'bg-blue-500';
                    if (activity.entity_type === 'deal') iconColor = 'bg-emerald-500';
                    if (activity.entity_type === 'quotation') iconColor = 'bg-purple-500';

                    return (
                      <div key={activity.id} className="flex gap-3 text-[13px]">
                        <div className={`w-2 h-2 mt-1.5 rounded-full ${iconColor} flex-shrink-0`} />
                        <div>
                          <span className="font-semibold text-foreground">
                            {activity.performed_by_name || 'System'}
                          </span>{' '}
                          <span className="text-foreground">{activity.description}</span>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" disabled>View Full Timeline</Button>
            </div>
          </ChartWrapper>
        );

      case 'leaderboard':
        return (
          <ChartWrapper title="Sales Leaderboard" icon={<Trophy className="h-4 w-4 text-amber-500" />}>
            <div className="space-y-4 h-full flex flex-col justify-start pt-2">
              {leaderboardData.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">No won deals in this period</p>
              ) : (
                leaderboardData.map((user, index) => {
                  const isTop = index === 0;
                  return (
                    <div key={user.id} className={`flex items-center justify-between p-2 rounded-lg ${isTop ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30' : 'px-2 py-1'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isTop ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {index + 1}
                        </div>
                        <div className={`text-[13px] text-foreground ${isTop ? 'font-semibold' : 'font-medium'}`}>
                          {user.name}
                        </div>
                      </div>
                      <div className={`text-[13px] ${isTop ? 'font-bold text-emerald-600' : 'font-semibold text-foreground'}`}>
                        {currency}{user.revenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ChartWrapper>
        );
      case 'stalledDeals':
        return (
          <ChartWrapper title="Deals Needing Attention" icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}>
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex-1 space-y-2">
                {stalledDeals.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground text-center py-8">🎉 All deals are active!</p>
                ) : (
                  stalledDeals.map(deal => (
                    <div key={deal.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-50/60 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{deal.lead?.company_name || 'Unknown'}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{deal.stage} · {currency}{(deal.deal_value || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <Link to={`/deals/${deal.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-700 flex-none">
                          Follow Up
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <Link to="/pipeline">View Pipeline</Link>
              </Button>
            </div>
          </ChartWrapper>
        );

      case 'leadSourcePerformance':
        return (
          <ChartWrapper title="Lead Source Performance" icon={<Layers className="h-4 w-4 text-violet-500" />}>
            {leadSourceData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No lead source data</div>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadSourceData} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" dy={8} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: any, name: string) => [
                        name === 'rate' ? `${value}%` : value,
                        name === 'total' ? 'Total Leads' : name === 'converted' ? 'Converted' : 'Conv. Rate'
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartWrapper>
        );

      case 'revenueForecast':
        return (
          <ChartWrapper title="AI Revenue Forecast" icon={<TrendingUp className="h-4 w-4 text-indigo-500" />}
            className={chartOrder.indexOf(id) === 0 ? 'md:col-span-2' : ''}>
            <div className="flex flex-col h-full gap-4">
              {!hasEnoughData ? (
                <p className="text-[13px] text-muted-foreground text-center py-6">Need at least 2 months of won deals to generate forecast.</p>
              ) : forecastLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded animate-pulse" />)}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                      <p className="text-[11px] text-indigo-500 font-medium">30-Day Forecast</p>
                      <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                        {currency}{forecast.forecast_30.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                      <p className="text-[11px] text-emerald-500 font-medium">90-Day Forecast</p>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {currency}{forecast.forecast_90.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  {forecast.series.length > 0 && (
                    <div className="flex-1 h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecast.series} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" fontSize={9} axisLine={false} tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={v => v.slice(5)} interval={6} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={v => `${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                          <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            formatter={(v: any) => [`${currency}${Number(v).toLocaleString('en-IN')}`, 'Forecast']} />
                          <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2}
                            fillOpacity={1} fill="url(#forecastGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground text-right">Powered by Prophet · Open-source</p>
                </>
              )}
            </div>
          </ChartWrapper>
        );

      default: return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 font-sans pb-8">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your sales performance and tasks.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className="h-9 gap-1.5 shadow-sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? <Save className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
              {isEditMode ? 'Save Layout' : 'Customize Dashboard'}
            </Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          <Button variant="outline" className="bg-card shadow-sm gap-2 border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-none h-10 px-4" asChild>
            <Link to="/leads?new=true">
              <PlusCircle className="h-4 w-4 text-primary" /> <span className="font-medium text-[13px]">Add Lead</span>
            </Link>
          </Button>
          <Button variant="outline" className="bg-card shadow-sm gap-2 border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-none h-10 px-4" asChild>
            <Link to="/deals">
              <Briefcase className="h-4 w-4 text-emerald-500" /> <span className="font-medium text-[13px]">Create Deal</span>
            </Link>
          </Button>
          <Button variant="outline" className="bg-card shadow-sm gap-2 border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-none h-10 px-4" asChild>
            <Link to="/meetings?new=true">
              <Calendar className="h-4 w-4 text-purple-500" /> <span className="font-medium text-[13px]">Schedule Meeting</span>
            </Link>
          </Button>
          <Button variant="outline" className="bg-card shadow-sm gap-2 border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-none h-10 px-4" asChild>
            <Link to="/tasks?new=true">
              <CheckSquare className="h-4 w-4 text-blue-500" /> <span className="font-medium text-[13px]">Create Task</span>
            </Link>
          </Button>
          <Button variant="outline" className="bg-card shadow-sm gap-2 border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 flex-none h-10 px-4" asChild>
            <Link to="/quotations?new=true">
              <FileText className="h-4 w-4 text-orange-500" /> <span className="font-medium text-[13px]">Generate Quote</span>
            </Link>
          </Button>
        </div>

        {/* AI Sales Insights & Next Best Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-100/40 dark:from-indigo-900/20 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-1 relative z-10">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg shrink-0">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-[14px] font-semibold text-indigo-900 dark:text-indigo-200">AI Sales Insights</h3>
              {aiLoading && <span className="ml-auto text-[11px] text-indigo-400 animate-pulse">Analyzing...</span>}
              {isServiceDown && <span className="ml-auto text-[11px] text-rose-400">⚠ AI Service offline</span>}
            </div>
            <div className="relative z-10 flex flex-col gap-2">
              {aiLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-5 bg-indigo-100 dark:bg-indigo-800/30 rounded animate-pulse" />)}
                </div>
              ) : isServiceDown ? (
                <p className="text-[13px] text-rose-600/80 dark:text-rose-400/80">Could not reach the Python AI service. Make sure it is running on <code className="bg-rose-100 dark:bg-rose-900/30 px-1 rounded text-[11px]">localhost:8000</code>.</p>
              ) : insights.length > 0 ? (
                insights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="text-[13px] text-indigo-800 dark:text-indigo-300 leading-relaxed flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                    <span>{insight.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-indigo-700/70 dark:text-indigo-300/70">Gathering enough data to generate insights...</p>
              )}
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-100/40 dark:from-emerald-900/20 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-1 relative z-10">
              <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg shrink-0">
                <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-[14px] font-semibold text-emerald-900 dark:text-emerald-200">Next Best Actions</h3>
            </div>
            <div className="relative z-10 flex flex-col gap-2">
              {aiLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-emerald-100 dark:bg-emerald-800/30 rounded animate-pulse" />)}
                </div>
              ) : nextBestActions.length > 0 ? (
                nextBestActions.slice(0, 3).map((action) => (
                  <div key={action.id} className="text-[13px] flex items-center justify-between gap-3 bg-white/60 dark:bg-slate-900/40 p-2 rounded border border-emerald-100 dark:border-emerald-800/30">
                    <div>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">{action.action}</span>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80 text-[11px] mt-0.5">{action.reason}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800" asChild>
                      <Link to={`/${action.entityType}s/${action.entityId}`}>View</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-emerald-700/70 dark:text-emerald-300/70">No urgent actions recommended right now.</p>
              )}
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={(event) => setActiveId(event.active.id as string)}
        >
          {/* KPI Metrics - Sortable Grid */}
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy} disabled={!isEditMode}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpiOrder.map(id => (
                <SortableItem key={id} id={id} className="h-full" isEditMode={isEditMode}>
                  {renderKpiCard(id)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>

          {/* Charts Row - Sortable Grid */}
          <SortableContext items={chartOrder} strategy={rectSortingStrategy} disabled={!isEditMode}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6 items-stretch">
              {chartOrder.map((id) => {
                const isFirst = chartOrder.indexOf(id) === 0;
                return (
                  <SortableItem key={id} id={id} className={
                    ((id === 'wonDealsTrend' || id === 'dealsProjection') && isFirst) ? "md:col-span-2 h-full" : "h-full"
                  } isEditMode={isEditMode}>
                    {renderChartCard(id)}
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <Card className="opacity-90 w-full h-full bg-white dark:bg-card shadow-2xl border border-primary/20 scale-[1.02] cursor-grabbing">
                <CardHeader className="py-3 px-5 border-b border-border bg-slate-50/50">
                  <CardTitle className="text-sm">Moving Widget...</CardTitle>
                </CardHeader>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </AppLayout>
  );
}
