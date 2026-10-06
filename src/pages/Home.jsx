import { Link } from 'react-router-dom';
import servicios from '../data/servicios.js';
import estadisticas from '../data/estadisticas.js';
import ServiceCard from '../components/ServiceCard.jsx';
import StatsCounter from '../components/StatsCounter.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import './Home.css';

// Página de inicio: presentación, estadísticas, servicios destacados y accesos a los dos portales
function Home() {
  useMetadatos({
    titulo: 'LIMS Laboratorio — Sistema de gestión para laboratorio bioquímico',
    descripcion:
      'Laboratorio de análisis clínicos con trazabilidad digital de muestras y portal de resultados online para pacientes.',
  });

  // slice(0, 2) toma solo los dos primeros servicios para mostrarlos como destacados
  const destacados = servicios.slice(0, 2);

  return (
    <main id="contenido">
      <section className="lims-hero">
        <div className="row g-0">
          <div className="col-lg-7 lims-hero-copy">
            <span className="lims-eyebrow lims-chip-accent d-inline-flex align-items-center gap-2 mb-3">
              <i className="fa-solid fa-flask-vial" aria-hidden="true"></i>
              Trazabilidad digital de muestras
            </span>
            <h1 className="lims-hero-title mb-3">
              Autogestión de análisis clínicos y resultados de laboratorio
            </h1>
            <p className="lims-hero-lead mb-4">
              Soluciones integrales en analítica clínica para profesionales y pacientes. Cada
              tubo identificado con código de barras y su estado visible de punta a punta.
            </p>

            <div className="d-flex flex-wrap gap-2 mb-4 pb-2">
              <Link to="/login-paciente" className="btn lims-btn-accent">
                <i className="fa-solid fa-file-waveform me-2" aria-hidden="true"></i>
                Ver mis resultados
              </Link>
              <Link to="/#contacto" className="btn lims-btn-ghost">
                <i className="fa-regular fa-calendar-plus me-2" aria-hidden="true"></i>
                Pedir un turno
              </Link>
            </div>

            {/* Se le pasa el arreglo de estadísticas por props */}
            <StatsCounter estadisticas={estadisticas} />
          </div>
          <div className="col-lg-5 lims-hero-media d-none d-lg-block"></div>
        </div>
      </section>

      <section className="py-5">
        <div className="container px-3 px-lg-4">
          <div className="d-flex align-items-baseline justify-content-between gap-3 mb-4">
            <h2 className="lims-h2 mb-0">Servicios destacados</h2>
            <Link to="/servicios" className="lims-link-more">
              Ver todos <i className="fa-solid fa-arrow-right ms-1" aria-hidden="true"></i>
            </Link>
          </div>
          <div className="row row-cols-1 row-cols-sm-2 g-3">
            {/* map() recorre los servicios destacados y devuelve una tarjeta por cada uno.
               key: identificador único que React necesita en cada elemento de una lista. */}
            {destacados.map((servicio) => (
              <div className="col" key={servicio.id}>
                <ServiceCard
                  foto={servicio.foto}
                  altFoto={servicio.altFoto}
                  icono={servicio.icono}
                  variante={servicio.variante}
                  titulo={servicio.titulo}
                  descripcion={servicio.descripcion}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-5">
        <div className="container px-3 px-lg-4">
          {/* Link navega a otra ruta sin recargar la página, a diferencia de un <a href> */}
          <div className="row row-cols-1 row-cols-md-2 g-3">
            <div className="col">
              <Link to="/login-paciente" className="lims-access lims-access--patient h-100">
                <span className="lims-access-icon">
                  <i className="fa-solid fa-user" aria-hidden="true"></i>
                </span>
                <span className="flex-grow-1">
                  <span className="d-block lims-access-title">Soy paciente</span>
                  <span className="d-block lims-access-sub">Ingrese con su DNI para ver resultados y turnos</span>
                </span>
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>
            <div className="col">
              <Link to="/login-personal" className="lims-access lims-access--staff h-100">
                <span className="lims-access-icon">
                  <i className="fa-solid fa-user-shield" aria-hidden="true"></i>
                </span>
                <span className="flex-grow-1">
                  <span className="d-block lims-access-title">Soy del personal</span>
                  <span className="d-block lims-access-sub">Acceso al sistema de gestión de muestras</span>
                </span>
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
