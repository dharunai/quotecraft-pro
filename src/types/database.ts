export interface CompanySettings {
  id: string;
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
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
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
  created_at: string;
  updated_at: string;
}
