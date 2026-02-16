
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const projectId = 'anqdcadmweehttbmmdey';
const secretKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';

const supabase = createClient(supabaseUrl, secretKey);

async function inspectSettings() {
    console.log('🔍 Inspecting Company Settings...');

    const { data: settings, error } = await supabase.from('company_settings').select('id, company_id, company_name, email');

    if (error) console.error('Error:', error);
    else console.table(settings);

    const { data: companies } = await supabase.from('companies').select('*');
    if (companies) console.table(companies);
}

inspectSettings();
