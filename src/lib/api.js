import { supabase } from './supabase.js';

// Las direcciones NO se escriben en el código: vienen del archivo .env
// API_URL: la API REST de Supabase (una dirección por tabla) · FUNCIONES_URL: sus funciones de servidor
export const API_URL = import.meta.env.VITE_API_URL;
export const FUNCIONES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Encabezados de cada petición: la clave pública del proyecto y el token de la sesión.
// Con el token, la base sabe quién consulta y aplica sus permisos (políticas RLS).
export async function encabezados() {
  const { data } = await supabase.auth.getSession();
  return { apikey: API_KEY, Authorization: `Bearer ${data.session?.access_token}` };
}

// Traduce el error de una petición Axios a un mensaje para mostrarle al usuario
export function mensajeDeErrorApi(error) {
  // Errores que armamos nosotros con el mensaje ya listo
  if (error.mensajeUsuario) return error.mensajeUsuario;
  const respuesta = error.response?.data;
  // Las funciones de servidor responden { error: "mensaje en español" }
  if (respuesta?.error) return respuesta.error;
  // La API de tablas responde con un código de PostgreSQL: 23505 = dato repetido, 23514 = formato inválido
  if (respuesta?.code === '23505') {
    return /matricula/i.test(respuesta.message ?? '')
      ? 'Esa matrícula ya está asignada a otra persona.'
      : 'Ya existe otro registro con ese dato.';
  }
  if (respuesta?.code === '23514') return 'Alguno de los datos no tiene un formato válido.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revise su conexión e intente nuevamente.';
  return 'Ocurrió un error inesperado. Intente nuevamente.';
}
