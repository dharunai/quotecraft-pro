require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Tables:', data.map(t => t.tablename).join(', '));
  }
}

checkTables();
