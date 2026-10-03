import { useEffect, useRef } from 'react';
import './StatsCounter.css';

const DURATION = 1500;

function animarContador(elemento) {
  const target = parseInt(elemento.dataset.target, 10);
  const suffix = elemento.dataset.suffix || '';
  let inicio = null;

  function paso(timestamp) {
    if (inicio === null) inicio = timestamp;
    const progreso = Math.min((timestamp - inicio) / DURATION, 1);
    elemento.textContent = Math.floor(progreso * target) + suffix;
    if (progreso < 1) {
      requestAnimationFrame(paso);
    } else {
      elemento.textContent = target + suffix;
    }
  }

  requestAnimationFrame(paso);
}

function StatsCounter({ estadisticas }) {
  const contenedorRef = useRef(null);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (sinMovimiento || !('IntersectionObserver' in window)) return;

    const valores = contenedor.querySelectorAll('.lims-stat-value');
    valores.forEach((elemento) => {
      elemento.textContent = '0' + (elemento.dataset.suffix || '');
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            valores.forEach(animarContador);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(contenedor);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lims-stats row row-cols-2 row-cols-md-4 g-0" ref={contenedorRef}>
      {estadisticas.map((stat) => (
        <div className="col" key={stat.id}>
          <div className="lims-stat">
            <div className="lims-stat-value" data-target={stat.target} data-suffix={stat.suffix}>
              {stat.target}
              {stat.suffix}
            </div>
            <div className="lims-stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCounter;
