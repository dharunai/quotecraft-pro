-- Add task_email_notifications column to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS task_email_notifications BOOLEAN DEFAULT TRUE;

-- Update existing records to have it enabled by default
UPDATE company_settings SET task_email_notifications = TRUE WHERE task_email_notifications IS NULL;
