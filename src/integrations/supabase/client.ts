import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xeuulrwbcbxycomuaxzd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhldXVscndiY2J4eWNvbXVheHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDY3NjAsImV4cCI6MjA4MDI4Mjc2MH0.wVSg4Z5Gjjtw8UWNxArWjzeSJQFYTqj2jIbDjAUqLS4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
