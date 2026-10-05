import './CintaLogos.css';

// Cinta que se desplaza sin fin: el contenido se repite dos veces y se anima con CSS.
// children deben ser elementos <li>. La copia queda oculta para lectores de pantalla.
function CintaLogos({ children, etiqueta, duracion = 40, separacion = 16, invertir = false }) {
  return (
    <div
      className={`lims-cinta${invertir ? ' is-invertida' : ''}`}
      style={{ '--cinta-duracion': `${duracion}s`, '--cinta-separacion': `${separacion}px` }}
    >
      <div className="lims-cinta-pista">
        <ul className="lims-cinta-grupo" aria-label={etiqueta}>
          {children}
        </ul>
        <ul className="lims-cinta-grupo lims-cinta-copia" aria-hidden="true">
          {children}
        </ul>
      </div>
    </div>
  );
}

export default CintaLogos;
