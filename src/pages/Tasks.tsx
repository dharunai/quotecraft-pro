import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus, CheckSquare, Clock, Trash2, Edit, CheckCircle2, MoreVertical,
  Users, Eye, UserCheck, UserPlus as UserPlusIcon, Forward, ArrowRightLeft
} from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useCompleteTask } from '@/hooks/useTasks';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { Task, TaskAssignment } from '@/types/database';
import { getAvatarUrl } from '@/lib/avatars';
import { format } from 'date-fns';
import { RecentActivityWidget } from '@/components/activity/ActivityTimeline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifyTaskAssigned, notifyTaskDelegated, notifyTaskCompleted, notifyTaskReassigned } from '@/lib/taskNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  medium: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  high: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  urgent: 'bg-red-50 text-red-700 hover:bg-red-100',
};

const statusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

type FilterType = 'all' | 'assigned_to_me' | 'created_by_me' | 'my_team' | 'watching';

export default function Tasks() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const queryClient = useQueryClient();

  const {
    allProfiles,
    currentProfile,
    getAssignableProfiles,
    canCurrentUserAssign,
    getMySubordinateIds,
  } = useTeamHierarchy();

  // Fetch task assignments for collaborators display
  const { data: taskAssignments = [] } = useQuery({
    queryKey: ['task-assignments'],
    queryFn: async (): Promise<TaskAssignment[]> => {
      const { data, error } = await supabase
        .from('task_assignments')
        .select('*');
      if (error) throw error;
      return (data || []) as TaskAssignment[];
    },
  });

  // Fetch leads and deals for "Related to" dropdown
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, company_name, contact_name')
        .order('company_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, deal_value, stage, lead:leads(company_name, contact_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch task templates
  const { data: taskTemplates = [] } = useQuery({
    queryKey: ['task-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates' as any) // Added 'as any'
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // --- State ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailSheetTask, setDetailSheetTask] = useState<Task | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as Task['priority'],
    status: 'pending' as Task['status'],
    assigned_to: null as string | null,
    entity_type: '' as string,
    entity_id: '' as string,
    // Part 5: Recurring
    is_recurring: false,
    recurring_pattern: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurring_interval: 1,
    recurring_end_date: '',
  });
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  // Delegate modal state
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [delegateTask, setDelegateTask] = useState<Task | null>(null);
  const [delegateTo, setDelegateTo] = useState<string | null>(null);
  const [delegateReason, setDelegateReason] = useState('');
  const [delegateKeepWatcher, setDelegateKeepWatcher] = useState(true);
  const [delegating, setDelegating] = useState(false);

  // Reassign modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [reassignTo, setReassignTo] = useState<string | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [reassignCollaborators, setReassignCollaborators] = useState<string[]>([]);
  const [reassigning, setReassigning] = useState(false);

  const assignableProfiles = useMemo(() => getAssignableProfiles(), [allProfiles, currentProfile]);
  const canAssign = canCurrentUserAssign();

  // --- Permission helpers ---
  const isManager = (currentProfile?.hierarchy_level ?? 2) <= 1;

  const canDelegate = (task: Task): boolean => {
    if (!currentProfile) return false;
    // Current assignee can delegate
    if (task.assigned_to === currentProfile.id) return true;
    // Managers can delegate
    if (isManager) return true;
    return false;
  };

  const canReassign = (task: Task): boolean => {
    if (!currentProfile) return false;
    // Task creator can reassign
    if ((task as any).created_by === user?.id) return true;
    // Managers can reassign
    if (isManager) return true;
    return false;
  };

  // --- Form helpers ---
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      status: 'pending',
      assigned_to: currentProfile?.id || null,
      entity_type: '',
      entity_id: '',
      is_recurring: false,
      recurring_pattern: 'weekly',
      recurring_interval: 1,
      recurring_end_date: '',
    });
    setSelectedCollaborators([]);
    setEditingTask(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to,
      entity_type: task.entity_type || '',
      entity_id: task.entity_id || '',
      is_recurring: (task as any).is_recurring || false,
      recurring_pattern: (task as any).recurring_pattern || 'weekly',
      recurring_interval: (task as any).recurring_interval || 1,
      recurring_end_date: (task as any).recurring_end_date || '',
    });
    const existingCollabs = taskAssignments
      .filter(ta => ta.task_id === task.id)
      .map(ta => ta.user_id);
    setSelectedCollaborators(existingCollabs);
    setIsDialogOpen(true);
  };

  // --- Delegate ---
  const openDelegateModal = (task: Task) => {
    setDelegateTask(task);
    setDelegateTo(null);
    setDelegateReason('');
    setDelegateKeepWatcher(true);
    setDelegateModalOpen(true);
  };

  const handleDelegate = async () => {
    if (!delegateTask || !delegateTo || !currentProfile) return;
    setDelegating(true);

    try {
      const oldAssignee = delegateTask.assigned_to;
      const currentWatchers: string[] = Array.isArray((delegateTask as any).watchers) ? (delegateTask as any).watchers : [];
      const updatedWatchers = delegateKeepWatcher && oldAssignee && !currentWatchers.includes(oldAssignee)
        ? [...currentWatchers, oldAssignee]
        : currentWatchers;

      // Update task: new assignee, set delegated_from, update watchers
      await supabase
        .from('tasks')
        .update({
          assigned_to: delegateTo,
          delegated_from: oldAssignee,
          watchers: updatedWatchers,
        } as any)
        .eq('id', delegateTask.id);

      // Send delegation emails
      const newAssigneeProfile = allProfiles.find(p => p.id === delegateTo);
      const oldAssigneeProfile = oldAssignee ? allProfiles.find(p => p.id === oldAssignee) : null;
      if (newAssigneeProfile && currentProfile) {
        notifyTaskDelegated(
          { id: delegateTask.id, title: delegateTask.title, priority: delegateTask.priority, due_date: delegateTask.due_date },
          newAssigneeProfile,
          oldAssigneeProfile || null,
          currentProfile,
          delegateReason || undefined,
        );
      }

      // Update task_assignments: make old assignee non-primary, new assignee primary
      // Remove old primary
      if (oldAssignee) {
        await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', delegateTask.id)
          .eq('user_id', oldAssignee);
      }
      // Insert new primary
      await supabase
        .from('task_assignments')
        .upsert({
          task_id: delegateTask.id,
          user_id: delegateTo,
          assigned_by: currentProfile.id,
        } as any, { onConflict: 'task_id,user_id' })
        .select();

      // Log in task_history
      await supabase
        .from('task_history' as any) // Added 'as any'
        .insert({
          task_id: delegateTask.id,
          action: 'delegated',
          from_user_id: oldAssignee,
          to_user_id: delegateTo,
          performed_by: currentProfile.id,
          reason: delegateReason || null,
          metadata: { keep_as_watcher: delegateKeepWatcher },
        } as any);

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      toast.success('Task delegated successfully');
      setDelegateModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to delegate: ' + (err?.message || 'Unknown error'));
    } finally {
      setDelegating(false);
    }
  };

  // --- Reassign ---
  const openReassignModal = (task: Task) => {
    setReassignTask(task);
    setReassignTo(task.assigned_to);
    setReassignReason('');
    const existingCollabs = taskAssignments
      .filter(ta => ta.task_id === task.id)
      .map(ta => ta.user_id);
    setReassignCollaborators(existingCollabs);
    setReassignModalOpen(true);
  };

  const handleReassign = async () => {
    if (!reassignTask || !reassignTo || !currentProfile) return;
    setReassigning(true);

    try {
      const oldAssignee = reassignTask.assigned_to;

      // Update task assigned_to
      await supabase
        .from('tasks')
        .update({ assigned_to: reassignTo } as any)
        .eq('id', reassignTask.id);

      // Replace collaborators
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', reassignTask.id);

      if (reassignCollaborators.length > 0) {
        const assignments = reassignCollaborators.map(userId => ({
          task_id: reassignTask.id,
          user_id: userId,
          assigned_by: currentProfile.id,
        }));
        await supabase.from('task_assignments').insert(assignments as any);
      }

      // Log in task_history
      await supabase
        .from('task_history' as any)
        .insert({
          task_id: reassignTask.id,
          action: 'reassigned',
          performed_by: currentProfile.id,
          reason: reassignReason || null,
          metadata: {
            previous_assignee: oldAssignee,
            new_assignee: reassignTo,
            collaborators: reassignCollaborators,
          },
        } as any);

      // Send reassignment email
      const newAssigneeProf = allProfiles.find(p => p.id === reassignTo);
      if (newAssigneeProf && currentProfile) {
        notifyTaskReassigned(
          { id: reassignTask.id, title: reassignTask.title, priority: reassignTask.priority, due_date: reassignTask.due_date },
          newAssigneeProf,
          currentProfile,
        );
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      toast.success('Task reassigned successfully');
      setReassignModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to reassign: ' + (err?.message || 'Unknown error'));
    } finally {
      setReassigning(false);
    }
  };

  const toggleReassignCollaborator = (profileId: string) => {
    setReassignCollaborators(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  // --- Create/Edit submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.assigned_to && formData.assigned_to !== currentProfile?.id && !canAssign) {
      toast.error('You do not have permission to assign tasks to others.');
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description || null,
      due_date: formData.due_date || null,
      priority: formData.priority,
      status: formData.status,
      entity_type: formData.entity_type || null,
      entity_id: formData.entity_id || null,
      assigned_to: formData.assigned_to,
      // Part 5
      is_recurring: formData.is_recurring,
      recurring_pattern: formData.is_recurring ? formData.recurring_pattern : null,
      recurring_interval: formData.is_recurring ? formData.recurring_interval : null,
      recurring_end_date: formData.is_recurring ? formData.recurring_end_date || null : null,
      recurring_next_date: (formData.is_recurring && formData.due_date) ? formData.due_date : null,
    };

    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...taskData });
        await supabase.from('task_assignments').delete().eq('task_id', editingTask.id);
        if (selectedCollaborators.length > 0) {
          const assignments = selectedCollaborators.map(userId => ({
            task_id: editingTask.id,
            user_id: userId,
            assigned_by: currentProfile?.id || null,
          }));
          await supabase.from('task_assignments').insert(assignments as any);
        }
      } else {
        const result = await createTask.mutateAsync(taskData as any);
        if (selectedCollaborators.length > 0 && result?.id) {
          const assignments = selectedCollaborators.map(userId => ({
            task_id: result.id,
            user_id: userId,
            assigned_by: currentProfile?.id || null,
          }));
          await supabase.from('task_assignments').insert(assignments as any);
        }

        // Send email notification to assignee on create
        if (result?.id && formData.assigned_to && currentProfile) {
          const assignee = allProfiles.find(p => p.id === formData.assigned_to);
          if (assignee && assignee.id !== currentProfile.id) {
            notifyTaskAssigned(
              { id: result.id, title: formData.title, description: formData.description, priority: formData.priority, due_date: formData.due_date },
              assignee,
              currentProfile,
            );
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error('Failed: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleComplete = async (task: Task) => {
    await completeTask.mutateAsync(task.id);

    // Send completion email to task creator
    if (currentProfile && (task as any).created_by) {
      // Find the creator profile by auth user_id
      const creatorProfile = allProfiles.find(p => p.user_id === (task as any).created_by);
      if (creatorProfile && creatorProfile.id !== currentProfile.id) {
        notifyTaskCompleted(
          { id: task.id, title: task.title },
          currentProfile,
          creatorProfile,
        );
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id);
    }
  };

  const toggleCollaborator = (profileId: string) => {
    setSelectedCollaborators(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  // --- Filtered tasks ---
  const filteredTasks = useMemo(() => {
    const myProfileId = currentProfile?.id;
    const subordinateIds = getMySubordinateIds();

    switch (filter) {
      case 'assigned_to_me':
        return tasks.filter(t => t.assigned_to === myProfileId);
      case 'created_by_me':
        return tasks.filter(t => (t as any).created_by === user?.id);
      case 'my_team':
        return tasks.filter(t => t.assigned_to && subordinateIds.includes(t.assigned_to));
      case 'watching':
        return tasks.filter(t => {
          const watchers = (t as any).watchers;
          return Array.isArray(watchers) && myProfileId && watchers.includes(myProfileId);
        });
      case 'all':
      default:
        return tasks;
    }
  }, [tasks, filter, currentProfile, user]);

  const pendingTasksCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return null;
    const profile = allProfiles.find(p => p.id === profileId);
    return profile?.full_name || profile?.email || null;
  };

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'assigned_to_me', label: 'Assigned to Me' },
    { key: 'created_by_me', label: 'Created by Me' },
    { key: 'my_team', label: 'My Team' },
    { key: 'watching', label: 'Watching' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 font-sans">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Task Overview</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Review details of your recent projects and tasks.
            </p>
          </div>
          <Button onClick={openNewDialog} size="sm" className="h-9 gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-none border-none shadow-sm bg-white relative overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming Tasks</p>
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-slate-400" />
                  <span className="text-3xl font-bold text-slate-900">{pendingTasksCount}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-900" />
          </Card>

          <Card className="rounded-none border-none shadow-sm bg-white relative overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tasks Completed</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <span className="text-3xl font-bold text-slate-900">{completedTasksCount}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </CardContent>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-teal-500" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content - Task Table */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="rounded-none border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-slate-50">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Tasks</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </CardHeader>

              {/* Filter Tabs */}
              <div className="px-6 pt-3 pb-2 flex gap-1 flex-wrap border-b border-slate-100">
                {filterTabs.map(tab => (
                  <Button
                    key={tab.key}
                    variant={filter === tab.key ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter(tab.key)}
                    className={`text-xs h-7 rounded-full ${filter === tab.key ? 'border-slate-300 bg-white text-slate-900 font-semibold hover:bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-50">
                      <TableHead className="w-[35%] text-xs font-semibold text-slate-500 pl-6 h-10">Task / Assignee</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 h-10">Due Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 h-10">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 h-10">Collaborators</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-500 pr-6 h-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                          No tasks found for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task) => {
                        const assigneeName = getProfileName(task.assigned_to);
                        const collabs = taskAssignments.filter(ta => ta.task_id === task.id);
                        const showDelegate = canDelegate(task);
                        const showReassign = canReassign(task);
                        return (
                          <TableRow key={task.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-6 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 bg-slate-100 border border-slate-200">
                                  {task.assigned_to ? (
                                    <>
                                      <AvatarImage src={getAvatarUrl(assigneeName || task.assigned_to)} />
                                      <AvatarFallback className="text-xs text-slate-500">
                                        {assigneeName?.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </>
                                  ) : (
                                    <AvatarFallback className="text-xs">?</AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    <Button
                                      variant="link"
                                      className="p-0 h-auto font-medium text-slate-900 hover:text-blue-600"
                                      onClick={() => {
                                        setDetailSheetTask(task);
                                        setIsDetailSheetOpen(true);
                                      }}
                                    >
                                      {task.title}
                                    </Button>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {assigneeName ? `Assigned to: ${assigneeName}` : (task.description || 'Unassigned')}
                                    {(task as any).delegated_from && (
                                      <span className="ml-1.5 text-amber-600">
                                        (delegated from {getProfileName((task as any).delegated_from) || 'someone'})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              {task.due_date ? (
                                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                  <span className={new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-600' : ''}>
                                    {format(new Date(task.due_date), 'EEE, MMM d')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge variant="outline" className={`rounded-sm px-2.5 py-0.5 text-[10px] font-semibold border ${statusColors[task.status]}`}>
                                {task.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3">
                              {collabs.length > 0 ? (
                                <div className="flex -space-x-1">
                                  {collabs.slice(0, 3).map(c => {
                                    const name = getProfileName(c.user_id);
                                    return (
                                      <Avatar key={c.id} className="h-6 w-6 border-2 border-white">
                                        <AvatarImage src={getAvatarUrl(name || c.user_id)} />
                                        <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                                          {name ? name.substring(0, 2).toUpperCase() : '??'}
                                        </AvatarFallback>
                                      </Avatar>
                                    );
                                  })}
                                  {collabs.length > 3 && (
                                    <span className="text-xs text-muted-foreground ml-2">+{collabs.length - 3}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6 py-3">
                              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                        onClick={() => {
                                          setDetailSheetTask(task);
                                          setIsDetailSheetOpen(true);
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">View Details</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => openEditDialog(task)}>
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Edit Task</TooltipContent>
                                  </Tooltip>

                                  {showDelegate && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => openDelegateModal(task)}>
                                          <Forward className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Delegate</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {showReassign && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={() => openReassignModal(task)}>
                                          <ArrowRightLeft className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Reassign</TooltipContent>
                                    </Tooltip>
                                  )}

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-green-600 hover:bg-green-50" onClick={() => handleComplete(task)}>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Complete</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(task.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Delete</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Task Summary */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-none border-none shadow-sm bg-white">
              <CardHeader className="py-4 px-6 border-b border-slate-50">
                <CardTitle className="text-sm font-bold text-slate-900">Task Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Priority Breakdown */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">By Priority</p>
                  <div className="space-y-2">
                    {(['urgent', 'high', 'medium', 'low'] as const).map(priority => {
                      const count = tasks.filter(t => t.priority === priority && t.status !== 'completed').length;
                      const pct = tasks.length > 0 ? Math.round((count / Math.max(tasks.filter(t => t.status !== 'completed').length, 1)) * 100) : 0;
                      const barColors: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-blue-400', low: 'bg-slate-300' };
                      return (
                        <div key={priority} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-14 capitalize">{priority}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColors[priority]}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status Summary */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">By Status</p>
                  <div className="space-y-2">
                    {(['pending', 'in_progress', 'completed', 'cancelled'] as const).map(status => {
                      const count = tasks.filter(t => t.status === status).length;
                      const labels: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
                      const dotColors: Record<string, string> = { pending: 'bg-slate-400', in_progress: 'bg-blue-500', completed: 'bg-green-500', cancelled: 'bg-red-400' };
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${dotColors[status]}`} />
                            <span className="text-xs text-slate-600">{labels[status]}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overdue count */}
                {(() => {
                  const now = new Date();
                  const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'completed' && t.status !== 'cancelled').length;
                  const dueTodayCount = tasks.filter(t => {
                    if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
                    const d = new Date(t.due_date);
                    return d.toDateString() === now.toDateString();
                  }).length;
                  return (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {overdueCount > 0 && (
                        <div className="flex items-center justify-between bg-red-50 rounded-md px-3 py-2">
                          <span className="text-xs text-red-700">Overdue</span>
                          <span className="text-xs font-bold text-red-700">{overdueCount}</span>
                        </div>
                      )}
                      {dueTodayCount > 0 && (
                        <div className="flex items-center justify-between bg-amber-50 rounded-md px-3 py-2">
                          <span className="text-xs text-amber-700">Due Today</span>
                          <span className="text-xs font-bold text-amber-700">{dueTodayCount}</span>
                        </div>
                      )}
                      {overdueCount === 0 && dueTodayCount === 0 && (
                        <p className="text-xs text-slate-400 text-center py-1">No urgent deadlines</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ==================== CREATE / EDIT DIALOG ==================== */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Template Selection */}
              {!editingTask && taskTemplates.length > 0 && (
                <div className="space-y-2 pb-2 border-b border-slate-50">
                  <Label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Quick Start</Label>
                  <Select onValueChange={(templateId) => {
                    const template = taskTemplates.find((t: any) => t.id === templateId) as any;
                    if (template) {
                      const dueDate = template.default_due_days
                        ? new Date(Date.now() + (template.default_due_days as number) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        : '';
                      setFormData({
                        ...formData,
                        title: template.name as string,
                        description: (template.description || '') as string,
                        priority: (template.default_priority || 'medium') as Task['priority'],
                        due_date: dueDate,
                      });
                      toast.success(`Applied template: ${template.name}`);
                    }
                  }}>
                    <SelectTrigger className="h-9 text-xs border-dashed border-slate-300 bg-slate-50/50">
                      <SelectValue placeholder="Use Task Template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTemplates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title"
                  required
                  className="h-9 text-sm rounded-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details..."
                  rows={3}
                  className="text-sm resize-none rounded-sm"
                />
              </div>

              {/* Related To — Lead or Deal */}
              <div className="space-y-2">
                <Label className="text-xs">Related To</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={formData.entity_type || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, entity_type: value === 'none' ? '' : value, entity_id: '' })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="deal">Deal</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.entity_type && (
                    <Select
                      value={formData.entity_id || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, entity_id: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-sm">
                        <SelectValue placeholder={`Select ${formData.entity_type}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {formData.entity_type === 'lead'
                          ? leads.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.contact_name || item.company_name || 'Unnamed Lead'}
                              {item.company_name && item.contact_name ? ` (${item.company_name})` : ''}
                            </SelectItem>
                          ))
                          : deals.map((item: any) => {
                            const lead = item.lead;
                            const label = lead?.company_name || lead?.contact_name || `Deal #${item.id.slice(0, 6)}`;
                            return (
                              <SelectItem key={item.id} value={item.id}>
                                {label} — {item.stage}
                              </SelectItem>
                            );
                          })
                        }
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-xs">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="h-9 text-sm rounded-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-xs">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: Task['priority']) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recurring Section */}
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <Label htmlFor="is_recurring" className="text-xs font-semibold">Make this Recurring</Label>
                  </div>
                  <Checkbox
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: !!checked })}
                  />
                </div>

                {formData.is_recurring && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Pattern</Label>
                      <Select
                        value={formData.recurring_pattern}
                        onValueChange={(val: any) => setFormData({ ...formData, recurring_pattern: val })}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Every X {formData.recurring_pattern === 'daily' ? 'Days' : formData.recurring_pattern === 'weekly' ? 'Weeks' : 'Months'}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.recurring_interval}
                        onChange={(e) => setFormData({ ...formData, recurring_interval: parseInt(e.target.value) || 1 })}
                        className="h-8 text-xs rounded-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned To - hierarchy filtered */}
              <div className="space-y-2">
                <Label htmlFor="assigned_to" className="text-xs">Assign To</Label>
                <Select
                  value={formData.assigned_to || "unassigned"}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value === "unassigned" ? null : value })}
                >
                  <SelectTrigger className="h-9 text-sm rounded-sm">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignableProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <span>{profile.full_name || profile.email}</span>
                          {profile.id === currentProfile?.id && (
                            <span className="text-[10px] text-muted-foreground">(You)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canAssign && formData.assigned_to && formData.assigned_to !== currentProfile?.id && (
                  <p className="text-[11px] text-red-500">You don't have permission to assign to others.</p>
                )}
              </div>

              {/* Collaborators - multi-select */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <UserPlusIcon className="h-3 w-3" />
                  Collaborators
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-start h-9 text-sm rounded-sm font-normal">
                      {selectedCollaborators.length > 0
                        ? `${selectedCollaborators.length} collaborator${selectedCollaborators.length > 1 ? 's' : ''} selected`
                        : 'Add collaborators...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-2" align="start">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {allProfiles
                        .filter(p => p.id !== formData.assigned_to)
                        .map(profile => (
                          <label key={profile.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <Checkbox
                              checked={selectedCollaborators.includes(profile.id)}
                              onCheckedChange={() => toggleCollaborator(profile.id)}
                            />
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {(profile.full_name || profile.email || '??').substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{profile.full_name || profile.email}</span>
                            {profile.id === currentProfile?.id && (
                              <span className="text-[10px] text-muted-foreground">(You)</span>
                            )}
                          </label>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedCollaborators.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCollaborators.map(id => {
                      const p = allProfiles.find(pr => pr.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                          {p?.full_name || p?.email || 'Unknown'}
                          <button type="button" onClick={() => toggleCollaborator(id)} className="ml-0.5 hover:text-red-500">×</button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {editingTask && (
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Task['status']) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="rounded-sm">Cancel</Button>
                <Button type="submit" size="sm" disabled={createTask.isPending || updateTask.isPending} className="rounded-sm">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ==================== DELEGATE MODAL ==================== */}
        <Dialog open={delegateModalOpen} onOpenChange={setDelegateModalOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Forward className="h-5 w-5 text-slate-700" />
                Delegate Task
              </DialogTitle>
              <DialogDescription className="text-xs">
                Transfer this task to another team member. You can stay as a watcher.
              </DialogDescription>
            </DialogHeader>
            {delegateTask && (
              <div className="space-y-4 py-2">
                {/* Task being delegated */}
                <div className="bg-slate-50 rounded-md px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">{delegateTask.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Currently assigned to: {getProfileName(delegateTask.assigned_to) || 'Unassigned'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Delegate To *</Label>
                  <Select value={delegateTo || ""} onValueChange={setDelegateTo}>
                    <SelectTrigger className="h-9 text-sm rounded-sm">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProfiles
                        .filter(p => p.id !== delegateTask.assigned_to)
                        .map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email}
                            {profile.id === currentProfile?.id ? ' (You)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Reason (optional)</Label>
                  <Textarea
                    value={delegateReason}
                    onChange={(e) => setDelegateReason(e.target.value)}
                    placeholder="Why are you delegating this task?"
                    rows={2}
                    className="text-sm resize-none rounded-sm"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={delegateKeepWatcher}
                    onCheckedChange={(checked) => setDelegateKeepWatcher(checked === true)}
                  />
                  <span className="text-sm">Keep me as a watcher</span>
                </label>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDelegateModalOpen(false)} className="rounded-sm">Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleDelegate}
                    disabled={!delegateTo || delegating}
                    className="rounded-sm bg-slate-900 hover:bg-slate-800"
                  >
                    {delegating ? 'Delegating...' : 'Delegate'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ==================== REASSIGN MODAL ==================== */}
        <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-slate-700" />
                Reassign Task
              </DialogTitle>
              <DialogDescription className="text-xs">
                Change the primary assignee and collaborators for this task.
              </DialogDescription>
            </DialogHeader>
            {reassignTask && (
              <div className="space-y-4 py-2">
                {/* Task info */}
                <div className="bg-slate-50 rounded-md px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">{reassignTask.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Currently assigned to: {getProfileName(reassignTask.assigned_to) || 'Unassigned'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Reassign To *</Label>
                  <Select value={reassignTo || ""} onValueChange={setReassignTo}>
                    <SelectTrigger className="h-9 text-sm rounded-sm">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableProfiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                          {profile.id === currentProfile?.id ? ' (You)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Collaborators for reassign */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Collaborators
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" type="button" className="w-full justify-start h-9 text-sm rounded-sm font-normal">
                        {reassignCollaborators.length > 0
                          ? `${reassignCollaborators.length} collaborator${reassignCollaborators.length > 1 ? 's' : ''}`
                          : 'Add collaborators...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="start">
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {allProfiles
                          .filter(p => p.id !== reassignTo)
                          .map(profile => (
                            <label key={profile.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                              <Checkbox
                                checked={reassignCollaborators.includes(profile.id)}
                                onCheckedChange={() => toggleReassignCollaborator(profile.id)}
                              />
                              <span className="text-sm">{profile.full_name || profile.email}</span>
                            </label>
                          ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {reassignCollaborators.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reassignCollaborators.map(id => {
                        const p = allProfiles.find(pr => pr.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                            {p?.full_name || p?.email || 'Unknown'}
                            <button type="button" onClick={() => toggleReassignCollaborator(id)} className="ml-0.5 hover:text-red-500">×</button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Reason (optional)</Label>
                  <Textarea
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="Why are you reassigning?"
                    rows={2}
                    className="text-sm resize-none rounded-sm"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReassignModalOpen(false)} className="rounded-sm">Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleReassign}
                    disabled={!reassignTo || reassigning}
                    className="rounded-sm bg-slate-900 hover:bg-slate-800"
                  >
                    {reassigning ? 'Reassigning...' : 'Reassign'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <TaskDetailSheet
        task={detailSheetTask}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onTaskUpdate={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
      />
    </AppLayout>
  );
}
