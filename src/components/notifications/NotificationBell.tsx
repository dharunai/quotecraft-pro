import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Info, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function NotificationBell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            return data;
        }
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('is_read', false);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('All marked as read');
        }
    });

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    toast.info(payload.new.title, {
                        description: payload.new.message,
                        action: payload.new.action_url ? {
                            label: 'View',
                            onClick: () => navigate(payload.new.action_url)
                        } : undefined
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, navigate]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-success" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
            case 'error': return <X className="h-4 w-4 text-destructive" />;
            default: return <Info className="h-4 w-4 text-primary" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => markAllRead.mutate()}>
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                                    onClick={() => {
                                        if (!n.is_read) markAsRead.mutate(n.id);
                                        if (n.action_url) navigate(n.action_url);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1">{getIcon(n.type)}</div>
                                        <div className="flex-1 space-y-1">
                                            <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold' : ''}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground pt-1 uppercase">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-2" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-4 border-t text-center">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/notifications')}>
                        View all notifications
                        <ChevronRight className="ml-2 h-3 w-3" />
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
