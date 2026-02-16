
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const projectId = 'anqdcadmweehttbmmdey';
const secretKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';

const supabase = createClient(supabaseUrl, secretKey);

async function inspectProfiles() {
    console.log('🔍 Inspecting Profiles Reporting Lines...');

    const { data: profiles, error } = await supabase.from('profiles').select('id, full_name, email, position, reports_to, department_id');

    if (error) console.error('Error:', error);
    else {
        // console.table(profiles); // Removed console table
        fs.writeFileSync('org_chart_data.json', JSON.stringify(profiles, null, 2));
        console.log('Data dumped to org_chart_data.json');
    }
}

inspectProfiles();
