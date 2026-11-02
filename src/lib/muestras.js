import axios from 'axios';
import { API_URL, encabezados } from './api.js';

// Muestras de la extracción (LIMS-28). Cada paciente lleva un número de muestra del día por sucursal
// (M1, M2…) que comparten todos sus tubos; hay un tubo por tipo de muestra. El número y los tubos
// los crea la base al rotular, para que dos boxes nunca repitan número.

async function rpc(nombre, parametros) {
  const response = await axios.post(`${API_URL}/rpc/${nombre}`, parametros, { headers: await encabezados() });
  return response.data;
}

// Lo que se escribe en el tubo: "M3 – 02/11/2026". fecha viene de la base como "AAAA-MM-DD"
// (se arma a mano: con new Date() un día sin hora se corre al anterior en Tucumán)
export function etiquetaMuestra(numero, fecha) {
  const [anio, mes, dia] = fecha.split('-');
  return `M${numero} – ${dia}/${mes}/${anio}`;
}

// Asigna el número del día (si no tenía), crea los tubos y une cada estudio con el suyo.
// Devuelve { turno_id, numero_muestra, fecha }
export function rotularMuestras(turnoId) {
  return rpc('rotular_muestras', { p_turno_id: turnoId });
}

// Tubo no obtenido o rechazado: queda en la trazabilidad con el motivo
export function rechazarMuestra(muestraId, motivo) {
  return rpc('rechazar_muestra', { p_muestra_id: muestraId, p_motivo: motivo });
}

// Estudios de las órdenes del turno y tubos ya rotulados.
// Devuelve { tubos: [{ tipoId, tipo, tubo, estudios: [{ codigo, nombre, orden }], muestra }], sinOrden, faltaRotular }
// (muestra: el tubo rotulado de ese tipo, o null si todavía no se rotuló)
export async function leerTubosDelTurno(turnoId) {
  const opciones = { headers: await encabezados() };
  const [ordenes, muestras] = await Promise.all([
    axios.get(`${API_URL}/ordenes`, {
      ...opciones,
      params: {
        select:
          'nro_orden,orden_analisis(id,padre_id,muestra_id,' +
          'analisis(codigo,nombre,tipo_muestra_id,tipos_muestra(nombre,tubo)))',
        turno_id: `eq.${turnoId}`,
        estado: 'neq.anulada',
        order: 'nro_orden.asc',
      },
    }),
    axios.get(`${API_URL}/muestras`, {
      ...opciones,
      params: {
        select: 'id,codigo_barras,tipo_muestra_id,estado,motivo_rechazo',
        turno_id: `eq.${turnoId}`,
      },
    }),
  ]);

  // Se agrupa por tipo de muestra: es lo que el técnico tiene que sacar (un tubo por tipo)
  const porTipo = new Map();
  let sinTubo = 0;
  for (const orden of ordenes.data) {
    for (const estudio of orden.orden_analisis) {
      if (!estudio.muestra_id) sinTubo += 1;
      // Los componentes (ej: Neutrófilos) van en el tubo de su estudio: no se listan aparte
      if (estudio.padre_id) continue;
      const { analisis } = estudio;
      if (!porTipo.has(analisis.tipo_muestra_id)) {
        porTipo.set(analisis.tipo_muestra_id, {
          tipoId: analisis.tipo_muestra_id,
          tipo: analisis.tipos_muestra?.nombre ?? 'Muestra',
          tubo: analisis.tipos_muestra?.tubo ?? null,
          estudios: [],
          muestra: null,
        });
      }
      porTipo.get(analisis.tipo_muestra_id).estudios.push({
        codigo: analisis.codigo,
        nombre: analisis.nombre,
        orden: orden.nro_orden,
      });
    }
  }
  for (const muestra of muestras.data) {
    const grupo = porTipo.get(muestra.tipo_muestra_id);
    if (grupo) grupo.muestra = muestra;
  }

  return {
    tubos: [...porTipo.values()].sort((a, b) => a.tipo.localeCompare(b.tipo, 'es')),
    sinOrden: ordenes.data.length === 0,
    // Hay estudios sin tubo: falta rotular (o recepción agregó una orden después)
    faltaRotular: sinTubo > 0,
  };
}
