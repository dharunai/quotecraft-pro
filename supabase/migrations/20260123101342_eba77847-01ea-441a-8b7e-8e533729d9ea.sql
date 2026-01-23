-- Update company_settings with email templates and stock alert settings (only add missing columns)
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS email_signature TEXT,
ADD COLUMN IF NOT EXISTS quotation_email_subject TEXT DEFAULT 'Quotation #{quote_number} from {company_name}',
ADD COLUMN IF NOT EXISTS quotation_email_body TEXT DEFAULT 'Dear {contact_name},

Please find attached quotation #{quote_number} for your review.

If you have any questions, feel free to reach out.

Best regards,
{company_name}',
ADD COLUMN IF NOT EXISTS invoice_email_subject TEXT DEFAULT 'Invoice #{invoice_number} from {company_name}',
ADD COLUMN IF NOT EXISTS invoice_email_body TEXT DEFAULT 'Dear {contact_name},

Please find attached invoice #{invoice_number}.

Payment is due by {due_date}.

Thank you for your business!

Best regards,
{company_name}',
ADD COLUMN IF NOT EXISTS enable_stock_alerts BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS stock_alert_email TEXT,
ADD COLUMN IF NOT EXISTS alert_on_low_stock BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_on_out_of_stock BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_logo_on_pdf BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS include_hsn_sac BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pdf_footer_text TEXT;