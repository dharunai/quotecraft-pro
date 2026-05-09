-- Default Email Templates
INSERT INTO email_templates (company_id, name, subject, body_html, category)
SELECT 
  id as company_id,
  'Quotation Follow-up',
  'Following up on your quotation',
  '<p>Hi {{contact_name}},</p><p>I hope you are doing well. I wanted to follow up on the quotation we sent over recently. Have you had a chance to review it?</p><p>Let me know if you have any questions.</p>',
  'follow-up'
FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO email_templates (company_id, name, subject, body_html, category)
SELECT 
  id as company_id,
  'Welcome Email',
  'Welcome to The Genworks!',
  '<p>Hi {{contact_name}},</p><p>Welcome aboard! We are excited to have you with us. If you need any assistance getting started, feel free to reach out.</p>',
  'onboarding'
FROM companies
ON CONFLICT DO NOTHING;
