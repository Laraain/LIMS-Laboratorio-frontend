import { useEffect, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import './Carrusel.css';

const INTERVALO = 6500;

function useMovimientoReducido() {
  const [reducido, setReducido] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const actualizar = () => setReducido(consulta.matches);
    consulta.addEventListener('change', actualizar);
    return () => consulta.removeEventListener('change', actualizar);
  }, []);

  return reducido;
}

function Carrusel({ imagenes }) {
  const [actual, setActual] = useState(0);
  const [pausadoPorUsuario, setPausadoPorUsuario] = useState(false);
  const [enEspera, setEnEspera] = useState(false);
  const reducido = useMovimientoReducido();

  const reproduciendo = !pausadoPorUsuario && !reducido;

  useEffect(() => {
    if (!reproduciendo || enEspera) return undefined;
    const id = setTimeout(() => setActual((i) => (i + 1) % imagenes.length), INTERVALO);
    return () => clearTimeout(id);
  }, [actual, reproduciendo, enEspera, imagenes.length]);

  const salirDelFoco = (evento) => {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setEnEspera(false);
  };

  return (
    <section
      className="lims-carrusel"
      aria-roledescription="carrusel"
      aria-label="Fotos del laboratorio"
      onMouseEnter={() => setEnEspera(true)}
      onMouseLeave={() => setEnEspera(false)}
      onFocus={() => setEnEspera(true)}
      onBlur={salirDelFoco}
    >
      <div className="lims-carrusel-marco">
        {imagenes.map((imagen, i) => (
          <figure
            key={imagen.id}
            className={`lims-carrusel-slide${i === actual ? ' is-activo' : ''}`}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${imagenes.length}: ${imagen.leyenda}`}
            aria-hidden={i !== actual}
          >
            <img
              src={imagen.src}
              alt={imagen.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
            />
            <figcaption className="lims-carrusel-leyenda">{imagen.leyenda}</figcaption>
          </figure>
        ))}
      </div>

      <div className="lims-carrusel-controles">
        <div className="lims-carrusel-indicadores">
          {imagenes.map((imagen, i) => (
            <button
              key={imagen.id}
              type="button"
              className={`lims-carrusel-indicador${i === actual ? ' is-activo' : ''}`}
              aria-label={`Mostrar foto ${i + 1}: ${imagen.leyenda}`}
              aria-current={i === actual}
              onClick={() => setActual(i)}
            />
          ))}
        </div>
        {!reducido && (
          <button
            type="button"
            className="lims-carrusel-pausa"
            onClick={() => setPausadoPorUsuario((p) => !p)}
            aria-label={pausadoPorUsuario ? 'Reanudar el pase de fotos' : 'Pausar el pase de fotos'}
          >
            {pausadoPorUsuario ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        )}
      </div>
    </section>
  );
}

export default Carrusel;
