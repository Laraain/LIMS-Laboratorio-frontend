import { useEffect } from 'react';
import { sitio } from '../data/laboratorio.js';

// Crea la etiqueta si no existe (el index.html trae las de la home) y le asigna el valor
function fijarEtiqueta(selector, crear, atributo, valor) {
  let etiqueta = document.head.querySelector(selector);
  if (!etiqueta) {
    etiqueta = crear();
    document.head.appendChild(etiqueta);
  }
  etiqueta.setAttribute(atributo, valor);
}

function fijarMeta(clave, nombre, contenido) {
  fijarEtiqueta(
    `meta[${clave}="${nombre}"]`,
    () => {
      const meta = document.createElement('meta');
      meta.setAttribute(clave, nombre);
      return meta;
    },
    'content',
    contenido,
  );
}

// Hook propio para el SEO: actualiza el título, la descripción, la URL canónica y si la página se indexa.
//
// ¿Por qué hace falta? En React hay un solo archivo HTML (index.html) para todo el sitio.
// Al pasar de una página a otra no se carga un HTML nuevo: React solo cambia lo que se ve.
// Entonces, si no hacemos nada, todas las páginas tendrían el mismo título y la misma descripción.
//
// Cómo se usa, al principio de cada página:
//   useMetadatos({ titulo: 'Título de la pestaña', descripcion: 'Texto que muestra Google', ruta: '/login-paciente' });
//
// indexar: si es false, le pide a Google que no muestre esa página en los resultados de búsqueda.
// Se usa en los logins, porque no tiene sentido que alguien los encuentre buscando en Google.
function useMetadatos({ titulo, descripcion, ruta, indexar = true }) {
  useEffect(() => {
    const url = `${sitio.url}${ruta}`;
    document.title = titulo;
    fijarMeta('name', 'description', descripcion);
    fijarMeta('name', 'robots', indexar ? 'index, follow' : 'noindex, nofollow');
    fijarMeta('property', 'og:title', titulo);
    fijarMeta('property', 'og:description', descripcion);
    fijarMeta('property', 'og:url', url);
    fijarEtiqueta(
      'link[rel="canonical"]',
      () => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        return link;
      },
      'href',
      url,
    );
  }, [titulo, descripcion, ruta, indexar]);
}

export default useMetadatos;
