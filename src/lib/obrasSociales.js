import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, encabezados } from './api.js';

// Valor del selector cuando el paciente no tiene obra social
export const PARTICULAR = 'particular';

// Hook con las obras sociales activas, para el selector. Devuelve { obras, cargando, error }
export function useObrasSociales() {
  const [estado, setEstado] = useState({ obras: [], cargando: true, error: false });

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/obras_sociales`, {
          headers: await encabezados(),
          params: { select: 'id,nombre', activa: 'eq.true', order: 'nombre.asc' },
        });
        if (vigente) setEstado({ obras: response.data, cargando: false, error: false });
      } catch (errorPeticion) {
        console.error('No se pudieron cargar las obras sociales:', errorPeticion);
        if (vigente) setEstado({ obras: [], cargando: false, error: true });
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  return estado;
}

// La obra social es obligatoria: hay que elegir una o "Particular". Con obra social, el número de afiliado también.
export function erroresObraSocial(obraSocial, nroAfiliado) {
  return {
    obraSocial: obraSocial === '',
    nroAfiliado: obraSocial !== '' && obraSocial !== PARTICULAR && nroAfiliado.trim() === '',
  };
}

// Lo que se envía a la función crear-paciente: obra social vacía = particular
export function datosObraSocial(obraSocial, nroAfiliado) {
  if (obraSocial === PARTICULAR) return { obra_social_id: null, nro_afiliado: null };
  return { obra_social_id: Number(obraSocial), nro_afiliado: nroAfiliado.trim() };
}

// Todas las obras sociales, activas e inactivas, para la pantalla de administración (solo admin)
export async function listarObrasSociales() {
  const response = await axios.get(`${API_URL}/obras_sociales`, {
    headers: await encabezados(),
    params: { select: 'id,nombre,codigo,activa', order: 'nombre.asc' },
  });
  return response.data;
}

// Guarda una obra social: sin id la crea, con id modifica solo los campos recibidos.
// Devuelve la fila guardada. Sin permiso de admin la API responde sin filas: se avisa con un mensaje claro.
export async function guardarObraSocial(datos, id = null) {
  // "return=representation": la API devuelve la fila guardada
  const headers = { ...(await encabezados()), Prefer: 'return=representation' };
  const respuesta = id
    ? await axios.patch(`${API_URL}/obras_sociales`, datos, { headers, params: { id: `eq.${id}` } })
    : await axios.post(`${API_URL}/obras_sociales`, datos, { headers });
  if (!Array.isArray(respuesta.data) || respuesta.data.length !== 1) {
    throw Object.assign(new Error('La API no devolvió la obra social guardada'), {
      mensajeUsuario: 'No tiene permiso para modificar las obras sociales.',
    });
  }
  return respuesta.data[0];
}
