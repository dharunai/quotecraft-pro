ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country text;

-- Update existing leads for the user's specific request
UPDATE leads SET 
    country = 'India', 
    state = 'Tamil Nadu', 
    city = (ARRAY['Chennai', 'Coimbatore'])[floor(random() * 2 + 1)],
    district = (ARRAY['Chennai', 'Coimbatore'])[floor(random() * 2 + 1)]
WHERE country IS NULL;
