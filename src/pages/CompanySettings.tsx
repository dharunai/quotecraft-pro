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
import { Label } from '@/components/ui/label';

export default function CompanySettings() {
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

  const handleSave = () => {
    if (!settings?.id) return;
    updateSettings.mutate({
      id: settings.id,
      ...formData,
      tax_rate: Number(formData.tax_rate)
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

  if (isLoading) {
    return <AppLayout>
      <p className="text-muted-foreground">Loading settings...</p>
    </AppLayout>;
  }

  return <AppLayout>
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold font-sans">Company Settings</h1>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="h-8 text-xs">
          <Save className="h-3 w-3 mr-1" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-3">
        {/* Branding */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription className="text-xs">
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
                <Label className="font-sans text-xs">Logo</Label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" aria-label="Upload logo file" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadLogo.isPending} className="h-8 text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadLogo.isPending ? 'Uploading...' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: 400x400px, PNG or JPG, max 5MB
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">Theme Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={formData.theme_color} onChange={e => handleChange('theme_color', e.target.value)} className="w-12 h-10 rounded border border-input cursor-pointer" aria-label="Select theme color" />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Company Information</CardTitle>
            <CardDescription className="text-xs">
              This information appears on your quotation headers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {/* Invite Code Section */}
            <div className="bg-muted/50 p-3 rounded-md border border-dashed mb-4">
              <label className="text-xs font-medium font-sans text-muted-foreground block mb-1">Company Invite Code</label>
              <div className="flex items-center gap-2">
                <code className="bg-background px-2 py-1 rounded border font-mono text-sm select-all">
                  {/* @ts-ignore */}
                  {settings?.company_code || 'Loading...'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    // @ts-ignore
                    if (settings?.company_code) {
                      // @ts-ignore
                      navigator.clipboard.writeText(settings.company_code);
                      toast.success("Code copied!");
                    }
                  }}
                >
                  Copy Code
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Share this code with your team members so they can join this workspace during signup.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium font-sans">Company Name</label>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quotation Settings</CardTitle>
            <CardDescription className="text-xs">
              Configure currency, tax rates, and default terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium font-sans">Currency Symbol</label>
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

        {/* PDF Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PDF Settings</CardTitle>
            <CardDescription className="text-xs">
              Configure PDF export options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium font-sans">Show Logo on PDF</label>
                  <p className="text-xs text-muted-foreground">Display your company logo in PDF exports</p>
                </div>
                <Switch checked={formData.show_logo_on_pdf} onCheckedChange={(checked) => handleChange('show_logo_on_pdf', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium font-sans">Include HSN/SAC Codes</label>
                  <p className="text-xs text-muted-foreground">Show HSN/SAC codes in PDF quotations and invoices</p>
                </div>
                <Switch checked={formData.include_hsn_sac} onCheckedChange={(checked) => handleChange('include_hsn_sac', checked)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-sans">PDF Footer Text</label>
              <Textarea value={formData.pdf_footer_text} onChange={e => handleChange('pdf_footer_text', e.target.value)} placeholder="Enter footer text to appear at the bottom of PDFs..." rows={3} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </AppLayout>;
}
