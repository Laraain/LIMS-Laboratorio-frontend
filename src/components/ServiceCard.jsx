import './ServiceCard.css';

// Tarjeta reutilizable de un servicio. Recibe todos sus datos por props (desestructuradas entre llaves),
// así el mismo componente sirve para cualquier servicio. icono es un componente de Phosphor: se renombra a Icono
// porque React solo trata como componente a lo que empieza con mayúscula.
function ServiceCard({ foto, altFoto, icono: Icono, variante, titulo, descripcion }) {
  // variante (azul o verde) cambia el color de la tarjeta agregando una clase CSS
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
