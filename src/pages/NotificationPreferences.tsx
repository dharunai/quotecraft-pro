import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Clock } from 'lucide-react';

export default function NotificationPreferences() {
    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
                    <p className="text-muted-foreground">
                        Control how and when you receive alerts from the CRM.
                    </p>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Bell className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>In-App Notifications</CardTitle>
                                    <CardDescription>Activity notifications within the CRM.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <Label>Activity Updates</Label>
                                    <p className="text-sm text-muted-foreground">
                                        See recent activities in the notification bell
                                    </p>
                                </div>
                                <Switch defaultChecked disabled />
                            </div>
                            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                                In-app notifications are always enabled. Activities from leads, deals, 
                                quotations, and invoices appear in the notification bell.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="opacity-60">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-muted-foreground">Email Notifications</CardTitle>
                                    <CardDescription>Coming soon - Configure email alert preferences.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 opacity-50 pointer-events-none">
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <Label>Email Alerts</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive important alerts via email
                                        </p>
                                    </div>
                                    <Switch disabled />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <Label>Daily Digest</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Summary of daily activity
                                        </p>
                                    </div>
                                    <Switch disabled />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="opacity-60">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-muted-foreground">Scheduled Reminders</CardTitle>
                                    <CardDescription>Coming soon - Set up task and follow-up reminders.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
