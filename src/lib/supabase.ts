import { createClient } from '@supabase/supabase-js';

// Configurar en .env.local (ver .env.example). El placeholder evita que la app
// reviente al arrancar antes de tener un proyecto Supabase real.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://PLACEHOLDER.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'PLACEHOLDER_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
