import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, CheckSquare, Clock, Calendar, Trash2, Edit, CheckCircle2, Circle, AlertCircle, MoreVertical } from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useCompleteTask } from '@/hooks/useTasks';
import { Task } from '@/types/database';
import { format } from 'date-fns';
import { RecentActivityWidget } from '@/components/activity/ActivityTimeline';

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

export default function Tasks() {
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as Task['priority'],
    status: 'pending' as Task['status'],
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      status: 'pending',
    });
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
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      title: formData.title,
      description: formData.description || null,
      due_date: formData.due_date || null,
      priority: formData.priority,
      status: formData.status,
      entity_type: null,
      entity_id: null,
      assigned_to: null,
    };

    if (editingTask) {
      await updateTask.mutateAsync({ id: editingTask.id, ...taskData });
    } else {
      await createTask.mutateAsync(taskData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleComplete = async (task: Task) => {
    await completeTask.mutateAsync(task.id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status !== 'completed' && task.status !== 'cancelled';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const pendingTasksCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

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
            {/* Cleaner bottom bar */}
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
                  <CardTitle className="text-base font-bold text-slate-900">Upcoming Tasks</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Below are some of the upcoming tasks.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="text-xs h-7"
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === 'pending' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                    className="text-xs h-7"
                  >
                    Pending
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-50">
                      <TableHead className="w-[40%] text-xs font-semibold text-slate-500 pl-6 h-10">Assigned User</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 h-10">Due Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 h-10">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-500 pr-6 h-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                          No tasks found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task) => (
                        <TableRow key={task.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 bg-slate-100 border border-slate-200">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.id}`} />
                                <AvatarFallback className="text-xs text-slate-500">
                                  {task.title.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {task.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {task.description || 'No description'}
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
                          <TableCell className="text-right pr-6 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900" onClick={() => openEditDialog(task)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-green-600" onClick={() => handleComplete(task)}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleDelete(task.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Activity */}
          <div className="lg:col-span-4 space-y-6">
            <RecentActivityWidget maxItems={8} />
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="rounded-sm">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createTask.isPending || updateTask.isPending} className="rounded-sm">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
