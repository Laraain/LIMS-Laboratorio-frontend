import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import servicios from '../data/servicios.js';
import ServiceCard from '../components/ServiceCard.jsx';
import './Home.css';

function Home() {
  useEffect(() => {
    document.title = 'LIMS Laboratorio — Sistema de gestión para laboratorio bioquímico';
  }, []);

  const destacados = servicios.slice(0, 2);

  return (
    <main id="contenido">
      <section className="lims-hero py-5">
        <div className="container px-3 px-lg-4">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="lims-eyebrow d-inline-block mb-3">Laboratorio bioquímico</span>
              <h1 className="lims-hero-title mb-3">
                Resultados confiables, trazabilidad digital de punta a punta
              </h1>
              <p className="lims-hero-text mb-4">
                Gestionamos cada muestra con tecnología LIMS: desde la extracción hasta la
                entrega del informe validado, con registro de usuario, fecha y hora en
                cada paso.
              </p>
              <Link to="/servicios" className="btn btn-lg lims-btn-accent">
                Conocer nuestros servicios
              </Link>
            </div>
            <div className="col-lg-5">
              <div className="lims-hero-panel">
                <ul className="list-unstyled lims-hero-rows mb-0">
                  <li>
                    <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                    <span>Informes firmados electrónicamente</span>
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                    <span>Estado de la muestra en tiempo real</span>
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                    <span>Historial clínico completo y descargable</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
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
            {destacados.map((servicio) => (
              <div className="col" key={servicio.id}>
                <ServiceCard
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
    </main>
  );
}

export default Home;
