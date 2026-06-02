import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLeads } from '@/hooks/useLeads';
import { useQuotations } from '@/hooks/useQuotations';
import { useDeals } from '@/hooks/useDeals';
import { useProducts } from '@/hooks/useProducts';
import { useTasks } from '@/hooks/useTasks';
import { useMeetings } from '@/hooks/useMeetings';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useAIInsights, useRevenueForecast } from '@/hooks/useAIInsights';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subMonths, isSameMonth, addMonths, parseISO, startOfMonth, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, LineChart, Line
} from 'recharts';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent, DragOverlay
} from '@dnd-kit/core';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Edit, Save, PlusCircle, Sparkles, Trophy, Activity,
  ArrowUpRight, ArrowDownRight, Target, FileText, Globe2,
  Calendar, CheckSquare, Briefcase, TrendingUp, GripHorizontal,
  AlertTriangle, Layers, TrendingDown, ChevronDown, Clock, ArrowRight,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9334e6', '#00bcd4', '#ff9800'];

const KPI_ACCENTS: Record<string, string> = {
  totalSales: '#4f46e5',
  openDeals: '#10b981',
  winRate: '#f59e0b',
  pipelineValue: '#8b5cf6',
  weightedValue: '#06b6d4',
  avgDaysToClose: '#f43f5e',
};

const KPI_ICONS: Record<string, React.ElementType> = {
  totalSales: TrendingUp,
  openDeals: Briefcase,
  winRate: Trophy,
  pipelineValue: Target,
  weightedValue: Activity,
  avgDaysToClose: Clock,
};

const WIDE_CHARTS = new Set(['wonDealsTrend', 'revenueForecast', 'geoMap']);

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    padding: '8px 12px',
  },
  itemStyle: { color: '#0f172a', fontSize: '12px' },
  cursor: { stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' },
};

// ─── Drag & Drop Wrapper ─────────────────────────────────────────────────────

function SortableItem(props: any) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: props.id, disabled: !props.isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`${props.className} relative group h-full`}>
      {props.isEditMode && (
        <div className="absolute top-2 right-2 z-20">
          <div
            {...attributes}
            {...listeners}
            className="bg-muted p-1 rounded-md hover:bg-muted/80 transition-colors shadow-sm cursor-grab active:cursor-grabbing"
          >
            <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
      {props.children}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ═════════════════════════════════════════════════════════════════════════════
// Dashboard Component
// ═════════════════════════════════════════════════════════════════════════════

// Shared chart wrapper
const ChartCard = ({ title, icon, viewAllLink, children, className = '', index, isEditMode }: any) => (
  <div
    className={cn(
      "dashboard-card overflow-hidden flex flex-col h-full dashboard-stagger",
      isEditMode && "ring-2 ring-primary/20",
      className
    )}
    style={{ animationDelay: `${(index + 6) * 70}ms` }}
  >
    <div className="dashboard-card-header">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-muted/60 flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      {viewAllLink && (
        <Link
          to={viewAllLink}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
    <div className="dashboard-card-body flex-1 relative" style={{ zIndex: 0 }}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  </div>
);

// Geographic Coordinate Dictionary (for instant local resolution of popular locations)
const GEO_COORDS: Record<string, { coords: [number, number]; zoom: number }> = {
  // Countries
  'india': { coords: [20.5937, 78.9629], zoom: 4 },
  'usa': { coords: [37.0902, -95.7129], zoom: 4 },
  'united states': { coords: [37.0902, -95.7129], zoom: 4 },
  'united states of america': { coords: [37.0902, -95.7129], zoom: 4 },
  'uae': { coords: [23.4241, 53.8478], zoom: 6 },
  'united arab emirates': { coords: [23.4241, 53.8478], zoom: 6 },
  
  // States (India)
  'tamil nadu': { coords: [11.1271, 78.6569], zoom: 7 },
  'tamilnau': { coords: [11.1271, 78.6569], zoom: 7 },
  'karnataka': { coords: [15.3173, 75.7139], zoom: 7 },
  'maharashtra': { coords: [19.7515, 75.7139], zoom: 7 },
  'kerala': { coords: [10.8505, 76.2711], zoom: 7 },
  'delhi': { coords: [28.7041, 77.1025], zoom: 9 },

  // Districts / Regions (Tamil Nadu)
  'chennai': { coords: [13.0827, 80.2707], zoom: 9 },
  'coimbatore': { coords: [11.0168, 76.9558], zoom: 10 },
  'salem': { coords: [11.6643, 78.1460], zoom: 10 },
  'madurai': { coords: [9.9252, 78.1198], zoom: 10 },

  // Cities
  'chennai city': { coords: [13.0827, 80.2707], zoom: 11 },
  'coimbatore city': { coords: [11.0168, 76.9558], zoom: 11 },
  'salem city': { coords: [11.6643, 78.1460], zoom: 11 },
  'bangalore': { coords: [12.9716, 77.5946], zoom: 10 },
  'bengaluru': { coords: [12.9716, 77.5946], zoom: 10 },
  'mumbai': { coords: [19.0760, 72.8777], zoom: 10 },
};

// React Leaflet helper to dynamically update map zoom/center
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
}

// Interactive Map Component with Shading & Drill-Down
const InteractiveGeographicMap = ({ leads, isEditMode, index }: { leads: any[], isEditMode: boolean, index: number }) => {
  const [mapLevel, setMapLevel] = useState<'country' | 'state' | 'district' | 'city'>('country');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  
  // Local coordinate cache
  const [resolvedCoords, setResolvedCoords] = useState<Record<string, [number, number]>>({});
  
  // Normalize helper
  const normalize = (val: string) => val ? val.trim().toLowerCase() : '';
  
  // Extract unique filter lists dynamically from leads
  const countries = useMemo(() => ['All', ...new Set(leads.map(l => l.country).filter(Boolean))], [leads]);
  const states = useMemo(() => {
    const filtered = selectedCountry === 'All' ? leads : leads.filter(l => l.country === selectedCountry);
    return ['All', ...new Set(filtered.map(l => l.state).filter(Boolean))];
  }, [leads, selectedCountry]);
  const cities = useMemo(() => {
    let filtered = leads;
    if (selectedCountry !== 'All') filtered = filtered.filter(l => l.country === selectedCountry);
    if (selectedState !== 'All') filtered = filtered.filter(l => l.state === selectedState);
    return ['All', ...new Set(filtered.map(l => l.city).filter(Boolean))];
  }, [leads, selectedCountry, selectedState]);
  
  // Grouping leads and locating coords based on level
  const aggregatedLocations = useMemo(() => {
    // Filter leads first based on country/state/city dropdown selectors
    let filteredLeads = leads;
    if (selectedCountry !== 'All') filteredLeads = filteredLeads.filter(l => l.country === selectedCountry);
    if (selectedState !== 'All') filteredLeads = filteredLeads.filter(l => l.state === selectedState);
    if (selectedCity !== 'All') filteredLeads = filteredLeads.filter(l => l.city === selectedCity);
    
    // Group leads by mapLevel
    const groups: Record<string, { count: number; context: string }> = {};
    filteredLeads.forEach(l => {
      let key = '';
      let context = '';
      if (mapLevel === 'country') {
        key = l.country || 'India';
        context = '';
      } else if (mapLevel === 'state') {
        key = l.state || 'Tamil Nadu';
        context = l.country || '';
      } else if (mapLevel === 'district') {
        key = l.district || l.city || 'Coimbatore';
        context = `${l.state || ''}, ${l.country || ''}`;
      } else {
        key = l.city || 'Coimbatore';
        context = `${l.state || ''}, ${l.country || ''}`;
      }
      
      if (!groups[key]) {
        groups[key] = { count: 0, context };
      }
      groups[key].count += 1;
    });
    
    // Convert to location objects
    return Object.entries(groups).map(([name, data]) => ({
      name,
      leads: data.count,
      context: data.context
    }));
  }, [leads, mapLevel, selectedCountry, selectedState, selectedCity]);

  // Geocoding coordinates cache in localStorage
  useEffect(() => {
    const resolveCoords = async () => {
      const newCoords = { ...resolvedCoords };
      let hasUpdate = false;
      
      for (const loc of aggregatedLocations) {
        const key = normalize(loc.name);
        if (GEO_COORDS[key]) continue; // static coords exist
        if (newCoords[key]) continue; // already in state
        
        // Check localStorage
        const cached = localStorage.getItem(`geo-coords-${key}`);
        if (cached) {
          newCoords[key] = JSON.parse(cached);
          hasUpdate = true;
          continue;
        }
        
        // Fetch from OSM Nominatim with a small delay to prevent rate limit
        try {
          const query = loc.context ? `${loc.name}, ${loc.context}` : loc.name;
          await new Promise(r => setTimeout(r, 250));
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            localStorage.setItem(`geo-coords-${key}`, JSON.stringify(coords));
            newCoords[key] = coords;
            hasUpdate = true;
          }
        } catch (e) {
          console.error('Nominatim fetch failed:', e);
        }
      }
      
      if (hasUpdate) {
        setResolvedCoords(newCoords);
      }
    };
    
    resolveCoords();
  }, [aggregatedLocations]);

  // Calculate coordinates for rendering markers
  const markers = useMemo(() => {
    return aggregatedLocations.map(loc => {
      const key = normalize(loc.name);
      let coords: [number, number] | null = null;
      if (GEO_COORDS[key]) {
        coords = GEO_COORDS[key].coords;
      } else if (resolvedCoords[key]) {
        coords = resolvedCoords[key];
      }
      return coords ? { ...loc, coords } : null;
    }).filter(Boolean) as Array<typeof aggregatedLocations[0] & { coords: [number, number] }>;
  }, [aggregatedLocations, resolvedCoords]);

  // Determine current map center and zoom level dynamically
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // default India
  const [mapZoom, setMapZoom] = useState<number>(4);

  // Sync map center/zoom when level/filters change
  useEffect(() => {
    if (selectedCity !== 'All') {
      const key = normalize(selectedCity);
      if (GEO_COORDS[key]) {
        setMapCenter(GEO_COORDS[key].coords);
        setMapZoom(GEO_COORDS[key].zoom);
      } else if (resolvedCoords[key]) {
        setMapCenter(resolvedCoords[key]);
        setMapZoom(11);
      }
    } else if (selectedState !== 'All') {
      const key = normalize(selectedState);
      if (GEO_COORDS[key]) {
        setMapCenter(GEO_COORDS[key].coords);
        setMapZoom(GEO_COORDS[key].zoom);
      } else if (resolvedCoords[key]) {
        setMapCenter(resolvedCoords[key]);
        setMapZoom(7);
      }
    } else if (selectedCountry !== 'All') {
      const key = normalize(selectedCountry);
      if (GEO_COORDS[key]) {
        setMapCenter(GEO_COORDS[key].coords);
        setMapZoom(GEO_COORDS[key].zoom);
      } else if (resolvedCoords[key]) {
        setMapCenter(resolvedCoords[key]);
        setMapZoom(5);
      }
    } else {
      // Default level based center
      if (mapLevel === 'country') {
        setMapCenter([20.5937, 78.9629]); // India
        setMapZoom(4);
      } else if (mapLevel === 'state' && selectedCountry !== 'All') {
        const key = normalize(selectedCountry);
        if (GEO_COORDS[key]) setMapCenter(GEO_COORDS[key].coords);
        setMapZoom(6);
      }
    }
  }, [mapLevel, selectedCountry, selectedState, selectedCity, resolvedCoords]);

  // Drill down when clicking on map elements
  const handleMarkerClick = (loc: any) => {
    if (mapLevel === 'country') {
      setSelectedCountry(loc.name);
      setSelectedState('All');
      setSelectedCity('All');
      setMapLevel('state');
    } else if (mapLevel === 'state') {
      setSelectedState(loc.name);
      setSelectedCity('All');
      setMapLevel('district');
    } else if (mapLevel === 'district') {
      setMapLevel('city');
    }
  };

  // Breadcrumbs actions
  const handleBreadcrumbClick = (targetLevel: 'country' | 'state' | 'district' | 'city') => {
    setMapLevel(targetLevel);
    if (targetLevel === 'country') {
      setSelectedCountry('All');
      setSelectedState('All');
      setSelectedCity('All');
    } else if (targetLevel === 'state') {
      setSelectedState('All');
      setSelectedCity('All');
    } else if (targetLevel === 'district') {
      setSelectedCity('All');
    }
  };

  // Styling density circles
  const getDensityColor = (count: number) => {
    if (count <= 2) return '#3b82f6'; // Sleek blue
    if (count <= 5) return '#6366f1'; // Indigo
    return '#ec4899'; // Vibrant pink/magenta
  };

  const getDensityRadius = (count: number) => {
    return Math.min(40, Math.max(12, 10 + count * 4));
  };

  return (
    <ChartCard index={index} isEditMode={isEditMode} title="Geographic Lead Density" icon={<Globe2 className="h-3.5 w-3.5 text-blue-500" />}>
      <div className="flex flex-col h-[320px] w-full relative">
        {/* Breadcrumbs and Level selectors */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-2 bg-muted/20 gap-2 flex-wrap">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <span 
              className={`hover:text-foreground cursor-pointer transition-colors ${mapLevel === 'country' && 'text-foreground font-bold'}`} 
              onClick={() => handleBreadcrumbClick('country')}
            >
              World
            </span>
            {selectedCountry !== 'All' && (
              <>
                <ChevronRight className="h-2.5 w-2.5" />
                <span 
                  className={`hover:text-foreground cursor-pointer transition-colors ${mapLevel === 'state' && 'text-foreground font-bold'}`}
                  onClick={() => handleBreadcrumbClick('state')}
                >
                  {selectedCountry}
                </span>
              </>
            )}
            {selectedState !== 'All' && (
              <>
                <ChevronRight className="h-2.5 w-2.5" />
                <span 
                  className={`hover:text-foreground cursor-pointer transition-colors ${mapLevel === 'district' && 'text-foreground font-bold'}`}
                  onClick={() => handleBreadcrumbClick('district')}
                >
                  {selectedState}
                </span>
              </>
            )}
          </div>

          {/* Level Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border/30">
            {(['country', 'state', 'district', 'city'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setMapLevel(lvl)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
                  mapLevel === lvl 
                    ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-border/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters inside Map Widget */}
        <div className="grid grid-cols-3 gap-1.5 px-4 py-1.5 border-b border-border/40 bg-muted/10">
          <div>
            <label className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider block">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedState('All');
                setSelectedCity('All');
                setMapLevel(e.target.value === 'All' ? 'country' : 'state');
              }}
              className="w-full text-[10px] bg-background border border-border/50 rounded px-1.5 py-0.5 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider block">State</label>
            <select
              value={selectedState}
              disabled={selectedCountry === 'All'}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('All');
                setMapLevel(e.target.value === 'All' ? 'state' : 'district');
              }}
              className="w-full text-[10px] bg-background border border-border/50 rounded px-1.5 py-0.5 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
            >
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider block">City</label>
            <select
              value={selectedCity}
              disabled={selectedState === 'All'}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setMapLevel(e.target.value === 'All' ? 'district' : 'city');
              }}
              className="w-full text-[10px] bg-background border border-border/50 rounded px-1.5 py-0.5 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
            >
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Map Rendering Container */}
        <div className="flex-1 w-full rounded-b-md overflow-hidden relative" style={{ zIndex: 1 }}>
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((loc, i) => (
              <CircleMarker 
                key={i} 
                center={loc.coords}
                radius={getDensityRadius(loc.leads)}
                pathOptions={{
                  fillColor: getDensityColor(loc.leads),
                  fillOpacity: 0.55,
                  color: getDensityColor(loc.leads),
                  weight: 1.5,
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(loc)
                }}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <div className="font-bold text-foreground border-b border-border pb-1 mb-1">{loc.name}</div>
                    <div className="flex justify-between gap-4 text-muted-foreground text-[10px] mt-1">
                      <span>Active Leads:</span>
                      <span className="font-semibold text-foreground">{loc.leads}</span>
                    </div>
                    {mapLevel !== 'city' && (
                      <div className="text-[8px] text-blue-500 font-semibold mt-1.5 hover:underline cursor-pointer">
                        Click on shade to zoom & drill down
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Floating Density Legend */}
          <div className="absolute bottom-2 right-2 z-[1000] bg-background/95 backdrop-blur-sm border border-border px-2 py-1.5 rounded-md shadow-md text-[8px] font-sans flex flex-col gap-1 pointer-events-none">
            <div className="font-semibold border-b border-border pb-0.5 mb-0.5 text-muted-foreground uppercase text-[7px] tracking-wider">Density</div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#3b82f6', opacity: 0.7 }} />
              <span>Low (1-2 leads)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#6366f1', opacity: 0.7 }} />
              <span>Medium (3-5 leads)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#ec4899', opacity: 0.7 }} />
              <span>High (5+ leads)</span>
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: rawLeads = [] } = useLeads();
  const { data: quotations = [] } = useQuotations();  // prefetch
  const { data: rawDeals = [] } = useDeals();
  const { data: products = [] } = useProducts();       // prefetch
  const { data: tasks = [] } = useTasks();
  const { data: meetings = [] } = useMeetings();
  const { data: settings } = useCompanySettings();
  const { allProfiles } = useTeamHierarchy();
  const currency = settings?.currency || '₹';
  const { insights, nextBestActions, isLoading: aiLoading, isServiceDown } = useAIInsights();

  // ── State ──────────────────────────────────────────────────────────────────

  const [isEditMode, setIsEditMode] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [filterState, setFilterState] = useState<string>('All');
  const [filterCity, setFilterCity] = useState<string>('All');

  const leads = useMemo(() => {
    return rawLeads.filter(l => 
      (filterState === 'All' || l.state === filterState) &&
      (filterCity === 'All' || l.city === filterCity)
    );
  }, [rawLeads, filterState, filterCity]);

  const deals = useMemo(() => {
    return rawDeals.filter(d => {
      const l = rawLeads.find(lead => lead.id === d.lead_id);
      return (filterState === 'All' || l?.state === filterState) &&
             (filterCity === 'All' || l?.city === filterCity);
    });
  }, [rawDeals, rawLeads, filterState, filterCity]);

  const wonDeals = useMemo(() => deals.filter(d => d.stage === 'won'), [deals]);
  const { forecast, isLoading: forecastLoading, hasEnoughData } = useRevenueForecast(wonDeals);

  // Real-time activities
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  });

  const [kpiOrder, setKpiOrder] = useState([
    'totalSales', 'openDeals', 'winRate', 'pipelineValue', 'weightedValue', 'avgDaysToClose'
  ]);

  const [chartOrder, setChartOrder] = useState([
    'goalTracker', 'geoMap', 'wonDealsTrend', 'conversionFunnel',
    'salesPipeline', 'dealsProjection', 'upcomingMeetings', 'leaderboard', 'dealLossReasons',
    'leadSourcePerformance', 'upcomingTasks', 'stalledDeals',
    'recentActivity', 'revenueForecast'
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Data Computation ──────────────────────────────────────────────────────

  const pipelineMetrics = useMemo(() => {
    const from = dateRange?.from || new Date(0);
    const to = dateRange?.to || new Date(2100, 0, 1);
    const activeDeals = deals.filter(d => d.stage !== 'lost' && d.stage !== 'won');
    const wonDealsInPeriod = deals.filter(d =>
      d.stage === 'won' && d.won_date &&
      isWithinInterval(parseISO(d.won_date), { start: from, end: to })
    );
    const lostDealsInPeriod = deals.filter(d =>
      d.stage === 'lost' && d.lost_date &&
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
      winRate, avgDaysToClose, pipelineValue,
      openDealsCount: activeDeals.length,
      weightedValue,
    };
  }, [deals, dateRange]);

  const kpiTrends = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const lastMonthStart = subMonths(currentMonthStart, 1);
    const currentMonthWon = deals.filter(d => d.stage === 'won' && d.won_date && parseISO(d.won_date) >= currentMonthStart);
    const lastMonthWon = deals.filter(d => d.stage === 'won' && d.won_date && parseISO(d.won_date) >= lastMonthStart && parseISO(d.won_date) < currentMonthStart);
    const currentRev = currentMonthWon.reduce((s, d) => s + (d.deal_value || 0), 0);
    const lastRev = lastMonthWon.reduce((s, d) => s + (d.deal_value || 0), 0);
    const revTrend = lastRev > 0 ? ((currentRev - lastRev) / lastRev) * 100 : 0;
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

  const pipelineData = useMemo(() => {
    const stages = ['qualified', 'proposal', 'negotiation', 'won', 'lost'];
    return stages.map(stage => ({
      name: stage.charAt(0).toUpperCase() + stage.slice(1),
      value: deals.filter(d => d.stage === stage).length
    })).filter(d => d.value > 0);
  }, [deals]);

  const wonDealsTrend = useMemo(() => {
    const data = [];
    const endDate = dateRange?.to || new Date();
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(endDate, i);
      const monthDeals = deals.filter(d =>
        d.stage === 'won' && d.won_date && isSameMonth(parseISO(d.won_date), date)
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
        d.expected_close_date && isSameMonth(parseISO(d.expected_close_date), date)
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
    return Object.keys(reasons).map(key => ({ name: key, value: reasons[key] }));
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

  const stalledDeals = useMemo(() => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    return deals.filter(
      d => !['won', 'lost'].includes(d.stage) &&
        d.updated_at && new Date(d.updated_at) < fiveDaysAgo
    ).slice(0, 5);
  }, [deals]);

  const leadSourceData = useMemo(() => {
    const groups: Record<string, { total: number; converted: number }> = {};
    leads.forEach(lead => {
      const bucket =
        lead.status === 'won' ? 'Won Leads' :
          lead.status === 'qualified' ? 'Qualified' :
            lead.status === 'proposal' ? 'Proposal' :
              lead.status === 'contacted' ? 'Contacted' :
                lead.status === 'lost' ? 'Lost' : 'New';
      if (!groups[bucket]) groups[bucket] = { total: 0, converted: 0 };
      groups[bucket].total++;
      if (lead.status === 'won' || lead.status === 'qualified') groups[bucket].converted++;
    });
    return Object.entries(groups)
      .map(([name, v]) => ({
        name, total: v.total, converted: v.converted,
        rate: v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [leads]);

  const leaderboardData = useMemo(() => {
    const from = dateRange?.from || new Date(0);
    const to = dateRange?.to || new Date(2100, 0, 1);
    const wonDealsInPeriod = deals.filter(d =>
      d.stage === 'won' && d.won_date &&
      isWithinInterval(parseISO(d.won_date), { start: from, end: to })
    );
    const revenueByUser = wonDealsInPeriod.reduce((acc, deal) => {
      const userId = deal.created_by;
      if (!userId) return acc;
      acc[userId] = (acc[userId] || 0) + (deal.deal_value || 0);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(revenueByUser)
      .map(([userId, revenue]) => {
        const profile = allProfiles.find(p => p.user_id === userId);
        return { id: userId, name: profile?.full_name || profile?.email || 'Unknown User', revenue };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [deals, dateRange, allProfiles]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  // ── KPI Card Renderer (Zoho-style) ────────────────────────────────────────

  const renderKpiCard = (id: string, index: number) => {
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
      case 'weightedValue':
        title = 'Forecast Revenue';
        value = `${currency}${Math.round(pipelineMetrics.weightedValue).toLocaleString('en-IN')}`;
        trend = 'Expected value based on prob.';
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

    const accent = KPI_ACCENTS[id] || '#4f46e5';
    const IconComp = KPI_ICONS[id] || Activity;

    return (
      <div
        className={cn(
          "dashboard-card overflow-hidden dashboard-stagger flex flex-col h-full",
          isEditMode && "ring-2 ring-primary/20"
        )}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Accent top bar */}
        <div className="h-[3px] flex-none" style={{ backgroundColor: accent }} />

        <div className="p-4 flex items-start justify-between gap-2 flex-1">
          <div className="space-y-0.5 min-w-0 flex flex-col h-full flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
              {value}
            </p>
            <div className="flex items-center gap-1 mt-auto pt-2">
              {trend.includes('%') ? (
                <span className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                  isPositive
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                )}>
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {trend}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">{trend}</span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 flex-shrink-0">
            <IconComp className="h-4 w-4" style={{ color: accent }} />
          </div>
        </div>
      </div>
    );
  };

  // ── Chart Card Renderer (Zoho-style) ──────────────────────────────────────

  const renderChartCard = (id: string, index: number) => {
    switch (id) {
      /* ── Geographic Map (Leaflet) ──────────────────────────────────── */
      case 'geoMap': {
        return (
          <InteractiveGeographicMap 
            leads={rawLeads} 
            isEditMode={isEditMode} 
            index={index} 
          />
        );
      }
      /* ── Revenue Goal Tracker ──────────────────────────────────────── */
      case 'goalTracker': {
        const goal = settings?.monthly_goal || 1000000;
        const currentRevenue = pipelineMetrics.totalSales;
        const progress = Math.min((currentRevenue / goal) * 100, 100);
        
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Target vs Actual" icon={<Target className="h-3.5 w-3.5 text-blue-500" />}>
            <div className="flex flex-col h-full items-center justify-center p-4 pt-0 pb-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" className="text-muted" strokeWidth="12" />
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#3b82f6" strokeWidth="12"
                    strokeDasharray={351.858} strokeDashoffset={351.858 - (351.858 * progress) / 100}
                    className="transition-all duration-1000 ease-out drop-shadow-sm" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold">{Math.round(progress)}%</span>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[13px] font-semibold text-foreground">{currency}{currentRevenue.toLocaleString('en-IN')} <span className="text-muted-foreground font-normal">/ {currency}{goal.toLocaleString('en-IN')}</span></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Revenue Goal Progress</p>
              </div>
            </div>
          </ChartCard>
        );
      }

      /* ── Upcoming Meetings ─────────────────────────────────────────── */
      case 'upcomingMeetings': {
        const upcoming = meetings
          .filter(m => new Date(m.start_time) >= new Date())
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .slice(0, 4);

        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Upcoming Meetings" icon={<Calendar className="h-3.5 w-3.5 text-orange-500" />} viewAllLink="/meetings">
            {upcoming.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-xs">No upcoming meetings</div>
            ) : (
              <div className="flex flex-col gap-2 h-[250px] overflow-y-auto px-4 pb-4">
                {upcoming.map(meeting => (
                  <div key={meeting.id} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <p className="text-[12px] font-semibold text-foreground truncate">{meeting.title}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(meeting.start_time), "MMM d, h:mm a")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        );
      }

      /* ── Lead Conversion Funnel ────────────────────────────────────── */
      case 'conversionFunnel': {
        const totalLeads = leads.length;
        const totalActiveDeals = deals.filter(d => d.stage !== 'lost' && d.stage !== 'won').length;
        const totalWonDeals = deals.filter(d => d.stage === 'won').length;
        const maxVal = Math.max(totalLeads, 1);
        
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Conversion Funnel" icon={<TrendingDown className="h-3.5 w-3.5 text-pink-500" />}>
            <div className="flex flex-col justify-center h-[250px] gap-6 px-5 pb-6">
              {[
                { label: 'Total Leads', count: totalLeads, color: 'bg-blue-500' },
                { label: 'Active Deals', count: totalActiveDeals, color: 'bg-purple-500' },
                { label: 'Won Deals', count: totalWonDeals, color: 'bg-emerald-500' }
              ].map(step => {
                const width = Math.max((step.count / maxVal) * 100, 5);
                return (
                  <div key={step.label} className="flex flex-col items-center">
                    <div className="w-full flex justify-between text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">
                      <span>{step.label}</span>
                      <span className="text-foreground">{step.count}</span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden flex justify-center">
                      <div className={`${step.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        );
      }

      /* ── Revenue Trend ─────────────────────────────────────────────── */
      case 'wonDealsTrend':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Revenue Trend" icon={<TrendingUp className="h-3.5 w-3.5 text-indigo-500" />}>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wonDealsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <RechartsTooltip {...TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="value" stroke="#1a73e8" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        );

      /* ── Pipeline Distribution ─────────────────────────────────────── */
      case 'salesPipeline':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Pipeline by Stage" icon={<Layers className="h-3.5 w-3.5 text-emerald-500" />} viewAllLink="/pipeline">
            <div className="h-[250px] w-full pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="40%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={2} cornerRadius={4}
                    dataKey="value" stroke="none"
                  >
                    {pipelineData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip {...TOOLTIP_STYLE} />
                  <Legend
                    layout="vertical" verticalAlign="middle" align="right"
                    iconSize={10} iconType="circle"
                    wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--foreground))', right: 0 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        );

      /* ── Deal Forecast ─────────────────────────────────────────────── */
      case 'dealsProjection':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Deal Forecast" icon={<Target className="h-3.5 w-3.5 text-amber-500" />} viewAllLink="/deals">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealsProjection} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                  <RechartsTooltip cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        );

      /* ── Deal Loss Reasons ─────────────────────────────────────────── */
      case 'dealLossReasons':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Deal Loss Reasons" icon={<TrendingDown className="h-3.5 w-3.5 text-rose-500" />}>
            <div className="h-[250px] w-full">
              {lossReasonsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lossReasonsData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }} width={90} />
                    <RechartsTooltip cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} {...TOOLTIP_STYLE} />
                    <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No lost deals data</div>
              )}
            </div>
          </ChartCard>
        );

      /* ── Sales Leaderboard (with progress bars) ────────────────────── */
      case 'leaderboard':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Sales Leaderboard" icon={<Trophy className="h-3.5 w-3.5 text-amber-500" />}>
            <div className="space-y-4">
              {leaderboardData.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">No won deals in this period</p>
              ) : (
                leaderboardData.map((u, i) => {
                  const maxRev = leaderboardData[0]?.revenue || 1;
                  const pct = Math.round((u.revenue / maxRev) * 100);
                  const isTop = i === 0;
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                        isTop
                          ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn("text-[13px] truncate", isTop ? "font-semibold" : "font-medium")}>{u.name}</span>
                          <span className={cn("text-[12px] font-semibold flex-shrink-0 ml-2",
                            isTop && "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {currency}{u.revenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700",
                              isTop ? "bg-amber-500" : "bg-primary/40"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ChartCard>
        );

      /* ── Upcoming Tasks ────────────────────────────────────────────── */
      case 'upcomingTasks':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Upcoming Tasks" icon={<CheckSquare className="h-3.5 w-3.5 text-sky-500" />} viewAllLink="/tasks">
            <div className="space-y-1">
              {upcomingTasksData.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">No upcoming tasks</p>
              ) : (
                upcomingTasksData.map(task => (
                  <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      task.priority === 'high' || task.priority === 'urgent' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No date'}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded capitalize flex-shrink-0",
                      task.priority === 'urgent' && "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
                      task.priority === 'high' && "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                      task.priority === 'medium' && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                      task.priority === 'low' && "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    )}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        );

      /* ── Recent Activity (Timeline) ────────────────────────────────── */
      case 'recentActivity':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Recent Activity" icon={<Activity className="h-3.5 w-3.5 text-muted-foreground" />}>
            <div className="relative">
              {recentActivities.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                recentActivities.map((activity: any, i: number) => {
                  let dotColor = 'bg-blue-500';
                  if (activity.entity_type === 'deal') dotColor = 'bg-emerald-500';
                  if (activity.entity_type === 'quotation') dotColor = 'bg-violet-500';

                  return (
                    <div key={activity.id} className="relative pl-6 pb-5 last:pb-0">
                      {/* Vertical connector line */}
                      {i < recentActivities.length - 1 && (
                        <div className="absolute left-[7px] top-[14px] bottom-0 w-px bg-border" />
                      )}
                      {/* Dot */}
                      <div className={cn(
                        "absolute left-0 top-[5px] w-[15px] h-[15px] rounded-full border-[3px] border-card",
                        dotColor
                      )} />
                      <div>
                        <p className="text-[13px] text-foreground leading-snug">
                          <span className="font-semibold">{activity.performed_by_name || 'System'}</span>
                          {' '}{activity.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ChartCard>
        );

      /* ── Stalled Deals ─────────────────────────────────────────────── */
      case 'stalledDeals':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Deals Needing Attention" icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />} viewAllLink="/pipeline">
            <div className="space-y-2">
              {stalledDeals.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-8">All deals are active.</p>
              ) : (
                stalledDeals.map(deal => (
                  <div key={deal.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{deal.lead?.company_name || 'Unknown'}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{deal.stage} · {currency}{(deal.deal_value || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <Link to={`/deals/${deal.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-700 flex-none">
                        Follow Up
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        );

      /* ── Lead Source Performance ────────────────────────────────────── */
      case 'leadSourcePerformance':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="Lead Sources" icon={<Layers className="h-3.5 w-3.5 text-violet-500" />} viewAllLink="/leads">
            {leadSourceData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-xs">No lead source data</div>
            ) : (
              <div className="h-[250px] w-full pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      cx="40%" cy="50%"
                      outerRadius={85}
                      paddingAngle={1}
                      dataKey="total" stroke="none"
                      nameKey="name"
                    >
                      {leadSourceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip {...TOOLTIP_STYLE} />
                    <Legend
                      layout="vertical" verticalAlign="middle" align="right"
                      iconSize={10} iconType="circle"
                      wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--foreground))', right: 0 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        );

      /* ── AI Revenue Forecast ───────────────────────────────────────── */
      case 'revenueForecast':
        return (
          <ChartCard index={index} isEditMode={isEditMode} title="AI Revenue Forecast" icon={<Sparkles className="h-3.5 w-3.5 text-indigo-500" />}>
            <div className="flex flex-col h-full gap-4">
              {!hasEnoughData ? (
                <p className="text-[13px] text-muted-foreground text-center py-6">Need at least 2 months of won deals to generate forecast.</p>
              ) : forecastLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
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
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" fontSize={9} axisLine={false} tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={v => v.slice(5)} interval={6} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={v => `${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                          <RechartsTooltip {...TOOLTIP_STYLE}
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
          </ChartCard>
        );

      default: return null;
    }
  };

  // ── Derived values for header ──────────────────────────────────────────────

  const userName = user?.email?.split('@')[0] || 'there';
  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <AppLayout>
      <div className="space-y-5 font-sans pb-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {getGreeting()}, {userName}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">{todayStr}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All States</SelectItem>
                <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Cities</SelectItem>
                <SelectItem value="Chennai">Chennai</SelectItem>
                <SelectItem value="Coimbatore">Coimbatore</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5 text-xs shadow-sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? <Save className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
              {isEditMode ? 'Save Layout' : 'Customize'}
            </Button>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: 'Add Lead', href: '/leads?new=true', icon: PlusCircle, color: 'text-foreground' },
            { label: 'Create Deal', href: '/deals', icon: Briefcase, color: 'text-emerald-600' },
            { label: 'Schedule Meeting', href: '/meetings?new=true', icon: Calendar, color: 'text-violet-600' },
            { label: 'Create Task', href: '/tasks?new=true', icon: CheckSquare, color: 'text-blue-600' },
            { label: 'Generate Quote', href: '/quotations?new=true', icon: FileText, color: 'text-amber-600' },
          ].map(action => (
            <Link
              key={action.label}
              to={action.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-[12px] font-medium text-foreground hover:bg-accent hover:border-border/80 transition-colors whitespace-nowrap shadow-sm flex-none"
            >
              <action.icon className={cn("h-3.5 w-3.5", action.color)} />
              {action.label}
            </Link>
          ))}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={(event) => setActiveId(event.active.id as string)}
        >

          {/* ── KPI Strip ──────────────────────────────────────────────── */}
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy} disabled={!isEditMode}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              {kpiOrder.map((id, idx) => (
                <SortableItem key={id} id={id} className="h-full" isEditMode={isEditMode}>
                  {renderKpiCard(id, idx)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>

          {/* ── AI Insights & Actions (Collapsible) ────────────────────── */}
          <div className="dashboard-card overflow-hidden mt-5 dashboard-stagger" style={{ animationDelay: '400ms' }}>
            <button
              onClick={() => setAiExpanded(!aiExpanded)}
              className="w-full dashboard-card-header hover:bg-accent/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex-shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <h3 className="text-[13px] font-semibold text-foreground">AI Insights & Recommended Actions</h3>
                {aiLoading && <span className="text-[11px] text-indigo-400 animate-pulse ml-2">Analyzing...</span>}
                {isServiceDown && <span className="text-[11px] text-rose-400 ml-2">AI Offline</span>}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                aiExpanded && "rotate-180"
              )} />
            </button>

            {aiExpanded && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-border/50">
                {/* Insights */}
                <div className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 mb-3">Insights</p>
                  {aiLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-5 bg-muted rounded animate-pulse" />)}
                    </div>
                  ) : isServiceDown ? (
                    <p className="text-[13px] text-rose-600/80 dark:text-rose-400/80">
                      Could not reach the AI service. Make sure it is running on{' '}
                      <code className="bg-rose-50 dark:bg-rose-900/30 px-1 rounded text-[11px]">localhost:8000</code>.
                    </p>
                  ) : insights.length > 0 ? (
                    <div className="space-y-2.5">
                      {insights.slice(0, 3).map((insight) => (
                        <div key={insight.id} className="text-[13px] text-foreground/80 leading-relaxed flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span>{insight.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">Gathering data to generate insights...</p>
                  )}
                </div>

                {/* Next Best Actions */}
                <div className="p-5 border-t lg:border-t-0 border-border/50">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-3">Recommended Actions</p>
                  {aiLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                    </div>
                  ) : nextBestActions.length > 0 ? (
                    <div className="space-y-2">
                      {nextBestActions.slice(0, 3).map((action) => (
                        <div key={action.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                          <div className="min-w-0">
                            <span className="text-[13px] font-medium text-foreground">{action.action}</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{action.reason}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] border border-border flex-none" asChild>
                            <Link to={`/${action.entityType}s/${action.entityId}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">No urgent actions recommended right now.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Charts Grid ────────────────────────────────────────────── */}
          <ErrorBoundary>
            <SortableContext items={chartOrder} strategy={rectSortingStrategy} disabled={!isEditMode}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5 items-stretch">
              {chartOrder.map((id, idx) => (
                <SortableItem
                  key={id}
                  id={id}
                  className={cn(
                    "h-full",
                    WIDE_CHARTS.has(id) && "md:col-span-2"
                  )}
                  isEditMode={isEditMode}
                >
                  {renderChartCard(id, idx)}
                </SortableItem>
              ))}
            </div>
            </SortableContext>
          </ErrorBoundary>

          <DragOverlay>
            {activeId ? (
              <Card className="opacity-90 w-full h-full bg-card shadow-2xl border border-primary/20 scale-[1.02] cursor-grabbing">
                <div className="py-3 px-5 border-b border-border">
                  <p className="text-sm font-medium">Moving Widget...</p>
                </div>
              </Card>
            ) : null}
          </DragOverlay>

        </DndContext>
      </div>
    </AppLayout>
  );
}
