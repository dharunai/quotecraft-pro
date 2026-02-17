import React, { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Clock, Send, AtSign, CheckCircle2, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseMentions, processMentions } from '@/lib/taskMentions';
import { getAvatarUrl } from '@/lib/avatars';

interface Task {
    id: string;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    due_date: string | null;
    assigned_to: string | null;
    entity_type?: string;
    entity_id?: string;
}

interface Comment {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
    };
}

interface HistoryItem {
    id: string;
    action: string;
    performed_by: string;
    metadata: any;
    created_at: string;
    profiles: {
        full_name: string | null;
    };
}

interface TaskDetailSheetProps {
    task: Task | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTaskUpdate?: () => void;
}

export function TaskDetailSheet({ task, open, onOpenChange, onTaskUpdate }: TaskDetailSheetProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [comments, setComments] = useState<Comment[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (task && open) {
            fetchComments();
            fetchHistory();
        }
    }, [task, open]);

    const fetchComments = async () => {
        if (!task) return;
        const { data, error } = await supabase
            .from('task_comments' as any)
            .select('*, profiles(full_name, avatar_url)')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setComments(data as any);
        }
    };

    const fetchHistory = async () => {
        if (!task) return;
        const { data, error } = await supabase
            .from('task_history' as any)
            .select('*, profiles:performed_by(full_name)')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setHistory(data as any);
        }
    };

    const handleAddComment = async () => {
        if (!task || !user || !newComment.trim()) return;

        setIsSubmitting(true);
        try {
            // 1. Parse mentions in the content
            const mentionedUserIds = await parseMentions(newComment);

            // 2. Insert comment
            const { data: commentData, error: commentError } = await supabase
                .from('task_comments' as any)
                .insert({
                    task_id: task.id,
                    user_id: user.id,
                    content: newComment,
                    mentions: mentionedUserIds,
                })
                .select('*, profiles(full_name, avatar_url)')
                .single();

            if (commentError) throw commentError;

            // 3. Process mentions (send notifications)
            const { data: currentUserProfile } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', user.id)
                .single();

            if (currentUserProfile) {
                processMentions(
                    { id: task.id, title: task.title },
                    newComment,
                    currentUserProfile as any,
                    mentionedUserIds
                );
            }

            setComments([...comments, commentData as any]);
            setNewComment('');
            toast({ title: 'Comment added' });
        } catch (error: any) {
            toast({ title: 'Error adding comment', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTaskStatus = async () => {
        if (!task) return;
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        setIsLoading(true);
        const { error } = await supabase
            .from('tasks')
            .update({
                status: newStatus,
                completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            })
            .eq('id', task.id);

        if (!error) {
            // Log history
            await supabase.from('task_history' as any).insert({
                task_id: task.id,
                action: newStatus === 'completed' ? 'completed' : 'reopened',
                performed_by: user?.id,
                metadata: { status: newStatus }
            });

            onTaskUpdate?.();
            toast({ title: `Task ${newStatus === 'completed' ? 'completed' : 'reopened'}` });
            fetchHistory();
        }
        setIsLoading(false);
    };

    if (!task) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
                <SheetHeader className="space-y-4 pr-6">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-full transition-colors bg-transparent hover:bg-slate-100 ${task.status === 'completed' ? 'text-green-600' : 'text-slate-400'}`}
                            onClick={toggleTaskStatus}
                            disabled={isLoading}
                        >
                            {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </Button>
                        <SheetTitle className="text-xl font-bold line-clamp-2">{task.title}</SheetTitle>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'} className="capitalize">
                            {task.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                            {task.status.replace('_', ' ')}
                        </Badge>
                        {task.due_date && (
                            <div className="flex items-center gap-1 text-slate-500 ml-auto">
                                <Clock className="h-3 w-3" />
                                <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </SheetHeader>

                <div className="mt-8 space-y-8 pb-8">
                    {/* Description */}
                    {task.description && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-slate-900">Description</h3>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                {task.description}
                            </p>
                        </div>
                    )}

                    <Separator />

                    {/* Comments Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                            <MessageSquare className="h-4 w-4" />
                            <h3 className="text-sm">Comments</h3>
                        </div>

                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.profiles.avatar_url || getAvatarUrl(comment.profiles.full_name || 'User')} />
                                        <AvatarFallback>{comment.profiles.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-900">
                                                {comment.profiles.full_name || 'User'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-r-lg rounded-bl-lg">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            <div className="space-y-2 pt-2">
                                <div className="relative">
                                    <Textarea
                                        placeholder="Add a comment... (use @[Name] to mention)"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="min-h-[80px] text-sm resize-none pr-10"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute bottom-2 right-2 h-7 w-7 text-slate-400 hover:text-blue-500 hover:bg-slate-100 bg-transparent flex items-center justify-center"
                                        onClick={handleAddComment}
                                        disabled={isSubmitting || !newComment.trim()}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <AtSign className="h-3 w-3" />
                                    Use @[Full Name] to mention team members
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* History Timeline */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold">
                            <Clock className="h-4 w-4" />
                            <h3 className="text-sm">History</h3>
                        </div>

                        <div className="relative border-l border-slate-100 ml-3.5 space-y-6 pb-2">
                            {history.map((item) => (
                                <div key={item.id} className="relative pl-6">
                                    <div className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-white" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-900">
                                            {item.profiles?.full_name || 'Someone'} {item.action.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {item.metadata?.reason && (
                                        <p className="text-xs text-slate-500 mt-1 italic">"{item.metadata.reason}"</p>
                                    )}
                                </div>
                            ))}
                            {history.length === 0 && (
                                <p className="text-xs text-slate-400 pl-6">No history yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
