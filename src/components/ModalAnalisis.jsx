import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { API_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import { leerNumero, numeroParaCampo } from '../lib/analisis.js';

// Mismas reglas que la base de datos (migración 20261021_01_catalogo_analisis.sql)
const FORMATO_CODIGO = /^[A-Z0-9_-]{2,20}$/;
const DEMORA_MAXIMA = 60;
// La columna analisis.ub admite hasta 9999,99 (migración 20261031_01_aranceles.sql)
const UB_MAXIMA = 9999;

// Ventana para cargar un análisis nuevo o modificar uno existente.
// Props: analisis (null para uno nuevo) · tipos (los tipos de muestra para elegir)
// onCerrar: cierra sin guardar · onGuardado: se llama después de guardar
function ModalAnalisis({ analisis, tipos, onCerrar, onGuardado }) {
  const esNuevo = !analisis;

  // Cada campo arranca con el valor del análisis (o vacío si es nuevo).
  // La ventana se crea de nuevo para cada análisis (ver key en ListaAnalisis), por eso alcanza con inicializarlos así.
  const [codigo, setCodigo] = useState(analisis?.codigo ?? '');
  const [nombre, setNombre] = useState(analisis?.nombre ?? '');
  const [tipoId, setTipoId] = useState(analisis?.tipo_muestra_id ? String(analisis.tipo_muestra_id) : '');
  const [unidad, setUnidad] = useState(analisis?.unidad ?? '');
  const [minimo, setMinimo] = useState(numeroParaCampo(analisis?.valor_ref_min));
  const [maximo, setMaximo] = useState(numeroParaCampo(analisis?.valor_ref_max));
  const [referenciaTexto, setReferenciaTexto] = useState(analisis?.valor_ref_texto ?? '');
  const [demora, setDemora] = useState(analisis?.dias_demora ?? '');
  // Arancel según el Nomenclador Bioquímico Único: cuántas unidades bioquímicas (UB) vale el estudio
  const [ub, setUb] = useState(numeroParaCampo(analisis?.ub));
  const [codigoNbu, setCodigoNbu] = useState(analisis?.codigo_nbu ?? '');
  const [activo, setActivo] = useState(analisis?.activo ?? true);
  // errores: un mensaje por campo con problemas (si el campo no está, está bien)
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Al escribir en un campo se borra su error, para que el aviso no quede si ya se corrigió
  function limpiarError(campo) {
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  // Revisa el formulario y devuelve los errores encontrados (un objeto vacío si está todo bien)
  function validar(datos) {
    const nuevos = {};
    if (!FORMATO_CODIGO.test(datos.codigo)) {
      nuevos.codigo = 'Use de 2 a 20 letras mayúsculas, números, guiones o guiones bajos.';
    }
    if (datos.nombre === '') nuevos.nombre = 'Ingrese el nombre del análisis.';
    if (!datos.tipo_muestra_id) nuevos.tipo = 'Elija el tipo de muestra.';
    if (Number.isNaN(datos.valor_ref_min)) nuevos.minimo = 'Ingrese un número (por ejemplo 0,6).';
    if (Number.isNaN(datos.valor_ref_max)) nuevos.maximo = 'Ingrese un número (por ejemplo 0,6).';
    if (
      !nuevos.minimo &&
      !nuevos.maximo &&
      datos.valor_ref_min !== null &&
      datos.valor_ref_max !== null &&
      datos.valor_ref_min > datos.valor_ref_max
    ) {
      nuevos.maximo = 'El máximo no puede ser menor que el mínimo.';
    }
    if (
      datos.dias_demora !== null &&
      (!Number.isInteger(datos.dias_demora) || datos.dias_demora < 0 || datos.dias_demora > DEMORA_MAXIMA)
    ) {
      nuevos.demora = `Ingrese una cantidad de días entera, de 0 a ${DEMORA_MAXIMA}.`;
    }
    if (Number.isNaN(datos.ub) || (datos.ub !== null && (datos.ub < 0 || datos.ub > UB_MAXIMA))) {
      nuevos.ub = `Ingrese las unidades bioquímicas, de 0 a ${UB_MAXIMA} (por ejemplo 1,5).`;
    }
    return nuevos;
  }

  async function handleSubmit(evento) {
    evento.preventDefault();

    // Los datos tal como se guardan en la base: textos sin espacios de más y vacíos como null
    const datos = {
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      tipo_muestra_id: tipoId ? Number(tipoId) : null,
      unidad: unidad.trim() || null,
      valor_ref_min: leerNumero(minimo),
      valor_ref_max: leerNumero(maximo),
      valor_ref_texto: referenciaTexto.trim() || null,
      dias_demora: String(demora).trim() === '' ? null : Number(demora),
      ub: leerNumero(ub),
      codigo_nbu: codigoNbu.trim() || null,
      activo,
    };

    const nuevosErrores = validar(datos);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    // Al editar, solo se envía lo que cambió
    const cambios = esNuevo
      ? datos
      : Object.fromEntries(Object.entries(datos).filter(([campo, valor]) => valor !== (analisis[campo] ?? null)));
    if (Object.keys(cambios).length === 0) {
      Swal.fire({ icon: 'info', title: 'No hay cambios', text: 'No modificó ningún dato.', confirmButtonColor: '#1c4e80' });
      return;
    }

    // Dar de baja un análisis no lo borra: deja de ofrecerse en recepción, pero las órdenes viejas lo conservan
    const seDaDeBaja = !esNuevo && analisis.activo && !activo;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: esNuevo ? '¿Agregar el análisis?' : '¿Guardar los cambios?',
      text: seDaDeBaja
        ? 'El análisis quedará dado de baja: no se podrá pedir en órdenes nuevas.'
        : `${datos.codigo} · ${datos.nombre}`,
      showCancelButton: true,
      confirmButtonText: esNuevo ? 'Agregar' : 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      // "return=representation": la API devuelve la fila guardada. Si la política de seguridad no deja
      // guardar, la API responde sin filas: se trata como error para no avisar algo que no ocurrió.
      const headers = { ...(await encabezados()), Prefer: 'return=representation' };
      const respuesta = esNuevo
        ? await axios.post(`${API_URL}/analisis`, cambios, { headers })
        : await axios.patch(`${API_URL}/analisis`, cambios, { headers, params: { id: `eq.${analisis.id}` } });
      if (!Array.isArray(respuesta.data) || respuesta.data.length !== 1) {
        throw Object.assign(new Error('La API no devolvió el análisis guardado'), {
          mensajeUsuario: 'No tiene permiso para modificar el catálogo, o el análisis ya no existe.',
        });
      }

      await Swal.fire({
        icon: 'success',
        title: esNuevo ? 'Análisis agregado' : 'Cambios guardados',
        timer: 1600,
        showConfirmButton: false,
      });
      onGuardado();
    } catch (error) {
      console.error('No se pudo guardar el análisis:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar el análisis',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  // Arma las clases de un campo: lo marca en rojo si tiene error
  const clase = (base, campo) => `${base}${errores[campo] ? ' is-invalid' : ''}`;

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          {esNuevo ? 'Nuevo análisis' : 'Editar análisis'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-analisis" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-sm-4">
              <label htmlFor="analisis-codigo" className="form-label fw-semibold small">
                Código <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="analisis-codigo"
                className={clase('form-control text-uppercase', 'codigo')}
                maxLength={20}
                autoComplete="off"
                value={codigo}
                onChange={(evento) => {
                  setCodigo(evento.target.value);
                  limpiarError('codigo');
                }}
              />
              {errores.codigo && <div className="invalid-feedback">{errores.codigo}</div>}
            </div>
            <div className="col-sm-8">
              <label htmlFor="analisis-nombre" className="form-label fw-semibold small">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="analisis-nombre"
                className={clase('form-control', 'nombre')}
                maxLength={80}
                value={nombre}
                onChange={(evento) => {
                  setNombre(evento.target.value);
                  limpiarError('nombre');
                }}
              />
              {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
            </div>

            <div className="col-sm-8">
              <label htmlFor="analisis-tipo" className="form-label fw-semibold small">
                Tipo de muestra <span className="text-danger">*</span>
              </label>
              <select
                id="analisis-tipo"
                className={clase('form-select', 'tipo')}
                value={tipoId}
                onChange={(evento) => {
                  setTipoId(evento.target.value);
                  limpiarError('tipo');
                }}
              >
                <option value="">Elija una opción</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                    {tipo.tubo ? ` — ${tipo.tubo}` : ''}
                  </option>
                ))}
              </select>
              {errores.tipo && <div className="invalid-feedback">{errores.tipo}</div>}
            </div>
            <div className="col-sm-4">
              <label htmlFor="analisis-unidad" className="form-label fw-semibold small">
                Unidad
              </label>
              <input
                type="text"
                id="analisis-unidad"
                className="form-control"
                maxLength={20}
                placeholder="mg/dL"
                value={unidad}
                onChange={(evento) => setUnidad(evento.target.value)}
              />
            </div>

            <fieldset className="col-12">
              <legend className="form-label fw-semibold small mb-1">Valor de referencia</legend>
              <p className="form-text mt-0 mb-2">
                Para resultados numéricos cargue el mínimo, el máximo o ambos. Para los demás, un texto (por ejemplo
                &quot;Negativo&quot;).
              </p>
              <div className="row g-3">
                <div className="col-6 col-sm-3">
                  <label htmlFor="analisis-minimo" className="form-label small">
                    Mínimo
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="analisis-minimo"
                    className={clase('form-control', 'minimo')}
                    value={minimo}
                    onChange={(evento) => {
                      setMinimo(evento.target.value);
                      limpiarError('minimo');
                    }}
                  />
                  {errores.minimo && <div className="invalid-feedback">{errores.minimo}</div>}
                </div>
                <div className="col-6 col-sm-3">
                  <label htmlFor="analisis-maximo" className="form-label small">
                    Máximo
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="analisis-maximo"
                    className={clase('form-control', 'maximo')}
                    value={maximo}
                    onChange={(evento) => {
                      setMaximo(evento.target.value);
                      limpiarError('maximo');
                    }}
                  />
                  {errores.maximo && <div className="invalid-feedback">{errores.maximo}</div>}
                </div>
                <div className="col-sm-6">
                  <label htmlFor="analisis-referencia-texto" className="form-label small">
                    Texto
                  </label>
                  <input
                    type="text"
                    id="analisis-referencia-texto"
                    className="form-control"
                    maxLength={60}
                    value={referenciaTexto}
                    onChange={(evento) => setReferenciaTexto(evento.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <div className="col-sm-6">
              <label htmlFor="analisis-demora" className="form-label fw-semibold small">
                Demora estimada (días)
              </label>
              <input
                type="number"
                id="analisis-demora"
                className={clase('form-control', 'demora')}
                min={0}
                max={DEMORA_MAXIMA}
                step={1}
                value={demora}
                aria-describedby="analisis-demora-ayuda"
                onChange={(evento) => {
                  setDemora(evento.target.value);
                  limpiarError('demora');
                }}
              />
              {errores.demora ? (
                <div className="invalid-feedback">{errores.demora}</div>
              ) : (
                <div className="form-text" id="analisis-demora-ayuda">
                  0 = el resultado sale en el día.
                </div>
              )}
            </div>
            <div className="col-6 col-sm-3">
              <label htmlFor="analisis-ub" className="form-label fw-semibold small">
                Unidades (UB)
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="analisis-ub"
                className={clase('form-control', 'ub')}
                placeholder="1,5"
                value={ub}
                aria-describedby="analisis-ub-ayuda"
                onChange={(evento) => {
                  setUb(evento.target.value);
                  limpiarError('ub');
                }}
              />
              {errores.ub && <div className="invalid-feedback">{errores.ub}</div>}
            </div>
            <div className="col-6 col-sm-3">
              <label htmlFor="analisis-nbu" className="form-label fw-semibold small">
                Código NBU
              </label>
              <input
                type="text"
                id="analisis-nbu"
                className="form-control"
                maxLength={10}
                autoComplete="off"
                value={codigoNbu}
                onChange={(evento) => setCodigoNbu(evento.target.value)}
              />
            </div>
            <div className="col-12 mt-1">
              <div className="form-text" id="analisis-ub-ayuda">
                Arancel según el Nomenclador Bioquímico Único: el precio es las UB por el valor de la UB de cada obra
                social (ver Aranceles). Sin UB, el estudio no tiene precio.
              </div>
            </div>

            {!esNuevo && (
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    role="switch"
                    id="analisis-activo"
                    className="form-check-input"
                    checked={activo}
                    onChange={(evento) => setActivo(evento.target.checked)}
                  />
                  <label htmlFor="analisis-activo" className="form-check-label">
                    Análisis activo
                  </label>
                </div>
                <div className="form-text">Un análisis dado de baja no se puede pedir en órdenes nuevas.</div>
              </div>
            )}
          </div>
        </form>
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" form="form-analisis" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : esNuevo ? 'Agregar análisis' : 'Guardar cambios'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalAnalisis;
