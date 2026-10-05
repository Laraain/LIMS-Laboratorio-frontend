import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import './PreguntasFrecuentes.css';

// Lista de preguntas que se abren de a una. Cada pregunta es un botón (funciona con teclado y lector de pantalla).
function PreguntasFrecuentes({ preguntas }) {
  const [abierta, setAbierta] = useState(null);

  return (
    <ul className="lims-faq">
      {preguntas.map((item) => {
        const estaAbierta = abierta === item.id;
        return (
          <li key={item.id} className={`lims-faq-item${estaAbierta ? ' is-abierta' : ''}`}>
            <h3 className="lims-faq-pregunta">
              <button
                type="button"
                id={`pregunta-${item.id}`}
                aria-expanded={estaAbierta}
                aria-controls={`respuesta-${item.id}`}
                onClick={() => setAbierta(estaAbierta ? null : item.id)}
              >
                <span>{item.pregunta}</span>
                <CaretDown className="lims-faq-flecha" aria-hidden="true" />
              </button>
            </h3>
            <div
              className="lims-faq-respuesta"
              id={`respuesta-${item.id}`}
              role="region"
              aria-labelledby={`pregunta-${item.id}`}
            >
              <div className="lims-faq-respuesta-interior">
                <p>{item.respuesta}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default PreguntasFrecuentes;
