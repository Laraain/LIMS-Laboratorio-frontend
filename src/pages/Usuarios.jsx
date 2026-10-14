import { Navigate, useNavigate } from 'react-router-dom';
import ListaPerfiles from '../components/ListaPerfiles.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { cerrarSesion, useSesion } from '../lib/auth.js';
import './Usuarios.css';

// Página solo para administradores: muestra todos los perfiles creados con sus datos y roles
function Usuarios() {
  // Título de la pestaña; noindex para que los buscadores no muestren esta página
  useMetadatos({
    titulo: 'Usuarios — LIMS Laboratorio',
    descripcion: 'Listado de usuarios del sistema, solo para administradores.',
    indexar: false,
  });

  const navigate = useNavigate();
  // useSesion recibe los roles que pueden estar acá: si la sesión es de otro rol (o no hay sesión), perfil queda en null
  const { cargando, perfil } = useSesion(['admin']);

  // Cierra la sesión en Supabase y vuelve al login del personal
  async function handleLogout() {
    await cerrarSesion();
    navigate('/login-personal');
  }

  // Mientras se verifica la sesión no se muestra nada de la lista
  if (cargando) {
    return (
      <main id="contenido" className="py-5">
        <p className="text-muted text-center" role="status">
          Verificando sesión…
        </p>
      </main>
    );
  }

  // Sin sesión de administrador se vuelve al login (Navigate redirige sin recargar la página).
  // Si todavía tiene la contraseña provisoria, el login le pide elegir una propia antes de entrar.
  if (!perfil || perfil.debe_cambiar_password) return <Navigate to="/login-personal" replace />;

  return (
    <main id="contenido" className="py-5">
      <div className="container px-3 px-lg-4">
        <header className="lims-usuarios-cabecera">
          <div>
            <span className="lims-usuarios-eyebrow d-inline-block mb-2">Administración</span>
            <h1 className="lims-usuarios-titulo mb-1">Usuarios del sistema</h1>
            <p className="text-muted mb-0">
              Sesión iniciada como {perfil.nombre} {perfil.apellido}.
            </p>
          </div>
          <button type="button" className="btn btn-outline-dark" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket me-2" aria-hidden="true"></i>
            Cerrar sesión
          </button>
        </header>

        <ListaPerfiles idActual={perfil.id} />
      </div>
    </main>
  );
}

export default Usuarios;
