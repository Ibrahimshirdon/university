// Runs during the Vercel build. Generates public/js/supabase-config.js from
// environment variables so the real keys never have to live in git.
const fs = require('fs');

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('Missing environment variables: ' + missing.join(', '));
  console.error('Set these in Vercel Project Settings > Environment Variables.');
  process.exit(1);
}

const content = `const SUPABASE_URL = "${process.env.SUPABASE_URL}";
const SUPABASE_ANON_KEY = "${process.env.SUPABASE_ANON_KEY}";
const SUPABASE_SERVICE_KEY = "${process.env.SUPABASE_SERVICE_KEY}";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sbAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
`;

fs.writeFileSync('public/js/supabase-config.js', content);
console.log('Generated public/js/supabase-config.js from environment variables.');
