import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lead } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building2, User, Mail, Phone, MapPin, FileText, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const leadSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  contact_name: z.string().min(1, 'Contact name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']),
  notes: z.string().max(2000).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  lead?: Lead | null;
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const statusBadgeClass: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-violet-50 text-violet-700 border-violet-200',
  proposal: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
};

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-border/60">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function LeadForm({ lead, onSubmit, onCancel, isLoading }: LeadFormProps) {
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
    },
  });

  const company = form.watch('company_name');
  const contact = form.watch('contact_name');
  const status = form.watch('status');
  const initials = (company || contact || '??').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identity preview */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-lg font-semibold shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{company || 'New Lead'}</p>
            <p className="text-xs text-muted-foreground truncate">{contact || 'Contact name'}</p>
          </div>
          <Badge variant="outline" className={`capitalize ${statusBadgeClass[status] || ''}`}>{status}</Badge>
        </div>

        {/* Company Information */}
        <div className="space-y-4">
          <SectionHeader icon={Building2} title="Company Information" description="Where the lead works" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="company_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Company Name *</FormLabel>
                <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Lead Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
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
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <SectionHeader icon={User} title="Contact Information" description="Primary point of contact" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="contact_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Contact Name *</FormLabel>
                <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</FormLabel>
                <FormControl><Input type="email" placeholder="jane@acme.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</FormLabel>
                <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <SectionHeader icon={MapPin} title="Address Details" />
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Address</FormLabel>
              <FormControl><Textarea placeholder="Street, City, State, Postal Code" rows={2} className="resize-none" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <SectionHeader icon={FileText} title="Notes & Internal Comments" />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium">Notes</FormLabel>
              <FormControl><Textarea placeholder="Context, requirements, follow-up reminders…" rows={4} className="resize-none" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border sticky bottom-0 bg-background -mx-6 px-6 -mb-6 pb-6">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isLoading} className="min-w-[130px]">
            {isLoading ? 'Saving…' : lead ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
