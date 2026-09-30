import './ServiceCard.css';

function ServiceCard({ icono, variante, titulo, descripcion }) {
  return (
    <article className={`lims-service-card lims-service-card--${variante} h-100`}>
      <span className="lims-service-icon" aria-hidden="true">
        <i className={icono}></i>
      </span>
      <h3 className="lims-service-title">{titulo}</h3>
      <p className="lims-service-text mb-0">{descripcion}</p>
    </article>
  );
}

export default ServiceCard;
