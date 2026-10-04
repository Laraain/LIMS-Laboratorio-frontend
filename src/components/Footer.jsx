import { Link } from 'react-router-dom';
import { MapPin, Phone, EnvelopeSimple } from '@phosphor-icons/react';
import { contacto, horarios } from '../data/laboratorio.js';
import './Footer.css';

function Footer() {
  return (
    <footer className="lims-footer" id="contacto">
      <div className="container px-3 px-lg-4">
        <div className="row g-4 pb-4">
          <div className="col-md-4">
            <h2 className="lims-footer-title">LIMS Laboratorio Bioquímico</h2>
            <p className="lims-footer-text mb-0">
              Análisis clínicos en San Miguel de Tucumán, con resultados validados por
              bioquímicos matriculados y disponibles en línea.
            </p>
          </div>
          <div className="col-md-4">
            <h2 className="lims-footer-title">Contacto</h2>
            <ul className="lims-footer-lista">
              <li>
                <MapPin className="lims-icono me-2" aria-hidden="true" />
                <a href={contacto.mapa} target="_blank" rel="noopener">
                  {contacto.direccion}
                </a>
              </li>
              <li>
                <Phone className="lims-icono me-2" aria-hidden="true" />
                <a href={contacto.telefonoEnlace}>{contacto.telefono}</a>
              </li>
              <li>
                <EnvelopeSimple className="lims-icono me-2" aria-hidden="true" />
                <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
              </li>
            </ul>
          </div>
          <div className="col-md-4">
            <h2 className="lims-footer-title">Horarios</h2>
            <p className="lims-footer-text mb-2">{horarios.textoAtencion}</p>
            <p className="lims-footer-text mb-3">{horarios.textoExtracciones}</p>
            <Link to="/login-personal" className="lims-footer-discreto">
              Acceso personal
            </Link>
          </div>
        </div>
        <div className="lims-footer-bottom">
          <p className="mb-0">&copy; 2026 — Proyecto Final Integrador LIMS · Bioquímica y Tecnología</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
