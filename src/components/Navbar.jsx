import { NavLink, Link } from 'react-router-dom';
import BsNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import { Buildings, List, SignOut, UserCircle } from '@phosphor-icons/react';
import Reloj from './Reloj.jsx';
import logo from '../assets/logo1.png';
import './Navbar.css';

// Barra de navegación superior, hecha con React Bootstrap (en el celular se colapsa en un menú).
// Sin props es la barra del sitio público. Dentro del panel del personal recibe la sesión y cambia:
// perfil y fecha: quién ingresó y cuándo · menuAbierto / onAlternarMenu: botón que muestra o esconde el menú lateral
// sucursal / onCambiarSucursal: sucursal en la que trabaja y botón para cambiarla (no se muestran mientras la elige)
// onCerrarSesion: botón "Cerrar sesión"
function Navbar({ perfil, fecha, sucursal, onCambiarSucursal, menuAbierto, onAlternarMenu, onCerrarSesion }) {
  if (perfil) {
    return (
      <BsNavbar sticky="top" className="lims-navbar lims-navbar--panel">
        <Container fluid className="px-3 px-lg-4 gap-2 gap-sm-3">
          {/* Mientras elige la sucursal no hay menú lateral: el botón no se muestra */}
          {onAlternarMenu && (
            <button
              type="button"
              className="lims-navbar-menu"
              onClick={onAlternarMenu}
              aria-controls="panel-menu"
              aria-expanded={menuAbierto}
              aria-label={menuAbierto ? 'Esconder menú' : 'Mostrar menú'}
            >
              {/* Trazo más grueso que el resto de los íconos: es el control principal del panel */}
              <List weight="bold" aria-hidden="true" />
            </button>
          )}

          <BsNavbar.Brand as={NavLink} to="/" className="d-flex align-items-center py-0 me-0">
            <img src={logo} alt="LIMS Laboratorio Bioquímico" height="30" />
          </BsNavbar.Brand>

          {/* Con la sesión iniciada "Inicio" lleva a la bienvenida del panel, no a la home del sitio.
              En el celular se esconde (también está en el menú lateral) para dejar lugar a la sucursal */}
          <Nav className="me-auto ms-sm-2 lims-navbar-inicio">
            <Nav.Link as={NavLink} to="/panel" end className="lims-nav-link">
              Inicio
            </Nav.Link>
          </Nav>

          <div className="lims-navbar-sesion">
            {sucursal && (
              <button
                type="button"
                className="lims-navbar-sucursal"
                onClick={onCambiarSucursal}
                title="Cambiar de sucursal"
                aria-label={`Trabajando en ${sucursal.nombre}${sucursal.localidad ? ` (${sucursal.localidad})` : ''}. Cambiar de sucursal`}
              >
                <Buildings aria-hidden="true" />
                <span className="lims-navbar-sucursal-nombre">{sucursal.nombre}</span>
                {/* Localidad en letra chica al lado del nombre: se ve de un vistazo dónde se está trabajando */}
                {sucursal.localidad && <span className="lims-navbar-localidad">{sucursal.localidad}</span>}
              </button>
            )}
            <span className="lims-navbar-usuario">
              <UserCircle aria-hidden="true" />
              {perfil.nombre} {perfil.apellido}
            </span>
            <Reloj className="lims-navbar-reloj" titulo={`Sesión iniciada el ${fecha}`} />
            <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={onCerrarSesion}>
              <SignOut className="lims-icono" aria-hidden="true" />
              <span className="lims-navbar-salir">Cerrar sesión</span>
            </button>
          </div>
        </Container>
      </BsNavbar>
    );
  }

  return (
    <BsNavbar expand="lg" sticky="top" className="lims-navbar">
      <Container className="px-3 px-lg-4">
        <BsNavbar.Brand as={NavLink} to="/" className="d-flex align-items-center py-0 me-auto me-lg-4">
          <img src={logo} alt="LIMS Laboratorio Bioquímico" height="30" />
        </BsNavbar.Brand>

        <div className="d-flex align-items-center gap-2 order-lg-last">
          <Link to="/login-paciente" className="btn lims-btn-pill lims-btn-primario">
            Ver mis resultados
          </Link>
          <BsNavbar.Toggle aria-controls="navbarNav" label="Abrir menú" className="lims-navbar-toggle" />
        </div>

        <BsNavbar.Collapse id="navbarNav">
          <Nav className="me-auto align-items-lg-center gap-lg-4 py-3 py-lg-0">
            {/* as={NavLink}: el enlace navega con React Router sin recargar y se marca como activo en la página actual.
               end: "Inicio" solo se marca activo en "/" exacto, y no en todas las rutas. */}
            <Nav.Link as={NavLink} to="/" end className="lims-nav-link">
              Inicio
            </Nav.Link>
            <Nav.Link as={Link} to="/#servicios" className="lims-nav-link">
              Servicios
            </Nav.Link>
            <Nav.Link as={Link} to="/#preparacion" className="lims-nav-link">
              Preparación
            </Nav.Link>
            {/* Lleva a la sección de contacto del pie (ver el useEffect de App.jsx) */}
            <Nav.Link as={Link} to="/#contacto" className="lims-nav-link">
              Contacto
            </Nav.Link>
          </Nav>
          <Nav className="me-lg-3 pb-3 pb-lg-0">
            <Nav.Link as={NavLink} to="/login-personal" className="lims-nav-link lims-nav-link--discreto">
              Acceso personal
            </Nav.Link>
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;
