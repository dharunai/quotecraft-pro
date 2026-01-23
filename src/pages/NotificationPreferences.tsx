import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationPreferences() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: prefs, isLoading } = useQuery({
        queryKey: ['notification_preferences', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // Create default preferences
                const { data: newData, error: createError } = await supabase
                    .from('notification_preferences')
                    .insert({ user_id: user.id })
                    .select()
                    .single();
                if (createError) throw createError;
                return newData;
            }

            return data;
        },
        enabled: !!user?.id
    });

    const updatePref = useMutation({
        mutationFn: async (updates: any) => {
            const { error } = await supabase
                .from('notification_preferences')
                .update(updates)
                .eq('user_id', user?.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification_preferences', user?.id] });
            toast.success('Preferences saved');
        }
    });

    if (isLoading) return <AppLayout><p>Loading...</p></AppLayout>;

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Notification Settings</h1>
                    <p className="text-muted-foreground">Control how and when you receive alerts from the CRM.</p>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Notifications</CardTitle>
                            <CardDescription>Configure your email communication preferences.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Email Alerts</Label>
                                    <p className="text-sm text-muted-foreground">Receive important alerts via email instantly.</p>
                                </div>
                                <Switch
                                    checked={prefs?.email_notifications}
                                    onCheckedChange={(val) => updatePref.mutate({ email_notifications: val })}
                                />
                            </div>

                            <div className="border-t pt-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Email Digest</Label>
                                        <p className="text-sm text-muted-foreground">Receive a summary of CRM activity.</p>
                                    </div>
                                    <Switch
                                        checked={prefs?.email_digest}
                                        onCheckedChange={(val) => updatePref.mutate({ email_digest: val })}
                                    />
                                </div>

                                {prefs?.email_digest && (
                                    <div className="flex items-center justify-between pl-6 border-l-2 ml-1">
                                        <Label>Frequency</Label>
                                        <Select
                                            value={prefs?.email_digest_frequency}
                                            onValueChange={(val) => updatePref.mutate({ email_digest_frequency: val })}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Trigger Notifications</CardTitle>
                            <CardDescription>Choose which events should trigger an in-app notification.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { id: 'notify_deal_created', label: 'New Deal Created' },
                                { id: 'notify_deal_won', label: 'Deal Won' },
                                { id: 'notify_quote_accepted', label: 'Quotation Accepted' },
                                { id: 'notify_invoice_paid', label: 'Invoice Paid' },
                                { id: 'notify_task_assigned', label: 'Task Assigned to Me' },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <Label htmlFor={item.id}>{item.label}</Label>
                                    <Switch
                                        id={item.id}
                                        checked={prefs?.[item.id]}
                                        onCheckedChange={(val) => updatePref.mutate({ [item.id]: val })}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
