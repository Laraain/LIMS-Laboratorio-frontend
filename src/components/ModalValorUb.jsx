import { useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { mensajeDeErrorApi } from '../lib/api.js';
import { leerNumero, numeroParaCampo } from '../lib/analisis.js';
import { formatearPesos, guardarValorUb } from '../lib/aranceles.js';
import { hoyTucuman } from '../lib/hora.js';

const OBSERVACIONES_MAXIMO = 200;

// "2026-10-01" → "01/10/2026"
function fechaCorta(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR');
}

// Ventana para cargar un valor nuevo de la UB de una obra social (o del particular), desde una fecha.
// Los valores anteriores quedan como historial: las órdenes viejas conservan el precio que tenían.
// Props: entidad ({ id, nombre }; id null = particular) · valores (su historial, del más nuevo al más viejo)
// onCerrar · onGuardado
function ModalValorUb({ entidad, valores, onCerrar, onGuardado }) {
  const esParticular = entidad.id === null;
  const actual = valores.find((valor) => valor.vigente_desde <= hoyTucuman()) ?? null;
  const [valorUb, setValorUb] = useState(numeroParaCampo(actual?.valor_ub));
  const [coseguro, setCoseguro] = useState(numeroParaCampo(actual?.coseguro_pct ?? 0));
  const [desde, setDesde] = useState(hoyTucuman());
  const [observaciones, setObservaciones] = useState('');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  function limpiarError(campo) {
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    const datos = {
      obra_social_id: entidad.id,
      valor_ub: leerNumero(valorUb),
      // El particular paga todo: no tiene coseguro
      coseguro_pct: esParticular ? 0 : leerNumero(coseguro),
      vigente_desde: desde,
      observaciones: observaciones.trim() || null,
    };

    const nuevos = {};
    if (datos.valor_ub === null || Number.isNaN(datos.valor_ub) || datos.valor_ub <= 0) {
      nuevos.valorUb = 'Ingrese el valor de la UB en pesos (por ejemplo 1500).';
    }
    if (datos.coseguro_pct === null || Number.isNaN(datos.coseguro_pct) || datos.coseguro_pct < 0 || datos.coseguro_pct > 100) {
      nuevos.coseguro = 'Ingrese un porcentaje de 0 a 100.';
    }
    if (!datos.vigente_desde) nuevos.desde = 'Elija desde qué día rige.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    // Un valor por día: si ya hay uno cargado para esa fecha, se reemplaza
    const mismoDia = valores.find((valor) => valor.vigente_desde === datos.vigente_desde) ?? null;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: `¿Guardar el valor de ${entidad.nombre}?`,
      html:
        `<p class="mb-1">${formatearPesos(datos.valor_ub)} por UB` +
        (esParticular ? '' : ` · coseguro ${datos.coseguro_pct}%`) +
        `, desde el ${fechaCorta(datos.vigente_desde)}.</p>` +
        (mismoDia
          ? '<p class="mb-0">Reemplaza el valor que ya estaba cargado para ese día.</p>'
          : '<p class="mb-0">Las órdenes que ya están cargadas conservan su precio.</p>'),
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      await guardarValorUb(datos, mismoDia?.id ?? null);
      await Swal.fire({ icon: 'success', title: 'Valor guardado', timer: 1600, showConfirmButton: false });
      onGuardado();
    } catch (error) {
      console.error('No se pudo guardar el valor de la UB:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar el valor',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  const clase = (base, campo) => `${base}${errores[campo] ? ' is-invalid' : ''}`;

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          Arancel · {entidad.nombre}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-valor-ub" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-sm-6">
              <label htmlFor="valor-ub" className="form-label fw-semibold small">
                Valor de la UB ($) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="valor-ub"
                className={clase('form-control', 'valorUb')}
                value={valorUb}
                onChange={(evento) => {
                  setValorUb(evento.target.value);
                  limpiarError('valorUb');
                }}
              />
              {errores.valorUb && <div className="invalid-feedback">{errores.valorUb}</div>}
            </div>
            {!esParticular && (
              <div className="col-sm-6">
                <label htmlFor="valor-coseguro" className="form-label fw-semibold small">
                  Coseguro del paciente (%) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="valor-coseguro"
                  className={clase('form-control', 'coseguro')}
                  value={coseguro}
                  aria-describedby="valor-coseguro-ayuda"
                  onChange={(evento) => {
                    setCoseguro(evento.target.value);
                    limpiarError('coseguro');
                  }}
                />
                {errores.coseguro ? (
                  <div className="invalid-feedback">{errores.coseguro}</div>
                ) : (
                  <div className="form-text" id="valor-coseguro-ayuda">
                    Lo que paga el paciente de cada estudio. 0 = lo cubre todo la obra social.
                  </div>
                )}
              </div>
            )}
            <div className="col-sm-6">
              <label htmlFor="valor-desde" className="form-label fw-semibold small">
                Rige desde <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                id="valor-desde"
                className={clase('form-control', 'desde')}
                value={desde}
                onChange={(evento) => {
                  setDesde(evento.target.value);
                  limpiarError('desde');
                }}
              />
              {errores.desde && <div className="invalid-feedback">{errores.desde}</div>}
            </div>
            <div className="col-12">
              <label htmlFor="valor-observaciones" className="form-label fw-semibold small">
                Observaciones
              </label>
              <input
                type="text"
                id="valor-observaciones"
                className="form-control"
                maxLength={OBSERVACIONES_MAXIMO}
                placeholder="Ej: aumento de noviembre"
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
              />
            </div>
          </div>
        </form>

        {valores.length > 0 && (
          <section className="mt-4" aria-labelledby="valor-historial">
            <h3 id="valor-historial" className="h6 fw-bold">
              Historial
            </h3>
            <ul className="list-unstyled mb-0 small">
              {valores.map((valor) => (
                <li key={valor.id} className="d-flex flex-wrap justify-content-between gap-2 py-1 border-bottom">
                  <span>Desde el {fechaCorta(valor.vigente_desde)}</span>
                  <span className="fw-semibold">
                    {formatearPesos(valor.valor_ub)} por UB
                    {esParticular ? '' : ` · coseguro ${Number(valor.coseguro_pct)}%`}
                  </span>
                  {valor.observaciones && <span className="w-100 text-muted">{valor.observaciones}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" form="form-valor-ub" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar valor'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalValorUb;
