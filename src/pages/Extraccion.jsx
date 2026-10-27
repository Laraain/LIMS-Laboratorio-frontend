import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CheckCircle, Megaphone, SignOut } from '@phosphor-icons/react';
import FilaDelDia from '../components/FilaDelDia.jsx';
import { ROLES_EXTRACCION } from '../data/roles.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { TIPOS_EXTRACCION, finalizarAtencion, llamarSiguiente, useFilaDelDia } from '../lib/fila.js';
import { edadDesde, horaDe } from '../lib/hora.js';
import useMetadatos from '../hooks/useMetadatos.js';
import '../components/ListaPerfiles.css';

// El box elegido se recuerda en esta computadora (uno por sucursal), para no elegirlo cada vez que se entra
const claveBox = (sucursalId) => `lims-box-extraccion-${sucursalId}`;

function boxGuardado(sucursalId) {
  try {
    return Number(localStorage.getItem(claveBox(sucursalId))) || null;
  } catch {
    return null;
  }
}

// Pantalla de extracción: el técnico (o el bioquímico) elige su box, llama al siguiente paciente de la fila
// y lo marca como atendido o "se retiró". Dos boxes nunca reciben al mismo paciente: lo garantiza la base.
function Extraccion() {
  useMetadatos({
    titulo: 'Extracción — LIMS Laboratorio',
    descripcion: 'Llamado de pacientes desde los boxes de extracción.',
    ruta: '/panel/extraccion',
    indexar: false,
  });

  const { perfil, sucursal } = useOutletContext();
  const { fila, cargando, error, recargar } = useFilaDelDia(sucursal.id);
  // Cada sucursal tiene su cantidad de boxes (la define el admin en Sucursales)
  const cantidadBoxes = sucursal.cantidad_boxes;
  // boxes: el box elegido en cada sucursal ({ idSucursal: número }), para que cambiar de sucursal no lo pierda
  const [boxes, setBoxes] = useState(() => ({ [sucursal.id]: boxGuardado(sucursal.id) }));
  const box = boxes[sucursal.id] ?? boxGuardado(sucursal.id);
  const [trabajando, setTrabajando] = useState(false);

  if (!ROLES_EXTRACCION.includes(perfil.rol)) return <Navigate to="/panel" replace />;

  // Si el admin redujo la cantidad de boxes, el box guardado puede no existir más
  const boxValido = box && box <= cantidadBoxes ? box : null;
  const enEspera = fila.filter((turno) => turno.estado === 'en_espera').length;
  // Paciente que este box llamó y todavía no terminó
  const actual = boxValido && fila.find((turno) => turno.estado === 'llamado' && turno.box === boxValido);

  function elegirBox(numero) {
    setBoxes((previos) => ({ ...previos, [sucursal.id]: numero }));
    try {
      localStorage.setItem(claveBox(sucursal.id), String(numero));
    } catch {
      // Sin almacenamiento local solo hay que volver a elegirlo la próxima vez
    }
  }

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

  async function llamar() {
    setTrabajando(true);
    try {
      const turno = await llamarSiguiente(boxValido, sucursal.id);
      if (!turno) {
        Swal.fire({
          icon: 'info',
          title: 'No hay pacientes en espera',
          timer: 1800,
          showConfirmButton: false,
        });
      }
    } catch (errorPeticion) {
      avisarError('No pudimos llamar al siguiente', errorPeticion);
    }
    await recargar();
    setTrabajando(false);
  }

  async function finalizar(estado) {
    if (estado === 'se_retiro') {
      const { isConfirmed } = await Swal.fire({
        icon: 'question',
        title: '¿El paciente se retiró?',
        text: `Número ${actual.numero} · ${actual.pacientes.apellido}, ${actual.pacientes.nombre}.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, se retiró',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#1c4e80',
      });
      if (!isConfirmed) return;
    }
    setTrabajando(true);
    try {
      await finalizarAtencion(actual.id, estado);
    } catch (errorPeticion) {
      avisarError('No pudimos actualizar la fila', errorPeticion);
    }
    await recargar();
    setTrabajando(false);
  }

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Extracción · {sucursal.nombre}</p>
          <h1 className="lims-panel-titulo">Llamado de pacientes</h1>
          <p className="lims-panel-texto mb-0">Elija su box y llame al siguiente paciente de la fila.</p>
        </div>
        <div className="lims-box-selector">
          <label htmlFor="box" className="form-label fw-semibold small mb-1">
            Su box
          </label>
          <select
            id="box"
            className="form-select"
            value={boxValido ?? ''}
            onChange={(evento) => elegirBox(Number(evento.target.value))}
          >
            <option value="" disabled>
              Elija su box
            </option>
            {Array.from({ length: cantidadBoxes }, (_, indice) => indice + 1).map((numero) => (
              <option key={numero} value={numero}>
                Box {numero}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="row g-4">
        <div className="col-xl-5">
          <section className="lims-llamado" aria-labelledby="llamado-titulo" aria-live="polite">
            <h2 id="llamado-titulo" className="lims-lista-titulo">
              {boxValido ? `Box ${boxValido}` : 'Box de extracción'}
            </h2>

            {!boxValido && (
              <p className="lims-panel-texto mb-0">Elija arriba en qué box está atendiendo para empezar a llamar.</p>
            )}

            {boxValido && actual && (
              <div className="lims-llamado-actual">
                <span className="lims-llamado-numero">{actual.numero}</span>
                <p className="lims-llamado-nombre mb-1">
                  {actual.pacientes.apellido}, {actual.pacientes.nombre}
                </p>
                <p className="lims-celda-identidad mb-3">
                  DNI {actual.pacientes.dni} · {edadDesde(actual.pacientes.fecha_nacimiento)} años ·{' '}
                  {TIPOS_EXTRACCION[actual.tipo]} · llamado {horaDe(actual.llamado_at)}
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn lims-btn-pill lims-btn-primario"
                    disabled={trabajando}
                    onClick={() => finalizar('atendido')}
                  >
                    <CheckCircle className="lims-icono me-2" aria-hidden="true" />
                    Atendido
                  </button>
                  <button
                    type="button"
                    className="btn lims-btn-pill lims-btn-secundario"
                    disabled={trabajando}
                    onClick={() => finalizar('se_retiro')}
                  >
                    <SignOut className="lims-icono me-2" aria-hidden="true" />
                    Se retiró
                  </button>
                </div>
              </div>
            )}

            {boxValido && !actual && (
              <div className="lims-llamado-vacio">
                <p className="mb-3">
                  {enEspera === 0
                    ? 'No hay pacientes en espera.'
                    : `${enEspera} ${enEspera === 1 ? 'paciente' : 'pacientes'} en espera.`}
                </p>
                <button
                  type="button"
                  className="btn lims-btn-pill lims-btn-primario lims-llamado-boton"
                  disabled={trabajando || enEspera === 0}
                  onClick={llamar}
                >
                  <Megaphone className="lims-icono me-2" aria-hidden="true" />
                  {trabajando ? 'Llamando…' : 'Llamar al siguiente'}
                </button>
              </div>
            )}
          </section>
        </div>
        <div className="col-xl-7">
          <FilaDelDia fila={fila} cargando={cargando} error={error} />
        </div>
      </div>
    </div>
  );
}

export default Extraccion;
