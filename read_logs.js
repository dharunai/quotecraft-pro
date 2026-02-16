
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM5NTU5NSwiZXhwIjoyMDg0OTcxNTk1fQ.some_secret';
// Note: I need the SERVICE ROLE KEY to read the logs if RLS is on and I'm not auth'd, or I can use anon key if I granted public access.
// In 'debug_trigger.sql', I did GRANT ALL ON public.debug_logs TO postgres, service_role, anon, authenticated;
// So anon key should work.

const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzOTU1OTUsImV4cCI6MjA4NDk3MTU5NX0.X0HDffK0KzzXC8diFWikYmXuSi5vwCdP9U2i594XIFY';

const supabase = createClient(supabaseUrl, anonKey);

async function readLogs() {
    const { data, error } = await supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error reading logs:', error);
    } else {
        console.log('Debug Logs:');
        data.forEach(log => {
            console.log(`[${log.created_at}] ${log.message}`, log.details ? JSON.stringify(log.details) : '');
        });
    }
}

readLogs();
