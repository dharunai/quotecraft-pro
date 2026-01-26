import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmail } from '@/lib/emailService';

interface EmailDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'quotation' | 'invoice';
  entityId: string;
  defaultRecipient: {
    email: string;
    name: string;
  };
  defaultSubject: string;
  defaultBody: string;
  pdfData?: string;
  pdfFilename?: string;
  onSuccess?: () => void;
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
  const [to, setTo] = useState(defaultRecipient.email || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
        body: body.trim(),
        attachments: pdfData ? [{
          filename: pdfFilename || `${type}.pdf`,
          content: pdfData,
        }] : undefined,
      });

      if (result.success) {
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send {type === 'quotation' ? 'Quotation' : 'Invoice'} via Email
          </DialogTitle>
          <DialogDescription>
            Send this {type} to {defaultRecipient.name || 'the customer'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">CC (optional)</Label>
            <Input
              id="cc"
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc1@example.com, cc2@example.com"
            />
            <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Enter your message..."
            />
          </div>

          {pdfData && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{pdfFilename || `${type}.pdf`}</span>
              <Badge variant="secondary" className="ml-auto">
                Attached
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
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
