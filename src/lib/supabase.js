import { createClient } from '@supabase/supabase-js';

// Se configuran en .env.local (ver .env.example). La clave publishable es pública:
// lo que protege los datos son las políticas RLS de la base.
const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(url && clave);

if (!supabaseConfigurado) {
  console.error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local (ver .env.example).');
}

// Sin configuración no se crea el cliente: la página de inicio sigue funcionando
// y los logins muestran el aviso correspondiente.
export const supabase = supabaseConfigurado ? createClient(url, clave) : null;
