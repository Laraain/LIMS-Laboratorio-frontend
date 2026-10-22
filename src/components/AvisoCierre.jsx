import { useEffect, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import { horarios } from '../data/laboratorio.js';
import { aMinutos, horaLocal } from '../lib/hora.js';

// ¿Ya es hora de avisar? Días de extracción, desde la hora del aviso (9:30) en adelante
function esHoraDeAvisar() {
  const { dia, minutos } = horaLocal();
  const { dias, aviso } = horarios.extraccion;
  return dias.includes(dia) && minutos >= aMinutos(aviso);
}

// Aviso para recepción cerca del cierre de extracción: cuántos pacientes siguen esperando,
// para consultar con extracción si se los puede atender después de hora. Es solo informativo.
// Prop enEspera: cantidad de pacientes en espera
function AvisoCierre({ enEspera }) {
  const [activo, setActivo] = useState(esHoraDeAvisar);

  // Se revisa la hora cada 30 segundos: el aviso aparece solo a las 9:30 sin recargar la página
  useEffect(() => {
    const id = setInterval(() => setActivo(esHoraDeAvisar()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!activo || enEspera === 0) return null;

  const { minutos } = horaLocal();
  const yaCerro = minutos >= aMinutos(horarios.extraccion.hasta);

  return (
    <div className="lims-aviso-cierre" role="status">
      <Warning className="lims-aviso-cierre-icono" aria-hidden="true" />
      <p className="mb-0">
        <strong>
          {enEspera === 1 ? 'Queda 1 paciente en espera' : `Quedan ${enEspera} pacientes en espera`}
        </strong>{' '}
        {yaCerro
          ? `y la extracción cerró a las ${horarios.extraccion.hasta}.`
          : `y la extracción cierra a las ${horarios.extraccion.hasta}.`}{' '}
        Consulte con extracción si se los puede atender.
      </p>
    </div>
  );
}

export default AvisoCierre;
