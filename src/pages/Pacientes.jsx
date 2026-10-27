import { Navigate, useOutletContext } from 'react-router-dom';
import ListaPacientes from '../components/ListaPacientes.jsx';
import { ROLES_PACIENTES } from '../data/roles.js';
import useMetadatos from '../hooks/useMetadatos.js';

// Página de pacientes: buscador por DNI, alta y edición con obra social.
// Entran recepción y el administrador.
function Pacientes() {
  useMetadatos({
    titulo: 'Pacientes — LIMS Laboratorio',
    descripcion: 'Búsqueda, alta y edición de pacientes del laboratorio.',
    ruta: '/panel/pacientes',
    indexar: false,
  });

  // Panel.jsx ya verificó que hay una sesión del personal; acá falta que el rol pueda gestionar pacientes
  const { perfil } = useOutletContext();
  if (!ROLES_PACIENTES.includes(perfil.rol)) return <Navigate to="/panel" replace />;

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Pacientes</p>
          <h1 className="lims-panel-titulo">Gestión de pacientes</h1>
          <p className="lims-panel-texto mb-0">
            Busque a un paciente por su DNI, dé de alta a uno nuevo o modifique sus datos y su obra social.
          </p>
        </div>
      </header>

      <ListaPacientes esAdmin={perfil.rol === 'admin'} />
    </div>
  );
}

export default Pacientes;
