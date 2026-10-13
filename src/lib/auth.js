import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseConfigurado } from './supabase.js';

// Supabase Auth inicia sesión con email. Pacientes y personal no escriben un email:
// el DNI o el usuario se convierten en un email interno que nunca recibe correos.
const DOMINIO_PACIENTES = 'pacientes.lims.local';
const DOMINIO_PERSONAL = 'personal.lims.local';

export const ROLES_PERSONAL = ['admin', 'bioquimico', 'tecnico', 'recepcion'];

export function emailDePaciente(dni) {
  return `${dni}@${DOMINIO_PACIENTES}`;
}

export function emailDePersonal(usuario) {
  return `${usuario.trim().toLowerCase()}@${DOMINIO_PERSONAL}`;
}

export const MENSAJE_SIN_CONFIGURAR =
  'El sistema no está configurado para conectarse con el servidor. Avise al administrador.';

// Traduce los errores de Supabase Auth a mensajes para el usuario
export function mensajeDeError(error) {
  const mensaje = error?.message ?? '';
  if (/invalid login credentials/i.test(mensaje)) return 'credenciales';
  if (/should be different from the old password/i.test(mensaje)) {
    return 'La nueva contraseña tiene que ser distinta de la provisoria.';
  }
  if (/password should be at least/i.test(mensaje)) {
    return 'La contraseña es demasiado corta.';
  }
  if (/failed to fetch|network/i.test(mensaje)) {
    return 'No se pudo conectar con el servidor. Revise su conexión e intente nuevamente.';
  }
  return 'Ocurrió un error inesperado. Intente nuevamente en unos minutos.';
}

async function leerPerfil(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, rol, nombre, apellido, activo, debe_cambiar_password')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Inicia sesión y verifica que la cuenta tenga permitido entrar a este portal.
// Devuelve { perfil } o { error } con un mensaje listo para mostrar.
export async function iniciarSesion(email, password, rolesPermitidos) {
  if (!supabaseConfigurado) return { error: MENSAJE_SIN_CONFIGURAR };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mensajeDeError(error) };

  try {
    const perfil = await leerPerfil(data.user.id);
    if (!perfil || !perfil.activo || !rolesPermitidos.includes(perfil.rol)) {
      await supabase.auth.signOut();
      return { error: 'credenciales' };
    }
    return { perfil };
  } catch (errorPerfil) {
    await supabase.auth.signOut();
    return { error: mensajeDeError(errorPerfil) };
  }
}

export async function cerrarSesion() {
  if (supabaseConfigurado) await supabase.auth.signOut();
}

function formatearFecha(iso) {
  return iso ? new Date(iso).toLocaleString('es-AR') : '';
}

// Sesión activa de este portal. Si hay una sesión de otro portal (por ejemplo,
// un paciente que entra a la página del personal) se la ignora y se muestra el formulario.
export function useSesion(rolesPermitidos) {
  const [estado, setEstado] = useState({ cargando: supabaseConfigurado, perfil: null, fecha: '' });
  const roles = rolesPermitidos.join(',');

  const cargar = useCallback(
    async (sesion) => {
      const usuario = sesion?.user;
      if (!usuario) {
        setEstado({ cargando: false, perfil: null, fecha: '' });
        return;
      }
      try {
        const perfil = await leerPerfil(usuario.id);
        const valido = perfil && perfil.activo && roles.split(',').includes(perfil.rol);
        setEstado({
          cargando: false,
          perfil: valido ? perfil : null,
          fecha: valido ? formatearFecha(usuario.last_sign_in_at) : '',
        });
      } catch {
        setEstado({ cargando: false, perfil: null, fecha: '' });
      }
    },
    [roles],
  );

  // Vuelve a leer el perfil (por ejemplo, después de completar el primer ingreso)
  const refrescar = useCallback(async () => {
    if (!supabaseConfigurado) return;
    const { data } = await supabase.auth.getSession();
    await cargar(data.session);
  }, [cargar]);

  useEffect(() => {
    if (!supabaseConfigurado) return undefined;
    // INITIAL_SESSION llega apenas se suscribe, con la sesión guardada (o null).
    // Supabase recomienda no consultar la base dentro del callback: se difiere con setTimeout.
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(evento)) {
        setTimeout(() => cargar(sesion), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [cargar]);

  return { ...estado, refrescar };
}
