import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { MagnifyingGlass, PencilSimple, Plus, Prohibit } from '@phosphor-icons/react';
import ModalOrden from '../components/ModalOrden.jsx';
import { ROLES_ORDENES } from '../data/roles.js';
import useMetadatos from '../hooks/useMetadatos.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { hoyTucuman } from '../lib/hora.js';
import { ESTADOS_ORDEN, anularOrden, useOrdenes } from '../lib/ordenes.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';

// En pantallas de menos de 1200px la tabla no entra: cada orden se muestra como tarjeta
function enTarjetas() {
  return window.matchMedia('(max-width: 1199.98px)').matches;
}

const FILTROS = [
  { clave: 'todas', nombre: 'Todas' },
  { clave: 'abierta', nombre: 'Abiertas' },
  { clave: 'anulada', nombre: 'Anuladas' },
];

// Órdenes médicas de la sucursal: listado por día, carga de órdenes nuevas, corrección y anulación.
// Desde Recepción se llega con el paciente elegido (location.state.paciente) y se abre la carga directamente.
function Ordenes() {
  useMetadatos({
    titulo: 'Órdenes — LIMS Laboratorio',
    descripcion: 'Carga y listado de órdenes médicas de la sucursal.',
    ruta: '/panel/ordenes',
    indexar: false,
  });

  const { perfil, sucursal } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(hoyTucuman);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [tarjetas] = useState(enTarjetas);
  // creando: paciente con el que se abre la carga (undefined = cerrada, null = sin paciente elegido)
  const [creando, setCreando] = useState(location.state?.paciente);
  const [editando, setEditando] = useState(null);
  const { ordenes, cargando, error, recargar } = useOrdenes(sucursal.id, fecha);

  if (!ROLES_ORDENES.includes(perfil.rol)) return <Navigate to="/panel" replace />;

  function cerrar() {
    setCreando(undefined);
    setEditando(null);
    // El paciente que llegó desde Recepción se usa una sola vez: si se recarga la página no vuelve a abrir la carga
    if (location.state?.paciente) navigate(location.pathname, { replace: true, state: null });
  }

  async function anular(orden) {
    const { value: motivo } = await Swal.fire({
      icon: 'warning',
      title: `¿Anular la orden ${orden.nro_orden}?`,
      text: 'La orden queda anulada y no se puede volver a abrir. Indique el motivo.',
      input: 'textarea',
      inputLabel: 'Motivo de la anulación',
      inputAttributes: { maxlength: 300 },
      inputValidator: (valor) => (!valor?.trim() ? 'El motivo es obligatorio.' : undefined),
      showCancelButton: true,
      confirmButtonText: 'Anular orden',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#b42318',
    });
    if (!motivo) return;
    try {
      await anularOrden(orden.id, motivo.trim());
      Swal.fire({ icon: 'success', title: 'Orden anulada', timer: 1600, showConfirmButton: false });
    } catch (errorPeticion) {
      console.error('No se pudo anular la orden:', errorPeticion);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos anular la orden',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    }
    recargar();
  }

  // Filtros sobre la lista que ya llegó: estado y búsqueda por número, DNI o nombre
  const texto = busqueda.trim().toLowerCase();
  const digitos = texto.replace(/[.\s]/g, '');
  const visibles = ordenes
    .filter((orden) => filtro === 'todas' || orden.estado === filtro)
    .filter((orden) => {
      if (!texto) return true;
      const paciente = orden.pacientes;
      return (
        orden.nro_orden.toLowerCase().includes(texto) ||
        `${paciente.apellido} ${paciente.nombre}`.toLowerCase().includes(texto) ||
        (digitos !== '' && paciente.dni.includes(digitos))
      );
    });
  const cantidad = (clave) => (clave === 'todas' ? ordenes.length : ordenes.filter((orden) => orden.estado === clave).length);

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Recepción · {sucursal.nombre}</p>
          <h1 className="lims-panel-titulo">Órdenes médicas</h1>
          <p className="lims-panel-texto mb-0">
            Cargue la orden que trae el paciente: médico, obra social y estudios. El número lo asigna el sistema.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="ordenes-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="ordenes-titulo" className="lims-lista-titulo">
              {fecha === hoyTucuman() ? 'Órdenes de hoy' : `Órdenes del ${new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR')}`}
            </h2>
            {!cargando && !error && (
              <p className="lims-lista-resumen mb-0" aria-live="polite">
                Mostrando {visibles.length} de {ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'}
              </p>
            )}
          </div>
          <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => setCreando(null)}>
            <Plus className="lims-icono me-2" aria-hidden="true" />
            Nueva orden
          </button>
        </div>

        <div className="lims-lista-controles">
          <div className="lims-lista-filtro" role="group" aria-label="Filtrar por estado">
            {FILTROS.map(({ clave, nombre }) => (
              <button
                key={clave}
                type="button"
                className="lims-filtro-boton"
                aria-pressed={filtro === clave}
                onClick={() => setFiltro(clave)}
              >
                {nombre} <span className="lims-filtro-cantidad">{cantidad(clave)}</span>
              </button>
            ))}
          </div>
          <div className="lims-lista-herramientas">
            <label htmlFor="ordenes-fecha" className="visually-hidden">
              Día de recepción
            </label>
            <input
              type="date"
              id="ordenes-fecha"
              className="form-control w-auto"
              max={hoyTucuman()}
              value={fecha}
              onChange={(evento) => evento.target.value && setFecha(evento.target.value)}
            />
            <div className="lims-lista-busqueda">
              <MagnifyingGlass className="lims-icono" aria-hidden="true" />
              <label htmlFor="buscar-orden" className="visually-hidden">
                Buscar por número, DNI o paciente
              </label>
              <input
                type="search"
                id="buscar-orden"
                placeholder="Buscar por número, DNI o paciente"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Cargando órdenes…
          </div>
        ) : error ? (
          <div className="lims-lista-aviso" role="alert">
            <span>No se pudieron cargar las órdenes.</span>
            <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <div className="lims-lista-aviso">
            {ordenes.length === 0 ? 'No se cargaron órdenes ese día.' : 'No hay órdenes que coincidan con la búsqueda.'}
          </div>
        ) : (
          <div className={`lims-tabla-contenedor${tarjetas ? ' lims-tabla-contenedor--tarjetas' : ''}`}>
            <table className="table align-middle mb-0 lims-tabla-perfiles">
              <thead>
                <tr>
                  <th scope="col">Orden</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Médico</th>
                  <th scope="col">Obra social</th>
                  <th scope="col">Estudios</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((orden) => {
                  const particulares = orden.orden_analisis.filter((estudio) => !estudio.cubierto).length;
                  return (
                    <tr key={orden.id}>
                      <td className="lims-celda-nombre">
                        <span>
                          <span className="lims-codigo">{orden.nro_orden}</span>
                          <span className="lims-celda-identidad">
                            Orden del {new Date(`${orden.fecha_orden}T00:00:00`).toLocaleDateString('es-AR')}
                          </span>
                        </span>
                      </td>
                      <td data-label="Paciente">
                        <span className="lims-celda-nombre-texto">
                          {orden.pacientes.apellido}, {orden.pacientes.nombre}
                        </span>
                        <span className="lims-celda-identidad">DNI {orden.pacientes.dni}</span>
                      </td>
                      <td data-label="Médico">
                        {orden.medicos.apellido}, {orden.medicos.nombre}
                        <span className="lims-celda-identidad">MP {orden.medicos.matricula}</span>
                      </td>
                      <td data-label="Obra social">{orden.obras_sociales?.nombre ?? 'Particular'}</td>
                      <td data-label="Estudios">
                        {orden.orden_analisis.length}
                        {orden.obra_social_id && particulares > 0 && (
                          <span className="lims-celda-identidad">
                            {particulares} particular{particulares === 1 ? '' : 'es'}
                          </span>
                        )}
                      </td>
                      <td data-label="Estado">
                        <span className={`lims-cuenta${orden.estado === 'anulada' ? ' lims-cuenta--inactiva' : ''}`}>
                          {ESTADOS_ORDEN[orden.estado]}
                        </span>
                        {orden.estado === 'anulada' && (
                          <span className="lims-celda-identidad" title={orden.motivo_anulacion}>
                            {orden.motivo_anulacion}
                          </span>
                        )}
                      </td>
                      <td className="text-end lims-celda-acciones">
                        {orden.estado === 'abierta' && (
                          <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                            <button
                              type="button"
                              className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                              aria-label={`Editar la orden ${orden.nro_orden}`}
                              onClick={() => setEditando(orden)}
                            >
                              <PencilSimple className="lims-icono me-1" aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                              aria-label={`Anular la orden ${orden.nro_orden}`}
                              onClick={() => anular(orden)}
                            >
                              <Prohibit className="lims-icono me-1" aria-hidden="true" />
                              Anular
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* La ventana solo existe mientras está abierta. key: cada orden arma su propio formulario */}
      {(creando !== undefined || editando) && (
        <ModalOrden
          key={editando?.id ?? 'nueva'}
          orden={editando}
          sucursal={sucursal}
          pacienteInicial={editando ? null : creando}
          onCerrar={cerrar}
          onGuardado={() => {
            cerrar();
            // Una orden nueva se ve en la lista de hoy
            if (!editando) setFecha(hoyTucuman());
            recargar();
          }}
        />
      )}
    </div>
  );
}

export default Ordenes;
