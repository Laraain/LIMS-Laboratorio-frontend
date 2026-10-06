import { useEffect } from 'react';

// Título y descripción propios de cada página (SEO).
// Como la app es una SPA, el index.html es uno solo: sin esto todas las páginas tendrían los mismos datos.
// Las etiquetas <meta> ya existen en el index.html; acá solo se les cambia el contenido.
// indexar = false le pide a los buscadores que no muestren la página (se usa en los logins).
function useMetadatos({ titulo, descripcion, indexar = true }) {
  useEffect(() => {
    document.title = titulo;
    document.querySelector('meta[name="description"]').content = descripcion;
    document.querySelector('meta[name="robots"]').content = indexar ? 'index, follow' : 'noindex, nofollow';
  }, [titulo, descripcion, indexar]); // se vuelve a ejecutar solo si cambia alguno de estos datos
}

export default useMetadatos;
