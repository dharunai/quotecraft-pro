
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Credentials (reused from migrate.js for convenience)
const projectId = 'anqdcadmweehttbmmdey';
const secretKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';

const supabase = createClient(supabaseUrl, secretKey);

async function inspect() {
    console.log('🔍 Inspecting RLS Policies for Profiles and Tasks...');

    const { data, error } = await supabase.rpc('get_rls_json', { table_names: ['profiles', 'tasks'] });

    if (error) {
        console.error('❌ Error inspecting policies:', error);
    } else {
        console.log('✅ Policies Found (writing to rls_output.json)');
        fs.writeFileSync('rls_output.json', JSON.stringify(data, null, 2));
    }
}

inspect();
