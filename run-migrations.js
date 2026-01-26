#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase PostgreSQL connection
const projectId = 'anqdcadmweehttbmmdey';
const dbPassword = process.env.DB_PASSWORD || process.argv[2];

if (!dbPassword) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Database Migration - Password Required                  ║
╚════════════════════════════════════════════════════════════════╝

Usage: node run-migrations.js <your-db-password>

Example:
  node run-migrations.js "your-postgres-password-here"

📍 Where to find your password:
  1. Go to https://supabase.com/dashboard
  2. Select project: anqdcadmweehttbmmdey
  3. Go to Settings > Database
  4. Copy the "password" field

Or set it as environment variable:
  export DB_PASSWORD="your-password"
  node run-migrations.js
`);
  process.exit(1);
}

const client = new Client({
  host: `${projectId}.postgres.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  ssl: 'require'
});

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
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Running Database Migrations                             ║
║         Project: anqdcadmweehttbmmdey                           ║
║         Host: ${projectId}.postgres.supabase.co         ║
╚════════════════════════════════════════════════════════════════╝
`);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    let successCount = 0;
    let errorCount = 0;

    for (const migration of migrations) {
      const filePath = path.join(__dirname, 'supabase', 'migrations', migration);
      
      try {
        if (!fs.existsSync(filePath)) {
          console.log(`⏭️  Skipping (not found): ${migration}`);
          continue;
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        
        console.log(`📝 Running: ${migration}`);

        await client.query(sql);
        
        console.log(`✅ ${migration} completed\n`);
        successCount++;

      } catch (err) {
        console.error(`❌ ${migration}: ${err.message}\n`);
        errorCount++;
      }
    }

    await client.end();

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    Migration Summary                            ║
╚════════════════════════════════════════════════════════════════╝

✅ Successful: ${successCount}/${migrations.length}
❌ Errors: ${errorCount}/${migrations.length}

${errorCount === 0 ? '🎉 All migrations completed successfully!' : '⚠️  Some migrations encountered issues. Check errors above.'}

📊 Next Steps:
  1. Verify tables in Supabase Dashboard
  2. Check the Schema section
  3. Test your app connection
  4. Create admin user if needed

🌐 Dashboard: https://supabase.com/dashboard/project/${projectId}
`);

  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('\n⚠️  Make sure:');
    console.error('  1. Your database password is correct');
    console.error('  2. Your project is active (check Supabase dashboard)');
    console.error('  3. Your network allows PostgreSQL connections (usually port 5432)');
    process.exit(1);
  }
}

runMigrations();
