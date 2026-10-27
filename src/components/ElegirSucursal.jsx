import { Buildings, MapPin } from '@phosphor-icons/react';
import { ultimaSucursal } from '../lib/sucursal.js';
import './ElegirSucursal.css';

// Pantalla que aparece al entrar al panel: la persona elige en qué sucursal trabaja hoy.
// La última sucursal que usó en esta computadora aparece marcada como sugerencia.
// Props: perfil (quién ingresó) · sucursales (las activas) · cargando · error · onReintentar · onElegir (recibe el id)
function ElegirSucursal({ perfil, sucursales, cargando, error, onReintentar, onElegir }) {
  const ultima = ultimaSucursal();

  return (
    <section className="lims-elegir-sucursal" aria-labelledby="elegir-sucursal-titulo">
      <p className="lims-panel-etiqueta">Hola, {perfil.nombre}</p>
      <h1 id="elegir-sucursal-titulo" className="lims-panel-titulo">
        ¿En qué sucursal trabaja hoy?
      </h1>
      <p className="lims-panel-texto">
        La fila de atención, los boxes y las órdenes que ve son los de la sucursal elegida. La puede cambiar después desde
        la barra de arriba.
      </p>

      {cargando && (
        <p className="lims-panel-texto" role="status">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Cargando sucursales…
        </p>
      )}
      {!cargando && error && (
        <div className="lims-elegir-sucursal-aviso" role="alert">
          No se pudieron cargar las sucursales.{' '}
          <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      )}
      {!cargando && !error && sucursales.length === 0 && (
        <div className="lims-elegir-sucursal-aviso" role="alert">
          No hay sucursales activas. Un administrador tiene que habilitar al menos una desde Sucursales.
        </div>
      )}

      {!cargando && !error && sucursales.length > 0 && (
        <ul className="lims-elegir-sucursal-lista">
          {sucursales.map((sucursal) => (
            <li key={sucursal.id}>
              <button
                type="button"
                className={`lims-elegir-sucursal-opcion${sucursal.id === ultima ? ' is-sugerida' : ''}`}
                onClick={() => onElegir(sucursal.id)}
              >
                <Buildings className="lims-elegir-sucursal-icono" aria-hidden="true" />
                <span className="lims-elegir-sucursal-nombre">{sucursal.nombre}</span>
                {sucursal.localidad && <span className="lims-elegir-sucursal-localidad">{sucursal.localidad}</span>}
                {sucursal.direccion && (
                  <span className="lims-elegir-sucursal-direccion">
                    <MapPin aria-hidden="true" /> {sucursal.direccion}
                  </span>
                )}
                {sucursal.id === ultima && <span className="lims-elegir-sucursal-ultima">La última que usó</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ElegirSucursal;
