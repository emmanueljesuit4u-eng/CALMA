import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://c--3d892a80-dd42-4944-8459-cbe8f7b9253a-prod.lovable.cloud';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aM4wWPbJX8gbJ4kYLQ-KMw_wHH3wzur';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
