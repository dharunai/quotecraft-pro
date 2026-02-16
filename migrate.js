#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials from .env
// Supabase credentials from .env
const projectId = 'anqdcadmweehttbmmdey';
const secretKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.G5Gway4aYBqos-0sLO-NTDW1TQpUWzEPN-UKin2nkCk';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';

// PostgreSQL connection string
const connectionString = `postgresql://postgres:[YOUR_POSTGRES_PASSWORD]@${projectId}.postgres.supabase.co:5432/postgres`;

const migrations = [
  '20260216170900_add_multi_tenancy.sql',
  'supabase/migrations/final_fix.sql',
  'supabase/migrations/add_join_company_flow.sql'
];

async function runMigrations() {
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Starting migrations...\n');

  for (const migration of migrations) {
    const filePath = path.join(__dirname, 'supabase', 'migrations', migration);

    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`📝 Running: ${migration}`);

      // Try RPC
      let { error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        console.warn(`RPC failed (${error.message || error.code}), checking valid helper...`);

        if (error.code === 'PGRST202' || (error.message && error.message.includes('Could not find the function'))) {
          console.error("❌ CRITICAL: The helper function 'exec_sql' is missing in the database.");
          console.error("   To proceed, please create the 'exec_sql' function in Supabase Dashboard -> SQL Editor:");
          console.log(`
             CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
             RETURNS void
             LANGUAGE plpgsql
             SECURITY DEFINER
             AS $$
             BEGIN
               EXECUTE sql_query;
             END;
             $$;
             `);
          return;
        }
      }

      if (error) {
        console.error(`❌ Error in ${migration}:`, error);
        fs.writeFileSync('migration_error.log', JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ ${migration} completed\n`);
      }
    } catch (err) {
      console.error(`❌ Failed to read or execute ${migration}:`, err.message);
      fs.writeFileSync('migration_error.log', err.message);
    }
  }

  console.log('✨ Migrations complete!');
}

// Alternative: Use psql directly
async function runMigrationsWithPsql() {
  const { exec } = await import('child_process');
  const util = await import('util');
  const execPromise = util.promisify(exec);

  console.log('🚀 Starting migrations with psql...\n');
  console.log('⚠️  You will need to enter your Supabase database password\n');

  for (const migration of migrations) {
    const filePath = path.join(__dirname, 'supabase', 'migrations', migration);

    try {
      console.log(`📝 Running: ${migration}`);

      const command = `PGPASSWORD='[YOUR_PASSWORD]' psql -h ${projectId}.postgres.supabase.co -U postgres -d postgres -f "${filePath}"`;

      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        console.warn(`⚠️  ${migration}:`, stderr);
      } else {
        console.log(`✅ ${migration} completed\n`);
      }
    } catch (err) {
      console.error(`❌ Failed to execute ${migration}:`, err.message);
    }
  }

  console.log('✨ Migrations complete!');
}

// For now, let's just show instructions
// console.log(`...`); // Commented out help
console.log('Attempting to run migrations via Service Role Key...');
runMigrations().catch(e => console.error(e));
