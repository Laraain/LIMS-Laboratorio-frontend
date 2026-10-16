import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CaretDown } from '@phosphor-icons/react';
import './IndicadorScroll.css';

// Flecha fija abajo al centro que avisa que hay más contenido; se oculta apenas el usuario empieza a desplazarse.
function IndicadorScroll({ destino, etiqueta = 'Ver más contenido', umbral = 80 }) {
  const [visible, setVisible] = useState(() => window.scrollY < umbral);

  useEffect(() => {
    const actualizar = () => setVisible(window.scrollY < umbral);
    window.addEventListener('scroll', actualizar, { passive: true });
    return () => window.removeEventListener('scroll', actualizar);
  }, [umbral]);

  return (
    <Link
      to={destino}
      className={`lims-indicador-scroll${visible ? '' : ' is-oculto'}`}
      aria-label={etiqueta}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <CaretDown weight="bold" aria-hidden="true" />
    </Link>
  );
}

export default IndicadorScroll;
