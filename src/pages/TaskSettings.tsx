import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

export default function TaskSettings() {
    const navigate = useNavigate();
    const { data: settings, isLoading } = useCompanySettings();
    const updateSettings = useUpdateCompanySettings();
    const { toast } = useToast();

    const [emailEnabled, setEmailEnabled] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [pendingValue, setPendingValue] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        if (settings) {
            setEmailEnabled((settings as any).task_email_notifications ?? false);
        }
    }, [settings]);

    const handleToggle = (newValue: boolean) => {
        setPendingValue(newValue);
        setPassword('');
        setPasswordError('');
        setShowPasswordDialog(true);
    };

    const handleConfirm = () => {
        if (!settings) return;

        const companyName = settings.company_name?.trim().toLowerCase();
        const enteredPassword = password.trim().toLowerCase();

        if (!enteredPassword) {
            setPasswordError('Password is required');
            return;
        }

        if (enteredPassword !== companyName) {
            setPasswordError('Incorrect password. Please enter your company name.');
            return;
        }

        // Password matches — update the setting
        updateSettings.mutate(
            {
                id: settings.id,
                task_email_notifications: pendingValue,
            } as any,
            {
                onSuccess: () => {
                    setEmailEnabled(pendingValue);
                    setShowPasswordDialog(false);
                    toast({
                        title: pendingValue ? 'Task Emails Enabled' : 'Task Emails Disabled',
                        description: pendingValue
                            ? 'Email notifications will be sent for task events.'
                            : 'Email notifications for task events are now turned off.',
                    });
                },
            }
        );
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/settings')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold">Task Settings</h1>
                        <p className="text-xs text-muted-foreground">Manage task-related preferences</p>
                    </div>
                </div>

                {/* Email Notifications Toggle */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-600" />
                            Task Email Notifications
                        </CardTitle>
                        <CardDescription className="text-xs">
                            When enabled, emails will be sent via Resend for task events such as creation, delegation, reassignment, completion, and due date reminders.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium text-slate-900">
                                    {emailEnabled ? 'Emails are enabled' : 'Emails are disabled'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {emailEnabled
                                        ? 'Task events will trigger email notifications'
                                        : 'No email notifications will be sent for task events'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Lock className="h-3.5 w-3.5 text-slate-400" />
                                <Switch
                                    checked={emailEnabled}
                                    onCheckedChange={handleToggle}
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Company password required to change this setting
                        </p>
                    </CardContent>
                </Card>

                {/* Password Confirmation Dialog */}
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-slate-700" />
                                Confirm with Company Password
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Enter the company password to {pendingValue ? 'enable' : 'disable'} task email notifications.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="company-password" className="text-xs">
                                    Company Password
                                </Label>
                                <Input
                                    id="company-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setPasswordError('');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                    className="h-9 text-sm rounded-sm"
                                    autoFocus
                                />
                                {passwordError && (
                                    <p className="text-xs text-red-500">{passwordError}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(false)} className="rounded-sm">
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleConfirm}
                                disabled={updateSettings.isPending}
                                className="rounded-sm bg-slate-900 hover:bg-slate-800"
                            >
                                {updateSettings.isPending ? 'Updating...' : 'Confirm'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
