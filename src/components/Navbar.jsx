import { NavLink } from 'react-router-dom';
import BsNavbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import './Navbar.css';

function Navbar() {
  return (
    <BsNavbar
      expand="lg"
      variant="dark"
      sticky="top"
      className="lims-navbar py-2"
    >
      <Container fluid className="px-3 px-lg-4">
        <BsNavbar.Brand as={NavLink} to="/" className="d-flex align-items-center gap-2">
          <i className="fa-solid fa-flask-vial lims-brand-icon" aria-hidden="true"></i>
          <span className="lims-brand-text">LIMS Laboratorio</span>
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="navbarNav" label="Abrir menú" />
        <BsNavbar.Collapse id="navbarNav">
          <Nav className="ms-auto align-items-lg-center gap-lg-2">
            <Nav.Link as={NavLink} to="/" end className="lims-nav-link">
              Inicio
            </Nav.Link>
            <Nav.Link as={NavLink} to="/servicios" className="lims-nav-link">
              Servicios
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/login-personal"
              className="btn btn-sm lims-btn-ghost mt-2 mt-lg-0 ms-lg-2"
            >
              Personal interno
            </Nav.Link>
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
