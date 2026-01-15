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
      company_settings: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          address: string | null
          bank_name: string | null
          company_name: string
          created_at: string
          currency: string
          default_due_days: number
          email: string | null
          gst_number: string | null
          id: string
          ifsc_code: string | null
          invoice_prefix: string
          invoice_terms: string | null
          logo_url: string | null
          pan: string | null
          phone: string | null
          tax_rate: number | null
          terms: string | null
          theme_color: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          default_due_days?: number
          email?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          pan?: string | null
          phone?: string | null
          tax_rate?: number | null
          terms?: string | null
          theme_color?: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          default_due_days?: number
          email?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          pan?: string | null
          phone?: string | null
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
