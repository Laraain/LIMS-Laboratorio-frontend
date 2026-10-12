import { useEffect } from 'react';

// Hook propio para el SEO: cambia el título de la pestaña y la descripción que muestra Google.
//
// ¿Por qué hace falta? En React hay un solo archivo HTML (index.html) para todo el sitio.
// Al pasar de una página a otra no se carga un HTML nuevo: React solo cambia lo que se ve.
// Entonces, si no hacemos nada, todas las páginas tendrían el mismo título y la misma descripción.
//
// Cómo se usa, al principio de cada página:
//   useMetadatos({ titulo: 'Servicios — LIMS Laboratorio', descripcion: 'Texto que muestra Google' });
//
// indexar: si es false, le pide a Google que no muestre esa página en los resultados de búsqueda.
// Se usa en los logins, porque no tiene sentido que alguien los encuentre buscando en Google.
function useMetadatos({ titulo, descripcion, indexar = true }) {
  useEffect(() => {
    // Texto de la pestaña del navegador
    document.title = titulo;

    // Descripción que aparece debajo del título en los resultados de Google
    document.querySelector('meta[name="description"]').content = descripcion;

    // Permiso para que Google muestre (index) o no (noindex) esta página
    document.querySelector('meta[name="robots"]').content = indexar ? 'index, follow' : 'noindex, nofollow';
  }, [titulo, descripcion, indexar]); // Se ejecuta al abrir la página, y de nuevo solo si cambia alguno de estos datos
}

export default useMetadatos;
