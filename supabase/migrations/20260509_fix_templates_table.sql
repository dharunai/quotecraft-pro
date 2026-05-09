-- Ensure body_html exists in email_templates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_templates' AND column_name='body_html') THEN
        ALTER TABLE email_templates ADD COLUMN body_html TEXT NOT NULL DEFAULT '';
    END IF;
END $$;
