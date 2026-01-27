import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingSettings() {
  const {
    data: settings,
    isLoading
  } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    invoice_prefix: 'INV',
    default_due_days: 30,
    invoice_terms: ''
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        bank_name: settings.bank_name || '',
        account_number: settings.account_number || '',
        ifsc_code: settings.ifsc_code || '',
        account_holder_name: settings.account_holder_name || '',
        invoice_prefix: settings.invoice_prefix || 'INV',
        default_due_days: settings.default_due_days || 30,
        invoice_terms: settings.invoice_terms || ''
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateBankDetails = () => {
    const errors: string[] = [];

    // IFSC code format: 4 letters + 0 + 6 alphanumeric
    if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifsc_code)) {
      errors.push('IFSC code format is invalid (should be like SBIN0001234)');
    }

    // Account number: 9-18 digits
    if (formData.account_number && !/^\d{9,18}$/.test(formData.account_number)) {
      errors.push('Account number should be 9-18 digits');
    }
    return errors;
  };

  const handleSave = () => {
    if (!settings?.id) return;
    const validationErrors = validateBankDetails();
    if (validationErrors.length > 0) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }
    updateSettings.mutate({
      id: settings.id,
      ...formData,
      default_due_days: Number(formData.default_due_days),
      ifsc_code: formData.ifsc_code.toUpperCase() || null
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
        <h1 className="text-lg font-bold font-sans">Billing Settings</h1>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="h-8 text-xs">
          <Save className="h-3 w-3 mr-1" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-3">
        {/* Banking Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Banking Details</CardTitle>
            <CardDescription className="text-xs">
              Bank account information for invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium font-sans">Bank Name</label>
                <Input value={formData.bank_name} onChange={e => handleChange('bank_name', e.target.value)} placeholder="State Bank of India" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Account Holder Name</label>
                <Input value={formData.account_holder_name} onChange={e => handleChange('account_holder_name', e.target.value)} placeholder="Your Company Pvt Ltd" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Account Number</label>
                <Input value={formData.account_number} onChange={e => handleChange('account_number', e.target.value)} placeholder="1234567890" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">IFSC Code</label>
                <Input value={formData.ifsc_code} onChange={e => handleChange('ifsc_code', e.target.value)} placeholder="SBIN0001234" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Invoice Settings</CardTitle>
            <CardDescription className="text-xs">
              Configure invoice numbering and default terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium font-sans">Invoice Prefix</label>
                <Input value={formData.invoice_prefix} onChange={e => handleChange('invoice_prefix', e.target.value)} placeholder="INV" className="w-32" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Default Due Days</label>
                <Input type="number" value={formData.default_due_days} onChange={e => handleChange('default_due_days', parseInt(e.target.value) || 30)} placeholder="30" min="0" className="w-32" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Invoice Terms & Conditions</label>
              <Textarea value={formData.invoice_terms} onChange={e => handleChange('invoice_terms', e.target.value)} placeholder="Enter default invoice terms and conditions..." rows={4} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </AppLayout>;
}
