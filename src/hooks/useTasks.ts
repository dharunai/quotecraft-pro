import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';
import { useAuth } from '@/contexts/AuthContext';

const tasksTable = () => (supabase as any).from('tasks');

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await tasksTable().select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Task[];
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async (): Promise<Task | null> => {
      if (!id) return null;
      const { data, error } = await tasksTable().select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Task | null;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { companyId, user } = useAuth();

  return useMutation({
    mutationFn: async (task: any) => {
      const { data, error } = await tasksTable()
        .insert({ ...task, company_id: companyId, created_by: user?.id || null })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...task }: any) => {
      const updateData: any = { ...task };
      if (task.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      const { data, error } = await tasksTable().update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tasksTable().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await tasksTable()
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task completed!');
      await triggerAutomation('task_completed', { task: { id: data.id, title: data.title } });
      await triggerWorkflows('task_completed', 'task', data.id, { id: data.id, title: data.title });
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
