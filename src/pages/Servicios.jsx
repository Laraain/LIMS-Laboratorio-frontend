import servicios from '../data/servicios.js';
import ServiceCard from '../components/ServiceCard.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import './Servicios.css';

function Servicios() {
  useMetadatos({
    titulo: 'Servicios — LIMS Laboratorio',
    descripcion:
      'Servicios del laboratorio: área de extracción, control de calidad, resultados online y trazabilidad de muestras.',
  });

  return (
    <main id="contenido" className="py-5">
      <div className="container px-3 px-lg-4">
        <header className="mb-4">
          <span className="lims-eyebrow-dark d-inline-block mb-2">Qué ofrecemos</span>
          <h1 className="lims-servicios-title mb-2">Nuestros servicios</h1>
          <p className="lims-servicios-text mb-0">
            Tres áreas conectadas en un solo sistema: extracción, análisis y entrega de
            resultados, con trazabilidad digital en cada etapa.
          </p>
        </header>

        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
          {servicios.map((servicio) => (
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
    </main>
  );
}

export default Servicios;
