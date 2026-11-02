import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { leerNumero, numeroParaCampo, textoReferencia } from '../lib/analisis.js';
import {
  SEXOS_RANGO,
  borrarRango,
  guardarRango,
  listarRangos,
  textoEdades,
  textoSexo,
  textoValores,
} from '../lib/rangos.js';

const EDAD_MAXIMA = 120;
const FORMULARIO_VACIO = { sexo: '', desde: '', hasta: '', minimo: '', maximo: '' };

// Datos de un rango para el formulario: la edad "hasta" se muestra incluida (la base la guarda sin incluir)
function formularioDe(rango) {
  return {
    sexo: rango.sexo ?? '',
    desde: String(rango.edad_desde),
    hasta: rango.edad_hasta === null ? '' : String(rango.edad_hasta - 1),
    minimo: numeroParaCampo(rango.valor_min),
    maximo: numeroParaCampo(rango.valor_max),
  };
}

// Ventana con los rangos de referencia por sexo y edad de un estudio. Todo el personal los ve;
// el administrador también los agrega, corrige y borra. Los resultados ya cargados no cambian:
// guardan el rango con el que se compararon.
// Props: analisis (el estudio) · puedeEditar · onCerrar (recibe true si se cambió algo)
function ModalRangos({ analisis, puedeEditar, onCerrar }) {
  const [rangos, setRangos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  // formulario: null si está cerrado · editandoId: el rango que se corrige (null = uno nuevo)
  const [formulario, setFormulario] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  // cambios: si se guardó o borró algo, para que la lista del catálogo se actualice al cerrar
  const [cambios, setCambios] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const lista = await listarRangos(analisis.id);
        if (vigente) setRangos(lista);
      } catch (errorPeticion) {
        console.error('No se pudieron cargar los rangos:', errorPeticion);
        if (vigente) setError(true);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [analisis.id, intento]);

  function recargar() {
    setCargando(true);
    setError(false);
    setIntento((valor) => valor + 1);
  }

  function abrirFormulario(rango = null) {
    setFormulario(rango ? formularioDe(rango) : FORMULARIO_VACIO);
    setEditandoId(rango?.id ?? null);
    setErrores({});
  }

  function cambiar(campo) {
    return (evento) => {
      setFormulario((previo) => ({ ...previo, [campo]: evento.target.value }));
      setErrores((previos) => ({ ...previos, [campo]: undefined }));
    };
  }

  async function handleGuardar(evento) {
    evento.preventDefault();
    const desde = formulario.desde.trim() === '' ? null : Number(formulario.desde);
    const hasta = formulario.hasta.trim() === '' ? null : Number(formulario.hasta);
    const minimo = leerNumero(formulario.minimo);
    const maximo = leerNumero(formulario.maximo);

    const nuevos = {};
    if (desde === null || !Number.isInteger(desde) || desde < 0 || desde > EDAD_MAXIMA) {
      nuevos.desde = `Ingrese una edad entera, de 0 a ${EDAD_MAXIMA}.`;
    }
    if (hasta !== null && (!Number.isInteger(hasta) || hasta > EDAD_MAXIMA)) {
      nuevos.hasta = `Ingrese una edad entera, de 0 a ${EDAD_MAXIMA}, o déjelo vacío.`;
    } else if (hasta !== null && desde !== null && hasta < desde) {
      nuevos.hasta = 'No puede ser menor que la edad desde.';
    }
    if (Number.isNaN(minimo)) nuevos.minimo = 'Ingrese un número (por ejemplo 0,6).';
    if (Number.isNaN(maximo)) nuevos.maximo = 'Ingrese un número (por ejemplo 0,6).';
    if (!nuevos.minimo && !nuevos.maximo) {
      if (minimo === null && maximo === null) nuevos.minimo = 'Cargue el mínimo, el máximo o ambos.';
      else if (minimo !== null && maximo !== null && minimo > maximo) nuevos.maximo = 'No puede ser menor que el mínimo.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const datos = {
      analisis_id: analisis.id,
      sexo: formulario.sexo || null,
      edad_desde: desde,
      // En la base la edad "hasta" no se incluye: 17 incluido se guarda como 18
      edad_hasta: hasta === null ? null : hasta + 1,
      valor_min: minimo,
      valor_max: maximo,
    };

    setGuardando(true);
    try {
      await guardarRango(datos, editandoId);
      setFormulario(null);
      setEditandoId(null);
      setCambios(true);
      recargar();
    } catch (errorPeticion) {
      console.error('No se pudo guardar el rango:', errorPeticion);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar el rango',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setGuardando(false);
    }
  }

  async function handleBorrar(rango) {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Borrar el rango?',
      text: `${textoSexo(rango.sexo)} · ${textoEdades(rango)} · ${textoValores(rango)}`,
      showCancelButton: true,
      confirmButtonText: 'Borrar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      await borrarRango(rango.id);
      setCambios(true);
      recargar();
    } catch (errorPeticion) {
      console.error('No se pudo borrar el rango:', errorPeticion);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos borrar el rango',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setGuardando(false);
    }
  }

  const unidad = analisis.unidad ? ` ${analisis.unidad}` : '';
  const clase = (base, campo) => `${base}${errores[campo] ? ' is-invalid' : ''}`;

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal
      show
      onHide={guardando ? undefined : () => onCerrar(cambios)}
      backdrop="static"
      enforceFocus={false}
      centered
      scrollable
      size="lg"
      contentClassName="lims-modal"
    >
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          Rangos por sexo y edad · {analisis.nombre}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="form-text mt-0">
          Al cargar un resultado se usa el rango del sexo y la edad del paciente (primero el de su sexo, después el de
          &quot;Todos&quot;). Si ninguno corresponde, se usa el general:{' '}
          <strong>
            {textoReferencia(analisis)}
            {unidad}
          </strong>
          . Los resultados ya cargados no cambian.
        </p>

        {cargando ? (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Cargando rangos…
          </div>
        ) : error ? (
          <div className="lims-lista-aviso" role="alert">
            <span>No se pudieron cargar los rangos.</span>
            <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : rangos.length === 0 ? (
          <div className="lims-lista-aviso">Este estudio no tiene rangos por sexo y edad: se usa siempre el general.</div>
        ) : (
          <div className="lims-tabla-contenedor">
            <table className="table align-middle mb-0 lims-tabla-perfiles">
              <thead>
                <tr>
                  <th scope="col">Sexo</th>
                  <th scope="col">Edad</th>
                  <th scope="col">Valor de referencia</th>
                  {puedeEditar && (
                    <th scope="col">
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rangos.map((rango) => (
                  <tr key={rango.id} className={rango.id === editandoId ? 'table-active' : undefined}>
                    <td>{textoSexo(rango.sexo)}</td>
                    <td data-label="Edad">{textoEdades(rango)}</td>
                    <td data-label="Valor de referencia" className="lims-celda-numero">
                      {textoValores(rango)}
                      {unidad}
                    </td>
                    {puedeEditar && (
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button
                            type="button"
                            className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                            aria-label={`Editar el rango ${textoSexo(rango.sexo)}, ${textoEdades(rango)}`}
                            disabled={guardando}
                            onClick={() => abrirFormulario(rango)}
                          >
                            <PencilSimple className="lims-icono" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                            aria-label={`Borrar el rango ${textoSexo(rango.sexo)}, ${textoEdades(rango)}`}
                            disabled={guardando}
                            onClick={() => handleBorrar(rango)}
                          >
                            <Trash className="lims-icono" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {puedeEditar && formulario && (
          <form className="lims-orden-bloque mt-3" onSubmit={handleGuardar} noValidate aria-labelledby="rango-form-titulo">
            <h3 id="rango-form-titulo" className="h6 fw-bold">
              {editandoId ? 'Corregir el rango' : 'Nuevo rango'}
            </h3>
            <div className="row g-3">
              <div className="col-sm-4">
                <label htmlFor="rango-sexo" className="form-label small fw-semibold">
                  Sexo
                </label>
                <select id="rango-sexo" className="form-select" value={formulario.sexo} onChange={cambiar('sexo')}>
                  <option value="">Todos</option>
                  {Object.entries(SEXOS_RANGO).map(([clave, nombre]) => (
                    <option key={clave} value={clave}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-sm-4">
                <label htmlFor="rango-desde" className="form-label small fw-semibold">
                  Edad desde <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="rango-desde"
                  className={clase('form-control', 'desde')}
                  min={0}
                  max={EDAD_MAXIMA}
                  value={formulario.desde}
                  onChange={cambiar('desde')}
                />
                {errores.desde && <div className="invalid-feedback">{errores.desde}</div>}
              </div>
              <div className="col-6 col-sm-4">
                <label htmlFor="rango-hasta" className="form-label small fw-semibold">
                  Edad hasta
                </label>
                <input
                  type="number"
                  id="rango-hasta"
                  className={clase('form-control', 'hasta')}
                  min={0}
                  max={EDAD_MAXIMA}
                  placeholder="En adelante"
                  aria-describedby="rango-hasta-ayuda"
                  value={formulario.hasta}
                  onChange={cambiar('hasta')}
                />
                {errores.hasta ? (
                  <div className="invalid-feedback">{errores.hasta}</div>
                ) : (
                  <div className="form-text" id="rango-hasta-ayuda">
                    Incluida. Vacío = en adelante.
                  </div>
                )}
              </div>
              <div className="col-6 col-sm-4">
                <label htmlFor="rango-minimo" className="form-label small fw-semibold">
                  Mínimo{unidad ? ` (${analisis.unidad})` : ''}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="rango-minimo"
                  className={clase('form-control', 'minimo')}
                  value={formulario.minimo}
                  onChange={cambiar('minimo')}
                />
                {errores.minimo && <div className="invalid-feedback">{errores.minimo}</div>}
              </div>
              <div className="col-6 col-sm-4">
                <label htmlFor="rango-maximo" className="form-label small fw-semibold">
                  Máximo{unidad ? ` (${analisis.unidad})` : ''}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="rango-maximo"
                  className={clase('form-control', 'maximo')}
                  value={formulario.maximo}
                  onChange={cambiar('maximo')}
                />
                {errores.maximo && <div className="invalid-feedback">{errores.maximo}</div>}
              </div>
              <div className="col-sm-4 d-flex align-items-end gap-2">
                <button
                  type="button"
                  className="btn lims-btn-pill lims-btn-secundario"
                  disabled={guardando}
                  onClick={() => {
                    setFormulario(null);
                    setEditandoId(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          className="btn lims-btn-pill lims-btn-secundario"
          disabled={guardando}
          onClick={() => onCerrar(cambios)}
        >
          Cerrar
        </button>
        {puedeEditar && !formulario && (
          <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => abrirFormulario()}>
            <Plus className="lims-icono me-1" aria-hidden="true" />
            Agregar rango
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default ModalRangos;
