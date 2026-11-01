import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { textoReferencia } from './analisis.js';

// Rangos de referencia por sexo y edad de un estudio (tabla analisis_rangos). Al cargar un resultado,
// la base usa el más específico que le corresponde al paciente (primero el de su sexo, después el de
// "todos") y, si no hay ninguno, el valor de referencia general del catálogo.
// En la base la edad "hasta" no se incluye (18 a 50 = de 18 a 49 años); en pantalla se muestra y se carga
// la última edad incluida, que es más natural ("de 18 a 49 años").

export const SEXOS_RANGO = { F: 'Femenino', M: 'Masculino' };

const CAMPOS_RANGO = 'id,analisis_id,sexo,edad_desde,edad_hasta,valor_min,valor_max';

export async function listarRangos(analisisId) {
  const response = await axios.get(`${API_URL}/analisis_rangos`, {
    headers: await encabezados(),
    params: { select: CAMPOS_RANGO, analisis_id: `eq.${analisisId}`, order: 'sexo.asc.nullsfirst,edad_desde.asc' },
  });
  return response.data;
}

// Crea un rango o modifica el que tiene ese id. Si la política de seguridad no deja, la API responde sin filas
export async function guardarRango(datos, id = null) {
  const headers = { ...(await encabezados()), Prefer: 'return=representation' };
  const response = id
    ? await axios.patch(`${API_URL}/analisis_rangos`, datos, { headers, params: { id: `eq.${id}` } })
    : await axios.post(`${API_URL}/analisis_rangos`, datos, { headers });
  if (!Array.isArray(response.data) || response.data.length !== 1) {
    throw Object.assign(new Error('La API no devolvió el rango guardado'), {
      mensajeUsuario: 'Solo un administrador puede cambiar los rangos de referencia.',
    });
  }
  return response.data[0];
}

export async function borrarRango(id) {
  const response = await axios.delete(`${API_URL}/analisis_rangos`, {
    headers: { ...(await encabezados()), Prefer: 'return=representation' },
    params: { id: `eq.${id}` },
  });
  if (!Array.isArray(response.data) || response.data.length !== 1) {
    throw Object.assign(new Error('La API no borró el rango'), {
      mensajeUsuario: 'Solo un administrador puede cambiar los rangos de referencia.',
    });
  }
}

// "Femenino" / "Masculino" / "Todos"
export function textoSexo(sexo) {
  return SEXOS_RANGO[sexo] ?? 'Todos';
}

// Edades del rango como se leen: "18 años o más", "1 a 17 años", "65 años"
export function textoEdades({ edad_desde: desde, edad_hasta: hasta }) {
  if (hasta === null || hasta === undefined) return `${desde} años o más`;
  const ultima = hasta - 1;
  if (ultima === desde) return `${desde} ${desde === 1 ? 'año' : 'años'}`;
  return `${desde} a ${ultima} años`;
}

// Mínimo y máximo del rango, con el mismo formato que el valor de referencia del catálogo
export function textoValores(rango) {
  return textoReferencia({ valor_ref_min: rango.valor_min, valor_ref_max: rango.valor_max, valor_ref_texto: null });
}
