import { useEffect, useRef, useState } from 'react';

// Devuelve una ref y si el elemento ya entró en pantalla (se activa una sola vez).
// Si el navegador no tiene IntersectionObserver, el contenido se muestra directamente.
function useAlAparecer({ margen = '0px 0px -15% 0px' } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || visible) return undefined;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: margen },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [visible, margen]);

  return [ref, visible];
}

export default useAlAparecer;
