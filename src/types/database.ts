export interface CompanySettings {
  id: string; // Acts as company_id for the tenant
  company_name: string;
  logo_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  pan: string | null;
  currency: string;
  tax_rate: number | null;
  terms: string | null;
  theme_color: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  account_holder_name: string | null;
  invoice_prefix: string;
  default_due_days: number;
  invoice_terms: string | null;
  created_at: string;
  updated_at: string;
  // Phase 3 additions
  email_signature: string | null;
  quotation_email_subject: string | null;
  quotation_email_body: string | null;
  invoice_email_subject: string | null;
  invoice_email_body: string | null;
  enable_stock_alerts: boolean;
  stock_alert_email: string | null;
  alert_on_low_stock: boolean;
  alert_on_out_of_stock: boolean;
  show_logo_on_pdf: boolean;
  include_hsn_sac: boolean;
  pdf_footer_text: string | null;
}

export interface Lead {
  id: string;
  company_id?: string; // Multi-tenancy
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  notes: string | null;
  is_qualified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  company_id?: string; // Multi-tenancy
  lead_id: string;
  deal_value: number | null;
  stage: 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
  expected_close_date: string | null;
  won_date: string | null;
  lost_date: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
}

export interface ProductCategory {
  id: string;
  company_id?: string; // Multi-tenancy
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id?: string; // Multi-tenancy
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit_price: number;
  cost_price: number | null;
  unit: string;
  tax_rate: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
}

export interface Quotation {
  id: string;
  company_id?: string; // Multi-tenancy
  quote_number: string;
  lead_id: string;
  deal_id: string | null;
  invoice_id: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  quote_date: string;
  valid_until: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  deal?: Deal;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id?: string; // Multi-tenancy
  invoice_number: string;
  deal_id: string | null;
  quotation_id: string | null;
  lead_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_enabled: boolean;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  amount_paid: number;
  payment_notes: string | null;
  terms_conditions: string | null;
  notes: string | null;
  is_locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  deal?: Deal;
  quotation?: Quotation;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  item_title: string;
  description: string | null;
  hsn_sac_code: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
  product?: Product;
}

export interface TeamMember {
  id: string;
  company_id?: string; // Multi-tenancy
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'sales' | 'viewer';
  is_active: boolean;
  invited_by: string | null;
  invited_at: string;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  company_id?: string; // Link to company
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  company_id?: string; // Multi-tenancy
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  company_id?: string; // Multi-tenancy (not yet in DB)
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_link: string | null;
  organizer_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  created_at: string;
  updated_at: string;
  participants?: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_conditions: Record<string, any> | null;
  actions: Record<string, any>;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// Workflow Types
export type WorkflowTriggerType = 'event' | 'schedule' | 'webhook' | 'manual';
export type WorkflowErrorHandling = 'stop' | 'continue' | 'retry';
export type WorkflowExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type WorkflowTemplateCategory = 'sales' | 'marketing' | 'support' | 'operations' | 'inventory' | 'payments';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNodeData {
  label: string;
  [key: string]: any;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: WorkflowNodePosition;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowFlowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowTriggerConfig {
  event?: string;
  
  // Schedule triggers
  schedule_type?: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_enabled?: boolean;
  schedule_time?: string; // HH:mm format
  schedule_day?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  schedule_date?: number; // Day of month (1-31)
  schedule_cron?: string; // Custom cron expression
  
  // Webhook triggers
  webhook_enabled?: boolean;
  webhook_id?: string;
  webhook_secret?: string;
  webhook_content_type?: 'application/json' | 'application/x-www-form-urlencoded' | 'text/plain';
  
  // Advanced conditions
  conditions_enabled?: boolean;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';
    value: string;
  }>;
  
  // Field change detection
  trigger_on_field_change?: boolean;
  watch_fields?: string[]; // Array of field names to watch
  
  // Time-based triggers
  delay_enabled?: boolean;
  delay_value?: number;
  delay_unit?: 'minutes' | 'hours' | 'days';
  
  // Batch processing
  batch_enabled?: boolean;
  batch_size?: number; // Number of events to batch
  batch_window_value?: number;
  batch_window_unit?: 'minutes' | 'hours';
  
  // Legacy fields for backward compatibility
  schedule_type_legacy?: 'interval' | 'cron';
  interval_value?: number;
  interval_unit?: 'minutes' | 'hours' | 'days';
  cron?: string;
  webhook_path?: string;
  [key: string]: any;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  trigger_type: WorkflowTriggerType;
  trigger_config: WorkflowTriggerConfig;
  flow_definition: WorkflowFlowDefinition;
  is_active: boolean;
  error_handling: WorkflowErrorHandling;
  max_retries: number;
  retry_delay_seconds: number;
  timeout_seconds: number;
  version: number;
  published_at: string | null;
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_executed_at: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionStep {
  node_id: string;
  node_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_event: string;
  trigger_data: Record<string, any>;
  entity_type: string | null;
  entity_id: string | null;
  steps_executed: WorkflowExecutionStep[];
  current_step_id: string | null;
  status: WorkflowExecutionStatus;
  error_message: string | null;
  error_step_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  retry_count: number;
  next_retry_at: string | null;
  output_data: Record<string, any> | null;
  created_at: string;
  workflow?: WorkflowDefinition;
}

export interface WorkflowTemplateConfigField {
  label: string;
  type: 'text' | 'number' | 'select' | 'time' | 'date' | 'boolean';
  default?: any;
  options?: { label: string; value: any }[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: WorkflowTemplateCategory | null;
  icon: string | null;
  template_definition: {
    trigger: WorkflowTriggerConfig;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  configurable_fields: Record<string, WorkflowTemplateConfigField> | null;
  required_integrations: string[] | null;
  is_featured: boolean;
  use_count: number;
  created_by: string | null;
  created_at: string;
}
