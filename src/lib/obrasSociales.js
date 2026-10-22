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
