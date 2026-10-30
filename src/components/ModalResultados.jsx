import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { CaretDown, CaretRight, SealCheck, WarningCircle } from '@phosphor-icons/react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { formatearNumero, leerNumero, numeroParaCampo, textoReferencia } from '../lib/analisis.js';
import { ROLES_VALIDACION } from '../data/roles.js';
import { edadDesde, fechaDe, horaDe } from '../lib/hora.js';
import {
  ESTADOS_ORDEN_CERRADA,
  ESTADOS_RESULTADO,
  guardarResultados,
  leerOrdenConResultados,
  rangosDeOrden,
  resultadoDe,
  validarOrden,
} from '../lib/resultados.js';
import './ModalOrden.css';
import './ModalResultados.css';

const SEXOS = { F: 'Femenino', M: 'Masculino', X: 'X' };

// Escapa los caracteres especiales antes de armar el HTML de una ventana de SweetAlert2
function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

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
// Props: ordenId · perfil · onCerrar · onGuardado
function ModalResultados({ ordenId, perfil, onCerrar, onGuardado }) {
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
  const [validando, setValidando] = useState(false);

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

  const paciente = orden?.pacientes;
  const estadoOrden = orden?.estado;
  // Una orden validada (o anulada) se muestra en modo lectura
  const soloLectura = ESTADOS_ORDEN_CERRADA.includes(estadoOrden);
  const puedeValidar = ROLES_VALIDACION.includes(perfil?.rol) && !soloLectura;
  // Un valor está cargado si tiene algo escrito y, en los estudios numéricos, es un número válido
  function valorCargado(estudio) {
    const texto = (valores[estudio.id] ?? '').trim();
    if (texto === '') return false;
    if (esNumerico(rangos[estudio.id])) {
      const numero = leerNumero(texto);
      return numero !== null && !Number.isNaN(numero) && numero >= 0;
    }
    return true;
  }
  const todosCargados = cargables.length > 0 && cargables.every(valorCargado);
  const fueraDeRangoDeLaOrden = cargables.filter(estaFuera);
  // Quién y cuándo validó: lo guarda la base en cada resultado al cerrar la orden
  const primerValidado = cargables.map(resultadoDe).find((resultado) => resultado?.estado === 'validado');
  const validador = primerValidado?.validador
    ? `${primerValidado.validador.nombre} ${primerValidado.validador.apellido}`
    : null;
  const validadoEn = primerValidado?.validado_en
    ? `el ${fechaDe(primerValidado.validado_en)} a las ${horaDe(primerValidado.validado_en)}`
    : null;

  async function handleSubmit(evento) {
    evento.preventDefault();
    if (soloLectura) return;
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

  // Validar la orden: la base guarda estos valores, valida todo, cierra la orden y crea el informe
  async function handleValidar() {
    if (!puedeValidar || !todosCargados) return;

    const items = cargables
      .filter((estudio) => resultadoDe(estudio)?.estado !== 'validado')
      .map((estudio) => {
        const texto = valores[estudio.id] ?? '';
        if (esNumerico(rangos[estudio.id])) {
          return { orden_analisis_id: estudio.id, valor_numerico: leerNumero(texto), valor_texto: null };
        }
        return { orden_analisis_id: estudio.id, valor_numerico: null, valor_texto: texto.trim() || null };
      });

    // Resumen: los valores fuera de rango van primero, para que el bioquímico los mire antes de firmar
    const filasFuera = fueraDeRangoDeLaOrden
      .map((estudio) => {
        const rango = rangos[estudio.id];
        const analisis = estudio.analisis;
        const unidad = analisis.unidad ? ` ${analisis.unidad}` : '';
        const referencia = textoReferencia({
          valor_ref_min: rango.valor_min,
          valor_ref_max: rango.valor_max,
          valor_ref_texto: rango.valor_texto,
        });
        const absoluto = absolutoDe(estudio);
        const detalleAbsoluto =
          analisis.absoluto_de && absoluto !== null
            ? ` · absoluto ${formatearNumero(absoluto)} ${analisis.absoluto_unidad ?? ''}`
            : '';
        return (
          `<li><strong>${escapar(analisis.nombre)}</strong>: ${escapar(valores[estudio.id] ?? '')}${escapar(unidad)}` +
          ` <span class="lims-validacion-ref">(referencia ${escapar(referencia)}${escapar(unidad)})</span>${escapar(detalleAbsoluto)}</li>`
        );
      })
      .join('');

    const resumen = fueraDeRangoDeLaOrden.length
      ? `<p class="lims-validacion-fuera mb-1">${fueraDeRangoDeLaOrden.length} ` +
        `${fueraDeRangoDeLaOrden.length === 1 ? 'valor queda' : 'valores quedan'} fuera de rango:</p>` +
        `<ul class="lims-validacion-lista">${filasFuera}</ul>`
      : '<p class="text-success fw-semibold mb-1">Todos los valores están dentro del rango de referencia.</p>';

    const { isConfirmed } = await Swal.fire({
      icon: fueraDeRangoDeLaOrden.length > 0 ? 'warning' : 'question',
      title: `¿Validar la orden ${orden.nro_orden}?`,
      html:
        `<p class="mb-1">${escapar(paciente.apellido)}, ${escapar(paciente.nombre)} · ` +
        `${cargables.length} ${cargables.length === 1 ? 'valor' : 'valores'}</p>` +
        resumen +
        '<p class="mb-0 mt-2">Al validar, la orden queda cerrada y no se puede modificar. Se crea el informe del paciente en borrador.</p>',
      showCancelButton: true,
      confirmButtonText: 'Validar y cerrar',
      cancelButtonText: 'Revisar',
      confirmButtonColor: '#1c4e80',
      customClass: { htmlContainer: 'lims-validacion-resumen' },
    });
    if (!isConfirmed) return;

    setValidando(true);
    try {
      const cierre = await validarOrden(ordenId, items);
      await Swal.fire({
        icon: 'success',
        title: 'Orden validada',
        html:
          `<p class="mb-1">${cierre.validados} ${cierre.validados === 1 ? 'resultado validado' : 'resultados validados'}` +
          (cierre.fuera_de_rango > 0 ? ` · ${cierre.fuera_de_rango} fuera de rango` : '') +
          '.</p><p class="mb-0">La orden quedó cerrada y el informe se creó en borrador.</p>',
        confirmButtonText: 'Listo',
        confirmButtonColor: '#1c4e80',
      });
      onGuardado();
    } catch (errorPeticion) {
      console.error('No se pudo validar la orden:', errorPeticion);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos validar la orden',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setValidando(false);
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
              disabled={soloLectura || validado || guardando || validando}
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
              {resultado.estado === 'validado' && resultado.validador
                ? ` · ${resultado.validador.nombre} ${resultado.validador.apellido}`
                : resultado.cargador
                  ? ` · ${resultado.cargador.nombre} ${resultado.cargador.apellido}`
                  : ''}
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

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal
      show
      onHide={guardando || validando ? undefined : onCerrar}
      backdrop="static"
      enforceFocus={false}
      centered
      scrollable
      size="lg"
      contentClassName="lims-modal"
    >
      <Modal.Header closeButton={!guardando && !validando}>
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

            {soloLectura && (
              <div className="lims-resultado-cerrada" role="status">
                <SealCheck aria-hidden="true" />
                <span>
                  <strong>
                    {estadoOrden === 'anulada'
                      ? 'Orden anulada.'
                      : `Orden validada${validador ? ` por ${validador}` : ''}.`}
                  </strong>{' '}
                  {validadoEn && `Se validó ${validadoEn}. `}No se puede modificar.
                </span>
              </div>
            )}

            <ul className="lims-resultados">
              {pedidos.map((estudio) => (componentesDe[estudio.id] ? filaConComponentes(estudio) : filaEstudio(estudio)))}
            </ul>
            <p className="form-text mb-0">
              {soloLectura
                ? 'La orden está cerrada: los resultados no se pueden modificar.'
                : 'Los estudios sin valor quedan sin cargar. Los resultados se pueden corregir hasta que los valide el bioquímico.'}
            </p>
          </form>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          className="btn lims-btn-pill lims-btn-secundario"
          onClick={onCerrar}
          disabled={guardando || validando}
        >
          {soloLectura ? 'Cerrar' : 'Cancelar'}
        </button>
        {!soloLectura && (
          <button
            type="submit"
            form="form-resultados"
            className={`btn lims-btn-pill ${puedeValidar ? 'lims-btn-secundario' : 'lims-btn-primario'}`}
            disabled={guardando || validando || cargando || error}
          >
            {guardando ? 'Guardando…' : 'Guardar resultados'}
          </button>
        )}
        {puedeValidar && (
          <button
            type="button"
            className="btn lims-btn-pill lims-btn-primario"
            onClick={handleValidar}
            disabled={!todosCargados || guardando || validando || cargando || error}
            title={!todosCargados ? 'Cargue todos los valores para poder validar la orden' : undefined}
          >
            <SealCheck className="lims-icono me-1" aria-hidden="true" />
            {validando ? 'Validando…' : 'Validar orden'}
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default ModalResultados;
