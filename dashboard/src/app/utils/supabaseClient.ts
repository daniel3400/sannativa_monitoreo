// utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificar que tenemos valores válidos para evitar errores de conexión
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables de entorno de Supabase no configuradas correctamente. Por favor verifica tu archivo .env.local');
}

// Crear el cliente con opciones para mejor manejo de errores
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Opcional: Añadir un helper para verificar conectividad
export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return { connected: !error, error: error?.message };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
