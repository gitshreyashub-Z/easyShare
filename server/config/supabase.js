import { createClient } from '@supabase/supabase-js';

export const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error('Supabase storage is not configured');

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const getSupabaseBucket = () => process.env.SUPABASE_BUCKET || 'easyShare_uploads';
