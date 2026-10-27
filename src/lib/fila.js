import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { hoyTucuman } from './hora.js';

// Fila de atención del día: el laboratorio atiende por orden de llegada.
// Cada sucursal tiene su fila: recepción registra la llegada, extracción llama al siguiente desde su box.
// Los cambios de la fila se hacen con funciones de la base (RPC), que asignan
// el número sin repetirlo y evitan que dos boxes llamen al mismo paciente.

export const ESTADOS_TURNO = {
  en_espera: 'En espera',
  llamado: 'Llamado',
  atendido: 'Atendido',
  se_retiro: 'Se retiró',
};

export const TIPOS_EXTRACCION = {
  ambulatoria: 'Ambulatoria',
  pediatrica: 'Pediátrica',
};

// Cada cuánto se vuelve a pedir la fila, para ver lo que hacen los otros puestos
const INTERVALO_ACTUALIZACION = 10000;

// Llama a una función de la base. PostgREST las publica en /rpc/<nombre>
async function rpc(nombre, parametros) {
  const response = await axios.post(`${API_URL}/rpc/${nombre}`, parametros, { headers: await encabezados() });
  return response.data;
}

// Devuelve { turno, ya_registrado }: si el paciente ya estaba hoy en alguna fila, ese turno
// (turno.sucursal_id dice en qué sucursal)
export function registrarLlegada(pacienteId, tipo, sucursalId) {
  return rpc('registrar_llegada', { p_paciente_id: pacienteId, p_tipo: tipo, p_sucursal_id: sucursalId });
}

// Devuelve el turno llamado, o null si no hay nadie en espera en esa sucursal
export function llamarSiguiente(box, sucursalId) {
  return rpc('llamar_siguiente', { p_box: box, p_sucursal_id: sucursalId });
}

// estado: 'atendido' o 'se_retiro'
export function finalizarAtencion(turnoId, estado) {
  return rpc('finalizar_atencion', { p_turno_id: turnoId, p_estado: estado });
}

// Fila de hoy de una sucursal con los datos del paciente, ordenada por número de atención
async function leerFilaDeHoy(sucursalId) {
  const response = await axios.get(`${API_URL}/turnos`, {
    headers: await encabezados(),
    params: {
      select:
        'id,numero,estado,tipo,box,created_at,llamado_at,finalizado_at,observaciones,paciente_id,' +
        'pacientes(dni,nombre,apellido,fecha_nacimiento)',
      sucursal_id: `eq.${sucursalId}`,
      fecha: `eq.${hoyTucuman()}`,
      order: 'numero.asc',
    },
  });
  return response.data;
}

// Hook con la fila de hoy de una sucursal. Se actualiza sola cada 10 segundos y con recargar() después de cada cambio.
// Devuelve { fila, cargando, error, recargar }
export function useFilaDelDia(sucursalId) {
  const [fila, setFila] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setFila(await leerFilaDeHoy(sucursalId));
      setError(false);
    } catch (errorPeticion) {
      console.error('No se pudo cargar la fila del día:', errorPeticion);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [sucursalId]);

  useEffect(() => {
    // La primera carga se difiere un instante para no actualizar estados durante el primer dibujo
    const primera = setTimeout(recargar, 0);
    const id = setInterval(recargar, INTERVALO_ACTUALIZACION);
    return () => {
      clearTimeout(primera);
      clearInterval(id);
    };
  }, [recargar]);

  return { fila, cargando, error, recargar };
}
