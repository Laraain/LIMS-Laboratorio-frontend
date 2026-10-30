import { Navigate, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, ClockCountdown } from '@phosphor-icons/react';
import { ROLES_BANDEJA } from '../data/roles.js';
import useMetadatos from '../hooks/useMetadatos.js';
import { fechaDe, horaDe } from '../lib/hora.js';
import { ESTADOS_ORDEN, avanceDeOrden } from '../lib/ordenes.js';
import '../components/ListaPerfiles.css';
import './PanelTecnico.css';

// Pantalla provisoria de carga de resultados. La pantalla real llega con LIMS-12/13:
// mientras tanto, muestra la orden elegida en la bandeja y avisa que todavía no está disponible.
// Cuando se integre, esta ruta se reemplaza por la pantalla de resultados.
function ResultadosPendiente() {
  useMetadatos({
    titulo: 'Resultados — LIMS Laboratorio',
    descripcion: 'Carga de resultados de las órdenes de la sucursal.',
    ruta: '/panel/resultados',
    indexar: false,
  });

  const { perfil, sucursal } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  // La bandeja pasa la orden elegida para poder mostrarla acá
  const orden = location.state?.orden ?? null;
  const avance = orden ? avanceDeOrden(orden) : null;

  if (!ROLES_BANDEJA.includes(perfil.rol) && perfil.rol !== 'admin') return <Navigate to="/panel" replace />;

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Resultados · {sucursal.nombre}</p>
          <h1 className="lims-panel-titulo">Carga de resultados</h1>
          <p className="lims-panel-texto mb-0">
            Carga de los valores de cada estudio, con aviso de los que quedan fuera de rango.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="resultados-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="resultados-titulo" className="lims-lista-titulo">
              {orden ? `Orden ${orden.nro_orden}` : 'Pantalla en preparación'}
            </h2>
            {orden && (
              <p className="lims-lista-resumen mb-0">
                {orden.pacientes.apellido}, {orden.pacientes.nombre} · DNI {orden.pacientes.dni}
              </p>
            )}
          </div>
          <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={() => navigate('/panel')}>
            <ArrowLeft className="lims-icono me-2" aria-hidden="true" />
            Volver a la bandeja
          </button>
        </div>

        {orden && (
          <div className="lims-tabla-contenedor lims-resumen-orden mb-3">
            <dl className="row g-0 mb-0">
              <div className="col-sm-6 col-lg-3 lims-resumen-dato">
                <dt>Orden</dt>
                <dd>{orden.nro_orden}</dd>
              </div>
              <div className="col-sm-6 col-lg-3 lims-resumen-dato">
                <dt>Recibida</dt>
                <dd>
                  {fechaDe(orden.fecha_recepcion)} · {horaDe(orden.fecha_recepcion)} hs
                </dd>
              </div>
              <div className="col-sm-6 col-lg-3 lims-resumen-dato">
                <dt>Estado</dt>
                <dd>{ESTADOS_ORDEN[orden.estado]}</dd>
              </div>
              <div className="col-sm-6 col-lg-3 lims-resumen-dato">
                <dt>Análisis</dt>
                <dd>
                  {avance.conResultado} de {avance.total} con resultado
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="lims-lista-aviso lims-aviso-pendiente">
          <span className="lims-aviso-pendiente-icono" aria-hidden="true">
            <ClockCountdown />
          </span>
          <div>
            <p className="fw-semibold mb-1">La carga de resultados todavía no está integrada</p>
            <p className="mb-0">
              {orden
                ? `La orden ${orden.nro_orden} quedó seleccionada. Cuando se integre la carga de resultados (LIMS-12/13), va a abrirse desde acá.`
                : 'Elija una orden desde la bandeja de trabajo. Cuando se integre la carga de resultados (LIMS-12/13), va a abrirse desde acá.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ResultadosPendiente;
