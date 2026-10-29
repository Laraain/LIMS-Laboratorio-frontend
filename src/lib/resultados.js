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

// La orden con su paciente y sus estudios, cada uno con su resultado si ya se cargó
export async function leerOrdenConResultados(ordenId) {
  const response = await axios.get(`${API_URL}/ordenes`, {
    headers: await encabezados(),
    params: {
      select:
        'id,nro_orden,estado,fecha_orden,pacientes(dni,nombre,apellido,sexo,fecha_nacimiento),' +
        // padre_id y absoluto_*: estudios con componentes (ej: fórmula leucocitaria, en % y absoluto)
        'orden_analisis(id,padre_id,analisis(id,codigo,nombre,unidad,absoluto_de,absoluto_min,absoluto_max,absoluto_unidad,' +
        'tipos_muestra(nombre)),grupos_analisis(nombre),' +
        'resultados(id,valor_numerico,valor_texto,valor_absoluto,fuera_de_rango,estado,cargado_en,' +
        'cargador:perfiles!resultados_cargado_por_fkey(nombre,apellido)))',
      id: `eq.${ordenId}`,
    },
  });
  return response.data[0] ?? null;
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
