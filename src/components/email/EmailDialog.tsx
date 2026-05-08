import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Mail, 
  Paperclip, 
  X, 
  ChevronDown, 
  Copy, 
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { sendEmail } from '@/lib/emailService';
import { RichTextEditor } from './RichTextEditor';
import { DEFAULT_TEMPLATES, replacePlaceholders, EmailTemplate } from '@/lib/emailTemplates';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useEmailTemplates, useCreateEmailTemplate } from '@/hooks/useEmailTemplates';
import { useLogSentEmail } from '@/hooks/useSentEmails';
import { useCreateInteractionLog } from '@/hooks/useInteractionLogs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'quotation' | 'invoice' | 'general';
  entityId: string;
  defaultRecipient: {
    email: string;
    name: string;
    company_name?: string;
  };
  defaultSubject: string;
  defaultBody: string;
  pdfData?: string;
  pdfFilename?: string;
  onSuccess?: () => void;
}

interface Attachment {
  filename: string;
  content: string; // base64
  size?: number;
}

export function EmailDialog({
  open,
  onClose,
  type,
  entityId,
  defaultRecipient,
  defaultSubject,
  defaultBody,
  pdfData,
  pdfFilename,
  onSuccess,
}: EmailDialogProps) {
  const { data: settings } = useCompanySettings();
  const { data: customTemplates = [] } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const logSentEmail = useLogSentEmail();
  const createInteractionLog = useCreateInteractionLog();
  
  const [to, setTo] = useState(defaultRecipient.email || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with PDF if provided
  useEffect(() => {
    if (pdfData && open) {
      setAttachments([{
        filename: pdfFilename || `${type}.pdf`,
        content: pdfData,
        size: Math.round((pdfData.length * 3) / 4 / 1024) // Approx size in KB
      }]);
    }
  }, [pdfData, pdfFilename, type, open]);

  // Reset fields when opening
  useEffect(() => {
    if (open) {
      setTo(defaultRecipient.email || '');
      setSubject(defaultSubject);
      
      let initialBody = defaultBody;
      if (settings?.email_signature) {
        const formattedSignature = settings.email_signature.replace(/\n/g, '<br>');
        initialBody = `${defaultBody}<br><br><div class="signature" style="color: #64748b; font-size: 0.9em;">${formattedSignature}</div>`;
      }
      setBody(initialBody);
    }
  }, [open, defaultRecipient, defaultSubject, defaultBody, settings]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleTemplateSelect = (templateId: string) => {
    const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES];
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;

    const data = {
      contact_name: defaultRecipient.name || 'there',
      company_name: settings?.company_name || 'our company',
      invoice_number: entityId.slice(0, 8).toUpperCase(), // Fallback
      quote_number: entityId.slice(0, 8).toUpperCase(),   // Fallback
    };

    const newSubject = replacePlaceholders(template.subject, data);
    let newBody = replacePlaceholders(template.body, data);
    
    if (settings?.email_signature) {
      newBody = `${newBody}<br><br><div class="signature">${settings.email_signature}</div>`;
    }

    setSubject(newSubject);
    setBody(newBody);
    toast.success(`Template "${template.name}" applied`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Limit to 1MB
      if (file.size > 1 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large (max 1MB)`);
        continue;
      }

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 part
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      newAttachments.push({
        filename: file.name,
        content: base64,
        size: Math.round(file.size / 1024)
      });
    }

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to || !validateEmail(to)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    setSending(true);

    try {
      const ccEmails = cc
        .split(',')
        .map((e) => e.trim())
        .filter((e) => validateEmail(e));

      const result = await sendEmail({
        to: to.trim(),
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: subject.trim(),
        body: body, // Now sending HTML
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (result.success) {
        // 1. Log to professional Mailing History
        try {
          await logSentEmail.mutateAsync({
            recipient_email: to.trim(),
            cc_emails: ccEmails.length > 0 ? ccEmails : undefined,
            subject: subject.trim(),
            body_html: body,
            attachments: attachments.length > 0 ? attachments : undefined,
            entity_type: type,
            entity_id: entityId,
          });
        } catch (err) {
          console.error('Failed to log to sent_emails:', err);
        }

        // 2. Log to Follow-up Notes (Interaction Logs)
        try {
          await createInteractionLog.mutateAsync({
            [type === 'lead' ? 'lead_id' : 'deal_id']: entityId,
            interaction_type: 'email',
            notes: `Email Sent: ${subject.trim()}\n\nTo: ${to.trim()}\n\nContent summarized in Mailing History.`,
            interaction_date: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to log to interaction_logs:', err);
        }

        toast.success('Email sent successfully');
        onSuccess?.();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = window.prompt('Enter a name for this template:');
    if (!name) return;

    await createTemplate.mutateAsync({
      name,
      subject,
      body,
      category: 'User Custom'
    });
  };

  const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES];
  const templatesByCategory = allTemplates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof DEFAULT_TEMPLATES>);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Composer
              </DialogTitle>
              <DialogDescription>
                Compose and send a professional email to {defaultRecipient.name}.
              </DialogDescription>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Templates
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <ScrollArea className="h-80">
                  {Object.entries(templatesByCategory).map(([category, templates]) => (
                    <React.Fragment key={category}>
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 px-2 py-1">
                        {category}
                      </DropdownMenuLabel>
                      {templates.map(t => (
                        <DropdownMenuItem key={t.id} onClick={() => handleTemplateSelect(t.id)}>
                          {t.name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </React.Fragment>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="to" className="text-xs font-semibold">Recipient Email *</Label>
                <Input
                  id="to"
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc" className="text-xs font-semibold">CC (optional)</Label>
                <Input
                  id="cc"
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc1@example.com, cc2@example.com"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-xs font-semibold">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="h-9 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message Body</Label>
              <RichTextEditor 
                content={body} 
                onChange={setBody} 
                placeholder="Write your email here..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Attachments (Max 1MB per file)</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  type="button" 
                  className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5 mr-1" />
                  Attach Files
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  onChange={handleFileChange}
                />
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border rounded-md group">
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate text-slate-700">{file.filename}</p>
                        <p className="text-[9px] text-slate-400">{file.size} KB</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/50 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Discard
            </Button>
            <Button variant="outline" onClick={handleSaveAsTemplate} disabled={sending} className="gap-2">
              <Copy className="h-4 w-4" />
              Save as Template
            </Button>
          </div>
          <Button onClick={handleSend} disabled={sending} className="min-w-[140px] bg-blue-600 hover:bg-blue-700">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
