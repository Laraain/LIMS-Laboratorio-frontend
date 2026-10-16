import './LoginLayout.css';

// Pantalla dividida para los logins: formulario a la izquierda y foto a la derecha (solo en escritorio)
function LoginLayout({ etiqueta, titulo, descripcion, foto, altFoto, posicionFoto = 'center', leyenda, pie, children }) {
  return (
    <main id="contenido" className="lims-login">
      <section className="lims-login-columna">
        <div className="lims-login-contenido">
          <p className="lims-login-etiqueta lims-aparece">{etiqueta}</p>
          <h1 className="lims-login-titulo lims-aparece lims-aparece--2">{titulo}</h1>
          <p className="lims-login-descripcion lims-aparece lims-aparece--3">{descripcion}</p>
          <div className="lims-aparece lims-aparece--4">{children}</div>
          {pie && <div className="lims-login-pie lims-aparece lims-aparece--5">{pie}</div>}
        </div>
      </section>

      <figure className="lims-login-foto">
        <img src={foto} alt={altFoto} style={{ objectPosition: posicionFoto }} />
        {leyenda && <figcaption>{leyenda}</figcaption>}
      </figure>
    </main>
  );
}

export default LoginLayout;
