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

// Título, descripción, URL canónica y si la página se indexa, actualizados en cada ruta de la SPA
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
