import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompanySettings, useUpdateCompanySettings, useUploadLogo } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { data: settings, isLoading } = useCompanySettings();
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
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!settings?.id) return;
    updateSettings.mutate({
      id: settings.id,
      ...formData,
      tax_rate: Number(formData.tax_rate),
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

    uploadLogo.mutate({ file, settingsId: settings.id });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Loading settings...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Company Settings</h1>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid gap-6">
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
                  {settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="Company Logo"
                      className="w-32 h-32 object-contain rounded-lg border border-border bg-white"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                      <span className="text-muted-foreground text-sm text-center px-2">
                        No logo
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLogo.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadLogo.isPending ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Recommended: 400x400px, PNG or JPG, max 5MB
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.theme_color}
                    onChange={(e) => handleChange('theme_color', e.target.value)}
                    className="w-12 h-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.theme_color}
                    onChange={(e) => handleChange('theme_color', e.target.value)}
                    placeholder="#166534"
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
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
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">GST Number</label>
                  <Input
                    value={formData.gst_number}
                    onChange={(e) => handleChange('gst_number', e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PAN (optional)</label>
                  <Input
                    value={formData.pan}
                    onChange={(e) => handleChange('pan', e.target.value)}
                    placeholder="AAAAA0000A"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Enter your company address"
                  rows={2}
                />
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
                  <label className="text-sm font-medium">Currency Symbol</label>
                  <Input
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    placeholder="₹"
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Rate (%)</label>
                  <Input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                    placeholder="18"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-32"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Terms & Conditions</label>
                <Textarea
                  value={formData.terms}
                  onChange={(e) => handleChange('terms', e.target.value)}
                  placeholder="Enter your default terms and conditions..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
