import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEmailActions } from '@/hooks/useEmailActions';
import { useEmailTemplates, EmailTemplate } from '@/hooks/useEmailTemplates';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { 
  X, Maximize2, Minimize2, 
  Bold, Italic, Underline, Link, 
  Image as ImageIcon, List, ListOrdered, 
  Type, AlignLeft, ChevronDown, FileText,
  Type as TypeIcon,
  Smile,
  Paperclip,
  PenTool,
  Trash,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';

const composeSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
});

type ComposeFormData = z.infer<typeof composeSchema>;

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  draftId?: string;
}

export function ComposeEmailModal({ isOpen, onClose, defaultTo, defaultSubject, defaultBody, draftId: initialDraftId }: ComposeEmailModalProps) {
  const { sendEmail, saveDraft } = useEmailActions();
  const { data: templates = [] } = useEmailTemplates();
  const { data: settings } = useCompanySettings();
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      to: defaultTo || '',
      subject: defaultSubject || '',
      body: defaultBody || '',
    },
  });

  useEffect(() => {
    if (initialDraftId) setDraftId(initialDraftId);
  }, [initialDraftId]);

  useEffect(() => {
    if (isOpen) {
      if (defaultTo) form.setValue('to', defaultTo);
      if (defaultSubject) form.setValue('subject', defaultSubject);
      if (defaultBody) form.setValue('body', defaultBody);
    }
  }, [isOpen, defaultTo, defaultSubject, defaultBody]);

  // Handle signature and defaults
  useEffect(() => {
    if (isOpen) {
      const currentBody = form.getValues('body');
      if (!currentBody && settings?.email_signature) {
        form.setValue('body', '\n\n' + settings.email_signature.replace(/<[^>]*>/g, ''));
      }
    }
  }, [isOpen, settings, form]);

  const onSubmit = (data: ComposeFormData) => {
    sendEmail.mutate({
      to: data.to,
      subject: data.subject,
      body: data.body,
    }, {
      onSuccess: () => {
        // If we were editing a draft, we should probably delete it or mark it as sent.
        // For simplicity, we just mark it as sent or delete the draft record.
        if (draftId) {
          // You could delete the draft here if you want to replace it with the sent email
        }
        form.reset();
        setDraftId(null);
        onClose();
      }
    });
  };

  // Auto-save logic
  const watchAll = form.watch();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && (watchAll.to || watchAll.subject || watchAll.body)) {
        setIsSaving(true);
        saveDraft.mutate({
          id: draftId || undefined,
          to: watchAll.to,
          subject: watchAll.subject,
          body: watchAll.body
        }, {
          onSuccess: (data: any) => {
            if (!draftId) setDraftId(data.id);
            setIsSaving(false);
          },
          onError: () => setIsSaving(false)
        });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [watchAll.to, watchAll.subject, watchAll.body, isOpen]);

  const applyTemplate = (template: EmailTemplate) => {
    form.setValue('subject', template.subject || '');
    // Strip HTML for textarea (simple approach)
    const plainBody = template.body_html.replace(/<[^>]*>/g, '');
    form.setValue('body', plainBody + (settings?.email_signature ? '\n\n' + settings.email_signature.replace(/<[^>]*>/g, '') : ''));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-xl border-none shadow-2xl">
        {/* Header */}
        <div className="bg-[#404040] text-white px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-bold">New Message</span>
          <div className="flex items-center gap-1">
            {isSaving && <span className="text-[10px] text-white/50 mr-2 italic">Draft saving...</span>}
            {!isSaving && draftId && <span className="text-[10px] text-white/50 mr-2 italic">Saved</span>}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white p-0 flex flex-col h-full min-h-[500px]">
            {/* Recipients */}
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem className="space-y-0 border-b border-slate-100">
                  <div className="flex items-center px-4 py-1 group">
                    <span className="text-sm text-slate-400 w-12">To</span>
                    <FormControl>
                      <Input {...field} className="border-none shadow-none focus-visible:ring-0 text-sm h-10 bg-transparent font-medium" placeholder="Recipients" />
                    </FormControl>
                  </div>
                  <FormMessage className="text-[10px] px-16 pb-1" />
                </FormItem>
              )}
            />

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem className="space-y-0 border-b border-slate-100">
                  <div className="flex items-center px-4 py-1">
                    <FormControl>
                      <Input {...field} className="border-none shadow-none focus-visible:ring-0 text-sm h-12 font-bold text-slate-900 bg-transparent placeholder:text-slate-300" placeholder="Subject" />
                    </FormControl>
                    
                    {/* Template Picker */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-2 text-slate-400 hover:text-blue-600 font-bold border-none">
                          <FileText className="h-3.5 w-3.5" />
                          Templates
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Email Templates</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {templates.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">No templates found</div>
                        ) : (
                          templates.map(t => (
                            <DropdownMenuItem key={t.id} onClick={() => applyTemplate(t)} className="flex flex-col items-start gap-0.5 py-2">
                              <span className="font-bold">{t.name}</span>
                              <span className="text-[10px] text-slate-400 truncate w-full">{t.subject}</span>
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <FormMessage className="text-[10px] px-4 pb-1" />
                </FormItem>
              )}
            />

            {/* Body / Editor Area */}
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem className="flex-1 flex flex-col space-y-0">
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="flex-1 border-none shadow-none focus-visible:ring-0 text-sm min-h-[350px] resize-none px-6 py-6 bg-transparent leading-relaxed" 
                      placeholder="Write your message here..." 
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] px-6 pb-1" />
                </FormItem>
              )}
            />

            {/* Bottom Toolbar */}
            <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button 
                  type="submit" 
                  disabled={sendEmail.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-bold shadow-md hover:shadow-lg transition-all h-10 mr-2"
                >
                  {sendEmail.isPending ? 'Sending...' : 'Send'}
                </Button>
                
                {/* Formatting Toolbar */}
                <div className="flex items-center px-1 py-1 rounded-md bg-slate-50/50">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm"><Bold className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm"><Italic className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm"><Underline className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm text-[12px] font-bold">A</Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm"><Link className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm"><Smile className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm"><ImageIcon className="h-4 w-4" /></Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white hover:shadow-sm"><List className="h-4 w-4" /></Button>
                </div>
                
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <Paperclip className="h-5 w-5" />
                </Button>
                
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <PenTool className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => form.reset()}>
                  <Trash className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-100">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
