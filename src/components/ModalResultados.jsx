import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { CaretDown, CaretRight, WarningCircle } from '@phosphor-icons/react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { formatearNumero, leerNumero, numeroParaCampo, textoReferencia } from '../lib/analisis.js';
import { edadDesde } from '../lib/hora.js';
import { ESTADOS_RESULTADO, guardarResultados, leerOrdenConResultados, rangosDeOrden, resultadoDe } from '../lib/resultados.js';
import './ModalOrden.css';
import './ModalResultados.css';

const SEXOS = { F: 'Femenino', M: 'Masculino', X: 'X' };

// ¿El estudio se informa con un número? Sí, si su rango de referencia tiene mínimo o máximo
function esNumerico(rango) {
  return Boolean(rango) && (rango.valor_min !== null || rango.valor_max !== null);
}

// Valor absoluto de un componente en %: % × el estudio base (ej: glóbulos blancos) / 100, igual que la base
function calcularAbsoluto(porcentaje, base) {
  const numero = leerNumero(porcentaje);
  const valorBase = leerNumero(base ?? '');
  if (numero === null || Number.isNaN(numero) || valorBase === null || Number.isNaN(valorBase)) return null;
  return Math.round((numero * valorBase) / 100);
}

// Mismo criterio que la base: fuera del mínimo o del máximo (del % o del absoluto), o distinto de la referencia de texto
function fueraDeRango(valor, rango, numerico, absoluto, analisis) {
  if (!rango || valor.trim() === '') return false;
  if (numerico) {
    const numero = leerNumero(valor);
    if (Number.isNaN(numero) || numero === null) return false;
    const fueraValor = (rango.valor_min !== null && numero < rango.valor_min) || (rango.valor_max !== null && numero > rango.valor_max);
    const fueraAbsoluto =
      absoluto !== null &&
      ((analisis.absoluto_min !== null && absoluto < analisis.absoluto_min) ||
        (analisis.absoluto_max !== null && absoluto > analisis.absoluto_max));
    return fueraValor || fueraAbsoluto;
  }
  return Boolean(rango.valor_texto) && rango.valor_texto !== 'Ver informe' && valor.trim().toLowerCase() !== rango.valor_texto.toLowerCase();
}

// Ventana para cargar o corregir los resultados de una orden (recepción y bioquímico).
// Cada estudio muestra el rango de referencia según el sexo y la edad del paciente y avisa si el valor queda fuera.
// Un estudio con componentes (ej: fórmula leucocitaria) se despliega para cargar sus valores de seguido;
// los que van en % muestran el absoluto, calculado con los glóbulos blancos de la misma orden.
// Los resultados validados por el bioquímico se ven pero no se pueden cambiar.
// Props: ordenId · onCerrar · onGuardado
function ModalResultados({ ordenId, onCerrar, onGuardado }) {
  const [orden, setOrden] = useState(null);
  const [rangos, setRangos] = useState({});
  // valores: lo que está escrito en cada campo, por id del estudio en la orden
  const [valores, setValores] = useState({});
  // cerrados: estudios con componentes plegados (arrancan abiertos si les falta algún valor)
  const [cerrados, setCerrados] = useState({});
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
        // Un estudio con componentes arranca plegado solo si ya tiene todos sus valores cargados
        const pendientes = new Set(
          datosOrden.orden_analisis.filter((estudio) => estudio.padre_id && !resultadoDe(estudio)).map((estudio) => estudio.padre_id),
        );
        setCerrados(
          Object.fromEntries(
            datosOrden.orden_analisis
              .filter((estudio) => estudio.padre_id)
              .map((estudio) => [estudio.padre_id, !pendientes.has(estudio.padre_id)]),
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

  // Estructura de la orden: estudios pedidos y, debajo de cada uno, sus componentes
  const estudios = orden?.orden_analisis ?? [];
  const componentesDe = {};
  estudios.forEach((estudio) => {
    if (estudio.padre_id) (componentesDe[estudio.padre_id] ??= []).push(estudio);
  });
  const pedidos = estudios.filter((estudio) => !estudio.padre_id);
  // Lo que se carga: los estudios sin componentes y los componentes (no el estudio que los agrupa)
  const cargables = estudios.filter((estudio) => !componentesDe[estudio.id]);
  // Valor escrito del estudio base del absoluto (ej: glóbulos blancos) en esta orden
  function valorBase(analisisId) {
    const base = estudios.find((estudio) => estudio.analisis.id === analisisId);
    return base ? valores[base.id] : null;
  }
  function absolutoDe(estudio) {
    return estudio.analisis.absoluto_de ? calcularAbsoluto(valores[estudio.id] ?? '', valorBase(estudio.analisis.absoluto_de)) : null;
  }
  function estaFuera(estudio) {
    const rango = rangos[estudio.id];
    return fueraDeRango(valores[estudio.id] ?? '', rango, esNumerico(rango), absolutoDe(estudio), estudio.analisis);
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    const nuevosErrores = {};
    const items = [];
    cargables.forEach((estudio) => {
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
    if (Object.keys(nuevosErrores).length > 0) {
      // Si el error está en un componente plegado, se despliega para que se vea
      setCerrados((previos) => {
        const abiertos = { ...previos };
        estudios.forEach((estudio) => {
          if (estudio.padre_id && nuevosErrores[estudio.id]) abiertos[estudio.padre_id] = false;
        });
        return abiertos;
      });
      return;
    }

    setGuardando(true);
    try {
      await guardarResultados(ordenId, items);
      const conValor = cargables.filter((estudio) => (valores[estudio.id] ?? '').trim() !== '').length;
      const fuera = cargables.filter(estaFuera).length;
      await Swal.fire({
        icon: 'success',
        title: 'Resultados guardados',
        text:
          `${conValor} de ${cargables.length} valores cargados` +
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

  // Una fila para cargar el valor de un estudio (o de un componente)
  function filaEstudio(estudio, componente = false) {
    const rango = rangos[estudio.id];
    const numerico = esNumerico(rango);
    const resultado = resultadoDe(estudio);
    const validado = resultado?.estado === 'validado';
    const valor = valores[estudio.id] ?? '';
    const absoluto = absolutoDe(estudio);
    const fuera = estaFuera(estudio);
    const idCampo = `resultado-${estudio.id}`;
    const analisis = estudio.analisis;
    return (
      <li key={estudio.id} className={`${componente ? 'lims-resultado--componente' : ''}${fuera ? ' lims-resultado--fuera' : ''}`}>
        <label htmlFor={idCampo} className="lims-resultado-estudio">
          {!componente && <span className="lims-codigo">{analisis.codigo}</span>}
          <span>
            <span className="fw-semibold">{analisis.nombre}</span>
            {!componente && (
              <span className="lims-celda-identidad">
                {analisis.tipos_muestra?.nombre}
                {estudio.grupos_analisis ? ` · ${estudio.grupos_analisis.nombre}` : ''}
              </span>
            )}
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
              placeholder={numerico ? 'Valor' : 'Escriba el resultado'}
              disabled={validado || guardando}
              value={valor}
              onChange={(evento) => cambiar(estudio.id, evento.target.value)}
            />
            {analisis.unidad && <span className="input-group-text">{analisis.unidad}</span>}
          </div>
          {analisis.absoluto_de && (
            <span className="lims-resultado-absoluto">
              {absoluto !== null
                ? `Absoluto: ${formatearNumero(absoluto)} ${analisis.absoluto_unidad ?? ''}`
                : 'Absoluto: cargue los glóbulos blancos'}
            </span>
          )}
          {errores[estudio.id] && <div className="text-danger small">{errores[estudio.id]}</div>}
        </div>
        <div className="lims-resultado-referencia">
          <span className="lims-celda-identidad">Referencia</span>
          <span>
            {rango
              ? textoReferencia({ valor_ref_min: rango.valor_min, valor_ref_max: rango.valor_max, valor_ref_texto: rango.valor_texto })
              : '—'}
            {analisis.unidad && esNumerico(rango) ? ` ${analisis.unidad}` : ''}
          </span>
          {analisis.absoluto_de && (analisis.absoluto_min !== null || analisis.absoluto_max !== null) && (
            <span>
              {textoReferencia({ valor_ref_min: analisis.absoluto_min, valor_ref_max: analisis.absoluto_max })}{' '}
              {analisis.absoluto_unidad}
            </span>
          )}
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
  }

  // Un estudio con componentes: misma fila de 3 columnas que los demás (estudio · botón en lugar del campo ·
  // avance en lugar de la referencia) y, debajo, una fila por componente.
  // Mientras falte algún valor no se puede plegar, para que no quede escondido lo que hay que cargar.
  function filaConComponentes(estudio) {
    const componentes = componentesDe[estudio.id];
    const abierto = !cerrados[estudio.id];
    const cargados = componentes.filter((componente) => (valores[componente.id] ?? '').trim() !== '').length;
    const completo = cargados === componentes.length;
    const fuera = componentes.filter(estaFuera).length;
    const idLista = `componentes-${estudio.id}`;
    return (
      <li key={estudio.id} className={`lims-resultado-grupo${fuera > 0 ? ' lims-resultado--fuera' : ''}`}>
        <div className="lims-resultado-fila">
          <div className="lims-resultado-estudio">
            <span className="lims-codigo">{estudio.analisis.codigo}</span>
            <span>
              <span className="fw-semibold">{estudio.analisis.nombre}</span>
              <span className="lims-celda-identidad">
                {estudio.analisis.tipos_muestra?.nombre}
                {estudio.grupos_analisis ? ` · ${estudio.grupos_analisis.nombre}` : ''}
              </span>
            </span>
          </div>
          <div className="lims-resultado-valor">
            <button
              type="button"
              className="lims-resultado-desplegar"
              aria-expanded={abierto}
              aria-controls={idLista}
              disabled={abierto && !completo}
              title={abierto && !completo ? 'Se puede ocultar cuando estén los valores cargados' : undefined}
              onClick={() => setCerrados((previos) => ({ ...previos, [estudio.id]: abierto }))}
            >
              <span>{abierto ? 'Ocultar los valores' : `Ver los ${componentes.length} valores`}</span>
              {abierto ? <CaretDown aria-hidden="true" /> : <CaretRight aria-hidden="true" />}
            </button>
          </div>
          <div className="lims-resultado-referencia">
            <span className="lims-celda-identidad">Valores</span>
            <span>
              {cargados} de {componentes.length} cargados
            </span>
            {fuera > 0 && (
              <span className="lims-resultado-alerta">
                <WarningCircle aria-hidden="true" /> {fuera} fuera de rango
              </span>
            )}
          </div>
        </div>
        {abierto && (
          <ul id={idLista} className="lims-resultados lims-resultados--componentes">
            {componentes.map((componente) => filaEstudio(componente, true))}
          </ul>
        )}
      </li>
    );
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
              {pedidos.map((estudio) => (componentesDe[estudio.id] ? filaConComponentes(estudio) : filaEstudio(estudio)))}
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
