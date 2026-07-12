// 1. Project Settings (gear icon) > API Keys
// 2. Copy the "Publishable key" (sb_publishable_...) into SUPABASE_ANON_KEY
// 3. Copy the "Secret key" or legacy "service_role" JWT into SUPABASE_SERVICE_KEY
//    WARNING: the secret key bypasses all database security rules. It's only
//    used here to let the Admin portal create Teacher/Student logins. See the
//    "Security note" in README.md before using this build anywhere public.
// 4. Copy your Project URL (Data API section, same page)
// 5. Copy this file to supabase-config.js (that filename is gitignored) and
//    fill in the values below.

const SUPABASE_URL = "REPLACE_ME";
const SUPABASE_ANON_KEY = "REPLACE_ME";
const SUPABASE_SERVICE_KEY = "REPLACE_ME";

// Normal client: used for everything a logged-in user does (respects RLS)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client: only used by admin-only code paths (creating/deleting logins).
// persistSession/autoRefreshToken are off so it never interferes with the
// real user session managed by `sb`.
const sbAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
