import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Building2, Briefcase, MapPin, FileText, Globe } from 'lucide-react';
import { Contact } from '@/types/database';
import { useAccounts } from '@/hooks/useAccounts';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  account_id: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  mailing_address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialData?: Partial<Contact>;
  onSubmit: (data: ContactFormData) => void;
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

export function ContactForm({ initialData, onSubmit, onCancel, isLoading }: ContactFormProps) {
  const { data: accounts = [] } = useAccounts();
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      account_id: initialData?.account_id || null,
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      job_title: initialData?.job_title || '',
      department: initialData?.department || '',
      mailing_address: initialData?.mailing_address || '',
      description: initialData?.description || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin">
        
        <div className="space-y-4">
          <FormSection icon={User} title="Primary Identity" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">First Name *</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <User className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="John" className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[9px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Last Name *</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <User className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="Doe" className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[9px]" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Organization / Account</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                  <FormControl>
                    <SelectTrigger className="h-7 text-[11px] bg-slate-50/30 border-slate-200">
                      <SelectValue placeholder="Select an organization" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs italic">No Organization</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormSection icon={Mail} title="Contact Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Work Email</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Mail className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="john@example.com" className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} value={field.value || ''} />
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
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Phone className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="+1..." className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} value={field.value || ''} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormSection icon={Briefcase} title="Professional Details" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Job Title</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Briefcase className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="e.g. Sales Manager" className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} value={field.value || ''} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Department</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Building2 className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="e.g. Sales" className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" {...field} value={field.value || ''} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormSection icon={MapPin} title="Address & Description" />
          <FormField
            control={form.control}
            name="mailing_address"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Mailing Address</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <MapPin className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Textarea placeholder="Full address..." className="min-h-[50px] pl-8 py-2 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none resize-none" {...field} value={field.value || ''} />
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
                <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Background Notes</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <FileText className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Textarea placeholder="Known since..." className="min-h-[50px] pl-8 py-2 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none resize-none" {...field} value={field.value || ''} />
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
            {isLoading ? 'Saving...' : initialData?.id ? 'Update Contact' : 'Save Contact'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
