import { createClient } from '@supabase/supabase-js';

// Support multiple environment variable names so local .env and deployment var names work:
// - Server keys: SUPABASE_SERVICE_ROLE_KEY, PASSWORD_DB_SUPABASE
// - Public keys: SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
// - URLs: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.PASSWORD_DB_SUPABASE;

export const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
// Flag that indicates we have a server-level key available (service role / password-like)
export const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PASSWORD_DB_SUPABASE);

export const supabase = useSupabase
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false } })
  : null;

export default supabase;
