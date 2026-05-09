import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anqdcadmweehttbmmdey.supabase.co';
const secretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';

const supabase = createClient(supabaseUrl, secretKey);

async function checkQuotes() {
    const { data, error } = await supabase
        .from('quotations')
        .select('quote_number')
        .order('quote_number', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Last 10 quote numbers:', data.map(q => q.quote_number));
    }
}

checkQuotes();
