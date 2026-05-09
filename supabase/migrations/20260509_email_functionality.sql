-- Add Gmail-style functionality to sent_emails table
ALTER TABLE sent_emails 
ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_snoozed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_sent_emails_folder ON sent_emails(folder);
CREATE INDEX IF NOT EXISTS idx_sent_emails_starred ON sent_emails(is_starred) WHERE is_starred = true;
