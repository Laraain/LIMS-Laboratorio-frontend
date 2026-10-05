import { Link } from 'react-router-dom';
import {
  Clock,
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  MapPin,
  MapTrifold,
  Phone,
  WhatsappLogo,
} from '@phosphor-icons/react';
import logo from '../assets/logo1.png';
import { contacto, horarios, redes, enlacesPie } from '../data/laboratorio.js';
import './Footer.css';

const iconosRedes = { facebook: FacebookLogo, instagram: InstagramLogo, whatsapp: WhatsappLogo, maps: MapTrifold };

function Footer() {
  return (
    <footer className="lims-footer" id="contacto">
      <div className="container px-3 px-lg-4">
        <div className="lims-footer-columnas">
          <div className="lims-footer-marca">
            <Link to="/" className="d-inline-block mb-3">
              <img src={logo} alt="LIMS Laboratorio Bioquímico" height="34" />
            </Link>
            <p className="lims-footer-lema">Del laboratorio a sus manos, sin salir de casa.</p>
            <p className="lims-footer-texto mb-0">
              Análisis clínicos en San Miguel de Tucumán, con resultados validados por bioquímicos
              matriculados y disponibles en línea.
            </p>
          </div>

          <nav aria-labelledby="pie-enlaces">
            <h2 id="pie-enlaces" className="lims-footer-titulo">
              Enlaces
            </h2>
            <ul className="lims-footer-lista">
              {enlacesPie.map((enlace) => (
                <li key={enlace.to}>
                  <Link to={enlace.to}>{enlace.texto}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="lims-footer-titulo">Contacto</h2>
            <ul className="lims-footer-lista lims-footer-contacto">
              <li>
                <MapPin aria-hidden="true" />
                <a href={contacto.mapa} target="_blank" rel="noopener">
                  {contacto.direccion}
                </a>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <a href={contacto.telefonoEnlace}>{contacto.telefono}</a>
              </li>
              <li>
                <EnvelopeSimple aria-hidden="true" />
                <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
              </li>
              <li>
                <Clock aria-hidden="true" />
                <span>
                  {horarios.lineasAtencion.map((linea) => (
                    <span key={linea.dias} className="d-block">
                      {linea.dias}: {linea.horas}
                    </span>
                  ))}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="lims-footer-titulo">Seguinos</h2>
            <ul className="lims-footer-redes">
              {redes.map((red) => {
                const Icono = iconosRedes[red.id];
                return (
                  <li key={red.id}>
                    <a
                      href={red.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${red.nombre} (se abre en una pestaña nueva)`}
                    >
                      <Icono aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="lims-footer-base">
          <p className="mb-0">&copy; 2026 LIMS Laboratorio Bioquímico. Todos los derechos reservados.</p>
          <ul className="lims-footer-base-enlaces">
            <li>
              <Link to="/login-paciente">Ver mis resultados</Link>
            </li>
            <li>
              <Link to="/login-personal">Acceso personal</Link>
            </li>
            <li>
              <Link to="/">Volver arriba</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
