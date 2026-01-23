import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Clock, AlertCircle, Filter, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';

export default function Tasks() {
    const queryClient = useQueryClient();
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data;
        }
    });

    const toggleTask = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase
                .from('tasks')
                .update({
                    status,
                    completed_at: status === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-destructive/20 text-destructive border-destructive/30';
            case 'high': return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
            case 'medium': return 'bg-primary/20 text-primary border-primary/30';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getDueDateStatus = (date: string | null) => {
        if (!date) return null;
        const d = new Date(date);
        if (isPast(d) && !isToday(d)) return <span className="text-destructive flex items-center gap-1 font-medium"><AlertCircle className="h-3 w-3" /> Overdue</span>;
        if (isToday(d)) return <span className="text-orange-500 flex items-center gap-1 font-medium"><Clock className="h-3 w-3" /> Today</span>;
        return <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(d, 'dd MMM')}</span>;
    };

    if (isLoading) return <AppLayout><p>Loading tasks...</p></AppLayout>;

    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">My Tasks</h1>
                        <p className="text-muted-foreground">Manage your follow-ups and CRM to-dos.</p>
                    </div>
                    <Button onClick={() => setIsNewTaskOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                    </Button>
                </div>

                <div className="grid lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-4">
                        {pendingTasks.length === 0 ? (
                            <div className="text-center py-12 border rounded-lg bg-card">
                                <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4 opacity-20" />
                                <p className="text-muted-foreground">All caught up! No pending tasks.</p>
                            </div>
                        ) : (
                            pendingTasks.map((task) => (
                                <Card key={task.id} className="hover:shadow-sm transition-shadow">
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <Checkbox
                                            className="mt-1"
                                            checked={task.status === 'completed'}
                                            onCheckedChange={(checked) => toggleTask.mutate({ id: task.id, status: checked ? 'completed' : 'pending' })}
                                        />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold">{task.title}</h3>
                                                <Badge className={getPriorityColor(task.priority)} variant="outline">
                                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                </Badge>
                                            </div>
                                            {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                                            <div className="flex items-center gap-4 pt-2 text-xs">
                                                {getDueDateStatus(task.due_date)}
                                                {task.entity_type && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 uppercase">
                                                        {task.entity_type}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}

                        {completedTasks.length > 0 && (
                            <div className="pt-6">
                                <h2 className="text-sm font-semibold text-muted-foreground mb-4">Completed</h2>
                                <div className="space-y-2 opacity-60">
                                    {completedTasks.map(task => (
                                        <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                            <Checkbox checked disabled />
                                            <span className="text-sm line-through text-muted-foreground">{task.title}</span>
                                            <span className="ml-auto text-[10px] text-muted-foreground">
                                                {task.completed_at ? format(new Date(task.completed_at), 'dd MMM') : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Pending</span>
                                    <span className="font-bold">{pendingTasks.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Due Today</span>
                                    <span className="font-bold text-orange-500">
                                        {tasks.filter(t => t.status !== 'completed' && t.due_date && isToday(new Date(t.due_date))).length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Overdue</span>
                                    <span className="font-bold text-destructive">
                                        {tasks.filter(t => t.status !== 'completed' && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* New Task Dialog logic omitted for brevity, but would handle title, description, due date, priority */}
            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground italic">Task creation form implementation in progress...</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancel</Button>
                        <Button onClick={() => setIsNewTaskOpen(false)}>Save Task</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
