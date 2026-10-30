import axios from 'axios';
import { API_URL, encabezados } from './api.js';

// Grupos de estudios: conjuntos que se piden juntos (ej: "Sangre completa").
// El admin los arma desde el catálogo; al cargar una orden se elige el grupo y se agregan todos sus estudios.

// Grupos con sus estudios en orden. soloActivos: para elegirlos en la orden (sin los desactivados)
export async function listarGrupos({ soloActivos = false } = {}) {
  const response = await axios.get(`${API_URL}/grupos_analisis`, {
    headers: await encabezados(),
    params: {
      select: 'id,codigo,nombre,activo,grupo_analisis_items(orden,analisis(id,codigo,nombre,activo))',
      ...(soloActivos && { activo: 'eq.true' }),
      order: 'nombre.asc',
    },
  });
  // Los estudios de cada grupo quedan ordenados como los armó el admin
  return response.data.map((grupo) => ({
    ...grupo,
    estudios: [...grupo.grupo_analisis_items]
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((item) => item.analisis),
  }));
}

// Crea (sin id) o modifica un grupo con su lista de estudios, todo junto. analisisIds: en el orden en que se listan
export async function guardarGrupo({ id = null, codigo, nombre, analisisIds }) {
  const response = await axios.post(
    `${API_URL}/rpc/guardar_grupo`,
    { p_codigo: codigo, p_nombre: nombre, p_analisis: analisisIds, p_id: id },
    { headers: await encabezados() },
  );
  return response.data;
}

// Activar o desactivar en lugar de borrar: las órdenes viejas pueden referenciar el grupo
export async function cambiarEstadoGrupo(id, activo) {
  const response = await axios.patch(
    `${API_URL}/grupos_analisis`,
    { activo },
    { headers: { ...(await encabezados()), Prefer: 'return=representation' }, params: { id: `eq.${id}` } },
  );
  if (!Array.isArray(response.data) || response.data.length !== 1) {
    throw Object.assign(new Error('La API no devolvió el grupo'), {
      mensajeUsuario: 'No tiene permiso para modificar los grupos.',
    });
  }
  return response.data[0];
}
