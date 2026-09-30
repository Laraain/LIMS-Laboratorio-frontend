import './Footer.css';

function Footer() {
  return (
    <footer className="lims-footer pt-4 pb-3">
      <div className="container-fluid px-3 px-lg-4">
        <div className="row g-4 pb-4">
          <div className="col-md-4">
            <h2 className="lims-footer-title mb-3">Laboratorio LIMS</h2>
            <p className="lims-footer-text mb-0">
              Comprometidos con la excelencia en diagnóstico clínico, innovación
              tecnológica y trazabilidad digital de muestras.
            </p>
          </div>
          <div className="col-md-4">
            <h2 className="lims-footer-title mb-3">Contacto y ubicación</h2>
            <p className="lims-footer-item">
              <i className="fa-solid fa-location-pin me-2" aria-hidden="true"></i>
              Av. Belgrano y Cuyo, Tucumán
            </p>
            <p className="lims-footer-item">
              <i className="fa-solid fa-phone me-2" aria-hidden="true"></i>
              381-604-1779
            </p>
            <p className="lims-footer-item mb-0">
              <i className="fa-solid fa-envelope me-2" aria-hidden="true"></i>
              contacto@limslaboratorio.com.ar
            </p>
          </div>
          <div className="col-md-4">
            <h2 className="lims-footer-title mb-3">Síguenos</h2>
            <p className="lims-footer-text mb-3">
              Novedades y asesoramiento en nuestras redes oficiales.
            </p>
            <div className="d-flex gap-2">
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener"
                aria-label="WhatsApp"
                className="lims-social"
              >
                <i className="fa-brands fa-whatsapp" aria-hidden="true"></i>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener"
                aria-label="Instagram"
                className="lims-social"
              >
                <i className="fa-brands fa-instagram" aria-hidden="true"></i>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener"
                aria-label="LinkedIn"
                className="lims-social"
              >
                <i className="fa-brands fa-linkedin-in" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>
        <div className="lims-footer-bottom pt-3 text-center">
          <p className="mb-0">&copy; 2026 — Proyecto Final Integrador LIMS · Bioquímica y Tecnología</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
