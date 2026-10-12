import { useEffect, useState } from 'react';
import './StatsCounter.css';

const PASOS = 50; // en cuántos saltos llega cada número a su valor final
const ESPERA = 30; // milisegundos entre un salto y el siguiente (50 x 30 ms = 1,5 segundos)

// Un número que cuenta desde 0 hasta target
function Estadistica({ target, suffix, label }) {
  // valor: el número que se ve en pantalla. Empieza en 0 y el useEffect lo va subiendo
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (valor === target) return; // ya llegó: no se programa otro salto

    const salto = Math.ceil(target / PASOS);
    const id = setTimeout(() => setValor(Math.min(valor + salto, target)), ESPERA);
    return () => clearTimeout(id); // si el componente se desmonta, se cancela el salto pendiente
  }, [valor, target]); // se vuelve a ejecutar cada vez que cambia el valor: así avanza el conteo

  return (
    <div className="lims-stat">
      <div className="lims-stat-value">
        {valor}
        {suffix}
      </div>
      <div className="lims-stat-label">{label}</div>
    </div>
  );
}

// Recibe la lista de estadísticas por props y genera una Estadistica por cada una con map()
function StatsCounter({ estadisticas }) {
  return (
    <div className="lims-stats row row-cols-2 row-cols-md-4 g-0">
      {estadisticas.map((stat) => (
        <div className="col" key={stat.id}>
          <Estadistica target={stat.target} suffix={stat.suffix} label={stat.label} />
        </div>
      ))}
    </div>
  );
}

export default StatsCounter;
