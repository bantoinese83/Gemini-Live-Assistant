import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jzisuselmgnimntqlfji.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6aXN1c2VsbWduaW1udHFsZmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzcwMjAsImV4cCI6MjA2NjU1MzAyMH0.kXz-iCbEi3WA8hGO9pBjMtqcHkANsYU5akHmGL_bQGE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 