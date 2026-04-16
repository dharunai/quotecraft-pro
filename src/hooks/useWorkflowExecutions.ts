import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { WorkflowExecution, WorkflowExecutionStep } from "@/types/database";

const execTable = () => (supabase as any).from("workflow_executions");

const transformExecution = (item: any): WorkflowExecution => ({
  ...item,
  steps_executed: (item.steps_executed || []) as WorkflowExecutionStep[],
});

export const useWorkflowExecutions = (workflowId?: string) => {
  return useQuery({
    queryKey: ["workflow-executions", workflowId],
    queryFn: async () => {
      let query = execTable()
        .select(`*, workflow:workflow_definitions(id, name)`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (workflowId) query = query.eq("workflow_id", workflowId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...transformExecution(item),
        workflow: item.workflow,
      })) as any[];
    },
    refetchInterval: 5000,
  });
};

export const useWorkflowExecution = (id: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-executions", "detail", id],
    queryFn: async () => {
      if (!id) throw new Error("No execution ID");
      const { data, error } = await execTable()
        .select(`*, workflow:workflow_definitions(*)`)
        .eq("id", id).single();
      if (error) throw error;
      return { ...transformExecution(data), workflow: data.workflow } as any;
    },
    enabled: !!id,
  });
};

export const useCancelExecution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await execTable()
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", id).eq("status", "running").select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
      toast({ title: "Execution cancelled" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useRetryExecution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await execTable().select("*").eq("id", id).single();
      if (fetchError) throw fetchError;
      const { data, error } = await execTable().insert([{
        workflow_id: original.workflow_id,
        trigger_event: original.trigger_event,
        trigger_data: original.trigger_data,
        entity_type: original.entity_type,
        entity_id: original.entity_id,
        status: "running",
        retry_count: (original.retry_count || 0) + 1,
      }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
      toast({ title: "Execution retried" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useWorkflowExecutionStats = (workflowId?: string) => {
  return useQuery({
    queryKey: ["workflow-executions", "stats", workflowId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      let query = execTable()
        .select("status, started_at, duration_ms")
        .gte("started_at", thirtyDaysAgo.toISOString());
      if (workflowId) query = query.eq("workflow_id", workflowId);
      const { data, error } = await query;
      if (error) throw error;
      const executions = data || [];
      const total = executions.length;
      const success = executions.filter((e: any) => e.status === "completed").length;
      const failed = executions.filter((e: any) => e.status === "failed").length;
      const running = executions.filter((e: any) => e.status === "running").length;
      const completed = executions.filter((e: any) => e.duration_ms != null);
      const avg = completed.length > 0 ? completed.reduce((s: number, e: any) => s + (e.duration_ms || 0), 0) / completed.length : 0;
      const rate = total > 0 ? (success / total) * 100 : 0;
      return {
        totalExecutions: total, successCount: success, failedCount: failed, runningCount: running,
        successRate: Math.round(rate * 10) / 10, avgDurationMs: Math.round(avg),
        last30Days: { total, success, failed },
      };
    },
    refetchInterval: 30000,
  });
};

export const useStartWorkflowExecution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ workflowId, triggerData }: { workflowId: string; triggerData?: Record<string, any> }) => {
      const { data, error } = await execTable().insert([{
        workflow_id: workflowId, trigger_event: "manual", trigger_data: triggerData || {}, status: "running",
      }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
      toast({ title: "Workflow started" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};
