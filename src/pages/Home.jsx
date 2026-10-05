import useMetadatos from '../hooks/useMetadatos.js';
import useAlAparecer from '../hooks/useAlAparecer.js';
import { ArrowRight, ArrowUpRight, WhatsappLogo } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import Carrusel from '../components/Carrusel.jsx';
import PreguntasFrecuentes from '../components/PreguntasFrecuentes.jsx';
import CintaLogos from '../components/CintaLogos.jsx';
import EstadoAhora from '../components/EstadoAhora.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import servicios from '../data/servicios.js';
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

// Cada palabra del título entra con un pequeño retraso respecto de la anterior
const palabrasTitulo = 'Sus análisis clínicos, con resultados en línea.'.split(' ');

function Home() {
  useMetadatos({
    titulo: 'LIMS Laboratorio Bioquímico — Análisis clínicos en Tucumán',
    descripcion:
      'Laboratorio de análisis clínicos en San Miguel de Tucumán. Consulte sus resultados en línea con su DNI, cómo prepararse para su estudio y las obras sociales con las que trabajamos.',
    ruta: '/',
  });

  // Las tarjetas de servicios entran una tras otra cuando la sección aparece en pantalla
  const [refServicios, serviciosVisibles] = useAlAparecer();

  return (
    <main id="contenido">
      <section className="lims-hero">
        <div className="container px-3 px-lg-4">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6">
              <p className="lims-kicker mb-3">Análisis clínicos · San Miguel de Tucumán</p>
              <h1 className="lims-hero-title mb-3">
                {palabrasTitulo.map((palabra, i) => (
                  <span key={i}>
                    <span className="lims-hero-palabra" style={{ animationDelay: `${120 + i * 90}ms` }}>
                      {palabra}
                    </span>{' '}
                  </span>
                ))}
              </h1>
              <p className="lims-hero-lema mb-4">Del laboratorio a sus manos, sin salir de casa.</p>
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
              <li key={paso.titulo} className="lims-paso lims-linea-al-pasar">
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
            <Link to="/#servicios" className="lims-link-flecha">
              Ver servicios <ArrowRight className="lims-icono ms-1" aria-hidden="true" />
            </Link>
          </div>
          <ul className="lims-areas">
            {areas.map((area) => (
              <li key={area.id} className="lims-area lims-linea-al-pasar">
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
          <CintaLogos etiqueta="Obras sociales" duracion={45} separacion={16}>
            {obrasSociales.map((obra) => (
              <li key={obra.id} className="lims-obra">
                <img src={obra.logo} alt="" decoding="async" />
                <span>{obra.nombre}</span>
              </li>
            ))}
          </CintaLogos>
        </div>
      </section>

      <section className="lims-seccion" aria-labelledby="titulo-equipo">
        <div className="container px-3 px-lg-4">
          <h2 id="titulo-equipo" className="lims-h2">Nuestro equipo</h2>
          <ul className="lims-equipo">
            {equipo.map((persona) => (
              <li key={persona.id} className="lims-persona">
                <img src={persona.foto} alt="" loading="lazy" width="600" height="720" />
                <div className="lims-persona-texto">
                  <h3 className="lims-persona-nombre">{persona.nombre}</h3>
                  <p className="lims-persona-cargo">{persona.cargo}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="servicios" className="lims-seccion lims-seccion--gris" aria-labelledby="titulo-servicios">
        <div className="container px-3 px-lg-4">
          <h2 id="titulo-servicios" className="lims-h2 mb-2">Nuestros servicios</h2>
          <p className="lims-seccion-bajada">
            Tres áreas conectadas en un solo sistema: extracción, análisis y entrega de
            resultados, con trazabilidad digital en cada etapa.
          </p>
          <div
            ref={refServicios}
            className={`row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 lims-aparecen${serviciosVisibles ? ' is-visible' : ''}`}
          >
            {servicios.map((servicio, i) => (
              <div className="col" key={servicio.id} style={{ '--orden': i }}>
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

      <section className="lims-seccion" aria-labelledby="titulo-preguntas">
        <div className="container px-3 px-lg-4">
          <div className="lims-preguntas">
            <header className="lims-preguntas-encabezado">
              <p className="lims-kicker mb-2">Preguntas frecuentes</p>
              <h2 id="titulo-preguntas" className="lims-h2 mb-3">¿Tiene alguna duda?</h2>
              <p className="mb-0">
                Reunimos las consultas más comunes. Si no encuentra su respuesta,{' '}
                <Link to="/#contacto">comuníquese con el laboratorio</Link>.
              </p>
            </header>
            <PreguntasFrecuentes preguntas={preguntas} />
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
