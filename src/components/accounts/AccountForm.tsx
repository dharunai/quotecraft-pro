import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building2, Globe, Phone, MapPin, Users, DollarSign, FileText, Briefcase } from 'lucide-react';
import { Account } from '@/types/database';

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  industry: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().optional(),
  annual_revenue: z.number().optional().or(z.literal(0)),
  employees_count: z.number().optional().or(z.literal(0)),
  billing_address: z.string().optional(),
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  initialData?: Partial<Account>;
  onSubmit: (data: AccountFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function FormSection({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 mb-3 mt-4 first:mt-0">
      <div className="p-1 rounded bg-slate-50 border border-slate-100">
        <Icon className="h-3 w-3 text-slate-500" />
      </div>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{title}</h3>
    </div>
  );
}

export function AccountForm({ initialData, onSubmit, onCancel, isLoading }: AccountFormProps) {
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initialData?.name || '',
      industry: initialData?.industry || '',
      website: initialData?.website || '',
      phone: initialData?.phone || '',
      annual_revenue: initialData?.annual_revenue || 0,
      employees_count: initialData?.employees_count || 0,
      billing_address: initialData?.billing_address || '',
      description: initialData?.description || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin">
        
        <div className="space-y-4">
          <FormSection icon={Building2} title="Basic Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Account Name *</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Building2 className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="e.g. Acme Corp" className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[9px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Industry</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Briefcase className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="e.g. Technology" className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormSection icon={Globe} title="Contact & Digital" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Website</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Globe className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="https://..." className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[9px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Phone</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Phone className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="+1..." className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormSection icon={DollarSign} title="Business Metrics" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="annual_revenue"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Annual Revenue (₹)</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <DollarSign className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="number" 
                        className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employees_count"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Employees</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Users className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="number" 
                        className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormSection icon={MapPin} title="Address & Additional" />
          <FormField
            control={form.control}
            name="billing_address"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Billing Address</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <MapPin className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Textarea placeholder="Full address..." className="min-h-[50px] pl-8 py-2 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none resize-none" {...field} />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Internal Description</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <FileText className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Textarea placeholder="Additional context..." className="min-h-[50px] pl-8 py-2 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none resize-none" {...field} />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 sticky bottom-0 bg-white/80 backdrop-blur-sm pb-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 text-[10px] font-bold px-4">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isLoading} className="h-7 text-[10px] font-bold bg-black text-white hover:bg-slate-800 px-8 shadow-sm">
            {isLoading ? 'Saving...' : initialData?.id ? 'Update Account' : 'Save Account'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
