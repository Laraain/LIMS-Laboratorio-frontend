import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, encabezados } from './api.js';

// Sucursales del laboratorio. Cada persona del personal elige al entrar en cuál trabaja:
// la elección dura lo que dura la sesión en esa pestaña, y la próxima vez se le propone la última que usó.
// La sucursal es un filtro de trabajo (qué fila, qué boxes, qué numeración), no un límite de seguridad.

// Elección de esta sesión (se borra al cerrar la pestaña o la sesión)
const CLAVE_SESION = 'lims-sucursal';
// Última sucursal usada en esta computadora, para proponerla al entrar
const CLAVE_ULTIMA = 'lims-sucursal-ultima';

// El almacenamiento del navegador puede fallar (navegación privada o datos bloqueados): nunca rompe el panel
function leer(almacen, clave) {
  try {
    return Number(almacen.getItem(clave)) || null;
  } catch {
    return null;
  }
}

function escribir(almacen, clave, valor) {
  try {
    if (valor === null) almacen.removeItem(clave);
    else almacen.setItem(clave, String(valor));
  } catch {
    // Sin almacenamiento solo hay que volver a elegirla la próxima vez
  }
}

export function sucursalElegida() {
  return leer(sessionStorage, CLAVE_SESION);
}

export function ultimaSucursal() {
  return leer(localStorage, CLAVE_ULTIMA);
}

export function guardarSucursal(id) {
  escribir(sessionStorage, CLAVE_SESION, id);
  escribir(localStorage, CLAVE_ULTIMA, id);
}

// Al cerrar sesión se olvida la elección: el próximo ingreso vuelve a preguntar
export function olvidarSucursal() {
  escribir(sessionStorage, CLAVE_SESION, null);
}

// Hook con todas las sucursales (activas e inactivas, en orden). Devuelve { sucursales, cargando, error, recargar }
// habilitado: false mientras no hay sesión (la base solo se las muestra al personal)
export function useSucursales(habilitado = true) {
  const [estado, setEstado] = useState({ sucursales: [], cargando: true, error: false });

  const recargar = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/sucursales`, {
        headers: await encabezados(),
        params: { select: 'id,nombre,prefijo,localidad,direccion,cantidad_boxes,activa', order: 'id.asc' },
      });
      setEstado({ sucursales: response.data, cargando: false, error: false });
    } catch (errorPeticion) {
      console.error('No se pudieron cargar las sucursales:', errorPeticion);
      setEstado((previo) => ({ ...previo, cargando: false, error: true }));
    }
  }, []);

  useEffect(() => {
    if (!habilitado) return undefined;
    // Se difiere un instante para no actualizar estados durante el primer dibujo
    const id = setTimeout(recargar, 0);
    return () => clearTimeout(id);
  }, [habilitado, recargar]);

  return { ...estado, recargar };
}
