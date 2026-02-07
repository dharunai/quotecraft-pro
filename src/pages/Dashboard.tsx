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
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={props.className}>
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
        month: format(date, 'MMM yyyy'),
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
            month: format(date, 'MMM yyyy'),
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
    const {active, over} = event;
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
    switch(id) {
      case 'totalSales':
        return (
          <Card className="bg-primary text-primary-foreground h-full" key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-sans opacity-90 cursor-move">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency}{pipelineMetrics.totalSales.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        );
      case 'winRate':
        return (
          <Card className="bg-blue-600 text-white h-full" key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-sans opacity-90 cursor-move">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pipelineMetrics.winRate}%</div>
            </CardContent>
          </Card>
        );
      case 'pipelineValue':
        return (
          <Card className="bg-violet-600 text-white h-full" key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-sans opacity-90 cursor-move">Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency}{pipelineMetrics.pipelineValue.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        );
      case 'openDeals':
        return (
          <Card className="bg-indigo-600 text-white h-full" key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-sans opacity-90 cursor-move">Open Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pipelineMetrics.openDealsCount}</div>
            </CardContent>
          </Card>
        );
      case 'weightedValue':
        return (
          <Card className="bg-sky-500 text-white h-full" key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-sans opacity-90 cursor-move">Weighted Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency}{Math.round(pipelineMetrics.weightedValue).toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        );
      case 'avgDaysToClose':
        return (
          <Card className="bg-teal-500 text-white h-full" key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-sans opacity-90 cursor-move">Avg Days to Close</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pipelineMetrics.avgDaysToClose}</div>
            </CardContent>
          </Card>
        );
      default: return null;
    }
  };

  const renderChartCard = (id: string) => {
    switch(id) {
      case 'wonDealsTrend':
        return (
          <Card key={id} className={`h-full ${chartOrder.indexOf(id) === 0 ? 'md:col-span-2' : ''}`}>
            <CardHeader>
              <CardTitle className="font-sans cursor-move">Won deals (trend)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={wonDealsTrend}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="value" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorValue)" name="Closed Value" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      case 'salesPipeline':
        return (
          <Card key={id} className="h-full">
            <CardHeader>
              <CardTitle className="font-sans cursor-move">Sales pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      case 'dealsProjection':
        return (
          <Card key={id} className={`h-full ${chartOrder.indexOf(id) === 0 ? 'md:col-span-2' : ''}`}>
            <CardHeader>
              <CardTitle className="font-sans cursor-move">Deals projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dealsProjection}>
                    <defs>
                      <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorProj)" name="Projected Value" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      case 'dealLossReasons':
        return (
          <Card key={id} className="h-full">
            <CardHeader>
              <CardTitle className="font-sans cursor-move">Deal loss reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
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
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground text-sm">No lost deals data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      case 'upcomingTasks':
        return (
          <Card key={id} className="h-full">
            <CardHeader>
              <CardTitle className="font-sans cursor-move">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {upcomingTasksData.length === 0 ? (
                   <p className="text-sm text-muted-foreground text-center py-8">No upcoming tasks</p>
                 ) : (
                   upcomingTasksData.map(task => (
                     <div key={task.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                       <div className={`w-2 h-2 mt-2 rounded-full ${
                         task.priority === 'high' || task.priority === 'urgent' ? 'bg-destructive' : 'bg-primary'
                       }`} />
                       <div>
                         <p className="text-sm font-medium">{task.title}</p>
                         <p className="text-xs text-muted-foreground">
                           {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                         </p>
                       </div>
                     </div>
                   ))
                 )}
                 <Button variant="outline" className="w-full text-xs" asChild>
                    <Link to="/tasks">View All Tasks</Link>
                 </Button>
              </div>
            </CardContent>
          </Card>
        );
      default: return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-sans">CRM Dashboard</h1>
          <div className="flex items-center space-x-2">
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
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {kpiOrder.map(id => (
                <SortableItem key={id} id={id} className="h-full">
                  {renderKpiCard(id)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>

          {/* Charts Row - Sortable Grid */}
          <SortableContext items={chartOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {chartOrder.map((id, index) => {
                // Apply conditional spanning classes based on position if needed
                const isFirst = chartOrder.indexOf(id) === 0;
                return (
                  <SortableItem key={id} id={id} className={
                    // Simple heuristic: If it's a "wide" chart (trend/projection) AND it's in a slot that allows spanning
                    // we span it. But for DND we just sort them. The grid is cols-3. 
                    // Let's make "WonDeals" and "Projection" span 2 cols if possible.
                    // But if they are dragged to a narrow slot, they will squeeze.
                    ((id === 'wonDealsTrend' || id === 'dealsProjection') && isFirst) ? "md:col-span-2" : ""
                  }>
                    {renderChartCard(id)}
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
          
          <DragOverlay>
             {activeId ? (
                // Simplified Overlay
                <Card className="opacity-80 w-full h-full bg-background shadow-xl">
                   <CardHeader><CardTitle>Moving...</CardTitle></CardHeader>
                </Card>
             ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </AppLayout>
  );
}
