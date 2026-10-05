import './ServiceCard.css';

function ServiceCard({ foto, altFoto, icono: Icono, variante, titulo, descripcion }) {
  return (
    <article className={`lims-service-card lims-service-card--${variante} h-100`}>
      <div className="lims-service-media">
        <img src={foto} alt={altFoto} className="lims-service-img" />
      </div>
      <div className="lims-service-body">
        <span className="lims-service-icon" aria-hidden="true">
          <Icono />
        </span>
        <h3 className="lims-service-title">{titulo}</h3>
        <p className="lims-service-text mb-0">{descripcion}</p>
      </div>
    </article>
  );
}

export default ServiceCard;
