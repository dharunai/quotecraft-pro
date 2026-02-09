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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, subMonths, isSameMonth, addMonths, parseISO, startOfMonth, isWithinInterval, addDays, startOfYear, endOfYear } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
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
import { Edit, Save, X } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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
    <div ref={setNodeRef} style={style} {...attributes} {...dragListeners} className={`${props.className} relative group`}>
      {props.isEditMode && (
        <div className="absolute top-2 right-2 z-20">
          <div className="bg-black/10 p-1 rounded hover:bg-black/20 transition-colors">
            <Edit className="h-3 w-3 text-slate-500" />
          </div>
        </div>
      )}
      {props.children}
    </div>
  );
}

export default function Dashboard() {
  const { data: leads = [] } = useLeads();
  const { data: quotations = [] } = useQuotations();
  const { data: deals = [] } = useDeals();
  const { data: products = [] } = useProducts();
  const { data: tasks = [] } = useTasks();
  const { data: settings } = useCompanySettings();
  const currency = settings?.currency || '₹';

  // --- State ---
  const [isEditMode, setIsEditMode] = useState(false);

  // --- Date Filter State ---
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  });

  // --- Drag & Drop State ---
  const [kpiOrder, setKpiOrder] = useState([
    'totalSales', 'winRate', 'pipelineValue', 'openDeals', 'weightedValue', 'avgDaysToClose'
  ]);

  const [chartOrder, setChartOrder] = useState([
    'wonDealsTrend', 'salesPipeline', 'dealsProjection', 'dealLossReasons', 'upcomingTasks'
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Filter Logic ---
  const filteredDeals = useMemo(() => {
    if (!dateRange?.from) return deals;
    // Basic filtering can happen here if needed, but we do precise filtering in metrics
    return deals;
  }, [deals, dateRange]);

  // --- KPI Metrics Calculation ---
  const pipelineMetrics = useMemo(() => {
    // Determine effective date range
    const from = dateRange?.from || new Date(0);
    const to = dateRange?.to || new Date(2100, 0, 1);

    const activeDeals = deals.filter(d => d.stage !== 'lost' && d.stage !== 'won');

    // Won deals strictly in period
    const wonDealsInPeriod = deals.filter(d =>
      d.stage === 'won' &&
      d.won_date &&
      isWithinInterval(parseISO(d.won_date), { start: from, end: to })
    );

    // Lost deals in period
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
      ? Math.round(totalDaysToClose / closedDealsWithDates.length)
      : 0;

    return {
      totalSales: wonDealsInPeriod.reduce((sum, d) => sum + (d.deal_value || 0), 0),
      wonDealsCount: wonDealsInPeriod.length,
      winRate,
      avgDaysToClose,
      pipelineValue, // Pipeline is usually "snapshot", so we show current active
      openDealsCount: activeDeals.length,
      weightedValue,
    };
  }, [deals, dateRange]);


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
    const startDate = dateRange?.to ? dateRange.to : new Date(); // Start projection from end of selected range (or today)

    for (let i = 0; i < 12; i++) {
      const date = addMonths(startDate, i);
      // Filter active deals expecting to close in this month
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
    // Filter lost deals by date range
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

  // --- Handlers ---
  function handleDragEnd(event: DragEndEvent) {
    if (!isEditMode) return; // double check logic

    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      if (kpiOrder.includes(active.id as string)) {
        setKpiOrder((items) => {
          const oldIndex = items.indexOf(active.id as string);
          const newIndex = items.indexOf(over?.id as string);
          return arrayMove(items, oldIndex, newIndex);
        });
      } else {
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
    const cardContent = (title: string, value: string | number, bgClass: string) => (
      <Card className={`h-full border-none shadow-sm relative overflow-hidden transition-all ${isEditMode ? 'hover:ring-2 hover:ring-primary/20' : ''}`}>
        {/* Abstract Background for Nano look */}
        <div className={`absolute inset-0 opacity-10 ${bgClass}`}
          style={{
            backgroundImage: 'url(/abstract_nano_bg.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'overlay'
          }} />

        <CardHeader className="pb-1 relative z-10">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-xl font-bold text-slate-900">{value}</div>
        </CardContent>

        {/* Decorative nano-line */}
        <div className={`absolute bottom-0 left-0 h-0.5 w-full ${bgClass.replace('bg-', 'bg-gradient-to-r from-transparent to-')}`} />
      </Card>
    );

    switch (id) {
      case 'totalSales': return cardContent('Total Sales', `${currency}${pipelineMetrics.totalSales.toLocaleString('en-IN')}`, 'bg-primary');
      case 'winRate': return cardContent('Win Rate', `${pipelineMetrics.winRate}%`, 'bg-blue-500');
      case 'pipelineValue': return cardContent('Pipeline Value', `${currency}${pipelineMetrics.pipelineValue.toLocaleString('en-IN')}`, 'bg-purple-500');
      case 'openDeals': return cardContent('Open Deals', pipelineMetrics.openDealsCount, 'bg-indigo-500');
      case 'weightedValue': return cardContent('Weighted Value', `${currency}${Math.round(pipelineMetrics.weightedValue).toLocaleString('en-IN')}`, 'bg-sky-500');
      case 'avgDaysToClose': return cardContent('Avg Days to Close', pipelineMetrics.avgDaysToClose, 'bg-teal-500');
      default: return null;
    }
  };

  const renderChartCard = (id: string) => {
    // Helper to wrap charts with consistent styling
    const ChartWrapper = ({ title, children, className = '' }: any) => (
      <Card key={id} className={`h-full border-none shadow-sm transition-all ${isEditMode ? 'hover:ring-2 hover:ring-primary/20' : ''} ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    );

    switch (id) {
      case 'wonDealsTrend':
        return (
          <ChartWrapper title="Won Deals Trend" className={chartOrder.indexOf(id) === 0 ? 'md:col-span-2' : ''}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wonDealsTrend}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>
        );
      case 'salesPipeline':
        return (
          <ChartWrapper title="Sales Pipeline">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>
        );
      case 'dealsProjection':
        return (
          <ChartWrapper title="Deals Projection" className={chartOrder.indexOf(id) === 0 ? 'md:col-span-2' : ''}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dealsProjection}>
                  <defs>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
                  <Area type="monotone" dataKey="value" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorProj)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>
        );
      case 'dealLossReasons':
        return (
          <ChartWrapper title="Deal Loss Reasons">
            <div className="h-[250px] flex items-center justify-center">
              {lossReasonsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lossReasonsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {lossReasonsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-xs">No lost deals data</div>
              )}
            </div>
          </ChartWrapper>
        );
      case 'upcomingTasks':
        return (
          <ChartWrapper title="Upcoming Tasks">
            <div className="space-y-3">
              {upcomingTasksData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No upcoming tasks</p>
              ) : (
                upcomingTasksData.map(task => (
                  <div key={task.id} className="flex items-start gap-3 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className={`w-1.5 h-1.5 mt-1.5 rounded-full ${task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-500' : 'bg-slate-400'
                      }`} />
                    <div>
                      <p className="text-xs font-medium text-slate-700">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No date'}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-slate-500 hover:text-slate-900" asChild>
                <Link to="/tasks">View All</Link>
              </Button>
            </div>
          </ChartWrapper>
        );
      default: return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 font-sans">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? <Save className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
              {isEditMode ? 'Save Layout' : 'Customize'}
            </Button>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {kpiOrder.map(id => (
                <SortableItem key={id} id={id} className="h-full" isEditMode={isEditMode}>
                  {renderKpiCard(id)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>

          {/* Charts Row - Sortable Grid */}
          <SortableContext items={chartOrder} strategy={rectSortingStrategy} disabled={!isEditMode}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
              {chartOrder.map((id, index) => {
                const isFirst = chartOrder.indexOf(id) === 0;
                return (
                  <SortableItem key={id} id={id} className={
                    ((id === 'wonDealsTrend' || id === 'dealsProjection') && isFirst) ? "md:col-span-2" : ""
                  } isEditMode={isEditMode}>
                    {renderChartCard(id)}
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <Card className="opacity-80 w-full h-full bg-white shadow-2xl border-primary/20">
                <CardHeader><CardTitle className="text-xs">Moving Widget...</CardTitle></CardHeader>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </AppLayout>
  );
}
