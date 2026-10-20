import { useOutletContext } from 'react-router-dom';
import PerfilUsuario from '../components/PerfilUsuario.jsx';
import useMetadatos from '../hooks/useMetadatos.js';

// Página del panel con los datos de la cuenta de quien ingresó (los trae PerfilUsuario con Axios)
function MiPerfil() {
  useMetadatos({
    titulo: 'Mi perfil — LIMS Laboratorio',
    descripcion: 'Datos de la cuenta del personal.',
    ruta: '/panel/perfil',
    indexar: false,
  });

  const { perfil } = useOutletContext();

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Mi cuenta</p>
          <h1 className="lims-panel-titulo">Mi perfil</h1>
          <p className="lims-panel-texto mb-0">Sus datos tal como figuran en el sistema.</p>
        </div>
      </header>

      <div className="lims-panel-perfil">
        <PerfilUsuario userId={perfil.id} titulo="Datos de la cuenta" />
      </div>
    </div>
  );
}

export default MiPerfil;
