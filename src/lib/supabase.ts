import { createClient } from '@supabase/supabase-js';

function getValidSupabaseUrl(): string {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (
    typeof envUrl === 'string' &&
    (envUrl.trim().startsWith('https://') || envUrl.trim().startsWith('http://'))
  ) {
    return envUrl.trim();
  }
  return 'https://cbirrbhvoobezmaophud.supabase.co';
}

function getValidAnonKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 30) {
    return envKey.trim();
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaXJyYmh2b29iZXptYW9waHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTE3MTAsImV4cCI6MjEwODc4NzcxMH0.ujg1Wt63qsCJBCEHIxOAy9Ua578VEZLc1PAkSBouWbM';
}

function getValidBucket(): string {
  const envBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET;
  if (
    typeof envBucket === 'string' &&
    envBucket.trim() &&
    !envBucket.trim().startsWith('http')
  ) {
    return envBucket.trim();
  }
  return 'uploads';
}

export const SUPABASE_URL = getValidSupabaseUrl();
export const SUPABASE_ANON_KEY = getValidAnonKey();
export const STORAGE_BUCKET = getValidBucket();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
