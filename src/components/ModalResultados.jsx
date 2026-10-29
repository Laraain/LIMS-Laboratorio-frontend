import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { WarningCircle } from '@phosphor-icons/react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { leerNumero, numeroParaCampo, textoReferencia } from '../lib/analisis.js';
import { edadDesde } from '../lib/hora.js';
import { ESTADOS_RESULTADO, guardarResultados, leerOrdenConResultados, rangosDeOrden, resultadoDe } from '../lib/resultados.js';
import './ModalOrden.css';
import './ModalResultados.css';

const SEXOS = { F: 'Femenino', M: 'Masculino', X: 'X' };

// ¿El estudio se informa con un número? Sí, si su rango de referencia tiene mínimo o máximo
function esNumerico(rango) {
  return Boolean(rango) && (rango.valor_min !== null || rango.valor_max !== null);
}

// Mismo criterio que la base: fuera del mínimo o del máximo, o distinto de la referencia de texto
function fueraDeRango(valor, rango, numerico) {
  if (!rango || valor.trim() === '') return false;
  if (numerico) {
    const numero = leerNumero(valor);
    if (Number.isNaN(numero) || numero === null) return false;
    return (rango.valor_min !== null && numero < rango.valor_min) || (rango.valor_max !== null && numero > rango.valor_max);
  }
  return Boolean(rango.valor_texto) && rango.valor_texto !== 'Ver informe' && valor.trim().toLowerCase() !== rango.valor_texto.toLowerCase();
}

// Ventana para cargar o corregir los resultados de una orden (recepción y bioquímico).
// Cada estudio muestra el rango de referencia según el sexo y la edad del paciente y avisa si el valor queda fuera.
// Los resultados validados por el bioquímico se ven pero no se pueden cambiar.
// Props: ordenId · onCerrar · onGuardado
function ModalResultados({ ordenId, onCerrar, onGuardado }) {
  const [orden, setOrden] = useState(null);
  const [rangos, setRangos] = useState({});
  // valores: lo que está escrito en cada campo, por id del estudio en la orden
  const [valores, setValores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const [datosOrden, datosRangos] = await Promise.all([leerOrdenConResultados(ordenId), rangosDeOrden(ordenId)]);
        if (!vigente) return;
        setOrden(datosOrden);
        setRangos(datosRangos);
        // Cada campo arranca con el valor ya cargado (con coma decimal)
        setValores(
          Object.fromEntries(
            datosOrden.orden_analisis.map((estudio) => {
              const resultado = resultadoDe(estudio);
              const valor = resultado
                ? resultado.valor_numerico !== null
                  ? numeroParaCampo(resultado.valor_numerico)
                  : (resultado.valor_texto ?? '')
                : '';
              return [estudio.id, valor];
            }),
          ),
        );
      } catch (errorPeticion) {
        console.error('No se pudieron cargar los resultados:', errorPeticion);
        if (vigente) setError(true);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [ordenId]);

  function cambiar(id, valor) {
    setValores((previos) => ({ ...previos, [id]: valor }));
    setErrores((previos) => ({ ...previos, [id]: undefined }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    const nuevosErrores = {};
    const items = [];
    orden.orden_analisis.forEach((estudio) => {
      const resultado = resultadoDe(estudio);
      // Los validados no se mandan: quedan como están
      if (resultado?.estado === 'validado') return;
      const texto = valores[estudio.id] ?? '';
      if (esNumerico(rangos[estudio.id])) {
        const numero = leerNumero(texto);
        if (Number.isNaN(numero) || (numero !== null && numero < 0)) {
          nuevosErrores[estudio.id] = 'Ingrese un número (use coma para los decimales).';
          return;
        }
        items.push({ orden_analisis_id: estudio.id, valor_numerico: numero, valor_texto: null });
      } else {
        items.push({ orden_analisis_id: estudio.id, valor_numerico: null, valor_texto: texto.trim() || null });
      }
    });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setGuardando(true);
    try {
      await guardarResultados(ordenId, items);
      const cargados = items.filter((item) => item.valor_numerico !== null || item.valor_texto !== null).length;
      const fuera = orden.orden_analisis.filter((estudio) =>
        fueraDeRango(valores[estudio.id] ?? '', rangos[estudio.id], esNumerico(rangos[estudio.id])),
      ).length;
      await Swal.fire({
        icon: 'success',
        title: 'Resultados guardados',
        text:
          `${cargados} de ${orden.orden_analisis.length} estudios con resultado` +
          (fuera > 0 ? ` · ${fuera} fuera de rango` : '') +
          '. Quedan pendientes de validación del bioquímico.',
        confirmButtonText: 'Listo',
        confirmButtonColor: '#1c4e80',
      });
      onGuardado();
    } catch (errorPeticion) {
      console.error('No se pudieron guardar los resultados:', errorPeticion);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar los resultados',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  const paciente = orden?.pacientes;

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable size="lg" contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          Resultados {orden ? `· Orden ${orden.nro_orden}` : ''}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {cargando ? (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Cargando la orden…
          </div>
        ) : error || !orden ? (
          <div className="lims-lista-aviso" role="alert">
            No se pudo cargar la orden. Cierre la ventana e intente de nuevo.
          </div>
        ) : (
          <form id="form-resultados" onSubmit={handleSubmit} noValidate>
            <div className="lims-orden-elegido lims-orden-bloque">
              <div>
                <p className="lims-celda-nombre-texto mb-0">
                  {paciente.apellido}, {paciente.nombre}
                </p>
                <p className="lims-celda-identidad mb-0">
                  DNI {paciente.dni} · {edadDesde(paciente.fecha_nacimiento)} años ·{' '}
                  {paciente.sexo ? SEXOS[paciente.sexo] : 'Sexo sin especificar (se usa el rango general)'}
                </p>
              </div>
            </div>

            <ul className="lims-resultados">
              {orden.orden_analisis.map((estudio) => {
                const rango = rangos[estudio.id];
                const numerico = esNumerico(rango);
                const resultado = resultadoDe(estudio);
                const validado = resultado?.estado === 'validado';
                const valor = valores[estudio.id] ?? '';
                const fuera = fueraDeRango(valor, rango, numerico);
                const idCampo = `resultado-${estudio.id}`;
                return (
                  <li key={estudio.id} className={fuera ? 'lims-resultado--fuera' : ''}>
                    <label htmlFor={idCampo} className="lims-resultado-estudio">
                      <span className="lims-codigo">{estudio.analisis.codigo}</span>
                      <span>
                        <span className="fw-semibold">{estudio.analisis.nombre}</span>
                        <span className="lims-celda-identidad">
                          {estudio.analisis.tipos_muestra?.nombre}
                          {estudio.grupos_analisis ? ` · ${estudio.grupos_analisis.nombre}` : ''}
                        </span>
                      </span>
                    </label>
                    <div className="lims-resultado-valor">
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          id={idCampo}
                          inputMode={numerico ? 'decimal' : 'text'}
                          className={`form-control ${errores[estudio.id] ? 'is-invalid' : ''}`}
                          autoComplete="off"
                          maxLength={numerico ? 20 : 200}
                          placeholder={numerico ? 'Valor' : (rango?.valor_texto ?? 'Resultado')}
                          disabled={validado || guardando}
                          value={valor}
                          onChange={(evento) => cambiar(estudio.id, evento.target.value)}
                        />
                        {estudio.analisis.unidad && <span className="input-group-text">{estudio.analisis.unidad}</span>}
                      </div>
                      {errores[estudio.id] && <div className="text-danger small">{errores[estudio.id]}</div>}
                    </div>
                    <div className="lims-resultado-referencia">
                      <span className="lims-celda-identidad">Referencia</span>
                      <span>
                        {rango
                          ? textoReferencia({
                              valor_ref_min: rango.valor_min,
                              valor_ref_max: rango.valor_max,
                              valor_ref_texto: rango.valor_texto,
                            })
                          : '—'}
                      </span>
                      {fuera && (
                        <span className="lims-resultado-alerta">
                          <WarningCircle aria-hidden="true" /> Fuera de rango
                        </span>
                      )}
                      {resultado && (
                        <span className={`lims-resultado-estado lims-resultado-estado--${resultado.estado}`}>
                          {ESTADOS_RESULTADO[resultado.estado]}
                          {resultado.cargador ? ` · ${resultado.cargador.nombre} ${resultado.cargador.apellido}` : ''}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="form-text mb-0">
              Los estudios sin valor quedan sin cargar. Los resultados se pueden corregir hasta que los valide el bioquímico.
            </p>
          </form>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button
          type="submit"
          form="form-resultados"
          className="btn lims-btn-pill lims-btn-primario"
          disabled={guardando || cargando || error}
        >
          {guardando ? 'Guardando…' : 'Guardar resultados'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalResultados;
