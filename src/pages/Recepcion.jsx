import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import AvisoCierre from '../components/AvisoCierre.jsx';
import FilaDelDia from '../components/FilaDelDia.jsx';
import RegistroLlegada from '../components/RegistroLlegada.jsx';
import { ROLES_RECEPCION } from '../data/roles.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { finalizarAtencion, useFilaDelDia } from '../lib/fila.js';
import useMetadatos from '../hooks/useMetadatos.js';
import '../components/ListaPerfiles.css';

// Pantalla de recepción: registrar la llegada de los pacientes y ver la fila del día.
// El laboratorio atiende por orden de llegada: no hay turnos con hora.
function Recepcion() {
  useMetadatos({
    titulo: 'Recepción — LIMS Laboratorio',
    descripcion: 'Registro de llegada de pacientes y fila de atención del día.',
    ruta: '/panel/recepcion',
    indexar: false,
  });

  const { perfil, sucursal, sucursales } = useOutletContext();
  const { fila, cargando, error, recargar } = useFilaDelDia(sucursal.id);
  const navigate = useNavigate();

  if (!ROLES_RECEPCION.includes(perfil.rol)) return <Navigate to="/panel" replace />;

  const enEspera = fila.filter((turno) => turno.estado === 'en_espera').length;

  // Un paciente que esperaba se fue sin que lo llamen
  async function retirar(turno) {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿El paciente se retiró?',
      text: `Número ${turno.numero} · ${turno.pacientes.apellido}, ${turno.pacientes.nombre}. Sale de la fila de hoy.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, se retiró',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;
    try {
      await finalizarAtencion(turno.id, 'se_retiro');
    } catch (errorPeticion) {
      console.error('No se pudo actualizar la fila:', errorPeticion);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos actualizar la fila',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    }
    recargar();
  }

  // Abre la carga de la orden con el paciente de la fila ya elegido
  function cargarOrden(turno) {
    navigate('/panel/ordenes', { state: { paciente: { id: turno.paciente_id, ...turno.pacientes } } });
  }

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Recepción · {sucursal.nombre}</p>
          <h1 className="lims-panel-titulo">Llegada de pacientes</h1>
          <p className="lims-panel-texto mb-0">
            Se atiende por orden de llegada. Busque al paciente por DNI y regístrelo en la fila de hoy.
          </p>
        </div>
      </header>

      <AvisoCierre enEspera={enEspera} />

      <div className="row g-4">
        <div className="col-xl-6">
          <RegistroLlegada fila={fila} sucursal={sucursal} sucursales={sucursales} onRegistrado={recargar} />
        </div>
        <div className="col-xl-6">
          <FilaDelDia fila={fila} cargando={cargando} error={error} onRetirar={retirar} onCargarOrden={cargarOrden} />
        </div>
      </div>
    </div>
  );
}

export default Recepcion;
