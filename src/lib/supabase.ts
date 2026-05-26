import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ledgenator] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — copy .env.example to .env.local and fill them in.',
  );
}

// Loosely typed client; row-level typing comes from src/types/database.ts at call sites.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
