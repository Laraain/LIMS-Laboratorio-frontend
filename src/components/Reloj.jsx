import { useEffect, useState } from 'react';
import { Clock } from '@phosphor-icons/react';

// Hora actual (horas y minutos) que se actualiza sola.
// No usa un intervalo de un segundo: espera justo hasta el cambio de minuto, así se redibuja una vez por minuto.
// Prop titulo: texto que aparece al pasar el mouse (por ejemplo, cuándo se inició la sesión)
function Reloj({ titulo, className = '' }) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    let temporizador;
    function programar() {
      // Milisegundos que faltan para el próximo minuto (+50 para no quedar justo antes del cambio)
      const espera = 60000 - (Date.now() % 60000) + 50;
      temporizador = setTimeout(() => {
        setAhora(new Date());
        programar();
      }, espera);
    }
    programar();
    // Al desaparecer el componente se cancela la espera pendiente
    return () => clearTimeout(temporizador);
  }, []);

  return (
    <time dateTime={ahora.toISOString()} title={titulo} className={className}>
      <Clock aria-hidden="true" />
      {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
    </time>
  );
}

export default Reloj;
