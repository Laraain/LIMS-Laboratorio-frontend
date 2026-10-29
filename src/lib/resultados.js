import axios from 'axios';
import { API_URL, encabezados } from './api.js';

// Resultados de los estudios de una orden. Los carga recepción (y el bioquímico si hace falta);
// solo el bioquímico los valida. La base compara cada valor con el rango de referencia que corresponde
// al sexo y la edad del paciente y marca los que quedan fuera de rango.

export const ESTADOS_RESULTADO = {
  pendiente: 'Sin validar',
  validado: 'Validado',
  rechazado: 'Rechazado',
};

async function rpc(nombre, parametros) {
  const response = await axios.post(`${API_URL}/rpc/${nombre}`, parametros, { headers: await encabezados() });
  return response.data;
}

// Orden para mostrar los estudios: primero los de cada grupo, en el orden en que se armó el grupo
// (ej: el hemograma antes que la química en "Sangre completa"); después los sueltos, por nombre.
// Los componentes, en el orden del catálogo.
function ordenarEstudios(estudios, posiciones) {
  const clave = (estudio) => [
    estudio.grupo_id ?? Number.MAX_SAFE_INTEGER,
    posiciones[`${estudio.grupo_id}-${estudio.analisis.id}`] ?? Number.MAX_SAFE_INTEGER,
    estudio.padre_id ? estudio.analisis.id : 0,
  ];
  return [...estudios].sort((a, b) => {
    const [ga, pa, ca] = clave(a);
    const [gb, pb, cb] = clave(b);
    return ga - gb || pa - pb || ca - cb || a.analisis.nombre.localeCompare(b.analisis.nombre, 'es');
  });
}

// La orden con su paciente y sus estudios (ya ordenados), cada uno con su resultado si ya se cargó
export async function leerOrdenConResultados(ordenId) {
  const response = await axios.get(`${API_URL}/ordenes`, {
    headers: await encabezados(),
    params: {
      select:
        'id,nro_orden,estado,fecha_orden,pacientes(dni,nombre,apellido,sexo,fecha_nacimiento),' +
        // padre_id y absoluto_*: estudios con componentes (ej: fórmula leucocitaria, en % y absoluto)
        'orden_analisis(id,padre_id,grupo_id,analisis(id,codigo,nombre,unidad,absoluto_de,absoluto_min,absoluto_max,absoluto_unidad,' +
        'tipos_muestra(nombre)),grupos_analisis(nombre),' +
        'resultados(id,valor_numerico,valor_texto,valor_absoluto,fuera_de_rango,estado,cargado_en,' +
        'cargador:perfiles!resultados_cargado_por_fkey(nombre,apellido)))',
      id: `eq.${ordenId}`,
    },
  });
  const orden = response.data[0] ?? null;
  if (!orden) return null;

  // Posición de cada estudio dentro de su grupo, para ordenarlos como se armó el grupo
  const grupos = [...new Set(orden.orden_analisis.map((estudio) => estudio.grupo_id).filter(Boolean))];
  let posiciones = {};
  if (grupos.length > 0) {
    const items = await axios.get(`${API_URL}/grupo_analisis_items`, {
      headers: await encabezados(),
      params: { select: 'grupo_id,analisis_id,orden', grupo_id: `in.(${grupos.join(',')})` },
    });
    posiciones = Object.fromEntries(items.data.map((item) => [`${item.grupo_id}-${item.analisis_id}`, item.orden ?? 0]));
  }
  return { ...orden, orden_analisis: ordenarEstudios(orden.orden_analisis, posiciones) };
}

// Rango de referencia de cada estudio de la orden, ya elegido por sexo y edad: { [orden_analisis_id]: rango }
export async function rangosDeOrden(ordenId) {
  const filas = await rpc('rangos_de_orden', { p_orden_id: ordenId });
  return Object.fromEntries(filas.map((fila) => [fila.orden_analisis_id, fila]));
}

// Guarda todos los resultados de la orden juntos. items: [{ orden_analisis_id, valor_numerico, valor_texto }]
// Un estudio sin valor no se guarda (si tenía un resultado sin validar, se borra).
export function guardarResultados(ordenId, items) {
  return rpc('guardar_resultados', { p_orden_id: ordenId, p_resultados: items });
}

// PostgREST devuelve el resultado como objeto (un estudio tiene un solo resultado); por las dudas acepta lista
export function resultadoDe(estudio) {
  const resultado = estudio.resultados;
  return Array.isArray(resultado) ? (resultado[0] ?? null) : (resultado ?? null);
}
