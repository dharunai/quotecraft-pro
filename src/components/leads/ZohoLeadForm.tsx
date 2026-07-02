import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { Country, State, City } from 'country-state-city';

// Zod schema matching database constraints & Zoho lead layout
const leadSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  first_name: z.string().max(100).optional(),
  last_name: z.string().min(1, 'Last name is required').max(100),
  designation: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  secondary_email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  secondary_phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']),
  notes: z.string().max(2000).optional(),
  lead_source: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  customer_requirement: z.string().max(2000).optional(),
  industry: z.string().optional(),
  city: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  country: z.string().max(200).optional(),
  lead_owner: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Real Estate',
  'Manufacturing',
  'Consulting',
  'Hospitality',
  'Automotive',
  'Other'
];

// Searchable Autocomplete Combobox (No Icons)
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

  const filteredOptions = useMemo(() => {
    return options
      .filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 100);
  }, [options, search]);

  return (
    <div ref={containerRef} className="space-y-1 relative w-full">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
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
        className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none"
      />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-[200] divide-y divide-slate-100">
          {filteredOptions.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setSearch(opt);
                setIsOpen(false);
              }}
              className="px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ZohoLeadFormProps {
  onSubmit: (data: any, isSaveAndNew?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ZohoLeadForm({ onSubmit, onCancel, isLoading }: ZohoLeadFormProps) {
  const { user } = useAuth();
  const { allProfiles = [] } = useTeamHierarchy();

  const [activeSection, setActiveSection] = useState('lead-image-section');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      company_name: '',
      first_name: '',
      last_name: '',
      designation: '',
      email: '',
      secondary_email: '',
      phone: '',
      secondary_phone: '',
      address: '',
      status: 'new',
      notes: '',
      lead_source: 'Website',
      website: '',
      customer_requirement: '',
      industry: 'Technology',
      city: '',
      district: '',
      state: '',
      country: '',
      lead_owner: user?.id || '',
    },
  });

  const countryWatch = form.watch('country') || '';
  const stateWatch = form.watch('state') || '';

  // Get dynamic countries from library
  const countriesList = useMemo(() => Country.getAllCountries(), []);
  const countryOptions = useMemo(() => countriesList.map(c => c.name), [countriesList]);

  // Find the selected country object
  const selectedCountryObj = useMemo(() => {
    return countriesList.find(c => c.name === countryWatch);
  }, [countriesList, countryWatch]);

  // Get states of selected country
  const stateOptionsList = useMemo(() => {
    if (!selectedCountryObj) return [];
    return State.getStatesOfCountry(selectedCountryObj.isoCode);
  }, [selectedCountryObj]);

  const stateOptions = useMemo(() => stateOptionsList.map(s => s.name), [stateOptionsList]);

  // Find selected state object
  const selectedStateObj = useMemo(() => {
    if (!selectedCountryObj || !stateWatch) return null;
    return stateOptionsList.find(s => s.name === stateWatch);
  }, [selectedCountryObj, stateOptionsList, stateWatch]);

  // Get cities/districts of selected state
  const districtOptionsList = useMemo(() => {
    if (!selectedCountryObj || !selectedStateObj) return [];
    return City.getCitiesOfState(selectedCountryObj.isoCode, selectedStateObj.isoCode);
  }, [selectedCountryObj, selectedStateObj]);

  const districtOptions = useMemo(() => districtOptionsList.map(c => c.name), [districtOptionsList]);

  useEffect(() => {
    if (user && !form.getValues('lead_owner')) {
      form.setValue('lead_owner', user.id);
    }
  }, [user, form]);

  // Scroll spy observer
  useEffect(() => {
    const sections = ['lead-image-section', 'lead-info-section', 'address-section', 'desc-section'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.1, rootMargin: '-10% 0px -70% 0px' }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach(obs => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        toast.success('Lead image simulated');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (data: LeadFormData, isSaveAndNew = false) => {
    const contact_name = data.first_name 
      ? `${data.first_name} ${data.last_name}`.trim() 
      : data.last_name;

    const payload = {
      company_name: data.company_name,
      contact_name,
      designation: data.designation || null,
      email: data.email || null,
      secondary_email: data.secondary_email || null,
      phone: data.phone || null,
      secondary_phone: data.secondary_phone || null,
      address: data.address || null,
      status: data.status,
      notes: data.notes || null,
      lead_source: data.lead_source || null,
      website: data.website || null,
      customer_requirement: data.customer_requirement || null,
      industry: data.industry || null,
      city: data.city || null,
      district: data.district || null,
      state: data.state || null,
      country: data.country || null,
      created_by: data.lead_owner || user?.id || null,
    };

    onSubmit(payload, isSaveAndNew);

    if (isSaveAndNew) {
      form.reset({
        company_name: '',
        first_name: '',
        last_name: '',
        designation: '',
        email: '',
        secondary_email: '',
        phone: '',
        secondary_phone: '',
        address: '',
        status: 'new',
        notes: '',
        lead_source: 'Website',
        website: '',
        customer_requirement: '',
        industry: 'Technology',
        city: '',
        district: '',
        state: '',
        country: '',
        lead_owner: user?.id || '',
      });
      setProfileImage(null);
      scrollToSection('lead-image-section');
    }
  };

  const currentInitials = useMemo(() => {
    const f = form.watch('first_name') || '';
    const l = form.watch('last_name') || '';
    const comp = form.watch('company_name') || '';
    if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    if (comp) return comp.slice(0, 2).toUpperCase();
    return '?';
  }, [form.watch('first_name'), form.watch('last_name'), form.watch('company_name')]);

  return (
    <Form {...form}>
      <form className="flex flex-col h-full overflow-hidden">
        
        {/* Main Work Area (Split Side Scroll & Form) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Scroll Navigation Shortcuts */}
          <div className="w-48 border-r border-slate-150 p-4 shrink-0 space-y-1 bg-slate-50/50 hidden md:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-2">Sections</p>
            {[
              { id: 'lead-image-section', label: 'Lead Image' },
              { id: 'lead-info-section', label: 'Lead Information' },
              { id: 'address-section', label: 'Address Information' },
              { id: 'desc-section', label: 'Description & Notes' }
            ].map((sect) => (
              <button
                key={sect.id}
                type="button"
                onClick={() => scrollToSection(sect.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === sect.id 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {sect.label}
              </button>
            ))}
          </div>

          {/* Form Fields Scrolling Panel */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            
            {/* Section 1: Lead Image (No Icons) */}
            <div 
              id="lead-image-section"
              className="border border-slate-200 rounded-xl p-5 flex items-center gap-5 scroll-mt-4 bg-white"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-500 transition-all overflow-hidden shrink-0 font-bold text-xs"
              >
                {profileImage ? (
                  <img src={profileImage} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span>{currentInitials}</span>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">Lead Avatar</h4>
                <p className="text-[10px] text-slate-400 leading-normal max-w-sm">
                  Upload a logo, business card photo, or avatar to represent this contact.
                </p>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Upload Photo
                  </button>
                  {profileImage && (
                    <button 
                      type="button" 
                      onClick={() => setProfileImage(null)}
                      className="text-[10px] text-red-500 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Lead Information (No Icons) */}
            <div 
              id="lead-info-section" 
              className="border border-slate-200 rounded-xl p-5 space-y-5 scroll-mt-4 bg-white"
            >
              <div className="pb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lead Information</h3>
                <p className="text-[10px] text-slate-400">Core personal and organizational details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                {/* Lead Owner */}
                <FormField control={form.control} name="lead_owner" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lead Owner</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none">
                          <SelectValue placeholder="Select Lead Owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allProfiles.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id} className="text-xs">
                            {p.full_name || p.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Company Name */}
                <FormField control={form.control} name="company_name" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Company Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* First Name */}
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Last Name */}
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Last Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Title / Designation */}
                <FormField control={form.control} name="designation" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Designation / Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Purchasing Manager" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Email */}
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Primary Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@company.com" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Secondary Email */}
                <FormField control={form.control} name="secondary_email" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secondary Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.personal@gmail.com" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Phone */}
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Primary Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Secondary Phone */}
                <FormField control={form.control} name="secondary_phone" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secondary Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555-0144" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Website */}
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.acme.com" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Lead Source */}
                <FormField control={form.control} name="lead_source" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lead Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none">
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

                {/* Lead Status */}
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lead Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New Lead</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Industry */}
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind} value={ind} className="text-xs">{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Section 3: Address Information (No Icons) */}
            <div 
              id="address-section" 
              className="border border-slate-200 rounded-xl p-5 space-y-5 scroll-mt-4 bg-white"
            >
              <div className="pb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Address Information</h3>
                <p className="text-[10px] text-slate-400">Physical address and localization</p>
              </div>

              <div className="space-y-4">
                {/* Street Address */}
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Room/Suite, Street address, locality..." className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Cascading Geographic Autocomplete Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                          options={countryOptions}
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
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter City" className="h-9 text-xs bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </div>

            {/* Section 4: Description Information (No Icons) */}
            <div 
              id="desc-section" 
              className="border border-slate-200 rounded-xl p-5 space-y-5 scroll-mt-4 bg-white"
            >
              <div className="pb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Description & Requirements</h3>
                <p className="text-[10px] text-slate-400">Contextual requirements and descriptive notes</p>
              </div>

              <div className="space-y-4">
                {/* Customer Requirement */}
                <FormField control={form.control} name="customer_requirement" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Customer Requirement</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What details did they share regarding their project?" 
                        rows={3} 
                        className="bg-white border-slate-200 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none resize-none rounded-lg" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Internal Notes */}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Internal Description / Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Internal context, background check details..." 
                        rows={3} 
                        className="bg-white border-slate-200 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-none resize-none rounded-lg" 
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

        {/* Fixed Footer Action Bar (Elevated) */}
        <div className="border-t border-slate-200 bg-white/95 px-6 py-4 flex items-center justify-end gap-2 shrink-0">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-4 h-9 rounded-lg"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="outline"
            disabled={isLoading}
            onClick={form.handleSubmit((data) => handleFormSubmit(data, true))}
            className="text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 px-4 h-9 rounded-lg"
          >
            Save and New
          </Button>
          <Button 
            type="button"
            disabled={isLoading}
            onClick={form.handleSubmit((data) => handleFormSubmit(data, false))}
            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 px-6 h-9 rounded-lg"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>

      </form>
    </Form>
  );
}
