import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

let client = null;

export function getSupabase() {
  if (client) return client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
