import axios from 'axios';
import { FUNCIONES_URL, encabezados } from './api.js';
import { supabase } from './supabase.js';

// Recuperar y restablecer contraseñas (LIMS-45). Las dos primeras usan funciones de servidor:
// cambiar la contraseña de otro o generar el link de recuperación requiere la clave secreta.

const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Recepción o el admin le dan una contraseña provisoria nueva a una cuenta (al personal, solo el admin).
// Devuelve { password, nombre, apellido }: la contraseña se muestra una sola vez.
export async function restablecerPassword(perfilId) {
  const response = await axios.post(
    `${FUNCIONES_URL}/restablecer-password`,
    { perfil_id: perfilId },
    { headers: await encabezados() },
  );
  return response.data;
}

// "¿Olvidó su contraseña?" del portal: si el paciente tiene email, le llega un link.
// La respuesta es la misma exista o no el DNI. Se llama sin sesión: solo con la clave pública.
export async function pedirRecuperacion(dni) {
  const response = await axios.post(`${FUNCIONES_URL}/recuperar-password`, { dni }, { headers: { apikey: API_KEY } });
  return response.data;
}

// Desde el link del mail: Supabase ya abrió la sesión con el link; se guarda la contraseña nueva
// y se registra la recuperación (deja de pedirse el cambio de la provisoria).
export async function guardarPasswordRecuperada(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  const { error: errorCierre } = await supabase.rpc('completar_recuperacion_password');
  if (errorCierre) throw errorCierre;
}
