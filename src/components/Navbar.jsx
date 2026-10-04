import { NavLink, Link } from 'react-router-dom';
import BsNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import logo from '../assets/logo1.png';
import './Navbar.css';

function Navbar() {
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
            <Nav.Link as={NavLink} to="/" end className="lims-nav-link">
              Inicio
            </Nav.Link>
            <Nav.Link as={NavLink} to="/servicios" className="lims-nav-link">
              Servicios
            </Nav.Link>
            <Nav.Link as={Link} to="/#preparacion" className="lims-nav-link">
              Preparación
            </Nav.Link>
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
