import { Navigate, useNavigate } from 'react-router-dom';
import { SignOut } from '@phosphor-icons/react';
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
    ruta: '/usuarios',
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
      <main id="contenido" className="lims-usuarios">
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
    <main id="contenido" className="lims-usuarios">
      <div className="container px-3 px-lg-4">
        <header className="lims-usuarios-cabecera">
          <div>
            <p className="lims-usuarios-etiqueta">Administración</p>
            <h1 className="lims-usuarios-titulo">Usuarios del sistema</h1>
            <p className="lims-usuarios-sesion mb-0">
              Sesión iniciada como <strong>{perfil.nombre} {perfil.apellido}</strong>
            </p>
          </div>
          <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={handleLogout}>
            <SignOut className="lims-icono me-2" aria-hidden="true" />
            Cerrar sesión
          </button>
        </header>

        <ListaPerfiles idActual={perfil.id} />
      </div>
    </main>
  );
}

export default Usuarios;
