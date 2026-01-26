import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { WorkflowExecution, WorkflowExecutionStep } from "@/types/database";

// Helper to transform DB response
const transformExecution = (item: any): WorkflowExecution => ({
  ...item,
  steps_executed: (item.steps_executed || []) as WorkflowExecutionStep[],
});

// Fetch executions for a workflow
export const useWorkflowExecutions = (workflowId?: string) => {
  return useQuery({
    queryKey: ["workflow-executions", workflowId],
    queryFn: async () => {
      let query = supabase
        .from("workflow_executions")
        .select(`
          *,
          workflow:workflow_definitions(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...transformExecution(item),
        workflow: item.workflow,
      })) as (WorkflowExecution & { workflow: { id: string; name: string } })[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds to show live updates
  });
};

// Fetch a single execution
export const useWorkflowExecution = (id: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-executions", "detail", id],
    queryFn: async () => {
      if (!id) throw new Error("No execution ID provided");
      
      const { data, error } = await supabase
        .from("workflow_executions")
        .select(`
          *,
          workflow:workflow_definitions(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...transformExecution(data),
        workflow: data.workflow,
      } as WorkflowExecution & { workflow: any };
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Refetch every 2 seconds if execution is still running
      return query.state.data?.status === "running" ? 2000 : false;
    },
  });
};

// Cancel a running execution
export const useCancelExecution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("workflow_executions")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "running")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
      toast({
        title: "Execution cancelled",
        description: "The workflow execution has been cancelled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling execution",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Retry a failed execution
export const useRetryExecution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the original execution
      const { data: original, error: fetchError } = await supabase
        .from("workflow_executions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Create a new execution with the same trigger data
      const { data, error } = await supabase
        .from("workflow_executions")
        .insert([{
          workflow_id: original.workflow_id,
          trigger_event: original.trigger_event,
          trigger_data: original.trigger_data,
          entity_type: original.entity_type,
          entity_id: original.entity_id,
          status: "running",
          retry_count: (original.retry_count || 0) + 1,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
      toast({
        title: "Execution retried",
        description: "A new execution has been started",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error retrying execution",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Get execution stats for a workflow
export const useWorkflowExecutionStats = (workflowId?: string) => {
  return useQuery({
    queryKey: ["workflow-executions", "stats", workflowId],
    queryFn: async () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      let query = supabase
        .from("workflow_executions")
        .select("status, started_at, duration_ms")
        .gte("started_at", thirtyDaysAgo.toISOString());

      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const executions = data || [];
      const totalExecutions = executions.length;
      const successCount = executions.filter(e => e.status === "completed").length;
      const failedCount = executions.filter(e => e.status === "failed").length;
      const runningCount = executions.filter(e => e.status === "running").length;
      
      const completedExecutions = executions.filter(e => e.duration_ms != null);
      const avgDuration = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / completedExecutions.length
        : 0;

      const successRate = totalExecutions > 0 
        ? (successCount / totalExecutions) * 100 
        : 0;

      return {
        totalExecutions,
        successCount,
        failedCount,
        runningCount,
        successRate: Math.round(successRate * 10) / 10,
        avgDurationMs: Math.round(avgDuration),
        last30Days: {
          total: totalExecutions,
          success: successCount,
          failed: failedCount,
        },
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Start a manual workflow execution
export const useStartWorkflowExecution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      workflowId, 
      triggerData 
    }: { 
      workflowId: string; 
      triggerData?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("workflow_executions")
        .insert([{
          workflow_id: workflowId,
          trigger_event: "manual",
          trigger_data: triggerData || {},
          status: "running",
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
      toast({
        title: "Workflow started",
        description: "The workflow execution has been started",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error starting workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
