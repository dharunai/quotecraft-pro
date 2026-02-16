
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const projectId = 'anqdcadmweehttbmmdey';
const secretKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';

const supabase = createClient(supabaseUrl, secretKey);

async function inspect() {
    console.log('🔍 Inspecting RLS Policies for departments...');
    const { data: policies, error } = await supabase.rpc('get_rls_json', { table_names: ['departments'] });
    if (error) console.error(error);
    else fs.writeFileSync('rls_output_depts.json', JSON.stringify(policies, null, 2));

    // Check if RLS is enabled on the table
    // We can't direct check pg_class easily, but we can assume if no policies, might be issue.

    // Also check how many departments exist
    const { data: depts } = await supabase.from('departments').select('id, company_id, name');
    console.log('Departments:', depts);
}

inspect();
