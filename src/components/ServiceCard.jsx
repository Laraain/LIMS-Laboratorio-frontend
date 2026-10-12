import './ServiceCard.css';

// Tarjeta reutilizable de un servicio. Recibe todos sus datos por props (desestructuradas entre llaves),
// así el mismo componente sirve para cualquier servicio.
function ServiceCard({ foto, altFoto, icono, variante, titulo, descripcion }) {
  // variante (azul o verde) cambia el color de la tarjeta agregando una clase CSS
  return (
    <article className={`lims-service-card lims-service-card--${variante} h-100`}>
      <img src={foto} alt={altFoto} className="lims-service-img" />
      <div className="lims-service-body">
        <span className="lims-service-icon" aria-hidden="true">
          <i className={icono}></i>
        </span>
        <h3 className="lims-service-title">{titulo}</h3>
        <p className="lims-service-text mb-0">{descripcion}</p>
      </div>
    </article>
  );
}

export default ServiceCard;
