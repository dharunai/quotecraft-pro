import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Play, History, Edit, Trash2, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/PermissionGuard';
import { format } from 'date-fns';

export default function AutomationSettings() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['automation_rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('automation_rules')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const toggleRule = useMutation({
        mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
            const { error } = await supabase
                .from('automation_rules')
                .update({ is_active: isActive })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
            toast.success('Rule status updated');
        }
    });

    const deleteRule = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('automation_rules')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
            toast.success('Rule deleted');
        }
    });

    if (isLoading) return <AppLayout><p>Loading automations...</p></AppLayout>;

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Automation Rules</h1>
                        <p className="text-muted-foreground">Automate your business workflows with trigger-based actions.</p>
                    </div>
                    <PermissionGuard requireAdmin>
                        <Button onClick={() => setIsNewRuleOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Rule
                        </Button>
                    </PermissionGuard>
                </div>

                <div className="grid gap-4">
                    {rules.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                            <p className="text-muted-foreground">No automation rules yet.</p>
                            <Button variant="link" onClick={() => setIsNewRuleOpen(true)}>Create your first rule</Button>
                        </div>
                    ) : (
                        rules.map((rule) => (
                            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{rule.name}</CardTitle>
                                            {!rule.is_active && <Badge variant="secondary">Inactive</Badge>}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Play className="h-3 w-3" />
                                                {rule.execution_count} executions
                                            </div>
                                            <Switch
                                                checked={rule.is_active}
                                                onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, isActive: checked })}
                                            />
                                        </div>
                                    </div>
                                    <CardDescription>{rule.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm">
                                            <span className="font-semibold text-primary">Trigger:</span> {rule.trigger_event.replace(/_/g, ' ')}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteRule.mutate(rule.id)} className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            <Dialog open={isNewRuleOpen} onOpenChange={setIsNewRuleOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Automation Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Rule Name</Label>
                            <Input id="name" placeholder="e.g., Auto-Create Deal on Qualification" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="trigger">Trigger Event</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an event" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lead_created">Lead Created</SelectItem>
                                    <SelectItem value="lead_qualified">Lead Qualified</SelectItem>
                                    <SelectItem value="quotation_status_changed">Quotation Status Changed</SelectItem>
                                    <SelectItem value="deal_won">Deal Won</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Further builder steps would go here */}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewRuleOpen(false)}>Cancel</Button>
                        <Button onClick={() => {
                            navigate('/settings/workflow-builder');
                            setIsNewRuleOpen(false);
                        }}>Next: Configure Actions</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
