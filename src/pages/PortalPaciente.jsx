import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FilePdf, SignOut } from '@phosphor-icons/react';
import useMetadatos from '../hooks/useMetadatos.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { cerrarSesion, useSesion } from '../lib/auth.js';
import { estadoDelPortal, informeDescargable, useMisOrdenes } from '../lib/portal.js';
import { linkDelInforme } from '../lib/resultados.js';
import './PortalPaciente.css';

// Roles que pueden entrar al portal: la cuenta tiene que ser de un paciente
const ROLES_PORTAL = ['paciente'];

// Fecha de la orden ("AAAA-MM-DD") como se lee acá: "22/10/2026".
// Se le agrega la hora para que no se corra un día por la zona horaria.
function fechaDeLaOrden(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR');
}

// Lo que ve el paciente después de entrar: la lista de sus estudios, con el botón
// para descargar el informe de los que ya están publicados.
function PortalPaciente() {
  const navigate = useNavigate();
  const { cargando: cargandoSesion, perfil } = useSesion(ROLES_PORTAL);
  // Con la contraseña provisoria todavía no se entra: el login le pide elegir una propia
  const sesionLista = Boolean(perfil && !perfil.debe_cambiar_password);
  const { ordenes, cargando, error, recargar } = useMisOrdenes(sesionLista);
  const [descargando, setDescargando] = useState(null);

  useMetadatos({
    titulo: 'Mis estudios · LIMS Laboratorio',
    descripcion: 'Consulte sus estudios de laboratorio y descargue los informes publicados.',
    ruta: '/mis-estudios',
    indexar: false,
  });

  async function handleCerrarSesion() {
    await cerrarSesion();
    navigate('/login-paciente', { replace: true });
  }

  // El PDF está en un lugar privado: se pide un link firmado que vence en minutos.
  // La pestaña se abre antes de pedirlo para que el navegador no la bloquee como ventana emergente.
  async function handleDescargar(orden) {
    const informe = informeDescargable(orden);
    if (!informe) return;

    const pestania = window.open('', '_blank');
    setDescargando(orden.id);
    try {
      const link = await linkDelInforme(informe.pdf_path);
      if (pestania) pestania.location.href = link;
      else window.location.assign(link);
    } catch (errorPeticion) {
      pestania?.close();
      console.error('No se pudo abrir el informe:', errorPeticion);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos abrir el informe',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setDescargando(null);
    }
  }

  if (cargandoSesion) {
    return (
      <main id="contenido" className="lims-portal">
        <p className="lims-portal-aviso" role="status">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Verificando sesión…
        </p>
      </main>
    );
  }

  if (!sesionLista) return <Navigate to="/login-paciente" replace />;

  return (
    <main id="contenido" className="lims-portal">
      <header className="lims-portal-encabezado">
        <div>
          <p className="lims-portal-etiqueta">Portal del paciente</p>
          <h1 className="lims-portal-titulo">Mis estudios</h1>
          <p className="lims-portal-texto">
            Hola, {perfil.nombre} {perfil.apellido}. Estos son los estudios que le pidió su médico.
          </p>
        </div>
        <button
          type="button"
          className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
          onClick={handleCerrarSesion}
        >
          <SignOut className="lims-icono me-1" aria-hidden="true" />
          Cerrar sesión
        </button>
      </header>

      {cargando ? (
        <p className="lims-portal-aviso" role="status">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Cargando sus estudios…
        </p>
      ) : error ? (
        <div className="lims-portal-aviso lims-portal-aviso--error" role="alert">
          <p className="mb-2">{error}</p>
          <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
            Reintentar
          </button>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="lims-portal-vacio">
          <p className="mb-1 fw-semibold">Todavía no tiene estudios.</p>
          <p className="mb-0">Cuando el laboratorio reciba una orden médica a su nombre, va a aparecer acá.</p>
        </div>
      ) : (
        <ul className="lims-portal-lista">
          {ordenes.map((orden) => {
            const listo = Boolean(informeDescargable(orden));
            return (
              <li key={orden.id} className="lims-portal-estudio">
                <div className="lims-portal-estudio-datos">
                  <span className="lims-portal-codigo">{orden.nro_orden}</span>
                  <h2 className="lims-portal-estudio-titulo">Orden del {fechaDeLaOrden(orden.fecha_orden)}</h2>
                  <p className="lims-portal-estudio-medico">
                    {orden.medicos
                      ? `Solicitada por ${orden.medicos.apellido}, ${orden.medicos.nombre}`
                      : 'Médico no informado'}
                  </p>
                  <span
                    className={`lims-portal-estado ${
                      listo ? 'lims-portal-estado--listo' : 'lims-portal-estado--proceso'
                    }`}
                  >
                    {estadoDelPortal(orden)}
                  </span>
                </div>

                {listo && (
                  <button
                    type="button"
                    className="btn lims-btn-pill lims-btn-primario lims-portal-descargar"
                    onClick={() => handleDescargar(orden)}
                    disabled={descargando === orden.id}
                    aria-label={`Descargar el informe de la orden ${orden.nro_orden}`}
                  >
                    <FilePdf className="lims-icono me-1" aria-hidden="true" />
                    {descargando === orden.id ? 'Abriendo…' : 'Descargar PDF'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="lims-portal-nota">
        Los informes se abren con un enlace que vence a los pocos minutos. Si necesita guardar el PDF, descárguelo en
        ese momento.
      </p>
    </main>
  );
}

export default PortalPaciente;
