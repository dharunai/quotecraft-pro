import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompanySettings, useUpdateCompanySettings, useUploadLogo } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function Settings() {
  const {
    data: settings,
    isLoading
  } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const uploadLogo = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    email: '',
    phone: '',
    gst_number: '',
    pan: '',
    currency: '₹',
    tax_rate: 18,
    terms: '',
    theme_color: '#166534',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    invoice_prefix: 'INV',
    default_due_days: 30,
    invoice_terms: '',
    // Email settings
    email_signature: '',
    quotation_email_subject: 'Quotation #{quote_number} from {company_name}',
    quotation_email_body: 'Dear {contact_name},\n\nPlease find attached quotation #{quote_number} for your review.\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\n{company_name}',
    invoice_email_subject: 'Invoice #{invoice_number} from {company_name}',
    invoice_email_body: 'Dear {contact_name},\n\nPlease find attached invoice #{invoice_number}.\n\nPayment is due by {due_date}.\n\nThank you for your business!\n\nBest regards,\n{company_name}',
    // Stock alerts
    enable_stock_alerts: true,
    stock_alert_email: '',
    alert_on_low_stock: true,
    alert_on_out_of_stock: true,
    // PDF settings
    show_logo_on_pdf: true,
    include_hsn_sac: true,
    pdf_footer_text: ''
  });
  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        address: settings.address || '',
        email: settings.email || '',
        phone: settings.phone || '',
        gst_number: settings.gst_number || '',
        pan: settings.pan || '',
        currency: settings.currency || '₹',
        tax_rate: settings.tax_rate || 18,
        terms: settings.terms || '',
        theme_color: settings.theme_color || '#166534',
        bank_name: settings.bank_name || '',
        account_number: settings.account_number || '',
        ifsc_code: settings.ifsc_code || '',
        account_holder_name: settings.account_holder_name || '',
        invoice_prefix: settings.invoice_prefix || 'INV',
        default_due_days: settings.default_due_days || 30,
        invoice_terms: settings.invoice_terms || '',
        // Email settings
        email_signature: settings.email_signature || '',
        quotation_email_subject: settings.quotation_email_subject || 'Quotation #{quote_number} from {company_name}',
        quotation_email_body: settings.quotation_email_body || '',
        invoice_email_subject: settings.invoice_email_subject || 'Invoice #{invoice_number} from {company_name}',
        invoice_email_body: settings.invoice_email_body || '',
        // Stock alerts
        enable_stock_alerts: settings.enable_stock_alerts ?? true,
        stock_alert_email: settings.stock_alert_email || '',
        alert_on_low_stock: settings.alert_on_low_stock ?? true,
        alert_on_out_of_stock: settings.alert_on_out_of_stock ?? true,
        // PDF settings
        show_logo_on_pdf: settings.show_logo_on_pdf ?? true,
        include_hsn_sac: settings.include_hsn_sac ?? true,
        pdf_footer_text: settings.pdf_footer_text || ''
      });
    }
  }, [settings]);
  const handleChange = (field: string, value: string | number | boolean) => {
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
      tax_rate: Number(formData.tax_rate),
      ifsc_code: formData.ifsc_code.toUpperCase() || null
    });
  };
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    uploadLogo.mutate({
      file,
      settingsId: settings.id
    });
  };
  const navigate = useNavigate();
  if (isLoading) {
    return <AppLayout>
      <p className="text-muted-foreground">Loading settings...</p>
    </AppLayout>;
  }
  return <AppLayout>
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-sans">Company Settings</h1>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Team Management - Admin Only */}
        <PermissionGuard requireAdmin>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage team members, roles, and access permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/settings/team')}>
                Manage Team
              </Button>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Your company logo and colors will appear on all quotations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {settings?.logo_url ? <img src={settings.logo_url} alt="Company Logo" className="w-32 h-32 object-contain rounded-lg border border-border bg-white" /> : <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground text-sm text-center px-2">
                    No logo
                  </span>
                </div>}
              </div>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadLogo.isPending}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadLogo.isPending ? 'Uploading...' : 'Upload Logo'}
                </Button>
                <p className="text-sm text-muted-foreground font-sans">
                  Recommended: 400x400px, PNG or JPG, max 5MB
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Theme Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={formData.theme_color} onChange={e => handleChange('theme_color', e.target.value)} className="w-12 h-10 rounded border border-input cursor-pointer" />
                <Input value={formData.theme_color} onChange={e => handleChange('theme_color', e.target.value)} placeholder="#166534" className="w-32" />
                <span className="text-sm text-muted-foreground font-sans">
                  Used as accent color in quotations
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              This information appears on your quotation headers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Company Name</label>
                <Input value={formData.company_name} onChange={e => handleChange('company_name', e.target.value)} placeholder="Your Company Name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Email</label>
                <Input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="contact@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Phone</label>
                <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">GST Number</label>
                <Input value={formData.gst_number} onChange={e => handleChange('gst_number', e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">PAN (optional)</label>
                <Input value={formData.pan} onChange={e => handleChange('pan', e.target.value)} placeholder="AAAAA0000A" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Address</label>
              <Textarea value={formData.address} onChange={e => handleChange('address', e.target.value)} placeholder="Enter your company address" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Quotation Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Settings</CardTitle>
            <CardDescription>
              Configure currency, tax rates, and default terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Currency Symbol</label>
                <Input value={formData.currency} onChange={e => handleChange('currency', e.target.value)} placeholder="₹" className="w-24" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Tax Rate (%)</label>
                <Input type="number" value={formData.tax_rate} onChange={e => handleChange('tax_rate', parseFloat(e.target.value) || 0)} placeholder="18" min="0" max="100" step="0.01" className="w-32" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Terms & Conditions</label>
              <Textarea value={formData.terms} onChange={e => handleChange('terms', e.target.value)} placeholder="Enter your default terms and conditions..." rows={5} />
            </div>
          </CardContent>
        </Card>

        {/* Banking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Banking Details</CardTitle>
            <CardDescription>
              Bank account information for invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Bank Name</label>
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
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
            <CardDescription>
              Configure invoice numbering and default terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Invoice Prefix</label>
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

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>
              Configure email templates for quotations and invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Email Signature</label>
              <Textarea value={formData.email_signature} onChange={e => handleChange('email_signature', e.target.value)} placeholder="Best regards,\nYour Name" rows={3} />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Quotation Email Template</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Subject</label>
                <Input value={formData.quotation_email_subject} onChange={e => handleChange('quotation_email_subject', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Body</label>
                <Textarea value={formData.quotation_email_body} onChange={e => handleChange('quotation_email_body', e.target.value)} rows={5} />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{company_name}'}, {'{contact_name}'}, {'{quote_number}'}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Invoice Email Template</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Subject</label>
                <Input value={formData.invoice_email_subject} onChange={e => handleChange('invoice_email_subject', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium font-sans">Body</label>
                <Textarea value={formData.invoice_email_body} onChange={e => handleChange('invoice_email_body', e.target.value)} rows={5} />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{company_name}'}, {'{contact_name}'}, {'{invoice_number}'}, {'{due_date}'}, {'{total}'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Settings */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Settings</CardTitle>
            <CardDescription>
              Configure PDF layout and appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-base font-medium">Show Company Logo</label>
                <p className="text-sm text-muted-foreground">
                  Include your company logo on PDF documents
                </p>
              </div>
              <Switch checked={formData.show_logo_on_pdf} onCheckedChange={(checked) => handleChange('show_logo_on_pdf', checked)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-base font-medium">Include HSN/SAC Codes</label>
                <p className="text-sm text-muted-foreground">
                  Show HSN/SAC codes column on invoices (Required for GST)
                </p>
              </div>
              <Switch checked={formData.include_hsn_sac} onCheckedChange={(checked) => handleChange('include_hsn_sac', checked)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">PDF Footer Text</label>
              <Textarea value={formData.pdf_footer_text} onChange={e => handleChange('pdf_footer_text', e.target.value)} placeholder="Registered Office: ..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts</CardTitle>
            <CardDescription>
              Configure low stock notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-base font-medium">Enable Stock Alerts</label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications when stock is low
                </p>
              </div>
              <Switch checked={formData.enable_stock_alerts} onCheckedChange={(checked) => handleChange('enable_stock_alerts', checked)} />
            </div>

            {formData.enable_stock_alerts && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium font-sans">Alert Email Address</label>
                  <Input value={formData.stock_alert_email} onChange={e => handleChange('stock_alert_email', e.target.value)} placeholder="alerts@company.com" type="email" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Alert on Low Stock</label>
                  </div>
                  <Switch checked={formData.alert_on_low_stock} onCheckedChange={(checked) => handleChange('alert_on_low_stock', checked)} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Alert on Out of Stock</label>
                  </div>
                  <Switch checked={formData.alert_on_out_of_stock} onCheckedChange={(checked) => handleChange('alert_on_out_of_stock', checked)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </AppLayout>;
}