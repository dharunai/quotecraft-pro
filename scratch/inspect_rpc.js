import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anqdcadmweehttbmmdey.supabase.co';
const secretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';

const supabase = createClient(supabaseUrl, secretKey);

async function inspectRPC() {
    console.log('Inspecting generate_quote_number RPC...');
    const { data, error } = await supabase.rpc('generate_quote_number');
    console.log('Sample quote number from RPC:', data);

    // Try to get function definition
    const { data: func, error: funcError } = await supabase
        .from('pg_proc')
        .select('prosrc')
        .eq('proname', 'generate_quote_number')
        .maybeSingle();

    if (funcError) {
        console.error('Failed to get function source:', funcError.message);
    } else {
        console.log('Function Source:', func?.prosrc);
    }
}

inspectRPC();
