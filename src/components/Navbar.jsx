import { NavLink, Link } from 'react-router-dom';
import BsNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import logo from '../assets/logo1.png';
import './Navbar.css';

function Navbar() {
  return (
    <BsNavbar expand="lg" variant="dark" sticky="top" className="lims-navbar py-0">
      <Container fluid className="px-3 px-lg-4">
        <BsNavbar.Brand as={NavLink} to="/" className="d-flex align-items-center gap-3 py-0">
          <img src={logo} alt="Logo LIMS Laboratorio Bioquímico" height="26" className="lims-logo-invert" />
          <span className="lims-chip-brand d-none d-md-inline-block">Laboratorio bioquímico</span>
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="navbarNav" label="Abrir menú" />
        <BsNavbar.Collapse id="navbarNav">
          <Nav className="ms-auto align-items-lg-center gap-lg-3 py-3 py-lg-0">
            <Nav.Link as={NavLink} to="/" end className="lims-nav-link">
              Inicio
            </Nav.Link>
            <Nav.Link as={NavLink} to="/servicios" className="lims-nav-link">
              Servicios
            </Nav.Link>
            <Nav.Link as={Link} to="/#contacto" className="lims-nav-link">
              Contacto
            </Nav.Link>
            <div className="lims-nav-divider ms-lg-3 ps-lg-3 mt-3 mt-lg-0">
              <Nav.Link as={NavLink} to="/login-personal" className="btn btn-sm lims-btn-ghost">
                Personal interno
              </Nav.Link>
            </div>
            <Nav.Link as={NavLink} to="/login-paciente" className="btn btn-sm lims-btn-accent mt-2 mt-lg-0">
              <i className="fa-solid fa-user me-2" aria-hidden="true"></i>
              Portal del paciente
            </Nav.Link>
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;
