import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, encabezados, mensajeDeErrorApi } from './api.js';
import { informeDe } from './resultados.js';

// Portal del paciente: sus estudios y el informe para descargar.
// La base deja que cada paciente vea solo sus propias órdenes y sus informes publicados
// (políticas RLS), así que acá no se filtra por paciente: lo hace la base.

// Lo que se pide de cada orden para el listado del portal
const CAMPOS_ORDEN =
  'id,nro_orden,estado,fecha_orden,medicos(nombre,apellido),informes(estado,pdf_path,publicado_en)';

// ¿Ya se puede descargar? Solo cuando el bioquímico firmó y publicó el informe
// (informeDe, de resultados.js, saca el informe de la orden)
export function informeDescargable(orden) {
  const informe = informeDe(orden);
  return informe?.estado === 'publicado' && informe.pdf_path ? informe : null;
}

// Lo que ve el paciente: el informe está listo recién cuando se publicó
export function estadoDelPortal(orden) {
  return orden.estado === 'informada' ? 'Listo' : 'En proceso';
}

// Las órdenes del paciente logueado, de la más nueva a la más vieja.
// activo: se consulta recién cuando hay una sesión de paciente
export function useMisOrdenes(activo) {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(Boolean(activo));
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  const recargar = useCallback(() => setIntento((numero) => numero + 1), []);

  useEffect(() => {
    if (!activo) return undefined;
    let vigente = true;

    (async () => {
      setCargando(true);
      setError('');
      try {
        const response = await axios.get(`${API_URL}/ordenes`, {
          headers: await encabezados(),
          params: {
            select: CAMPOS_ORDEN,
            // Las anuladas no se muestran: se cargaron por error o se dieron de baja
            estado: 'neq.anulada',
            order: 'fecha_orden.desc,nro_orden.desc',
          },
        });
        if (vigente) setOrdenes(response.data);
      } catch (errorPeticion) {
        console.error('No se pudieron cargar los estudios del paciente:', errorPeticion);
        if (vigente) setError(mensajeDeErrorApi(errorPeticion));
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [activo, intento]);

  return { ordenes, cargando, error, recargar };
}
