import { Link } from 'react-router-dom';
import useMetadatos from '../hooks/useMetadatos.js';
import './NoEncontrada.css';

// Página para una dirección que no existe (ruta "*"). Dentro del panel se dibuja en el lugar de la página
// (con el menú lateral al costado) y lleva al inicio del panel; en el sitio público lleva al inicio del sitio.
function NoEncontrada({ enPanel = false }) {
  useMetadatos({
    titulo: 'Página no encontrada — LIMS Laboratorio',
    descripcion: 'La dirección que buscó no existe.',
    ruta: window.location.pathname,
    indexar: false,
  });

  const contenido = (
    <section className="lims-no-encontrada" aria-labelledby="no-encontrada-titulo">
      <p className="lims-panel-etiqueta">Error 404</p>
      <h1 id="no-encontrada-titulo" className="lims-no-encontrada-titulo">
        No encontramos esta página
      </h1>
      <p className="lims-no-encontrada-texto">
        La dirección puede estar mal escrita o la página ya no existe.
      </p>
      <Link to={enPanel ? '/panel' : '/'} className="btn lims-btn-pill lims-btn-primario">
        {enPanel ? 'Volver al inicio del panel' : 'Volver al inicio'}
      </Link>
    </section>
  );

  // En el panel ya hay un <main> (el del panel); en el sitio público la página arma el suyo
  return enPanel ? contenido : <main id="contenido">{contenido}</main>;
}

export default NoEncontrada;
