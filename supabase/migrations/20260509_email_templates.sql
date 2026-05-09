-- Recreate Email Templates table correctly
DROP TABLE IF EXISTS email_templates CASCADE;

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  body_html TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view company templates" ON email_templates
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create company templates" ON email_templates
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company templates" ON email_templates
  FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
