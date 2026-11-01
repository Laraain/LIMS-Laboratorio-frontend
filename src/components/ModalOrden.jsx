import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { MagnifyingGlass, Plus, Stack, Trash, UserPlus, X } from '@phosphor-icons/react';
import { API_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import { TIPOS_EXTRACCION, registrarLlegada } from '../lib/fila.js';
import { hoyTucuman } from '../lib/hora.js';
import { listarGrupos } from '../lib/grupos.js';
import { PARTICULAR, useObrasSociales } from '../lib/obrasSociales.js';
import { buscarMedicos, crearMedico, crearOrden, leerCatalogoActivo, modificarOrden, turnoDeHoy } from '../lib/ordenes.js';
import './ModalOrden.css';

// Escapa los caracteres especiales antes de armar el HTML de una ventana de SweetAlert2
function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Busca la ficha de un paciente por DNI (null si no está cargado)
async function buscarPaciente(dni) {
  const response = await axios.get(`${API_URL}/pacientes`, {
    headers: await encabezados(),
    params: { select: 'id,dni,nombre,apellido,obra_social_id,nro_afiliado,obras_sociales(nombre)', dni: `eq.${dni}` },
  });
  return response.data[0] ?? null;
}

// En la base, obra_social_id nulo significa "particular"
function valorObraSocial(id) {
  return id ? String(id) : PARTICULAR;
}

const MEDICO_VACIO = { nombre: '', apellido: '', matricula: '', especialidad: '' };

// Ventana para cargar una orden médica nueva o corregir una abierta (recepción y admin).
// Props: orden (null para una nueva) · sucursal (donde se carga) · pacienteInicial (opcional: viene de la fila de atención)
// onCerrar: cierra sin guardar · onGuardado: recibe la orden guardada
function ModalOrden({ orden, sucursal, pacienteInicial = null, onCerrar, onGuardado }) {
  const esNueva = !orden;
  const { obras, cargando: cargandoObras } = useObrasSociales();

  // Paciente: fijo al editar; en una orden nueva se busca por DNI (o llega desde la fila)
  const [paciente, setPaciente] = useState(esNueva ? pacienteInicial : { id: orden.paciente_id, ...orden.pacientes });
  const [dniBuscado, setDniBuscado] = useState('');
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  // turno: la visita de hoy del paciente en esta sucursal, si vino hoy
  const [turno, setTurno] = useState(null);
  // Si no está en la fila de hoy, al guardar la orden se registra su llegada (así el box lo puede llamar)
  const [registrarHoy, setRegistrarHoy] = useState(true);
  const [tipoLlegada, setTipoLlegada] = useState('ambulatoria');

  const [medico, setMedico] = useState(esNueva ? null : { id: orden.medico_id, ...orden.medicos });
  const [busquedaMedico, setBusquedaMedico] = useState('');
  const [medicosEncontrados, setMedicosEncontrados] = useState([]);
  // nuevoMedico: datos del médico que se da de alta en el momento (null = no se está cargando uno)
  const [nuevoMedico, setNuevoMedico] = useState(null);
  const [guardandoMedico, setGuardandoMedico] = useState(false);

  const [fechaOrden, setFechaOrden] = useState(esNueva ? hoyTucuman() : orden.fecha_orden);
  const [obraSocial, setObraSocial] = useState(
    esNueva ? (pacienteInicial ? valorObraSocial(pacienteInicial.obra_social_id) : '') : valorObraSocial(orden.obra_social_id),
  );
  const [observaciones, setObservaciones] = useState(orden?.observaciones ?? '');

  // estudios: [{ analisis_id, codigo, nombre, cubierto, grupo_id, grupo }] (grupo: nombre del grupo del que vino)
  const [estudios, setEstudios] = useState(
    esNueva
      ? []
      : orden.orden_analisis
          .filter((estudio) => !estudio.padre_id)
          .map((estudio) => ({
          analisis_id: estudio.analisis_id,
          codigo: estudio.analisis.codigo,
          nombre: estudio.analisis.nombre,
          cubierto: estudio.cubierto,
          grupo_id: estudio.grupo_id,
          grupo: estudio.grupos_analisis?.nombre ?? null,
        })),
  );
  const [catalogo, setCatalogo] = useState([]);
  // grupos: los grupos activos (ej: "Sangre completa"), que agregan todos sus estudios de una vez
  const [grupos, setGrupos] = useState([]);
  const [busquedaEstudio, setBusquedaEstudio] = useState('');

  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const esParticular = obraSocial === PARTICULAR;

  // El catálogo y los grupos se piden una sola vez al abrir la ventana
  useEffect(() => {
    let vigente = true;
    leerCatalogoActivo()
      .then((datos) => vigente && setCatalogo(datos))
      .catch((errorPeticion) => console.error('No se pudo cargar el catálogo:', errorPeticion));
    listarGrupos({ soloActivos: true })
      .then((datos) => vigente && setGrupos(datos))
      .catch((errorPeticion) => console.error('No se pudieron cargar los grupos:', errorPeticion));
    return () => {
      vigente = false;
    };
  }, []);

  // Al elegir el paciente de una orden nueva, se busca si vino hoy a esta sucursal
  useEffect(() => {
    if (!esNueva || !paciente) return undefined;
    let vigente = true;
    turnoDeHoy(paciente.id, sucursal.id)
      .then((encontrado) => vigente && setTurno(encontrado))
      .catch((errorPeticion) => console.error('No se pudo buscar el turno de hoy:', errorPeticion));
    return () => {
      vigente = false;
    };
  }, [esNueva, paciente, sucursal.id]);

  // Búsqueda de médicos mientras se escribe: espera 300 ms sin teclear para no pedir en cada letra
  useEffect(() => {
    if (medico || nuevoMedico) return undefined;
    let vigente = true;
    const id = setTimeout(() => {
      buscarMedicos(busquedaMedico)
        .then((datos) => vigente && setMedicosEncontrados(datos))
        .catch((errorPeticion) => console.error('No se pudieron buscar médicos:', errorPeticion));
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(id);
    };
  }, [busquedaMedico, medico, nuevoMedico]);

  function limpiarError(campo) {
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  async function handleBuscarPaciente() {
    const dni = dniBuscado.replace(/[.\s]/g, '');
    if (!/^\d{7,8}$/.test(dni)) {
      setErrores((previos) => ({ ...previos, paciente: 'Ingrese un DNI de 7 u 8 números.' }));
      return;
    }
    setBuscandoPaciente(true);
    try {
      const encontrado = await buscarPaciente(dni);
      if (!encontrado) {
        setErrores((previos) => ({
          ...previos,
          paciente: 'No hay un paciente con ese DNI. Dele el alta desde Recepción o Pacientes.',
        }));
        return;
      }
      setPaciente(encontrado);
      setObraSocial(valorObraSocial(encontrado.obra_social_id));
      limpiarError('paciente');
    } catch (errorPeticion) {
      setErrores((previos) => ({ ...previos, paciente: mensajeDeErrorApi(errorPeticion) }));
    } finally {
      setBuscandoPaciente(false);
    }
  }

  async function guardarNuevoMedico() {
    const datos = {
      nombre: nuevoMedico.nombre.trim(),
      apellido: nuevoMedico.apellido.trim(),
      matricula: nuevoMedico.matricula.trim().toUpperCase(),
      especialidad: nuevoMedico.especialidad.trim() || null,
    };
    if (!datos.nombre || !datos.apellido || !datos.matricula) {
      setErrores((previos) => ({ ...previos, medico: 'Complete nombre, apellido y matrícula del médico.' }));
      return;
    }
    setGuardandoMedico(true);
    try {
      setMedico(await crearMedico(datos));
      setNuevoMedico(null);
      limpiarError('medico');
    } catch (errorPeticion) {
      console.error('No se pudo dar de alta el médico:', errorPeticion);
      const repetida = errorPeticion.response?.data?.code === '23505';
      setErrores((previos) => ({
        ...previos,
        medico: repetida ? 'Ya hay un médico con esa matrícula: búsquelo por la matrícula.' : mensajeDeErrorApi(errorPeticion),
      }));
    } finally {
      setGuardandoMedico(false);
    }
  }

  function agregarEstudio(analisis) {
    setEstudios((previos) => [
      ...previos,
      { analisis_id: analisis.id, codigo: analisis.codigo, nombre: analisis.nombre, cubierto: true, grupo_id: null, grupo: null },
    ]);
    setBusquedaEstudio('');
    limpiarError('estudios');
  }

  // Agrega los estudios activos del grupo que todavía no están en la orden (un estudio no se repite)
  function agregarGrupo(grupo) {
    setEstudios((previos) => {
      const yaEstan = new Set(previos.map((estudio) => estudio.analisis_id));
      const nuevos = grupo.estudios
        .filter((analisis) => analisis.activo && !yaEstan.has(analisis.id))
        .map((analisis) => ({
          analisis_id: analisis.id,
          codigo: analisis.codigo,
          nombre: analisis.nombre,
          cubierto: true,
          grupo_id: grupo.id,
          grupo: grupo.nombre,
        }));
      return [...previos, ...nuevos];
    });
    setBusquedaEstudio('');
    limpiarError('estudios');
  }

  function cambiarCobertura(analisisId, cubierto) {
    setEstudios((previos) => previos.map((estudio) => (estudio.analisis_id === analisisId ? { ...estudio, cubierto } : estudio)));
  }

  function quitarEstudio(analisisId) {
    setEstudios((previos) => previos.filter((estudio) => estudio.analisis_id !== analisisId));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    const nuevosErrores = {
      paciente: !paciente ? 'Busque al paciente por su DNI.' : undefined,
      medico: !medico ? 'Elija el médico que firmó la orden, o dele el alta.' : undefined,
      fechaOrden: fechaOrden === '' || fechaOrden > hoyTucuman() ? 'Ingrese la fecha de la orden (no puede ser futura).' : undefined,
      obraSocial: obraSocial === '' ? 'Elija la obra social, o "Particular".' : undefined,
      estudios: estudios.length === 0 ? 'Agregue al menos un estudio.' : undefined,
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    const obraSocialId = esParticular ? null : Number(obraSocial);
    const sinCobertura = esParticular ? estudios.length : estudios.filter((estudio) => !estudio.cubierto).length;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: esNueva ? '¿Guardar la orden?' : '¿Guardar los cambios?',
      html:
        `<p class="mb-1">${escapar(paciente.apellido)}, ${escapar(paciente.nombre)}</p>` +
        `<p class="mb-1">${estudios.length} ${estudios.length === 1 ? 'estudio' : 'estudios'}` +
        (sinCobertura > 0 ? ` · ${sinCobertura} particular${sinCobertura === 1 ? '' : 'es'}` : '') +
        '</p>',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    const datos = {
      medicoId: medico.id,
      estudios: estudios.map(({ analisis_id: analisisId, cubierto, grupo_id: grupoId }) => ({
        analisis_id: analisisId,
        cubierto,
        grupo_id: grupoId,
      })),
      fechaOrden,
      obraSocialId,
      observaciones,
    };
    setGuardando(true);
    try {
      let turnoId = turno?.id ?? null;
      if (esNueva && !turnoId && registrarHoy) {
        const { turno: llegada } = await registrarLlegada(paciente.id, tipoLlegada, sucursal.id);
        // Un paciente está una sola vez por día en la fila: si está en la otra sucursal, no se une
        if (llegada.sucursal_id !== sucursal.id) {
          throw Object.assign(new Error('El paciente está en la fila de otra sucursal'), {
            mensajeUsuario: 'El paciente ya está hoy en la fila de otra sucursal. Desmarque "Registrar su llegada" para cargar la orden igual.',
          });
        }
        turnoId = llegada.id;
      }
      const guardada = esNueva
        ? await crearOrden({ ...datos, pacienteId: paciente.id, turnoId, sucursalId: sucursal.id })
        : await modificarOrden(orden.id, datos);
      await Swal.fire({
        icon: 'success',
        title: esNueva ? 'Orden cargada' : 'Cambios guardados',
        html: `<p class="mb-0">Número de orden</p><p class="fs-3 fw-bold mb-0">${escapar(guardada.nro_orden)}</p>`,
        confirmButtonText: 'Listo',
        confirmButtonColor: '#1c4e80',
      });
      onGuardado(guardada);
    } catch (errorPeticion) {
      console.error('No se pudo guardar la orden:', errorPeticion);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar la orden',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  // Estudios del catálogo que coinciden con lo que se escribe (sin repetir los ya agregados)
  const textoEstudio = busquedaEstudio.trim().toLowerCase();
  const elegidos = new Set(estudios.map((estudio) => estudio.analisis_id));
  const sugerencias = textoEstudio
    ? catalogo
        .filter((analisis) => !elegidos.has(analisis.id))
        .filter((analisis) => analisis.nombre.toLowerCase().includes(textoEstudio) || analisis.codigo.toLowerCase().includes(textoEstudio))
        .slice(0, 8)
    : [];
  // Grupos que coinciden: se muestran primero, porque agregan varios estudios de una vez
  const gruposSugeridos = textoEstudio
    ? grupos.filter((grupo) => `${grupo.codigo} ${grupo.nombre}`.toLowerCase().includes(textoEstudio)).slice(0, 4)
    : [];
  // Si la obra social de la orden se desactivó, igual se muestra para no perderla
  const obraFueraDeLista =
    obraSocial !== '' && !esParticular && !cargandoObras && !obras.some((obra) => String(obra.id) === obraSocial);

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable size="lg" contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          {esNueva ? 'Nueva orden' : `Orden ${orden.nro_orden}`}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-orden" onSubmit={handleSubmit} noValidate>
          {/* Paciente */}
          <fieldset className="lims-orden-bloque">
            <legend className="lims-orden-subtitulo">Paciente</legend>
            {paciente ? (
              <div className="lims-orden-elegido">
                <div>
                  <p className="lims-celda-nombre-texto mb-0">
                    {paciente.apellido}, {paciente.nombre}
                  </p>
                  <p className="lims-celda-identidad mb-0">
                    DNI {paciente.dni}
                    {esNueva && (turno ? ` · número ${turno.numero} de la fila de hoy` : ' · no está en la fila de hoy')}
                  </p>
                </div>
                {esNueva && !pacienteInicial && (
                  <button
                    type="button"
                    className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                    onClick={() => {
                      setPaciente(null);
                      setTurno(null);
                      setObraSocial('');
                    }}
                  >
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              <div className="lims-orden-busqueda">
                <label htmlFor="orden-dni" className="visually-hidden">
                  DNI del paciente
                </label>
                <input
                  type="text"
                  id="orden-dni"
                  inputMode="numeric"
                  className={`form-control ${errores.paciente ? 'is-invalid' : ''}`}
                  placeholder="DNI del paciente"
                  value={dniBuscado}
                  onChange={(evento) => {
                    setDniBuscado(evento.target.value);
                    limpiarError('paciente');
                  }}
                  onKeyDown={(evento) => {
                    // Enter busca, sin enviar el formulario de la orden
                    if (evento.key === 'Enter') {
                      evento.preventDefault();
                      handleBuscarPaciente();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn lims-btn-pill lims-btn-primario"
                  onClick={handleBuscarPaciente}
                  disabled={buscandoPaciente}
                >
                  <MagnifyingGlass className="lims-icono me-1" aria-hidden="true" />
                  {buscandoPaciente ? 'Buscando…' : 'Buscar'}
                </button>
              </div>
            )}
            {errores.paciente && <div className="text-danger small mt-1">{errores.paciente}</div>}
            {esNueva && paciente && !turno && (
              <div className="lims-orden-llegada">
                <div className="form-check mb-0">
                  <input
                    type="checkbox"
                    id="orden-registrar-llegada"
                    className="form-check-input"
                    checked={registrarHoy}
                    onChange={(evento) => setRegistrarHoy(evento.target.checked)}
                  />
                  <label htmlFor="orden-registrar-llegada" className="form-check-label">
                    Registrar su llegada en la fila de hoy
                  </label>
                </div>
                {registrarHoy && (
                  <select
                    className="form-select form-select-sm w-auto"
                    aria-label="Tipo de extracción"
                    value={tipoLlegada}
                    onChange={(evento) => setTipoLlegada(evento.target.value)}
                  >
                    {Object.entries(TIPOS_EXTRACCION).map(([clave, nombre]) => (
                      <option key={clave} value={clave}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                )}
                <p className="form-text mb-0 w-100">
                  {registrarHoy
                    ? 'Al guardar la orden, el paciente entra a la fila y el box de extracción lo puede llamar.'
                    : 'La orden queda sin turno: el paciente no aparece en extracción hasta que se registre su llegada.'}
                </p>
              </div>
            )}
          </fieldset>

          {/* Médico */}
          <fieldset className="lims-orden-bloque">
            <legend className="lims-orden-subtitulo">
              Médico <span className="text-danger">*</span>
            </legend>
            {medico ? (
              <div className="lims-orden-elegido">
                <div>
                  <p className="lims-celda-nombre-texto mb-0">
                    {medico.apellido}, {medico.nombre}
                  </p>
                  <p className="lims-celda-identidad mb-0">
                    MP {medico.matricula}
                    {medico.especialidad ? ` · ${medico.especialidad}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                  onClick={() => {
                    setMedico(null);
                    setBusquedaMedico('');
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : nuevoMedico ? (
              <div className="row g-2">
                <div className="col-sm-6">
                  <label htmlFor="medico-nombre" className="form-label fw-semibold small">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="medico-nombre"
                    className="form-control"
                    maxLength={60}
                    value={nuevoMedico.nombre}
                    onChange={(evento) => setNuevoMedico({ ...nuevoMedico, nombre: evento.target.value })}
                  />
                </div>
                <div className="col-sm-6">
                  <label htmlFor="medico-apellido" className="form-label fw-semibold small">
                    Apellido
                  </label>
                  <input
                    type="text"
                    id="medico-apellido"
                    className="form-control"
                    maxLength={60}
                    value={nuevoMedico.apellido}
                    onChange={(evento) => setNuevoMedico({ ...nuevoMedico, apellido: evento.target.value })}
                  />
                </div>
                <div className="col-sm-6">
                  <label htmlFor="medico-matricula" className="form-label fw-semibold small">
                    Matrícula (MP)
                  </label>
                  <input
                    type="text"
                    id="medico-matricula"
                    className="form-control text-uppercase"
                    maxLength={20}
                    value={nuevoMedico.matricula}
                    onChange={(evento) => setNuevoMedico({ ...nuevoMedico, matricula: evento.target.value })}
                  />
                </div>
                <div className="col-sm-6">
                  <label htmlFor="medico-especialidad" className="form-label fw-semibold small">
                    Especialidad
                  </label>
                  <input
                    type="text"
                    id="medico-especialidad"
                    className="form-control"
                    maxLength={60}
                    placeholder="Opcional"
                    value={nuevoMedico.especialidad}
                    onChange={(evento) => setNuevoMedico({ ...nuevoMedico, especialidad: evento.target.value })}
                  />
                </div>
                <div className="col-12 d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn lims-btn-pill lims-btn-primario lims-btn-chico"
                    onClick={guardarNuevoMedico}
                    disabled={guardandoMedico}
                  >
                    {guardandoMedico ? 'Guardando…' : 'Guardar médico'}
                  </button>
                  <button
                    type="button"
                    className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                    onClick={() => {
                      setNuevoMedico(null);
                      limpiarError('medico');
                    }}
                    disabled={guardandoMedico}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label htmlFor="orden-medico" className="visually-hidden">
                  Buscar médico por apellido o matrícula
                </label>
                <input
                  type="search"
                  id="orden-medico"
                  className={`form-control ${errores.medico ? 'is-invalid' : ''}`}
                  placeholder="Buscar por apellido o matrícula"
                  autoComplete="off"
                  value={busquedaMedico}
                  onChange={(evento) => {
                    setBusquedaMedico(evento.target.value);
                    limpiarError('medico');
                  }}
                />
                {busquedaMedico.trim().length >= 2 && (
                  <ul className="lims-orden-sugerencias">
                    {medicosEncontrados.map((opcion) => (
                      <li key={opcion.id}>
                        <button type="button" onClick={() => setMedico(opcion)}>
                          <span className="fw-semibold">
                            {opcion.apellido}, {opcion.nombre}
                          </span>
                          <span className="lims-celda-identidad">MP {opcion.matricula}</span>
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        className="lims-orden-sugerencia-nueva"
                        onClick={() => setNuevoMedico({ ...MEDICO_VACIO, apellido: busquedaMedico.trim() })}
                      >
                        <UserPlus className="lims-icono me-1" aria-hidden="true" />
                        {medicosEncontrados.length === 0 ? 'No está cargado: dar de alta el médico' : 'Dar de alta otro médico'}
                      </button>
                    </li>
                  </ul>
                )}
              </>
            )}
            {errores.medico && <div className="text-danger small mt-1">{errores.medico}</div>}
          </fieldset>

          {/* Fecha y obra social */}
          <div className="row g-3 lims-orden-bloque">
            <div className="col-sm-6">
              <label htmlFor="orden-fecha" className="form-label fw-semibold small">
                Fecha de la orden <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                id="orden-fecha"
                className={`form-control ${errores.fechaOrden ? 'is-invalid' : ''}`}
                max={hoyTucuman()}
                value={fechaOrden}
                onChange={(evento) => {
                  setFechaOrden(evento.target.value);
                  limpiarError('fechaOrden');
                }}
              />
              {errores.fechaOrden ? (
                <div className="invalid-feedback">{errores.fechaOrden}</div>
              ) : (
                <div className="form-text">La que firmó el médico.</div>
              )}
            </div>
            <div className="col-sm-6">
              <label htmlFor="orden-obra-social" className="form-label fw-semibold small">
                Obra social <span className="text-danger">*</span>
              </label>
              <select
                id="orden-obra-social"
                className={`form-select ${errores.obraSocial ? 'is-invalid' : ''}`}
                value={obraSocial}
                disabled={cargandoObras}
                onChange={(evento) => {
                  setObraSocial(evento.target.value);
                  limpiarError('obraSocial');
                }}
              >
                <option value="">{cargandoObras ? 'Cargando…' : 'Elija una opción'}</option>
                <option value={PARTICULAR}>Particular (sin obra social)</option>
                {obraFueraDeLista && <option value={obraSocial}>{orden?.obras_sociales?.nombre ?? 'Obra social actual'} (inactiva)</option>}
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nombre}
                  </option>
                ))}
              </select>
              {errores.obraSocial ? (
                <div className="invalid-feedback">{errores.obraSocial}</div>
              ) : (
                <div className="form-text">Se propone la del paciente; se puede cambiar solo para esta orden.</div>
              )}
            </div>
          </div>

          {/* Estudios */}
          <fieldset className="lims-orden-bloque">
            <legend className="lims-orden-subtitulo">
              Estudios <span className="text-danger">*</span>
            </legend>
            <label htmlFor="orden-estudio" className="visually-hidden">
              Agregar estudio o grupo por nombre o código
            </label>
            <input
              type="search"
              id="orden-estudio"
              className={`form-control ${errores.estudios ? 'is-invalid' : ''}`}
              placeholder="Agregar estudio o grupo por nombre o código"
              autoComplete="off"
              value={busquedaEstudio}
              onChange={(evento) => setBusquedaEstudio(evento.target.value)}
              onKeyDown={(evento) => {
                // Enter agrega la primera sugerencia (primero los grupos)
                if (evento.key === 'Enter') {
                  evento.preventDefault();
                  if (gruposSugeridos[0]) agregarGrupo(gruposSugeridos[0]);
                  else if (sugerencias[0]) agregarEstudio(sugerencias[0]);
                }
              }}
            />
            {textoEstudio && (
              <ul className="lims-orden-sugerencias">
                {gruposSugeridos.length === 0 && sugerencias.length === 0 && (
                  <li className="lims-orden-sugerencia-vacia">No hay estudios ni grupos que coincidan.</li>
                )}
                {gruposSugeridos.map((grupo) => (
                  <li key={`grupo-${grupo.id}`}>
                    <button type="button" onClick={() => agregarGrupo(grupo)}>
                      <Stack className="lims-icono" aria-hidden="true" />
                      <span className="lims-codigo">{grupo.codigo}</span>
                      <span className="fw-semibold">{grupo.nombre}</span>
                      <span className="lims-celda-identidad ms-auto">Grupo · {grupo.estudios.length} estudios</span>
                    </button>
                  </li>
                ))}
                {sugerencias.map((analisis) => (
                  <li key={analisis.id}>
                    <button type="button" onClick={() => agregarEstudio(analisis)}>
                      <Plus className="lims-icono" aria-hidden="true" />
                      <span className="lims-codigo">{analisis.codigo}</span>
                      <span>{analisis.nombre}</span>
                      <span className="lims-celda-identidad ms-auto">{analisis.tipos_muestra?.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errores.estudios && <div className="text-danger small mt-1">{errores.estudios}</div>}

            {estudios.length > 0 && (
              <ul className="lims-orden-estudios">
                {estudios.map((estudio) => (
                  <li key={estudio.analisis_id}>
                    <span className="lims-codigo">{estudio.codigo}</span>
                    <span className="lims-orden-estudio-nombre">
                      {estudio.nombre}
                      {estudio.grupo && <span className="lims-celda-identidad">De {estudio.grupo}</span>}
                    </span>
                    {/* Los estudios que la obra social no cubre se cobran como particulares */}
                    <div className="form-check form-switch mb-0">
                      <input
                        type="checkbox"
                        role="switch"
                        id={`cubierto-${estudio.analisis_id}`}
                        className="form-check-input"
                        checked={!esParticular && estudio.cubierto}
                        disabled={esParticular}
                        onChange={(evento) => cambiarCobertura(estudio.analisis_id, evento.target.checked)}
                      />
                      <label htmlFor={`cubierto-${estudio.analisis_id}`} className="form-check-label small">
                        {esParticular ? 'Particular' : estudio.cubierto ? 'Cubre la obra social' : 'No lo cubre: particular'}
                      </label>
                    </div>
                    <button
                      type="button"
                      className="lims-orden-quitar"
                      aria-label={`Quitar ${estudio.nombre}`}
                      onClick={() => quitarEstudio(estudio.analisis_id)}
                    >
                      <Trash aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <div className="lims-orden-bloque">
            <label htmlFor="orden-observaciones" className="form-label fw-semibold small">
              Observaciones
            </label>
            <textarea
              id="orden-observaciones"
              className="form-control"
              rows={2}
              maxLength={500}
              value={observaciones}
              onChange={(evento) => setObservaciones(evento.target.value)}
            />
          </div>
        </form>
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          <X className="lims-icono me-1" aria-hidden="true" />
          Cancelar
        </button>
        <button type="submit" form="form-orden" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : esNueva ? 'Guardar orden' : 'Guardar cambios'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalOrden;
