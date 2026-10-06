import { useEffect } from 'react';

// Busca la etiqueta <meta name="..."> del <head>; si no existe la crea. Después le pone el contenido.
function fijarMeta(nombre, contenido) {
  let meta = document.head.querySelector(`meta[name="${nombre}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', nombre);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', contenido);
}

// Título y descripción propios de cada página (SEO).
// Como la app es una SPA, el index.html es uno solo: sin esto todas las páginas tendrían los mismos datos.
// indexar = false le pide a los buscadores que no muestren la página (se usa en los logins).
function useMetadatos({ titulo, descripcion, indexar = true }) {
  useEffect(() => {
    document.title = titulo;
    fijarMeta('description', descripcion);
    fijarMeta('robots', indexar ? 'index, follow' : 'noindex, nofollow');
  }, [titulo, descripcion, indexar]); // se vuelve a ejecutar solo si cambia alguno de estos datos
}

export default useMetadatos;
