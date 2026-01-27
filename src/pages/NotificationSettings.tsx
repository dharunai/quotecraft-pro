import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function NotificationSettings() {
  const {
    data: settings,
    isLoading
  } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const [formData, setFormData] = useState({
    enable_stock_alerts: true,
    stock_alert_email: '',
    alert_on_low_stock: true,
    alert_on_out_of_stock: true
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        enable_stock_alerts: settings.enable_stock_alerts ?? true,
        stock_alert_email: settings.stock_alert_email || '',
        alert_on_low_stock: settings.alert_on_low_stock ?? true,
        alert_on_out_of_stock: settings.alert_on_out_of_stock ?? true
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string | boolean) => {
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
        <h1 className="text-lg font-bold font-sans">Notification Settings</h1>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="h-8 text-xs">
          <Save className="h-3 w-3 mr-1" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-3">
        {/* Stock Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock Alerts</CardTitle>
            <CardDescription className="text-xs">
              Get notified when products reach critical stock levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium font-sans">Enable Stock Alerts</label>
                <p className="text-xs text-muted-foreground">Receive notifications about low stock levels</p>
              </div>
              <Switch checked={formData.enable_stock_alerts} onCheckedChange={(checked) => handleChange('enable_stock_alerts', checked)} />
            </div>

            {formData.enable_stock_alerts && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium font-sans">Alert Email Address</label>
                  <Input type="email" value={formData.stock_alert_email} onChange={e => handleChange('stock_alert_email', e.target.value)} placeholder="alerts@company.com" />
                  <p className="text-xs text-muted-foreground">
                    Stock alerts will be sent to this email address
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium font-sans">Alert on Low Stock</label>
                      <p className="text-xs text-muted-foreground">Notify when stock is below 20% of max quantity</p>
                    </div>
                    <Switch checked={formData.alert_on_low_stock} onCheckedChange={(checked) => handleChange('alert_on_low_stock', checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium font-sans">Alert on Out of Stock</label>
                      <p className="text-xs text-muted-foreground">Notify when any product runs out of stock</p>
                    </div>
                    <Switch checked={formData.alert_on_out_of_stock} onCheckedChange={(checked) => handleChange('alert_on_out_of_stock', checked)} />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Other Notifications</CardTitle>
            <CardDescription>
              Manage other notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              More notification preferences can be managed from your <a href="/settings/notifications" className="text-blue-600 hover:underline">Notification Preferences page</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </AppLayout>;
}
