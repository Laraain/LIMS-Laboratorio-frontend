import { useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import './CintaLogos.css';

// Cinta que se desplaza sin fin: el contenido se repite dos veces y se anima con CSS.
// children deben ser elementos <li>. La copia queda oculta para lectores de pantalla.
function CintaLogos({ children, etiqueta, duracion = 40, separacion = 16, invertir = false }) {
  const [pausada, setPausada] = useState(false);

  return (
    <div
      className={`lims-cinta${pausada ? ' is-pausada' : ''}${invertir ? ' is-invertida' : ''}`}
      style={{ '--cinta-duracion': `${duracion}s`, '--cinta-separacion': `${separacion}px` }}
    >
      <div className="lims-cinta-ventana">
        <div className="lims-cinta-pista">
          <ul className="lims-cinta-grupo" aria-label={etiqueta}>
            {children}
          </ul>
          <ul className="lims-cinta-grupo lims-cinta-copia" aria-hidden="true">
            {children}
          </ul>
        </div>
      </div>
      <button
        type="button"
        className="lims-cinta-pausa"
        onClick={() => setPausada((valor) => !valor)}
        aria-label={pausada ? 'Reanudar el desplazamiento' : 'Pausar el desplazamiento'}
      >
        {pausada ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
    </div>
  );
}

export default CintaLogos;
