import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lead } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building2, User, Mail, Phone, MapPin, FileText, Tag, CheckCircle2, XCircle, Trophy, UserPlus, ImagePlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';

const leadSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  contact_name: z.string().min(1, 'Contact name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']),
  notes: z.string().max(2000).optional(),
  lead_source: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  customer_requirement: z.string().max(2000).optional(),
  city: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  country: z.string().max(200).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  lead?: Lead | null;
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  disableEmailField?: boolean;
}

const statusBadgeClass: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-violet-50 text-violet-700 border-violet-200',
  proposal: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
};

// Hierarchical geographic database for India, US, UAE
const GEOGRAPHIC_DATA: Record<string, Record<string, string[]>> = {
  'India': {
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Salem', 'Madurai', 'Trichy', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Virudhunagar', 'Karur', 'Nilgiris', 'Kanyakumari', 'Namakkal'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Navi Mumbai', 'Kalyan', 'Solapur', 'Kolhapur'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Palakkad', 'Kottayam', 'Malappuram'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
  },
  'United States': {
    'California': ['Los Angeles County', 'San Diego County', 'Orange County', 'Santa Clara County', 'Alameda County', 'Sacramento County'],
    'Texas': ['Harris County', 'Dallas County', 'Tarrant County', 'Bexar County', 'Travis County'],
    'New York': ['New York County', 'Kings County', 'Queens County', 'Bronx County', 'Nassau County'],
  },
  'United Arab Emirates': {
    'Abu Dhabi': ['Abu Dhabi', 'Al Ain', 'Al Dhafra'],
    'Dubai': ['Dubai City', 'Hatta'],
    'Sharjah': ['Sharjah', 'Khor Fakkan', 'Kalba'],
  }
};

// Searchable Autocomplete Combobox
function SearchableSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: string[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(value);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="space-y-1 relative w-full">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">{label}</label>
      <Input
        placeholder={placeholder}
        value={search}
        disabled={disabled}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none"
      />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-md shadow-lg z-[200] divide-y divide-border/40">
          {filteredOptions.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setSearch(opt);
                setIsOpen(false);
              }}
              className="px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, color = "bg-primary/10 text-primary" }: { icon: React.ElementType; title: string; description?: string; color?: string }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-border/60">
      <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center shrink-0 shadow-sm`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold tracking-tight text-foreground/90 uppercase">{title}</h3>
        {description && <p className="text-[11px] text-muted-foreground font-medium leading-none">{description}</p>}
      </div>
    </div>
  );
}

export function LeadForm({ lead, onSubmit, onCancel, isLoading, disableEmailField }: LeadFormProps) {
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      company_name: lead?.company_name || '',
      contact_name: lead?.contact_name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      address: lead?.address || '',
      status: lead?.status || 'new',
      notes: lead?.notes || '',
      lead_source: lead?.lead_source || 'Website',
      website: lead?.website || '',
      customer_requirement: lead?.customer_requirement || '',
      city: lead?.city || '',
      district: lead?.district || '',
      state: lead?.state || '',
      country: lead?.country || '',
    },
  });

  const countryWatch = form.watch('country') || '';
  const stateWatch = form.watch('state') || '';

  const stateOptions = useMemo(() => {
    return GEOGRAPHIC_DATA[countryWatch] ? Object.keys(GEOGRAPHIC_DATA[countryWatch]) : [];
  }, [countryWatch]);

  const districtOptions = useMemo(() => {
    return (GEOGRAPHIC_DATA[countryWatch] && GEOGRAPHIC_DATA[countryWatch][stateWatch])
      ? GEOGRAPHIC_DATA[countryWatch][stateWatch]
      : [];
  }, [countryWatch, stateWatch]);

  const { allProfiles } = useTeamHierarchy();

  const company = form.watch('company_name');
  const contact = form.watch('contact_name');
  const status = form.watch('status');
  const initials = (company || contact || '??').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Tag className="h-3.5 w-3.5" />;
      case 'contacted': return <Phone className="h-3.5 w-3.5" />;
      case 'qualified': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'proposal': return <FileText className="h-3.5 w-3.5" />;
      case 'won': return <Tag className="h-3.5 w-3.5" />; // Using Tag as placeholder or Trophy if available
      case 'lost': return <XCircle className="h-3.5 w-3.5" />;
      default: return <Tag className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-3 -mr-3 space-y-6 py-2">
          {/* Identity preview - Interactive Header */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-gradient-to-r from-muted/50 to-transparent shadow-sm group">
            <div 
              className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-base font-bold shadow-md cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all relative overflow-hidden"
              onClick={() => document.getElementById('company_name_input')?.focus()}
            >
              {initials}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ImagePlus className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="text-base font-bold truncate tracking-tight text-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={() => document.getElementById('company_name_input')?.focus()}
              >
                {company || 'Click to set Company Name'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p 
                  className="text-[11px] text-muted-foreground font-medium truncate flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => document.getElementById('contact_name_input')?.focus()}
                >
                  <User className="h-3 w-3 opacity-70" /> {contact || 'Assign contact person'}
                </p>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <Badge 
                  variant="outline" 
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0 h-5 border-none cursor-pointer hover:opacity-80 transition-opacity ${statusBadgeClass[status] || ''}`}
                  onClick={() => document.getElementById('status_trigger')?.click()}
                >
                  {status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            {/* Business Details */}
            <div className="space-y-4">
              <SectionHeader 
                icon={Building2} 
                title="Business" 
                description="Entity information" 
                color="bg-blue-600/10 text-blue-600"
              />
              <div className="space-y-4 px-1">
                <FormField control={form.control} name="company_name" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Company Name *</FormLabel>
                    <FormControl><Input id="company_name_input" placeholder="Acme Corp" className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Website</FormLabel>
                    <FormControl><Input placeholder="https://www.acme.com" className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 flex items-center gap-1.5">Pipeline Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new"><div className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-blue-500" /> New Lead</div></SelectItem>
                        <SelectItem value="contacted"><div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-amber-500" /> Contacted</div></SelectItem>
                        <SelectItem value="qualified"><div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-500" /> Qualified</div></SelectItem>
                        <SelectItem value="proposal"><div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-indigo-500" /> Proposal</div></SelectItem>
                        <SelectItem value="won"><div className="flex items-center gap-2"><Trophy className="h-3.5 w-3.5 text-emerald-500" /> Won</div></SelectItem>
                        <SelectItem value="lost"><div className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" /> Lost</div></SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lead_source" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Lead Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Cold Call">Cold Call</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Advertising">Advertising</SelectItem>
                        <SelectItem value="Partner">Partner</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Primary Contact */}
            <div className="space-y-5">
              <SectionHeader 
                icon={User} 
                title="Contact" 
                description="Lead person" 
                color="bg-violet-600/10 text-violet-600"
              />
              <div className="space-y-4 px-1">
                <FormField control={form.control} name="contact_name" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Full Name *</FormLabel>
                    <FormControl><Input id="contact_name_input" placeholder="Jane Doe" className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 flex items-center gap-1.5">Work Email</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@acme.com" disabled={disableEmailField} className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Phone & Address */}
            <div className="space-y-4 md:col-span-2 border-t pt-6 border-border/40">
              <SectionHeader 
                icon={MapPin} 
                title="Contact Details & Location" 
                color="bg-amber-600/10 text-amber-600"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-1 mt-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Phone Number</FormLabel>
                    <FormControl><Input placeholder="+91 98765 43210" className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Physical Address</FormLabel>
                    <FormControl><Input placeholder="Street, Area, landmark..." className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Cascading Geographic Autocomplete Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 col-span-2 mt-2">
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <SearchableSelect
                          label="Country"
                          placeholder="Select/Type Country"
                          value={field.value || ''}
                          onChange={(val) => {
                            field.onChange(val);
                            form.setValue('state', '');
                            form.setValue('district', '');
                          }}
                          options={Object.keys(GEOGRAPHIC_DATA)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <SearchableSelect
                          label="State / Region"
                          placeholder="Select/Type State"
                          value={field.value || ''}
                          disabled={!countryWatch}
                          onChange={(val) => {
                            field.onChange(val);
                            form.setValue('district', '');
                          }}
                          options={stateOptions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="district" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <SearchableSelect
                          label="District"
                          placeholder="Select/Type District"
                          value={field.value || ''}
                          disabled={!stateWatch}
                          onChange={field.onChange}
                          options={districtOptions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">City (Manual)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter City" className="h-8 text-xs bg-background border-border/60 focus:border-primary transition-colors shadow-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </div>

            {/* Requirements & Notes */}
            <div className="space-y-4 md:col-span-2 border-t pt-6 border-border/40">
              <SectionHeader 
                icon={FileText} 
                title="Requirements & Notes" 
                color="bg-emerald-600/10 text-emerald-600"
              />
              <div className="space-y-4 px-1 mt-4">
                <FormField control={form.control} name="customer_requirement" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Customer Requirement</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Specific requirements mentioned by customer…" 
                        rows={2} 
                        className="bg-background border-border/60 text-xs focus:border-primary transition-colors shadow-none resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add internal context here…" 
                        rows={2} 
                        className="bg-background border-border/60 text-xs focus:border-primary transition-colors shadow-none resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer - Elevated with subtle shadow */}
        <div className="flex justify-end items-center gap-3 py-5 mt-auto border-t border-border/60 bg-background/80 backdrop-blur-sm shrink-0">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
            className="hover:bg-muted font-bold text-muted-foreground px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            size="sm"
            disabled={isLoading} 
            className="px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
          >
            {isLoading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
