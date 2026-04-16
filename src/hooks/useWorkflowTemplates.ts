import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { WorkflowTemplate, WorkflowTemplateCategory } from "@/types/database";

const tplTable = () => (supabase as any).from("workflow_templates");

const transformTemplate = (item: any): WorkflowTemplate => ({
  ...item,
  template_definition: item.template_definition as any,
  configurable_fields: item.configurable_fields as any,
});

export const useWorkflowTemplates = (category?: WorkflowTemplateCategory) => useQuery({
  queryKey: ["workflow-templates", category],
  queryFn: async () => {
    let query = tplTable().select("*").order("is_featured", { ascending: false }).order("use_count", { ascending: false });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(transformTemplate);
  },
});

export const useFeaturedTemplates = () => useQuery({
  queryKey: ["workflow-templates", "featured"],
  queryFn: async () => {
    const { data, error } = await tplTable().select("*").eq("is_featured", true).order("use_count", { ascending: false }).limit(6);
    if (error) throw error;
    return (data || []).map(transformTemplate);
  },
});

export const useWorkflowTemplate = (id: string | undefined) => useQuery({
  queryKey: ["workflow-templates", id],
  queryFn: async () => {
    if (!id) throw new Error("No template ID");
    const { data, error } = await tplTable().select("*").eq("id", id).single();
    if (error) throw error;
    return transformTemplate(data);
  },
  enabled: !!id,
});

export const useCreateWorkflowFromTemplate = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ templateId, name }: { templateId: string; name: string; customConfig?: Record<string, any> }) => {
      const { data: template, error: tplErr } = await tplTable().select("*").eq("id", templateId).single();
      if (tplErr) throw tplErr;
      const { data: userData } = await supabase.auth.getUser();
      const tplDef = template.template_definition as any;
      const wfTable = (supabase as any).from("workflow_definitions");
      const { data, error } = await wfTable.insert({
        name, description: template.description,
        trigger_type: tplDef?.trigger?.type || "event",
        trigger_config: tplDef?.trigger || {},
        flow_definition: { nodes: tplDef?.nodes || [], edges: tplDef?.edges || [] },
        error_handling: "stop", max_retries: 3,
        tags: [template.category || "custom"],
        created_by: userData.user?.id || null,
      }).select().single();
      if (error) throw error;
      await tplTable().update({ use_count: (template.use_count || 0) + 1 }).eq("id", templateId);
      return data;
    },
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["workflows"] }); qc.invalidateQueries({ queryKey: ["workflow-templates"] }); toast({ title: "Created from template", description: `"${d.name}"` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useTemplateCategoryStats = () => useQuery({
  queryKey: ["workflow-templates", "category-stats"],
  queryFn: async () => {
    const { data, error } = await tplTable().select("category");
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data || []).forEach((item: any) => { const cat = item.category || "other"; counts[cat] = (counts[cat] || 0) + 1; });
    return counts;
  },
});
