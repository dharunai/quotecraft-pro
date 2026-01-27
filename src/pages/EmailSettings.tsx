import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function EmailSettings() {
  const {
    data: settings,
    isLoading
  } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const [formData, setFormData] = useState({
    email_signature: '',
    quotation_email_subject: 'Quotation #{quote_number} from {company_name}',
    quotation_email_body: 'Dear {contact_name},\n\nPlease find attached quotation #{quote_number} for your review.\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\n{company_name}',
    invoice_email_subject: 'Invoice #{invoice_number} from {company_name}',
    invoice_email_body: 'Dear {contact_name},\n\nPlease find attached invoice #{invoice_number}.\n\nPayment is due by {due_date}.\n\nThank you for your business!\n\nBest regards,\n{company_name}',
    stock_alert_email: ''
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        email_signature: settings.email_signature || '',
        quotation_email_subject: settings.quotation_email_subject || 'Quotation #{quote_number} from {company_name}',
        quotation_email_body: settings.quotation_email_body || '',
        invoice_email_subject: settings.invoice_email_subject || 'Invoice #{invoice_number} from {company_name}',
        invoice_email_body: settings.invoice_email_body || '',
        stock_alert_email: settings.stock_alert_email || ''
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!settings?.id) return;
    updateSettings.mutate({
      id: settings.id,
      ...formData
    });
  };

  if (isLoading) {
    return <AppLayout>
      <p className="text-muted-foreground">Loading settings...</p>
    </AppLayout>;
  }

  return <AppLayout>
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold font-sans">Email Settings</h1>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="h-8 text-xs">
          <Save className="h-3 w-3 mr-1" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-3">
        {/* Email Signature */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Email Signature</CardTitle>
            <CardDescription className="text-xs">
              Default signature for all outgoing emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            <div className="space-y-1">
              <label className="text-xs font-medium font-sans">Your Email Signature</label>
              <Textarea value={formData.email_signature} onChange={e => handleChange('email_signature', e.target.value)} placeholder="Enter your default email signature..." rows={3} />
              <p className="text-xs text-muted-foreground">
                This will be added to all emails sent through QuoteCraft
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quotation Email */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Email</CardTitle>
            <CardDescription>
              Customize the email template when sending quotations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Subject Line</label>
              <Input value={formData.quotation_email_subject} onChange={e => handleChange('quotation_email_subject', e.target.value)} placeholder="Quotation #{quote_number} from {company_name}" />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{quote_number}'}, {'{company_name}'}, {'{contact_name}'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Email Body</label>
              <Textarea value={formData.quotation_email_body} onChange={e => handleChange('quotation_email_body', e.target.value)} placeholder="Dear {contact_name}..." rows={6} />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{quote_number}'}, {'{company_name}'}, {'{contact_name}'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Email */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Email</CardTitle>
            <CardDescription>
              Customize the email template when sending invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Subject Line</label>
              <Input value={formData.invoice_email_subject} onChange={e => handleChange('invoice_email_subject', e.target.value)} placeholder="Invoice #{invoice_number} from {company_name}" />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{invoice_number}'}, {'{company_name}'}, {'{contact_name}'}, {'{due_date}'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Email Body</label>
              <Textarea value={formData.invoice_email_body} onChange={e => handleChange('invoice_email_body', e.target.value)} placeholder="Dear {contact_name}..." rows={6} />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{invoice_number}'}, {'{company_name}'}, {'{contact_name}'}, {'{due_date}'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alert Email */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Alert Email</CardTitle>
            <CardDescription>
              Email address to receive stock alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Alert Email Address</label>
              <Input type="email" value={formData.stock_alert_email} onChange={e => handleChange('stock_alert_email', e.target.value)} placeholder="alerts@company.com" />
              <p className="text-xs text-muted-foreground">
                Stock alerts will be sent to this email address
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </AppLayout>;
}
