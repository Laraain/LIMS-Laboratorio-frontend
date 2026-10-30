import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { hoyTucuman } from './hora.js';

// Órdenes médicas: qué estudios le pidieron al paciente.
// El número (ej: S1-2026-000123) lo genera la base con el prefijo de la sucursal.
// La orden y sus estudios se guardan juntos con funciones de la base (RPC): si algo falla, no queda nada a medias.

export const ESTADOS_ORDEN = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  completa: 'Completa',
  informada: 'Informada',
  anulada: 'Anulada',
};

// Lo que se pide de cada orden para el listado y para la ventana de edición
const CAMPOS_ORDEN =
  'id,nro_orden,estado,fecha_orden,fecha_recepcion,observaciones,motivo_anulacion,turno_id,obra_social_id,' +
  'paciente_id,medico_id,pacientes(dni,nombre,apellido,obra_social_id,nro_afiliado),' +
  'medicos(nombre,apellido,matricula),obras_sociales(nombre),' +
  'orden_analisis(analisis_id,cubierto,grupo_id,analisis(codigo,nombre),grupos_analisis(nombre))';

async function rpc(nombre, parametros) {
  const response = await axios.post(`${API_URL}/rpc/${nombre}`, parametros, { headers: await encabezados() });
  return response.data;
}

// estudios: [{ analisis_id, cubierto, grupo_id }] · obraSocialId null = particular
export function crearOrden({ pacienteId, medicoId, estudios, fechaOrden, obraSocialId, turnoId, sucursalId, observaciones }) {
  return rpc('crear_orden', {
    p_paciente_id: pacienteId,
    p_medico_id: medicoId,
    p_estudios: estudios,
    p_fecha_orden: fechaOrden,
    p_obra_social_id: obraSocialId,
    p_turno_id: turnoId,
    p_sucursal_id: sucursalId,
    p_observaciones: observaciones,
  });
}

export function modificarOrden(ordenId, { medicoId, estudios, fechaOrden, obraSocialId, observaciones }) {
  return rpc('modificar_orden', {
    p_orden_id: ordenId,
    p_medico_id: medicoId,
    p_estudios: estudios,
    p_fecha_orden: fechaOrden,
    p_obra_social_id: obraSocialId,
    p_observaciones: observaciones,
  });
}

export function anularOrden(ordenId, motivo) {
  return rpc('anular_orden', { p_orden_id: ordenId, p_motivo: motivo });
}

// Turno de hoy del paciente en la sucursal: la orden queda unida a esa visita (o null si no vino hoy)
export async function turnoDeHoy(pacienteId, sucursalId) {
  const response = await axios.get(`${API_URL}/turnos`, {
    headers: await encabezados(),
    params: {
      select: 'id,numero',
      paciente_id: `eq.${pacienteId}`,
      sucursal_id: `eq.${sucursalId}`,
      fecha: `eq.${hoyTucuman()}`,
      limit: 1,
    },
  });
  return response.data[0] ?? null;
}

// Busca médicos por apellido, nombre o matrícula (hasta 8 resultados)
export async function buscarMedicos(texto) {
  const limpio = texto.trim().replace(/[,()*]/g, ' ');
  if (limpio.length < 2) return [];
  const response = await axios.get(`${API_URL}/medicos`, {
    headers: await encabezados(),
    params: {
      select: 'id,nombre,apellido,matricula,especialidad',
      or: `(apellido.ilike.*${limpio}*,nombre.ilike.*${limpio}*,matricula.ilike.*${limpio}*)`,
      order: 'apellido.asc,nombre.asc',
      limit: 8,
    },
  });
  return response.data;
}

// Da de alta un médico y devuelve la fila creada
export async function crearMedico(datos) {
  const response = await axios.post(`${API_URL}/medicos`, datos, {
    headers: { ...(await encabezados()), Prefer: 'return=representation' },
  });
  return response.data[0];
}

// Análisis activos del catálogo, para elegir los estudios de la orden
export async function leerCatalogoActivo() {
  const response = await axios.get(`${API_URL}/analisis`, {
    headers: await encabezados(),
    params: { select: 'id,codigo,nombre,tipos_muestra(nombre)', activo: 'eq.true', order: 'nombre.asc' },
  });
  return response.data;
}

// Hook con las órdenes de una sucursal recibidas en un día (fecha: 'AAAA-MM-DD').
// Devuelve { ordenes, cargando, error, recargar }
export function useOrdenes(sucursalId, fecha) {
  const [estado, setEstado] = useState({ ordenes: [], cargando: true, error: false });

  const recargar = useCallback(async () => {
    try {
      // fecha_recepcion se guarda con hora: se pide el día completo en la hora de Tucumán (UTC-3)
      const response = await axios.get(`${API_URL}/ordenes`, {
        headers: await encabezados(),
        params: {
          select: CAMPOS_ORDEN,
          sucursal_id: `eq.${sucursalId}`,
          and: `(fecha_recepcion.gte.${fecha}T00:00:00-03:00,fecha_recepcion.lte.${fecha}T23:59:59.999-03:00)`,
          order: 'fecha_recepcion.desc',
        },
      });
      setEstado({ ordenes: response.data, cargando: false, error: false });
    } catch (errorPeticion) {
      console.error('No se pudieron cargar las órdenes:', errorPeticion);
      setEstado((previo) => ({ ...previo, cargando: false, error: true }));
    }
  }, [sucursalId, fecha]);

  useEffect(() => {
    // Se difiere un instante para no actualizar estados durante el primer dibujo
    const id = setTimeout(recargar, 0);
    return () => clearTimeout(id);
  }, [recargar]);

  return { ...estado, recargar };
}
