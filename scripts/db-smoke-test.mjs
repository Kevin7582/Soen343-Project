import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const key = serviceRoleKey || anonKey;
const table = process.env.SUPABASE_SMOKE_TABLE || 'vehicles';

if (!url) {
  console.error('Missing SUPABASE_URL');
  process.exit(1);
}

if (!key) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY');
  process.exit(1);
}

async function run() {
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: false }).limit(1);

  if (error) {
    console.error(`Supabase smoke test failed for table "${table}":`, error.message);
    process.exit(1);
  }

  const rows = Array.isArray(data) ? data.length : 0;
  console.log(`Supabase smoke test passed. Connected to ${url} and queried table "${table}" successfully (sample rows returned: ${rows}).`);
}

run().catch((error) => {
  console.error('Unexpected smoke test failure:', error?.message || error);
  process.exit(1);
});
