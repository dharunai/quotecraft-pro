
import { createClient } from '@supabase/supabase-js';
// import 'dotenv/config';

// Credentials (reused from migrate.js for convenience)
const projectId = 'anqdcadmweehttbmmdey';
const secretKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';

const supabase = createClient(supabaseUrl, secretKey);

async function inspect() {
    console.log('🔍 Inspecting RLS Policies for Products...');

    const { data, error } = await supabase.rpc('get_rls_json', { table_names: ['products', 'product_categories'] });

    if (error) {
        console.error('❌ Error inspecting policies:', error);
    } else {
        console.log('✅ Policies Found (writing to rls_output.json)');
        const fs = await import('fs');
        fs.writeFileSync('rls_output.json', JSON.stringify(data, null, 2));
    }

    // Also check if RLS is enabled on the table
    // We can't easily check pg_class directly via API without another RPC, 
    // but the presence of policies usually implies RLS is intended.

    // Let's also check if company_id column exists and is populated
    console.log('\n📊 Checking data distribution (first 5 rows):');
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, company_id')
        .limit(5);

    if (prodError) {
        console.error('❌ Error fetching products:', prodError);
    } else {
        console.table(products);
    }
}

inspect();
