
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://anqdcadmweehttbmmdey.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucWRjYWRtd2VlaHR0Ym1tZGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzOTU1OTUsImV4cCI6MjA4NDk3MTU5NX0.X0HDffK0KzzXC8diFWikYmXuSi5vwCdP9U2i594XIFY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    const email = `test.user.${Date.now()}@example.com`;
    const password = 'password123';
    const companyName = 'Test Company ' + Date.now();
    const fullName = 'Test User';

    console.log(`Attempting signup with: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                company_name: companyName
            }
        }
    });

    if (error) {
        console.error('Signup Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Signup Successful:', data);
    }
}

testSignup();
