import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Tag, Warning } from '@phosphor-icons/react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { etiquetaMuestra, leerTubosDelTurno, rechazarMuestra, rotularMuestras } from '../lib/muestras.js';

// Tubos del paciente llamado (LIMS-28): qué hay que extraer, agrupado por tipo de muestra, y el botón
// "Rotular muestras", que pide a la base el número del día (M1, M2…) para escribirlo en todos sus tubos.
// Props: turno (el turno llamado, con numero_muestra y fecha) · onRotulado (para recargar la fila)
function MuestrasDelPaciente({ turno, onRotulado }) {
  // datos: { tubos, sinOrden, faltaRotular } · null mientras carga
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await leerTubosDelTurno(turno.id));
      setError(false);
    } catch (errorPeticion) {
      console.error('No se pudieron cargar las muestras:', errorPeticion);
      setError(true);
    }
  }, [turno.id]);

  useEffect(() => {
    // Igual que la fila: la primera carga se difiere para no actualizar estados durante el dibujo
    const primera = setTimeout(cargar, 0);
    return () => clearTimeout(primera);
  }, [cargar]);

  function avisarError(titulo, errorPeticion) {
    console.error(titulo, errorPeticion);
    Swal.fire({
      icon: 'error',
      title: titulo,
      text: mensajeDeErrorApi(errorPeticion),
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#1c4e80',
    });
  }

  async function rotular() {
    // La primera vez se gasta un número del día: se confirma para no asignarlo sin querer
    if (!turno.numero_muestra) {
      const { isConfirmed } = await Swal.fire({
        icon: 'question',
        title: '¿Rotular las muestras?',
        text: 'Se le asigna al paciente el número de muestra del día. Hágalo cuando ya esté por extraer.',
        showCancelButton: true,
        confirmButtonText: 'Rotular',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#1c4e80',
      });
      if (!isConfirmed) return;
    }
    setTrabajando(true);
    try {
      const rotulo = await rotularMuestras(turno.id);
      const nuevos = await leerTubosDelTurno(turno.id);
      setDatos(nuevos);
      await onRotulado();
      const cantidad = nuevos.tubos.filter((grupo) => grupo.muestra?.estado === 'extraida').length;
      await Swal.fire({
        icon: 'success',
        title: etiquetaMuestra(rotulo.numero_muestra, rotulo.fecha),
        text: `Escriba este número en ${cantidad === 1 ? 'el tubo' : `los ${cantidad} tubos`} del paciente.`,
        confirmButtonText: 'Listo',
        confirmButtonColor: '#1c4e80',
      });
    } catch (errorPeticion) {
      avisarError('No pudimos rotular las muestras', errorPeticion);
    }
    setTrabajando(false);
  }

  async function marcarProblema(grupo) {
    // Un solo motivo, con dos botones: el tubo no se pudo sacar o se sacó pero no sirve
    const motivoEscrito = () => {
      const texto = Swal.getInput().value.trim();
      if (!texto) Swal.showValidationMessage('Escriba el motivo.');
      return texto || false;
    };
    const respuesta = await Swal.fire({
      icon: 'warning',
      title: `Tubo de ${grupo.tipo}`,
      html: '<p class="mb-0">¿No se pudo obtener o se rechazó? Queda registrado con su motivo.</p>',
      input: 'text',
      inputPlaceholder: 'Ej: vena difícil, muestra hemolizada',
      inputAttributes: { 'aria-label': 'Motivo', maxlength: '200' },
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'No se obtuvo',
      denyButtonText: 'Rechazado',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
      denyButtonColor: '#b02a37',
      preConfirm: motivoEscrito,
      preDeny: motivoEscrito,
      returnInputValueOnDeny: true,
    });
    if (respuesta.isDismissed) return;

    const motivo = `${respuesta.isConfirmed ? 'No se obtuvo' : 'Rechazado'}: ${respuesta.value}`;
    setTrabajando(true);
    try {
      await rechazarMuestra(grupo.muestra.id, motivo);
      await cargar();
    } catch (errorPeticion) {
      avisarError('No pudimos registrar el tubo', errorPeticion);
    }
    setTrabajando(false);
  }

  if (error) {
    return (
      <div className="lims-muestras">
        <p className="text-danger small mb-2">No pudimos cargar las muestras del paciente.</p>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={cargar}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!datos) {
    return <p className="lims-muestras small text-muted mb-0">Cargando las muestras…</p>;
  }

  if (datos.sinOrden) {
    return (
      <div className="lims-muestras">
        <p className="lims-muestras-aviso mb-0">
          <Warning className="lims-icono me-2" aria-hidden="true" />
          Todavía no tiene una orden cargada. Pídale a recepción que la cargue antes de extraer.
        </p>
      </div>
    );
  }

  return (
    <div className="lims-muestras">
      <div className="lims-muestras-cabecera">
        <h3 className="lims-muestras-titulo">Muestras</h3>
        {turno.numero_muestra && (
          <span className="lims-muestra-rotulo" title="Escríbalo en cada tubo">
            {etiquetaMuestra(turno.numero_muestra, turno.fecha)}
          </span>
        )}
      </div>

      <ul className="lims-muestras-lista">
        {datos.tubos.map((grupo) => (
          <li key={grupo.tipoId} className={grupo.muestra?.estado === 'rechazada' ? 'lims-muestra-rechazada' : ''}>
            <div className="lims-muestra-fila">
              <div>
                <p className="fw-semibold mb-0">
                  {grupo.tipo}
                  {grupo.tubo && <span className="lims-celda-identidad d-inline ms-2">{grupo.tubo}</span>}
                </p>
                <p className="lims-celda-identidad mb-0">
                  {grupo.estudios.map((estudio) => estudio.nombre).join(' · ')}
                </p>
                {grupo.muestra?.estado === 'rechazada' && (
                  <p className="small text-danger mb-0">{grupo.muestra.motivo_rechazo}</p>
                )}
              </div>
              {grupo.muestra?.estado === 'extraida' && (
                <button
                  type="button"
                  className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                  disabled={trabajando}
                  onClick={() => marcarProblema(grupo)}
                  aria-label={`Marcar el tubo de ${grupo.tipo} como no obtenido o rechazado`}
                >
                  Problema
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {datos.faltaRotular && (
        <button
          type="button"
          className="btn lims-btn-pill lims-btn-primario w-100"
          disabled={trabajando}
          onClick={rotular}
        >
          <Tag className="lims-icono me-2" aria-hidden="true" />
          {trabajando
            ? 'Rotulando…'
            : turno.numero_muestra
              ? `Rotular lo que falta (${etiquetaMuestra(turno.numero_muestra, turno.fecha)})`
              : 'Rotular muestras'}
        </button>
      )}
    </div>
  );
}

export default MuestrasDelPaciente;
