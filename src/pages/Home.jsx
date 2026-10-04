import { useEffect } from 'react';
import { ArrowRight, ArrowUpRight, WhatsappLogo } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import Accordion from 'react-bootstrap/Accordion';
import Carrusel from '../components/Carrusel.jsx';
import EstadoAhora from '../components/EstadoAhora.jsx';
import {
  contacto,
  horarios,
  carrusel,
  accesos,
  pasosResultados,
  areas,
  preparacion,
  obrasSociales,
  equipo,
  preguntas,
} from '../data/laboratorio.js';
import './Home.css';

const numero = (i) => String(i + 1).padStart(2, '0');

function Home() {
  useEffect(() => {
    document.title = 'LIMS Laboratorio Bioquímico — Análisis clínicos en Tucumán';
  }, []);

  return (
    <main id="contenido">
      <section className="lims-hero">
        <div className="container px-3 px-lg-4">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6">
              <p className="lims-kicker mb-3">Análisis clínicos · San Miguel de Tucumán</p>
              <h1 className="lims-hero-title mb-3">Sus análisis clínicos, con resultados en línea.</h1>
              <p className="lims-hero-lead mb-4">
                Realice sus estudios en el laboratorio y consulte el informe validado por un
                bioquímico matriculado desde el celular, ingresando con su DNI.
              </p>
              <div className="d-flex flex-wrap align-items-center gap-3">
                <Link to="/login-paciente" className="btn lims-btn-pill lims-btn-primario lims-btn-grande">
                  Ver mis resultados
                </Link>
                <a href={contacto.mapa} target="_blank" rel="noopener" className="lims-link-flecha">
                  Cómo llegar <ArrowUpRight className="lims-icono ms-1" aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="col-lg-6">
              <Carrusel imagenes={carrusel} />
            </div>
          </div>
        </div>
      </section>

      <nav className="lims-accesos" aria-label="Accesos rápidos">
        <div className="container px-3 px-lg-4">
          <ul className="lims-accesos-lista">
            {accesos.map((acceso) => (
              <li key={acceso.id}>
                <Link to={acceso.to} className="lims-acceso">
                  <span>{acceso.texto}</span>
                  <span className="lims-acceso-flecha" aria-hidden="true">
                    <ArrowUpRight />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <section className="lims-practica" aria-label="Datos prácticos">
        <div className="container px-3 px-lg-4">
          <dl className="lims-practica-lista">
            <div>
              <dt>Dirección</dt>
              <dd>{contacto.direccion}</dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>{horarios.textoAtencion}</dd>
            </div>
            <div>
              <dt>Extracciones</dt>
              <dd>{horarios.textoExtracciones}</dd>
            </div>
            <div>
              <dt className="visually-hidden">Estado</dt>
              <dd>
                <EstadoAhora franjas={horarios.atencion} />
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="lims-seccion" aria-labelledby="titulo-resultados">
        <div className="container px-3 px-lg-4">
          <h2 id="titulo-resultados" className="lims-h2">Cómo ver sus resultados</h2>
          <ol className="lims-pasos">
            {pasosResultados.map((paso, i) => (
              <li key={paso.titulo} className="lims-paso">
                <span className="lims-paso-numero" aria-hidden="true">{numero(i)}</span>
                <h3 className="lims-h3">{paso.titulo}</h3>
                <p className="mb-0">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lims-seccion lims-seccion--gris" aria-labelledby="titulo-estudios">
        <div className="container px-3 px-lg-4">
          <div className="lims-encabezado-seccion">
            <h2 id="titulo-estudios" className="lims-h2 mb-0">Estudios por área</h2>
            <Link to="/servicios" className="lims-link-flecha">
              Ver servicios <ArrowRight className="lims-icono ms-1" aria-hidden="true" />
            </Link>
          </div>
          <ul className="lims-areas">
            {areas.map((area) => (
              <li key={area.id} className="lims-area">
                <h3 className="lims-h3">{area.nombre}</h3>
                <p className="mb-0">{area.estudios}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="preparacion" className="lims-seccion" aria-labelledby="titulo-preparacion">
        <div className="container px-3 px-lg-4">
          <h2 id="titulo-preparacion" className="lims-h2">Cómo prepararse para su estudio</h2>
          <ol className="lims-pasos">
            {preparacion.map((paso, i) => (
              <li key={paso.titulo} className="lims-paso">
                <span className="lims-paso-numero" aria-hidden="true">{numero(i)}</span>
                <h3 className="lims-h3">{paso.titulo}</h3>
                <p className="mb-0">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="obras-sociales" className="lims-seccion lims-seccion--gris" aria-labelledby="titulo-obras">
        <div className="container px-3 px-lg-4">
          <h2 id="titulo-obras" className="lims-h2">Obras sociales con las que trabajamos</h2>
          <ul className="lims-obras">
            {obrasSociales.map((obra) => (
              <li key={obra.id}>{obra.nombre}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lims-seccion" aria-labelledby="titulo-equipo">
        <div className="container px-3 px-lg-4">
          <h2 id="titulo-equipo" className="lims-h2">Nuestro equipo</h2>
          <ul className="lims-equipo">
            {equipo.map((persona) => (
              <li key={persona.id} className="lims-persona">
                <div className="lims-persona-foto">
                  <img src={persona.foto} alt="" loading="lazy" width="600" height="720" />
                </div>
                <h3 className="lims-h3 mt-3 mb-1">{persona.nombre}</h3>
                <p className="mb-0">{persona.cargo}</p>
                <p className="lims-matricula mb-0">{persona.matricula}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lims-seccion lims-seccion--gris" aria-labelledby="titulo-preguntas">
        <div className="container px-3 px-lg-4">
          <div className="row g-4">
            <div className="col-lg-4">
              <h2 id="titulo-preguntas" className="lims-h2">Preguntas frecuentes</h2>
            </div>
            <div className="col-lg-8">
              <Accordion className="lims-preguntas">
                {preguntas.map((item) => (
                  <Accordion.Item eventKey={item.id} key={item.id}>
                    <Accordion.Header as="h3">{item.pregunta}</Accordion.Header>
                    <Accordion.Body>{item.respuesta}</Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {contacto.whatsapp && (
        <a
          href={`https://wa.me/${contacto.whatsapp}`}
          target="_blank"
          rel="noopener"
          className="lims-whatsapp"
          aria-label="Escribirnos por WhatsApp"
        >
          <WhatsappLogo aria-hidden="true" />
        </a>
      )}
    </main>
  );
}

export default Home;
