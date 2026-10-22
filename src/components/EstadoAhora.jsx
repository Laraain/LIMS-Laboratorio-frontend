import { useEffect, useState } from 'react';
import { aMinutos, horaLocal } from '../lib/hora.js';

function calcularEstado(franjas) {
  const { dia, minutos } = horaLocal();
  const franja = franjas.find(
    (f) => f.dias.includes(dia) && minutos >= aMinutos(f.desde) && minutos < aMinutos(f.hasta),
  );
  return franja ? { abierto: true, hasta: franja.hasta } : { abierto: false };
}

function EstadoAhora({ franjas }) {
  const [estado, setEstado] = useState(() => calcularEstado(franjas));

  useEffect(() => {
    const id = setInterval(() => setEstado(calcularEstado(franjas)), 60000);
    return () => clearInterval(id);
  }, [franjas]);

  return (
    <span className={`lims-estado${estado.abierto ? ' is-abierto' : ''}`}>
      <span className="lims-estado-punto" aria-hidden="true"></span>
      {estado.abierto ? `Abierto ahora · hasta las ${estado.hasta}` : 'Cerrado ahora'}
    </span>
  );
}

export default EstadoAhora;
