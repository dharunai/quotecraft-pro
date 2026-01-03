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
  created_at: string;
  updated_at: string;
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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  lead_id: string;
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

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}
