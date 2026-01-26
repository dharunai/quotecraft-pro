import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { 
  WorkflowDefinition, 
  WorkflowFlowDefinition, 
  WorkflowTriggerConfig 
} from "@/types/database";

// Helper to transform DB response to WorkflowDefinition
const transformWorkflow = (data: any): WorkflowDefinition => ({
  ...data,
  flow_definition: data.flow_definition as WorkflowFlowDefinition,
  trigger_config: data.trigger_config as WorkflowTriggerConfig,
});

// Fetch all workflows
export const useWorkflows = () => {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_definitions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(transformWorkflow);
    },
  });
};

// Fetch a single workflow
export const useWorkflow = (id: string | undefined) => {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: async () => {
      if (!id) throw new Error("No workflow ID provided");
      const { data, error } = await supabase
        .from("workflow_definitions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return transformWorkflow(data);
    },
    enabled: !!id,
  });
};

// Create workflow
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workflow: {
      name: string;
      description?: string;
      trigger_type: "event" | "schedule" | "webhook" | "manual";
      trigger_config?: WorkflowTriggerConfig;
      flow_definition?: WorkflowFlowDefinition;
      error_handling?: "stop" | "continue" | "retry";
      max_retries?: number;
      tags?: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("workflow_definitions")
        .insert({
          name: workflow.name,
          description: workflow.description || null,
          trigger_type: workflow.trigger_type,
          trigger_config: (workflow.trigger_config || {}) as any,
          flow_definition: (workflow.flow_definition || { nodes: [], edges: [] }) as any,
          error_handling: workflow.error_handling || "stop",
          max_retries: workflow.max_retries || 3,
          tags: workflow.tags || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: "Workflow created",
        description: `"${data.name}" has been created successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Update workflow
export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      flow_definition,
      trigger_config,
      ...updates 
    }: Partial<WorkflowDefinition> & { id: string }) => {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      if (flow_definition) {
        updateData.flow_definition = flow_definition as any;
      }
      if (trigger_config) {
        updateData.trigger_config = trigger_config as any;
      }
      
      const { data, error } = await supabase
        .from("workflow_definitions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflows", data.id] });
      toast({
        title: "Workflow updated",
        description: `"${data.name}" has been updated`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Delete workflow
export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: "Workflow deleted",
        description: "The workflow has been deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Toggle workflow active/inactive
export const useToggleWorkflow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("workflow_definitions")
        .update({ 
          is_active,
          updated_at: new Date().toISOString(),
          published_at: is_active ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: data.is_active ? "Workflow activated" : "Workflow deactivated",
        description: `"${data.name}" is now ${data.is_active ? "active" : "inactive"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error toggling workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Save workflow flow (nodes and edges)
export const useSaveWorkflowFlow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      flow_definition,
      trigger_config
    }: { 
      id: string; 
      flow_definition: WorkflowFlowDefinition;
      trigger_config?: WorkflowTriggerConfig;
    }) => {
      // First get current version
      const { data: current } = await supabase
        .from("workflow_definitions")
        .select("version")
        .eq("id", id)
        .single();
      
      const updates: any = {
        flow_definition: flow_definition as any,
        updated_at: new Date().toISOString(),
        version: (current?.version || 0) + 1,
      };

      if (trigger_config) {
        updates.trigger_config = trigger_config as any;
      }

      const { data, error } = await supabase
        .from("workflow_definitions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", data.id] });
      toast({
        title: "Workflow saved",
        description: "Your changes have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Duplicate workflow
export const useDuplicateWorkflow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the original
      const { data: original, error: fetchError } = await supabase
        .from("workflow_definitions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { data: userData } = await supabase.auth.getUser();

      // Create a copy
      const { data, error } = await supabase
        .from("workflow_definitions")
        .insert({
          name: `${original.name} (Copy)`,
          description: original.description,
          trigger_type: original.trigger_type,
          trigger_config: original.trigger_config,
          flow_definition: original.flow_definition,
          error_handling: original.error_handling,
          max_retries: original.max_retries,
          retry_delay_seconds: original.retry_delay_seconds,
          timeout_seconds: original.timeout_seconds,
          tags: original.tags,
          created_by: userData.user?.id || null,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: "Workflow duplicated",
        description: `Created "${data.name}"`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error duplicating workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
