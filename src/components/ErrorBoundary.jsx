import { Component } from 'react';
import '../pages/NoEncontrada.css';

// Si una página falla al dibujarse, en lugar de dejar la pantalla en blanco se muestra un aviso
// con la opción de recargar. Quien lo usa le pasa reinicio={pathname}: al cambiar de página se borra
// el error y se vuelve a intentar, sin desmontar lo que está adentro (el panel no vuelve a verificar la sesión).
// (Tiene que ser un componente de clase: React solo atrapa errores de dibujo con getDerivedStateFromError).
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, reinicio: props.reinicio };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  // Cambió la página: se olvida el error de la anterior
  static getDerivedStateFromProps(props, state) {
    if (props.reinicio !== state.reinicio) return { error: null, reinicio: props.reinicio };
    return null;
  }

  componentDidCatch(error, info) {
    console.error('Error al dibujar la página:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { enPanel = false } = this.props;
    return (
      <section className="lims-no-encontrada" role="alert" aria-labelledby="error-pagina-titulo">
        <p className="lims-panel-etiqueta">Algo salió mal</p>
        <h1 id="error-pagina-titulo" className="lims-no-encontrada-titulo">
          No pudimos mostrar esta página
        </h1>
        <p className="lims-no-encontrada-texto">
          Pruebe recargarla. Si vuelve a pasar, avísele al administrador del sistema.
        </p>
        <div className="lims-no-encontrada-acciones">
          <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
          {/* <a> y no <Link>: si falló el ruteo, una carga completa es lo más seguro */}
          <a href={enPanel ? '/panel' : '/'} className="btn lims-btn-pill lims-btn-secundario">
            {enPanel ? 'Ir al inicio del panel' : 'Ir al inicio'}
          </a>
        </div>
      </section>
    );
  }
}

export default ErrorBoundary;
