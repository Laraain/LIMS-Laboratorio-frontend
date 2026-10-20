import { Navigate, useOutletContext } from 'react-router-dom';
import ListaPerfiles from '../components/ListaPerfiles.jsx';
import useMetadatos from '../hooks/useMetadatos.js';

// Página del panel solo para administradores: muestra todos los perfiles creados con sus datos y roles
function Usuarios() {
  // Título de la pestaña; noindex para que los buscadores no muestren esta página
  useMetadatos({
    titulo: 'Administración de perfiles — LIMS Laboratorio',
    descripcion: 'Listado de usuarios del sistema, solo para administradores.',
    ruta: '/panel/usuarios',
    indexar: false,
  });

  // Panel.jsx ya verificó que hay una sesión del personal; acá solo falta que sea admin
  const { perfil } = useOutletContext();
  if (perfil.rol !== 'admin') return <Navigate to="/panel" replace />;

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Administración de perfiles</h1>
          <p className="lims-panel-texto mb-0">Todas las cuentas del sistema, con sus datos y roles.</p>
        </div>
      </header>

      <ListaPerfiles idActual={perfil.id} />
    </div>
  );
}

export default Usuarios;
