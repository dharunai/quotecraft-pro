import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, Activity, TrendingUp, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    description: string;
    performed_by_name: string | null;
    created_at: string;
}

export function NotificationBell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const { data: activities = [] } = useQuery({
        queryKey: ['recent-activities'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            return data as ActivityItem[];
        }
    });

    // Real-time subscription for new activities
    useEffect(() => {
        const channel = supabase
            .channel('activities-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activities' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const getIcon = (entityType: string) => {
        switch (entityType) {
            case 'lead': return <TrendingUp className="h-4 w-4 text-info" />;
            case 'deal': return <CheckCircle2 className="h-4 w-4 text-success" />;
            case 'quotation': return <FileText className="h-4 w-4 text-primary" />;
            case 'invoice': return <FileText className="h-4 w-4 text-warning" />;
            case 'product': return <Package className="h-4 w-4 text-muted-foreground" />;
            default: return <Activity className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getEntityUrl = (entityType: string, entityId: string) => {
        switch (entityType) {
            case 'lead': return `/leads/${entityId}`;
            case 'deal': return `/deals/${entityId}`;
            case 'quotation': return `/quotations/${entityId}`;
            case 'invoice': return `/invoices/${entityId}`;
            case 'product': return `/products`;
            default: return `/dashboard`;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-accent transition-colors">
                    <Bell className="h-5 w-5" />
                    {activities.length > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h4 className="font-semibold text-foreground">Recent Activity</h4>
                </div>
                <ScrollArea className="h-[350px]">
                    {activities.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No recent activity</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {activities.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="p-4 border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        navigate(getEntityUrl(activity.entity_type, activity.entity_id));
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">{getIcon(activity.entity_type)}</div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <p className="text-sm leading-tight text-foreground line-clamp-2">
                                                {activity.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                {activity.performed_by_name && (
                                                    <span>{activity.performed_by_name}</span>
                                                )}
                                                <span>•</span>
                                                <span>
                                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
