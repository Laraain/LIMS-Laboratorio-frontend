import { useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { mensajeDeErrorApi } from '../lib/api.js';
import { leerNumero, numeroParaCampo } from '../lib/analisis.js';
import { formatearPesos } from '../lib/aranceles.js';
import { MEDIOS_PAGO, anularCobro, cuentaDeOrden, registrarCobro } from '../lib/cobros.js';
import { abrirComprobante } from '../lib/comprobante.js';
import { fechaDe, horaDe } from '../lib/hora.js';

const OBSERVACIONES_MAXIMO = 200;

// Ventana de cobro de una orden (LIMS-19): cuánto paga el paciente, lo que ya pagó y el formulario para
// registrar un cobro nuevo. Se puede pagar en partes (ej: una parte en efectivo y otra con débito).
// Los cobros cargados no se borran: se anulan con motivo.
// Props: orden (con sus estudios y cobros) · sucursal · perfil · onCerrar · onGuardado (después de registrar o anular)
function ModalCobro({ orden, sucursal, perfil, onCerrar, onGuardado }) {
  const cuenta = cuentaDeOrden(orden);
  const puedeCobrar = orden.estado !== 'anulada' && cuenta.saldo > 0;
  // Se propone cobrar todo lo que falta
  const [monto, setMonto] = useState(numeroParaCampo(cuenta.saldo > 0 ? cuenta.saldo : ''));
  const [medio, setMedio] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Los más nuevos arriba
  const cobros = [...(orden.cobros ?? [])].sort((a, b) => b.cobrado_en.localeCompare(a.cobrado_en));

  // Comprobante de cobro para el paciente (LIMS-46). Se abre en una pestaña aparte, lista para imprimir o
  // guardar como PDF. El cobro recién registrado todavía no tiene el perfil embebido: se lo agrega el que cobró.
  function verComprobante(cobro) {
    if (!abrirComprobante({ orden, cobro, sucursal })) {
      Swal.fire({
        icon: 'warning',
        title: 'No se pudo abrir el comprobante',
        text: 'Permití las ventanas emergentes para este sitio y volvé a intentarlo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    }
  }

  function avisarError(titulo, errorPeticion) {
    console.error(titulo, errorPeticion);
    return Swal.fire({
      icon: 'error',
      title: titulo,
      text: mensajeDeErrorApi(errorPeticion),
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#1c4e80',
    });
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    const valor = leerNumero(monto);
    if (valor === null || Number.isNaN(valor) || valor <= 0) {
      setError('Ingrese el monto en pesos (por ejemplo 2700 o 2700,50).');
      return;
    }
    if (valor > cuenta.saldo) {
      setError(`No puede ser más de lo que falta cobrar (${formatearPesos(cuenta.saldo)}).`);
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: `¿Registrar ${formatearPesos(valor)}?`,
      text: `${MEDIOS_PAGO[medio]} · orden ${orden.nro_orden}`,
      showCancelButton: true,
      confirmButtonText: 'Registrar cobro',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      const resultado = await registrarCobro(orden.id, valor, medio, observaciones.trim());
      const saldo = Number(resultado.saldo);
      const cobroConCobrador = {
        ...resultado.cobro,
        cobrador: perfil ? { nombre: perfil.nombre, apellido: perfil.apellido } : resultado.cobro.cobrador,
      };
      const { isConfirmed } = await Swal.fire({
        icon: 'success',
        title: saldo <= 0 ? 'Orden pagada' : 'Cobro registrado',
        text: saldo <= 0 ? 'El paciente pagó el total de la orden.' : `Falta cobrar ${formatearPesos(saldo)}.`,
        showCancelButton: true,
        confirmButtonText: 'Comprobante',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#1c4e80',
      });
      if (isConfirmed) verComprobante(cobroConCobrador);
      onGuardado();
    } catch (errorPeticion) {
      await avisarError('No pudimos registrar el cobro', errorPeticion);
      setGuardando(false);
    }
  }

  async function anular(cobro) {
    const { value: motivo } = await Swal.fire({
      icon: 'warning',
      title: `¿Anular el cobro de ${formatearPesos(cobro.monto)}?`,
      text: 'El cobro queda anulado y deja de contar. Indique el motivo.',
      input: 'text',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Ej: se cargó dos veces',
      inputAttributes: { maxlength: 200 },
      inputValidator: (texto) => (!texto?.trim() ? 'El motivo es obligatorio.' : undefined),
      showCancelButton: true,
      confirmButtonText: 'Anular cobro',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#b42318',
    });
    if (!motivo) return;

    setGuardando(true);
    try {
      await anularCobro(cobro.id, motivo.trim());
      await Swal.fire({ icon: 'success', title: 'Cobro anulado', timer: 1600, showConfirmButton: false });
      onGuardado();
    } catch (errorPeticion) {
      await avisarError('No pudimos anular el cobro', errorPeticion);
      setGuardando(false);
    }
  }

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          Cobro · {orden.nro_orden}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="mb-3">
          {orden.pacientes.apellido}, {orden.pacientes.nombre}
          <span className="lims-celda-identidad">DNI {orden.pacientes.dni}</span>
        </p>

        <dl className="row g-2 mb-3">
          <div className="col-4">
            <dt className="small text-muted fw-normal">Total</dt>
            <dd className="fw-semibold mb-0">{formatearPesos(cuenta.total)}</dd>
          </div>
          <div className="col-4">
            <dt className="small text-muted fw-normal">Cobrado</dt>
            <dd className="fw-semibold mb-0">{formatearPesos(cuenta.cobrado)}</dd>
          </div>
          <div className="col-4">
            <dt className="small text-muted fw-normal">Falta</dt>
            <dd className={`fw-semibold mb-0${cuenta.saldo > 0 ? ' text-danger' : ''}`}>
              {formatearPesos(Math.max(cuenta.saldo, 0))}
            </dd>
          </div>
        </dl>

        {cuenta.total === 0 && (
          <p className="small text-muted">Esta orden no tiene importe para el paciente.</p>
        )}

        {puedeCobrar && (
          <form id="form-cobro" onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-sm-6">
                <label htmlFor="cobro-monto" className="form-label fw-semibold small">
                  Monto ($) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="cobro-monto"
                  className={`form-control${error ? ' is-invalid' : ''}`}
                  value={monto}
                  onChange={(evento) => {
                    setMonto(evento.target.value);
                    setError('');
                  }}
                />
                {error ? (
                  <div className="invalid-feedback">{error}</div>
                ) : (
                  <div className="form-text">Si paga en partes, cargue cada parte por separado.</div>
                )}
              </div>
              <div className="col-sm-6">
                <label htmlFor="cobro-medio" className="form-label fw-semibold small">
                  Medio de pago <span className="text-danger">*</span>
                </label>
                <select id="cobro-medio" className="form-select" value={medio} onChange={(evento) => setMedio(evento.target.value)}>
                  {Object.entries(MEDIOS_PAGO).map(([valor, nombre]) => (
                    <option key={valor} value={valor}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label htmlFor="cobro-observaciones" className="form-label fw-semibold small">
                  Observaciones
                </label>
                <input
                  type="text"
                  id="cobro-observaciones"
                  className="form-control"
                  maxLength={OBSERVACIONES_MAXIMO}
                  placeholder="Ej: últimos 4 de la tarjeta, nro. de transferencia"
                  value={observaciones}
                  onChange={(evento) => setObservaciones(evento.target.value)}
                />
              </div>
            </div>
          </form>
        )}

        {cobros.length > 0 && (
          <section className="mt-4" aria-labelledby="cobro-historial">
            <h3 id="cobro-historial" className="h6 fw-bold">
              Cobros
            </h3>
            <ul className="list-unstyled mb-0 small">
              {cobros.map((cobro) => (
                <li key={cobro.id} className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 border-bottom">
                  <span className={cobro.anulado_en ? 'text-muted text-decoration-line-through' : ''}>
                    {fechaDe(cobro.cobrado_en)} {horaDe(cobro.cobrado_en)} · {MEDIOS_PAGO[cobro.medio_pago]}
                  </span>
                  <span className="d-inline-flex align-items-center gap-2">
                    <span className={`fw-semibold${cobro.anulado_en ? ' text-muted text-decoration-line-through' : ''}`}>
                      {formatearPesos(cobro.monto)}
                    </span>
                    <button
                      type="button"
                      className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                      disabled={guardando}
                      aria-label={`Ver el comprobante del cobro de ${formatearPesos(cobro.monto)}`}
                      onClick={() => verComprobante(cobro)}
                    >
                      Comprobante
                    </button>
                    {!cobro.anulado_en && (
                      <button
                        type="button"
                        className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                        disabled={guardando}
                        aria-label={`Anular el cobro de ${formatearPesos(cobro.monto)}`}
                        onClick={() => anular(cobro)}
                      >
                        Anular
                      </button>
                    )}
                  </span>
                  {cobro.observaciones && <span className="w-100 text-muted">{cobro.observaciones}</span>}
                  {cobro.anulado_en && <span className="w-100 text-danger">Anulado: {cobro.motivo_anulacion}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          {puedeCobrar ? 'Cancelar' : 'Cerrar'}
        </button>
        {puedeCobrar && (
          <button type="submit" form="form-cobro" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar cobro'}
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default ModalCobro;
