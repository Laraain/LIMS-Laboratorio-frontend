import { useOutletContext } from 'react-router-dom';
import ListaAnalisis from '../components/ListaAnalisis.jsx';
import useMetadatos from '../hooks/useMetadatos.js';

// Página del panel con el catálogo de análisis que hace el laboratorio.
// La ve todo el personal (recepción la consulta al cargar una orden); solo el administrador la modifica.
function Analisis() {
  useMetadatos({
    titulo: 'Catálogo de análisis — LIMS Laboratorio',
    descripcion: 'Análisis que realiza el laboratorio, con su tipo de muestra y valores de referencia.',
    ruta: '/panel/analisis',
    indexar: false,
  });

  // perfil llega desde Panel.jsx (el <Outlet context>), que ya verificó la sesión del personal
  const { perfil } = useOutletContext();
  const puedeEditar = perfil.rol === 'admin';

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Catálogo</p>
          <h1 className="lims-panel-titulo">Catálogo de análisis</h1>
          <p className="lims-panel-texto mb-0">
            Estudios que realiza el laboratorio, con su tipo de muestra, valores de referencia y demora.
          </p>
        </div>
      </header>

      <ListaAnalisis puedeEditar={puedeEditar} />
    </div>
  );
}

export default Analisis;
