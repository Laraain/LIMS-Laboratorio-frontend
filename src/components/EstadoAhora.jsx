import { useEffect, useState } from 'react';

const ZONA = 'America/Argentina/Tucuman';
const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function horaLocal() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((p) => p.type === tipo).value;
  return { dia: DIAS[valor('weekday')], minutos: Number(valor('hour')) * 60 + Number(valor('minute')) };
}

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

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
