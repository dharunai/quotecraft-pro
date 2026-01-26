#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials from .env
const projectId = 'anqdcadmweehttbmmdey';
const secretKey = 'sb_secret_mO8q1GvDVuH1ayBJI2oLrA_wfLn5_ws';
const supabaseUrl = `https://${projectId}.supabase.co`;

// PostgreSQL connection string
const connectionString = `postgresql://postgres:[YOUR_POSTGRES_PASSWORD]@${projectId}.postgres.supabase.co:5432/postgres`;

const migrations = [
  '20260103103732_d3f2eb8f-2ba2-4fc6-9bdb-98b8d7487ef4.sql',
  '20260103103746_86a547a1-6fc5-4a60-9a2f-bba417822dd5.sql',
  '20260115175943_051044fc-1a28-411e-aa7b-f7d7cc0a1fe7.sql',
  '20260123101342_eba77847-01ea-441a-8b7e-8e533729d9ea.sql',
  '20260124_automation.sql',
  '20260124_notifications.sql',
  '20260124_scoring.sql',
  '20260124_tasks.sql',
  '20260124000000_team_members.sql',
  '20260124000100_search_indexes.sql',
  '20260124000200_auto_admin.sql'
];

async function runMigrations() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabase = createClient(supabaseUrl, secretKey);
  
  console.log('🚀 Starting migrations...\n');
  
  for (const migration of migrations) {
    const filePath = path.join(__dirname, 'supabase', 'migrations', migration);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`📝 Running: ${migration}`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: sql 
      }).catch(async () => {
        // Fallback: Try using the REST API with raw SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql_query: sql })
        });
        return response.json();
      });
      
      if (error) {
        console.error(`❌ Error in ${migration}:`, error);
      } else {
        console.log(`✅ ${migration} completed\n`);
      }
    } catch (err) {
      console.error(`❌ Failed to read or execute ${migration}:`, err.message);
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
console.log(`
╔════════════════════════════════════════════════════════════════╗
║         QuoteCraft Pro - Database Migration Script              ║
╚════════════════════════════════════════════════════════════════╝

📊 New Supabase Project Details:
  • Project ID: ${projectId}
  • URL: ${supabaseUrl}
  • Region: (Check your Supabase dashboard)

🔐 To run migrations, you need:
  1. Your Supabase database password (from Database settings)
  2. Either psql installed OR the Supabase CLI

🎯 Option 1: Using Supabase CLI (Recommended)
   $ supabase db push

🎯 Option 2: Using psql directly
   $ psql -h ${projectId}.postgres.supabase.co -U postgres -d postgres
   Then run each migration file individually.

🎯 Option 3: Copy-paste SQL in Supabase Dashboard
   1. Go to SQL Editor in Supabase Dashboard
   2. Open each migration file
   3. Copy and paste the SQL
   4. Run each one

📁 Migration files location:
   ${path.join(__dirname, 'supabase', 'migrations')}

✨ After migrations are complete:
   1. Verify tables in Supabase Dashboard
   2. Test the app connection
   3. Create an admin user account

Would you like to proceed with option 1, 2, or 3?
`);
