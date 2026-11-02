import { useCallback, useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ArrowCounterClockwise, LockKey, LockKeyOpen } from '@phosphor-icons/react';
import { ROLES_CAJA } from '../data/roles.js';
import useMetadatos from '../hooks/useMetadatos.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { leerNumero } from '../lib/analisis.js';
import { formatearPesos } from '../lib/aranceles.js';
import { abrirCaja, cerrarCaja, reabrirCaja, resumenCaja } from '../lib/caja.js';
import { MEDIOS_PAGO } from '../lib/cobros.js';
import { fechaDe, horaDe, hoyTucuman } from '../lib/hora.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';

// "2026-10-01" → "01/10/2026"
function fechaCorta(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR');
}

// Caja diaria de la sucursal (LIMS-20): recepción la abre con el efectivo inicial y al final del día la cierra
// contando el efectivo. Se ve lo cobrado por medio de pago y la diferencia entre lo esperado y lo contado.
// Se pueden consultar días anteriores; el admin puede reabrir una caja cerrada (con motivo).
function Caja() {
  useMetadatos({
    titulo: 'Caja — LIMS Laboratorio',
    descripcion: 'Apertura y cierre de la caja diaria de la sucursal.',
    ruta: '/panel/caja',
    indexar: false,
  });

  const { perfil, sucursal } = useOutletContext();
  const [fecha, setFecha] = useState(hoyTucuman);
  // resumen: lo que devuelve resumen_caja · null mientras carga
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(false);
  const [monto, setMonto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errorMonto, setErrorMonto] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setResumen(await resumenCaja(sucursal.id, fecha));
      setError(false);
    } catch (errorPeticion) {
      console.error('No se pudo cargar la caja:', errorPeticion);
      setError(true);
    }
  }, [sucursal.id, fecha]);

  useEffect(() => {
    // La primera carga se difiere para no actualizar estados durante el primer dibujo
    const primera = setTimeout(recargar, 0);
    return () => clearTimeout(primera);
  }, [recargar]);

  if (!ROLES_CAJA.includes(perfil.rol)) return <Navigate to="/panel" replace />;

  const esHoy = fecha === hoyTucuman();
  const caja = resumen?.caja ?? null;
  const abierta = caja && !caja.cerrada_en;
  const totalCobrado = (resumen?.por_medio ?? []).reduce((suma, medio) => suma + Number(medio.total), 0);
  // Se abre solo la de hoy; se cierra la de hoy o una de otro día que quedó abierta
  const puedeAbrir = resumen && !caja && esHoy;
  const puedeCerrar = abierta;
  const montoLeido = leerNumero(monto);
  // Mientras escribe lo contado, se adelanta la diferencia con lo esperado en efectivo
  const diferenciaPrevia =
    puedeCerrar && montoLeido !== null && !Number.isNaN(montoLeido) ? montoLeido - Number(resumen.efectivo_esperado) : null;

  function cambiarFecha(nueva) {
    setFecha(nueva || hoyTucuman());
    setResumen(null);
    setMonto('');
    setObservaciones('');
    setErrorMonto('');
  }

  async function avisarError(titulo, errorPeticion) {
    console.error(titulo, errorPeticion);
    await Swal.fire({
      icon: 'error',
      title: titulo,
      text: mensajeDeErrorApi(errorPeticion),
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#1c4e80',
    });
  }

  function montoValido() {
    if (montoLeido === null || Number.isNaN(montoLeido) || montoLeido < 0) {
      setErrorMonto('Ingrese el monto en pesos (por ejemplo 20000 o 20000,50). Puede ser 0.');
      return false;
    }
    return true;
  }

  async function abrir(evento) {
    evento.preventDefault();
    if (!montoValido()) return;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Abrir la caja de hoy?',
      text: `${sucursal.nombre} · efectivo inicial ${formatearPesos(montoLeido)}`,
      showCancelButton: true,
      confirmButtonText: 'Abrir caja',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setTrabajando(true);
    try {
      await abrirCaja(sucursal.id, montoLeido);
      setMonto('');
      await Swal.fire({ icon: 'success', title: 'Caja abierta', timer: 1600, showConfirmButton: false });
    } catch (errorPeticion) {
      await avisarError('No pudimos abrir la caja', errorPeticion);
    }
    await recargar();
    setTrabajando(false);
  }

  async function cerrar(evento) {
    evento.preventDefault();
    if (!montoValido()) return;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `¿Cerrar la caja del ${fechaCorta(fecha)}?`,
      html:
        `<p class="mb-1">Efectivo contado: <strong>${formatearPesos(montoLeido)}</strong></p>` +
        `<p class="mb-1">Esperado: ${formatearPesos(resumen.efectivo_esperado)}</p>` +
        '<p class="mb-0">Con la caja cerrada no se puede cobrar ni anular cobros de ese día.</p>',
      showCancelButton: true,
      confirmButtonText: 'Cerrar caja',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setTrabajando(true);
    try {
      const cierre = await cerrarCaja(sucursal.id, montoLeido, observaciones.trim(), fecha);
      setMonto('');
      setObservaciones('');
      const diferencia = Number(cierre.diferencia);
      await Swal.fire({
        icon: diferencia === 0 ? 'success' : 'warning',
        title: 'Caja cerrada',
        text:
          diferencia === 0
            ? 'El efectivo coincide con lo esperado.'
            : `${diferencia > 0 ? 'Sobran' : 'Faltan'} ${formatearPesos(Math.abs(diferencia))} en efectivo.`,
        confirmButtonText: 'Listo',
        confirmButtonColor: '#1c4e80',
      });
    } catch (errorPeticion) {
      await avisarError('No pudimos cerrar la caja', errorPeticion);
    }
    await recargar();
    setTrabajando(false);
  }

  async function reabrir() {
    const { value: motivo } = await Swal.fire({
      icon: 'warning',
      title: `¿Reabrir la caja del ${fechaCorta(fecha)}?`,
      text: 'Se borra el cierre (lo contado) y se puede volver a cobrar o anular cobros de ese día. Indique el motivo.',
      input: 'text',
      inputLabel: 'Motivo de la reapertura',
      inputPlaceholder: 'Ej: faltó cargar un cobro',
      inputAttributes: { maxlength: 300 },
      inputValidator: (texto) => (!texto?.trim() ? 'El motivo es obligatorio.' : undefined),
      showCancelButton: true,
      confirmButtonText: 'Reabrir caja',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#b42318',
    });
    if (!motivo) return;

    setTrabajando(true);
    try {
      await reabrirCaja(caja.id, motivo.trim());
      await Swal.fire({ icon: 'success', title: 'Caja reabierta', timer: 1600, showConfirmButton: false });
    } catch (errorPeticion) {
      await avisarError('No pudimos reabrir la caja', errorPeticion);
    }
    await recargar();
    setTrabajando(false);
  }

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Cobranzas · {sucursal.nombre}</p>
          <h1 className="lims-panel-titulo">Caja diaria</h1>
          <p className="lims-panel-texto mb-0">
            Abra la caja al empezar el día con el efectivo inicial: sin la caja abierta no se puede cobrar. Al terminar,
            ciérrela contando el efectivo.
          </p>
        </div>
        <div>
          <label htmlFor="caja-fecha" className="form-label fw-semibold small mb-1">
            Día
          </label>
          <input
            type="date"
            id="caja-fecha"
            className="form-control"
            value={fecha}
            max={hoyTucuman()}
            onChange={(evento) => cambiarFecha(evento.target.value)}
          />
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="caja-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="caja-titulo" className="lims-lista-titulo">
              {esHoy ? 'Caja de hoy' : `Caja del ${fechaCorta(fecha)}`}
            </h2>
            {resumen && (
              <p className="lims-lista-resumen mb-0">
                {!caja
                  ? 'No se abrió'
                  : abierta
                    ? `Abierta a las ${horaDe(caja.abierta_en)}`
                    : `Cerrada el ${fechaDe(caja.cerrada_en)} a las ${horaDe(caja.cerrada_en)}`}
              </p>
            )}
          </div>
          {perfil.rol === 'admin' && caja && !abierta && (
            <button type="button" className="btn lims-btn-pill lims-btn-secundario" disabled={trabajando} onClick={reabrir}>
              <ArrowCounterClockwise className="lims-icono me-2" aria-hidden="true" />
              Reabrir caja
            </button>
          )}
        </div>

        {error ? (
          <div className="lims-lista-aviso" role="alert">
            <span>No se pudo cargar la caja.</span>
            <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : !resumen ? (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Cargando la caja…
          </div>
        ) : (
          <div className="p-3 p-md-4">
            {caja && (
              <div className="lims-tabla-contenedor mb-4">
                <table className="table align-middle mb-0">
                  <caption className="visually-hidden">Lo cobrado en el día por medio de pago</caption>
                  <thead>
                    <tr>
                      <th scope="col">Medio de pago</th>
                      <th scope="col" className="text-end">
                        Cobros
                      </th>
                      <th scope="col" className="text-end">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.por_medio.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-muted">
                          Todavía no hay cobros este día.
                        </td>
                      </tr>
                    )}
                    {resumen.por_medio.map((medio) => (
                      <tr key={medio.medio_pago}>
                        <td>{MEDIOS_PAGO[medio.medio_pago]}</td>
                        <td className="text-end">{medio.cantidad}</td>
                        <td className="text-end">{formatearPesos(medio.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-semibold">
                      <td>Total cobrado</td>
                      <td></td>
                      <td className="text-end">{formatearPesos(totalCobrado)}</td>
                    </tr>
                  </tfoot>
                </table>
                {resumen.cobros_anulados > 0 && (
                  <p className="small text-muted mt-2 mb-0">
                    {resumen.cobros_anulados} {resumen.cobros_anulados === 1 ? 'cobro anulado no cuenta' : 'cobros anulados no cuentan'}.
                  </p>
                )}
              </div>
            )}

            {caja && (
              <dl className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                  <dt className="small text-muted fw-normal">Efectivo inicial</dt>
                  <dd className="fw-semibold mb-0">{formatearPesos(caja.monto_inicial)}</dd>
                </div>
                <div className="col-6 col-md-3">
                  <dt className="small text-muted fw-normal">Efectivo esperado</dt>
                  <dd className="fw-semibold mb-0">{formatearPesos(resumen.efectivo_esperado)}</dd>
                </div>
                {!abierta && (
                  <>
                    <div className="col-6 col-md-3">
                      <dt className="small text-muted fw-normal">Efectivo contado</dt>
                      <dd className="fw-semibold mb-0">{formatearPesos(caja.monto_contado)}</dd>
                    </div>
                    <div className="col-6 col-md-3">
                      <dt className="small text-muted fw-normal">Diferencia</dt>
                      <dd className={`fw-semibold mb-0${Number(resumen.diferencia) === 0 ? ' text-success' : ' text-danger'}`}>
                        {Number(resumen.diferencia) === 0
                          ? 'Sin diferencia'
                          : `${Number(resumen.diferencia) > 0 ? 'Sobran' : 'Faltan'} ${formatearPesos(Math.abs(resumen.diferencia))}`}
                      </dd>
                    </div>
                  </>
                )}
                {!abierta && caja.observaciones_cierre && (
                  <div className="col-12">
                    <dt className="small text-muted fw-normal">Observaciones del cierre</dt>
                    <dd className="mb-0">{caja.observaciones_cierre}</dd>
                  </div>
                )}
                {caja.motivo_reapertura && (
                  <div className="col-12">
                    <dt className="small text-muted fw-normal">Reabierta por el administrador</dt>
                    <dd className="mb-0">
                      {fechaDe(caja.reabierta_en)} {horaDe(caja.reabierta_en)} · {caja.motivo_reapertura}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {!caja && !esHoy && <p className="text-muted mb-0">Ese día la caja no se abrió.</p>}

            {(puedeAbrir || puedeCerrar) && (
              <form onSubmit={puedeAbrir ? abrir : cerrar} noValidate className="row g-3 align-items-end">
                <div className="col-sm-6 col-lg-4">
                  <label htmlFor="caja-monto" className="form-label fw-semibold small">
                    {puedeAbrir ? 'Efectivo inicial ($)' : 'Efectivo contado ($)'} <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="caja-monto"
                    className={`form-control${errorMonto ? ' is-invalid' : ''}`}
                    value={monto}
                    onChange={(evento) => {
                      setMonto(evento.target.value);
                      setErrorMonto('');
                    }}
                  />
                  {errorMonto ? (
                    <div className="invalid-feedback">{errorMonto}</div>
                  ) : (
                    <div className="form-text">
                      {puedeAbrir
                        ? 'El cambio con el que empieza el día. Puede ser 0.'
                        : diferenciaPrevia === null
                          ? 'Cuente el efectivo que hay en la caja.'
                          : diferenciaPrevia === 0
                            ? 'Coincide con lo esperado.'
                            : `${diferenciaPrevia > 0 ? 'Sobran' : 'Faltan'} ${formatearPesos(Math.abs(diferenciaPrevia))}.`}
                    </div>
                  )}
                </div>
                {puedeCerrar && (
                  <div className="col-sm-6 col-lg-5">
                    <label htmlFor="caja-observaciones" className="form-label fw-semibold small">
                      Observaciones
                    </label>
                    <input
                      type="text"
                      id="caja-observaciones"
                      className="form-control"
                      maxLength={300}
                      placeholder="Ej: faltante por un vuelto mal dado"
                      value={observaciones}
                      onChange={(evento) => setObservaciones(evento.target.value)}
                    />
                  </div>
                )}
                <div className="col-12 col-lg-3">
                  <button type="submit" className="btn lims-btn-pill lims-btn-primario w-100" disabled={trabajando}>
                    {puedeAbrir ? (
                      <LockKeyOpen className="lims-icono me-2" aria-hidden="true" />
                    ) : (
                      <LockKey className="lims-icono me-2" aria-hidden="true" />
                    )}
                    {trabajando ? 'Guardando…' : puedeAbrir ? 'Abrir caja' : 'Cerrar caja'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Caja;
