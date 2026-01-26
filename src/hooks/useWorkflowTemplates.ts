import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { WorkflowTemplate, WorkflowTemplateCategory } from "@/types/database";

// Helper to transform DB response to WorkflowTemplate
const transformTemplate = (item: any): WorkflowTemplate => ({
  ...item,
  template_definition: item.template_definition as any,
  configurable_fields: item.configurable_fields as any,
});

// Fetch all templates
export const useWorkflowTemplates = (category?: WorkflowTemplateCategory) => {
  return useQuery({
    queryKey: ["workflow-templates", category],
    queryFn: async () => {
      let query = supabase
        .from("workflow_templates")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("use_count", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(transformTemplate);
    },
  });
};

// Fetch featured templates
export const useFeaturedTemplates = () => {
  return useQuery({
    queryKey: ["workflow-templates", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_featured", true)
        .order("use_count", { ascending: false })
        .limit(6);

      if (error) throw error;
      
      return (data || []).map(transformTemplate);
    },
  });
};

// Fetch a single template
export const useWorkflowTemplate = (id: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-templates", id],
    queryFn: async () => {
      if (!id) throw new Error("No template ID provided");
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return transformTemplate(data);
    },
    enabled: !!id,
  });
};

// Use a template to create a workflow
export const useCreateWorkflowFromTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      name,
      customConfig
    }: { 
      templateId: string; 
      name: string;
      customConfig?: Record<string, any>;
    }) => {
      // Fetch the template
      const { data: template, error: templateError } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      const { data: userData } = await supabase.auth.getUser();

      // Parse the template definition
      const templateDef = template.template_definition as any;

      // Create workflow from template
      const { data, error } = await supabase
        .from("workflow_definitions")
        .insert({
          name,
          description: template.description,
          trigger_type: templateDef?.trigger?.type || "event",
          trigger_config: (templateDef?.trigger || {}) as any,
          flow_definition: ({
            nodes: templateDef?.nodes || [],
            edges: templateDef?.edges || [],
          }) as any,
          error_handling: "stop",
          max_retries: 3,
          tags: [template.category || "custom"],
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment template use count
      await supabase
        .from("workflow_templates")
        .update({ use_count: (template.use_count || 0) + 1 })
        .eq("id", templateId);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({
        title: "Workflow created from template",
        description: `"${data.name}" has been created`,
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

// Get template categories with counts
export const useTemplateCategoryStats = () => {
  return useQuery({
    queryKey: ["workflow-templates", "category-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("category");

      if (error) throw error;

      // Count by category
      const counts: Record<string, number> = {};
      (data || []).forEach(item => {
        const cat = item.category || "other";
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return counts;
    },
  });
};
