import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DollarSign, Calendar, TrendingUp, Tag, FileText, Briefcase, Info } from 'lucide-react';

const dealSchema = z.object({
  deal_value: z.number().min(0, 'Value must be positive'),
  stage: z.string().min(1, 'Stage is required'),
  expected_close_date: z.string().optional().nullable(),
  probability: z.number().min(0).max(100),
  notes: z.string().optional().nullable(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  initialData?: any;
  onSubmit: (data: DealFormData) => void;
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

export function DealForm({ initialData, onSubmit, onCancel, isLoading }: DealFormProps) {
  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      deal_value: initialData?.deal_value || 0,
      stage: initialData?.stage || 'qualified',
      expected_close_date: initialData?.expected_close_date || '',
      probability: initialData?.probability || 25,
      notes: initialData?.notes || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 scrollbar-thin">
        
        <div className="space-y-4">
          <FormSection icon={DollarSign} title="Deal Value & Pipeline" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="deal_value"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Expected Value (₹)</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <DollarSign className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[9px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Pipeline Stage</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-7 text-[11px] bg-slate-50/30 border-slate-200">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="qualified" className="text-xs font-medium">Qualified</SelectItem>
                      <SelectItem value="proposal" className="text-xs font-medium">Proposal</SelectItem>
                      <SelectItem value="negotiation" className="text-xs font-medium">Negotiation</SelectItem>
                      <SelectItem value="won" className="text-xs font-bold text-emerald-600">Won</SelectItem>
                      <SelectItem value="lost" className="text-xs font-bold text-rose-600">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <FormSection icon={Calendar} title="Schedule & Forecast" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormField
              control={form.control}
              name="expected_close_date"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Expected Close Date</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Calendar className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="date" 
                        className="h-7 pl-8 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Confidence (%)</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <TrendingUp className="absolute left-2.5 top-2 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="number" 
                        placeholder="25" 
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

          <FormSection icon={Info} title="Strategic Context" />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Deal Background / Notes</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <FileText className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Textarea 
                      placeholder="Specify requirements, competitors, or deal context..." 
                      className="min-h-[80px] pl-8 py-2 text-[11px] border-slate-200 bg-slate-50/30 focus:bg-white transition-all shadow-none resize-none" 
                      {...field} 
                      value={field.value || ''}
                    />
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
            {isLoading ? 'Saving...' : initialData?.id ? 'Update Deal' : 'Save Deal'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
