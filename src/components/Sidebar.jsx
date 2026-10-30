import { NavLink } from 'react-router-dom';
import { Buildings, ClipboardText, FileText, FirstAidKit, Flask, House, IdentificationCard, Syringe, UserCircle, UsersThree, X } from '@phosphor-icons/react';
import ROLES, { ROLES_EXTRACCION, ROLES_ORDENES, ROLES_PACIENTES, ROLES_RECEPCION } from '../data/roles.js';
import './Sidebar.css';

// Opciones del menú lateral. roles: quiénes la ven (si no se indica, la ven todos los roles del personal).
// end: "Inicio" solo se marca activo en /panel exacto, y no en todas las páginas del panel.
const OPCIONES = [
  { ruta: '/panel', texto: 'Inicio', icono: House, end: true },
  { ruta: '/panel/perfil', texto: 'Mi perfil', icono: UserCircle },
  { ruta: '/panel/recepcion', texto: 'Recepción', icono: ClipboardText, roles: ROLES_RECEPCION },
  { ruta: '/panel/ordenes', texto: 'Órdenes', icono: FileText, roles: ROLES_ORDENES },
  { ruta: '/panel/pacientes', texto: 'Pacientes', icono: IdentificationCard, roles: ROLES_PACIENTES },
  { ruta: '/panel/extraccion', texto: 'Extracción', icono: Syringe, roles: ROLES_EXTRACCION },
  { ruta: '/panel/analisis', texto: 'Catálogo de análisis', icono: Flask },
  { ruta: '/panel/usuarios', texto: 'Administración de perfiles', icono: UsersThree, roles: ['admin'] },
  { ruta: '/panel/sucursales', texto: 'Sucursales', icono: Buildings, roles: ['admin'] },
  { ruta: '/panel/obras-sociales', texto: 'Obras sociales', icono: FirstAidKit, roles: ['admin'] },
];

// Menú lateral del panel del personal: muestra solo las opciones habilitadas para el rol de quien ingresó.
// Props: perfil (quién ingresó) · abierto (si se ve o está escondido)
// onCerrar: esconde el menú (botón X y fondo oscuro, solo en el celular) · onNavegar: se llama al tocar una opción
function Sidebar({ perfil, abierto, onCerrar, onNavegar }) {
  const opciones = OPCIONES.filter((opcion) => !opcion.roles || opcion.roles.includes(perfil.rol));

  return (
    <>
      <aside id="panel-menu" className="lims-sidebar" aria-label="Menú del panel" aria-hidden={!abierto}>
        <div className="lims-sidebar-interior">
          <div className="lims-sidebar-cabecera">
            <p className="lims-sidebar-etiqueta">Menú</p>
            {/* En el celular el menú tapa la barra de arriba: este botón lo cierra */}
            <button type="button" className="lims-sidebar-cerrar" onClick={onCerrar} aria-label="Cerrar menú">
              <X aria-hidden="true" />
            </button>
          </div>

          {/* En pantallas chicas la barra de arriba no tiene lugar para el nombre: se muestra acá */}
          <div className="lims-sidebar-usuario">
            <strong>
              {perfil.nombre} {perfil.apellido}
            </strong>
            <span>{ROLES[perfil.rol]?.nombre ?? perfil.rol}</span>
          </div>

          <nav>
            <ul className="lims-sidebar-lista">
              {/* map(): por cada opción habilitada arma un enlace con su ícono */}
              {opciones.map(({ ruta, texto, icono: Icono, end }) => (
                <li key={ruta}>
                  <NavLink to={ruta} end={end} className="lims-sidebar-enlace" onClick={onNavegar}>
                    <Icono aria-hidden="true" />
                    <span>{texto}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Fondo oscuro detrás del menú en el celular: tocarlo cierra el menú */}
      {abierto && <div className="lims-sidebar-fondo" onClick={onCerrar} aria-hidden="true" />}
    </>
  );
}

export default Sidebar;
