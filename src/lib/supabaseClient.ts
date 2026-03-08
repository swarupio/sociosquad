import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://xonacoxvpkwxaiwvawru.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbmFjb3h2cGt3eGFpd3Zhd3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTE5NTUsImV4cCI6MjA4ODU2Nzk1NX0.0Ni9C0s5vnNmGNXzgksGhBka23Ni4b_o10dt8UVBOsA';

export const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
