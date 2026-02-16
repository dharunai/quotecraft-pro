
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Credentials
const projectId = 'anqdcadmweehttbmmdey';
const secretKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';

const supabase = createClient(supabaseUrl, secretKey);

async function inspectData() {
    console.log('🔍 Inspecting Data...');

    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error('Profiles Error:', pError);
    else console.log('Profiles:', profiles.length, 'records');

    const { data: team, error: tError } = await supabase.from('team_members').select('*');
    if (tError) console.error('Team Members Error:', tError);
    else console.log('Team Members:', team.length, 'records');

    const { data: depts, error: dError } = await supabase.from('departments').select('*');
    if (dError) console.error('Departments Error:', dError);
    else console.log('Departments:', depts.length, 'records');

    const outputFile = 'data_dump.json';
    fs.writeFileSync(outputFile, JSON.stringify({ profiles, team, depts }, null, 2));
    console.log(`✅ Data dumped to ${outputFile}`);
}

inspectData();
