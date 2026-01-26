export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
          performed_by_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          address: string | null
          alert_on_low_stock: boolean
          alert_on_out_of_stock: boolean
          bank_name: string | null
          company_name: string
          created_at: string
          currency: string
          default_due_days: number
          email: string | null
          email_signature: string | null
          enable_stock_alerts: boolean
          gst_number: string | null
          id: string
          ifsc_code: string | null
          include_hsn_sac: boolean
          invoice_email_body: string | null
          invoice_email_subject: string | null
          invoice_prefix: string
          invoice_terms: string | null
          logo_url: string | null
          pan: string | null
          pdf_footer_text: string | null
          phone: string | null
          quotation_email_body: string | null
          quotation_email_subject: string | null
          show_logo_on_pdf: boolean
          stock_alert_email: string | null
          tax_rate: number | null
          terms: string | null
          theme_color: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          alert_on_low_stock?: boolean
          alert_on_out_of_stock?: boolean
          bank_name?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          default_due_days?: number
          email?: string | null
          email_signature?: string | null
          enable_stock_alerts?: boolean
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          include_hsn_sac?: boolean
          invoice_email_body?: string | null
          invoice_email_subject?: string | null
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          pan?: string | null
          pdf_footer_text?: string | null
          phone?: string | null
          quotation_email_body?: string | null
          quotation_email_subject?: string | null
          show_logo_on_pdf?: boolean
          stock_alert_email?: string | null
          tax_rate?: number | null
          terms?: string | null
          theme_color?: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          alert_on_low_stock?: boolean
          alert_on_out_of_stock?: boolean
          bank_name?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          default_due_days?: number
          email?: string | null
          email_signature?: string | null
          enable_stock_alerts?: boolean
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          include_hsn_sac?: boolean
          invoice_email_body?: string | null
          invoice_email_subject?: string | null
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          pan?: string | null
          pdf_footer_text?: string | null
          phone?: string | null
          quotation_email_body?: string | null
          quotation_email_subject?: string | null
          show_logo_on_pdf?: boolean
          stock_alert_email?: string | null
          tax_rate?: number | null
          terms?: string | null
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          created_at: string
          created_by: string | null
          deal_value: number | null
          expected_close_date: string | null
          id: string
          lead_id: string
          lost_date: string | null
          lost_reason: string | null
          notes: string | null
          probability: number
          stage: string
          updated_at: string
          won_date: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id: string
          lost_date?: string | null
          lost_reason?: string | null
          notes?: string | null
          probability?: number
          stage?: string
          updated_at?: string
          won_date?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string
          lost_date?: string | null
          lost_reason?: string | null
          notes?: string | null
          probability?: number
          stage?: string
          updated_at?: string
          won_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string
          created_at: string
          email_type: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          email_type: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          email_type?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string | null
          hsn_sac_code: string | null
          id: string
          invoice_id: string
          item_title: string
          line_total: number
          product_id: string | null
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          hsn_sac_code?: string | null
          id?: string
          invoice_id: string
          item_title: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          hsn_sac_code?: string | null
          id?: string
          invoice_id?: string
          item_title?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string | null
          deal_id: string | null
          due_date: string
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          is_locked: boolean
          lead_id: string
          notes: string | null
          payment_notes: string | null
          payment_status: string
          quotation_id: string | null
          subtotal: number
          tax_amount: number
          tax_enabled: boolean
          tax_rate: number
          terms_conditions: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          due_date: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          is_locked?: boolean
          lead_id: string
          notes?: string | null
          payment_notes?: string | null
          payment_status?: string
          quotation_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_enabled?: boolean
          tax_rate?: number
          terms_conditions?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          due_date?: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_locked?: boolean
          lead_id?: string
          notes?: string | null
          payment_notes?: string | null
          payment_status?: string
          quotation_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_enabled?: boolean
          tax_rate?: number
          terms_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          company_name: string
          contact_name: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_qualified: boolean
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_qualified?: boolean
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_qualified?: boolean
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          low_stock_threshold: number
          name: string
          sku: string
          stock_quantity: number
          tax_rate: number | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          sku: string
          stock_quantity?: number
          tax_rate?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          sku?: string
          stock_quantity?: number
          tax_rate?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          line_total: number
          quantity: number
          quotation_id: string
          sort_order: number
          title: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          line_total?: number
          quantity?: number
          quotation_id: string
          sort_order?: number
          title: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          line_total?: number
          quantity?: number
          quotation_id?: string
          sort_order?: number
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          invoice_id: string | null
          lead_id: string
          notes: string | null
          quote_date: string
          quote_number: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          invoice_id?: string | null
          lead_id: string
          notes?: string | null
          quote_date?: string
          quote_number: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          invoice_id?: string | null
          lead_id?: string
          notes?: string | null
          quote_date?: string
          quote_number?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          notified_at: string | null
          product_id: string
          resolved_at: string | null
          stock_quantity: number
          threshold: number
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id: string
          resolved_at?: string | null
          stock_quantity: number
          threshold: number
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          resolved_at?: string | null
          stock_quantity?: number
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          entity_type: string | null
          entity_id: string | null
          assigned_to: string | null
          due_date: string | null
          priority: "low" | "medium" | "high" | "urgent"
          status: "pending" | "in_progress" | "completed" | "cancelled"
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          entity_type?: string | null
          entity_id?: string | null
          assigned_to?: string | null
          due_date?: string | null
          priority?: "low" | "medium" | "high" | "urgent"
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          entity_type?: string | null
          entity_id?: string | null
          assigned_to?: string | null
          due_date?: string | null
          priority?: "low" | "medium" | "high" | "urgent"
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_event: string
          trigger_conditions: Json | null
          actions: Json
          is_active: boolean
          execution_count: number
          last_executed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_event: string
          trigger_conditions?: Json | null
          actions: Json
          is_active?: boolean
          execution_count?: number
          last_executed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_event?: string
          trigger_conditions?: Json | null
          actions?: Json
          is_active?: boolean
          execution_count?: number
          last_executed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: "info" | "success" | "warning" | "error"
          category: string | null
          entity_type: string | null
          entity_id: string | null
          action_url: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: "info" | "success" | "warning" | "error"
          category?: string | null
          entity_type?: string | null
          entity_id?: string | null
          action_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: "info" | "success" | "warning" | "error"
          category?: string | null
          entity_type?: string | null
          entity_id?: string | null
          action_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          role: "admin" | "sales" | "viewer"
          is_active: boolean
          invited_by: string | null
          invited_at: string
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          role?: "admin" | "sales" | "viewer"
          is_active?: boolean
          invited_by?: string | null
          invited_at?: string
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          role?: "admin" | "sales" | "viewer"
          is_active?: boolean
          invited_by?: string | null
          invited_at?: string
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_definitions: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_type: "event" | "schedule" | "webhook" | "manual"
          trigger_config: Json
          flow_definition: Json
          is_active: boolean
          error_handling: "stop" | "continue" | "retry"
          max_retries: number
          retry_delay_seconds: number
          timeout_seconds: number
          version: number
          published_at: string | null
          execution_count: number
          success_count: number
          failure_count: number
          last_executed_at: string | null
          tags: string[] | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_type: "event" | "schedule" | "webhook" | "manual"
          trigger_config?: Json
          flow_definition?: Json
          is_active?: boolean
          error_handling?: "stop" | "continue" | "retry"
          max_retries?: number
          retry_delay_seconds?: number
          timeout_seconds?: number
          version?: number
          published_at?: string | null
          execution_count?: number
          success_count?: number
          failure_count?: number
          last_executed_at?: string | null
          tags?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_type?: "event" | "schedule" | "webhook" | "manual"
          trigger_config?: Json
          flow_definition?: Json
          is_active?: boolean
          error_handling?: "stop" | "continue" | "retry"
          max_retries?: number
          retry_delay_seconds?: number
          timeout_seconds?: number
          version?: number
          published_at?: string | null
          execution_count?: number
          success_count?: number
          failure_count?: number
          last_executed_at?: string | null
          tags?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string
          trigger_event: string
          trigger_data: Json
          entity_type: string | null
          entity_id: string | null
          steps_executed: Json
          current_step_id: string | null
          status: "running" | "completed" | "failed" | "cancelled" | "paused"
          error_message: string | null
          error_step_id: string | null
          started_at: string
          completed_at: string | null
          duration_ms: number | null
          retry_count: number
          next_retry_at: string | null
          output_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          trigger_event: string
          trigger_data?: Json
          entity_type?: string | null
          entity_id?: string | null
          steps_executed?: Json
          current_step_id?: string | null
          status: "running" | "completed" | "failed" | "cancelled" | "paused"
          error_message?: string | null
          error_step_id?: string | null
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          retry_count?: number
          next_retry_at?: string | null
          output_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          trigger_event?: string
          trigger_data?: Json
          entity_type?: string | null
          entity_id?: string | null
          steps_executed?: Json
          current_step_id?: string | null
          status?: "running" | "completed" | "failed" | "cancelled" | "paused"
          error_message?: string | null
          error_step_id?: string | null
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          retry_count?: number
          next_retry_at?: string | null
          output_data?: Json | null
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "workflow_executions_workflow_id_fkey"
          columns: ["workflow_id"]
          referencedRelation: "workflow_definitions"
          referencedColumns: ["id"]
        }]
      }
      workflow_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          category: "sales" | "marketing" | "support" | "operations" | "inventory" | "payments" | null
          icon: string | null
          template_definition: Json
          configurable_fields: Json | null
          required_integrations: string[] | null
          is_featured: boolean
          use_count: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: "sales" | "marketing" | "support" | "operations" | "inventory" | "payments" | null
          icon?: string | null
          template_definition: Json
          configurable_fields?: Json | null
          required_integrations?: string[] | null
          is_featured?: boolean
          use_count?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: "sales" | "marketing" | "support" | "operations" | "inventory" | "payments" | null
          icon?: string | null
          template_definition?: Json
          configurable_fields?: Json | null
          required_integrations?: string[] | null
          is_featured?: boolean
          use_count?: number
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      generate_sku: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
