import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { WorkflowDefinition, WorkflowFlowDefinition, WorkflowTriggerConfig } from "@/types/database";

const wfTable = () => (supabase as any).from("workflow_definitions");

const transformWorkflow = (data: any): WorkflowDefinition => ({
  ...data,
  flow_definition: data.flow_definition as WorkflowFlowDefinition,
  trigger_config: data.trigger_config as WorkflowTriggerConfig,
});

export const useWorkflows = () => useQuery({
  queryKey: ["workflows"],
  queryFn: async () => {
    const { data, error } = await wfTable().select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(transformWorkflow);
  },
});

export const useWorkflow = (id: string | undefined) => useQuery({
  queryKey: ["workflows", id],
  queryFn: async () => {
    if (!id) throw new Error("No workflow ID");
    const { data, error } = await wfTable().select("*").eq("id", id).single();
    if (error) throw error;
    return transformWorkflow(data);
  },
  enabled: !!id,
});

export const useCreateWorkflow = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (workflow: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await wfTable().insert({
        name: workflow.name, description: workflow.description || null,
        trigger_type: workflow.trigger_type, trigger_config: workflow.trigger_config || {},
        flow_definition: workflow.flow_definition || { nodes: [], edges: [] },
        error_handling: workflow.error_handling || "stop", max_retries: workflow.max_retries || 3,
        tags: workflow.tags || null, created_by: userData.user?.id || null,
      }).select().single();
      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast({ title: "Workflow created", description: `"${d.name}" created` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateWorkflow = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, flow_definition, trigger_config, ...updates }: any) => {
      const updateData: any = { ...updates, updated_at: new Date().toISOString() };
      if (flow_definition) updateData.flow_definition = flow_definition;
      if (trigger_config) updateData.trigger_config = trigger_config;
      const { data, error } = await wfTable().update(updateData).eq("id", id).select().single();
      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast({ title: "Workflow updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteWorkflow = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await wfTable().delete().eq("id", id); if (error) throw error; return id; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast({ title: "Workflow deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useToggleWorkflow = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await wfTable().update({ is_active, updated_at: new Date().toISOString(), published_at: is_active ? new Date().toISOString() : null }).eq("id", id).select().single();
      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast({ title: d.is_active ? "Activated" : "Deactivated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useSaveWorkflowFlow = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, flow_definition, trigger_config }: any) => {
      const { data: current } = await wfTable().select("version").eq("id", id).single();
      const updates: any = { flow_definition, updated_at: new Date().toISOString(), version: (current?.version || 0) + 1 };
      if (trigger_config) updates.trigger_config = trigger_config;
      const { data, error } = await wfTable().update(updates).eq("id", id).select().single();
      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["workflows", d.id] }); toast({ title: "Workflow saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useDuplicateWorkflow = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await wfTable().select("*").eq("id", id).single();
      if (fetchError) throw fetchError;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await wfTable().insert({
        name: `${original.name} (Copy)`, description: original.description, trigger_type: original.trigger_type,
        trigger_config: original.trigger_config, flow_definition: original.flow_definition,
        error_handling: original.error_handling, max_retries: original.max_retries,
        retry_delay_seconds: original.retry_delay_seconds, timeout_seconds: original.timeout_seconds,
        tags: original.tags, created_by: userData.user?.id || null, is_active: false,
      }).select().single();
      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast({ title: "Duplicated", description: `"${d.name}"` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useRenameWorkflow = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await wfTable().update({ name, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return transformWorkflow(data);
    },
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast({ title: "Renamed", description: `"${d.name}"` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};
