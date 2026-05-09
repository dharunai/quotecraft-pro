import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anqdcadmweehttbmmdey.supabase.co';
const secretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';

const supabase = createClient(supabaseUrl, secretKey);

async function checkColumns() {
    console.log('Checking for new columns...');
    const { data, error } = await supabase
        .from('leads')
        .select('website, customer_requirement')
        .limit(1);

    if (error) {
        console.error('Column check failed:', error.message);
    } else {
        console.log('Columns website and customer_requirement exist!');
    }
}

checkColumns();
