import { useOutletContext } from 'react-router-dom';
import { Flask } from '@phosphor-icons/react';
import ROLES from '../data/roles.js';
import useMetadatos from '../hooks/useMetadatos.js';

// Primera página del panel: da la bienvenida con el nombre y el rol de quien ingresó
function PanelInicio() {
  useMetadatos({
    titulo: 'Panel — LIMS Laboratorio',
    descripcion: 'Panel del personal del laboratorio.',
    ruta: '/panel',
    indexar: false,
  });

  // perfil y fecha llegan desde Panel.jsx (el <Outlet context>)
  const { perfil, fecha } = useOutletContext();

  return (
    <section className="lims-bienvenida">
      <span className="lims-bienvenida-icono" aria-hidden="true">
        <Flask />
      </span>
      <h1 className="lims-bienvenida-titulo">
        Bienvenido/a al sistema LIMS –{' '}
        <span>
          {perfil.nombre} {perfil.apellido}
        </span>
      </h1>
      <p className="lims-bienvenida-rol">
        Su rol es <strong>{ROLES[perfil.rol]?.nombre ?? perfil.rol}</strong>
      </p>
      <p className="lims-bienvenida-fecha">Sesión iniciada el {fecha}</p>
    </section>
  );
}

export default PanelInicio;
