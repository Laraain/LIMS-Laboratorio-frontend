import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { ArrowClockwise, ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import ModalResultados from '../components/ModalResultados.jsx';
import { ROLES_BANDEJA, ROLES_RESULTADOS } from '../data/roles.js';
import useMetadatos from '../hooks/useMetadatos.js';
import { diaDe, fechaDe, horaDe, hoyTucuman } from '../lib/hora.js';
import { ESTADOS_ORDEN, avanceDeOrden, useOrdenesPendientes } from '../lib/ordenes.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';
import './PanelTecnico.css';

// En pantallas de menos de 1200px la tabla no entra: cada orden se muestra como tarjeta
function enTarjetas() {
  return window.matchMedia('(max-width: 1199.98px)').matches;
}

const FILTROS = [
  { clave: 'todas', nombre: 'Todas' },
  { clave: 'abierta', nombre: 'Abiertas' },
  { clave: 'en_proceso', nombre: 'En proceso' },
];

// Fecha de la orden, que viene como "AAAA-MM-DD" (sin hora): "28/10/2026"
function fechaCorta(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR');
}

// Cuánto hace que la orden espera, en días: "Hoy", "Ayer" o "Hace 3 días"
function esperaDe(fechaIso) {
  const dias = Math.round(
    (new Date(`${hoyTucuman()}T00:00:00`) - new Date(`${diaDe(fechaIso)}T00:00:00`)) / 86400000,
  );
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
}

// Bandeja de trabajo del bioquímico y del técnico: las órdenes de su sucursal que todavía tienen
// análisis por procesar, de la más vieja a la más nueva. Al tocar una orden se abren sus resultados ahí mismo:
// el bioquímico los carga y valida; el técnico solo los mira.
function PanelTecnico() {
  useMetadatos({
    titulo: 'Bandeja de trabajo — LIMS Laboratorio',
    descripcion: 'Órdenes pendientes de la sucursal para el bioquímico y el técnico.',
    ruta: '/panel',
    indexar: false,
  });

  const { perfil, sucursal } = useOutletContext();
  const [filtro, setFiltro] = useState('todas');
  // Sin fecha se ven todas las pendientes; con fecha, solo las recibidas ese día
  const [fecha, setFecha] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tarjetas] = useState(enTarjetas);
  // Orden cuyos resultados están abiertos en la ventana
  const [abierta, setAbierta] = useState(null);
  const { ordenes, cargando, error, recargar } = useOrdenesPendientes();

  if (!ROLES_BANDEJA.includes(perfil.rol)) return <Navigate to="/panel" replace />;

  function abrir(orden) {
    setAbierta(orden.id);
  }

  // Filtros sobre la lista que ya llegó: estado, día de recepción y búsqueda por número, DNI o paciente
  const texto = busqueda.trim().toLowerCase();
  const digitos = texto.replace(/[.\s]/g, '');
  const visibles = ordenes
    .filter((orden) => filtro === 'todas' || orden.estado === filtro)
    .filter((orden) => !fecha || diaDe(orden.fecha_recepcion) === fecha)
    .filter((orden) => {
      if (!texto) return true;
      const paciente = orden.pacientes;
      return (
        orden.nro_orden.toLowerCase().includes(texto) ||
        `${paciente.apellido} ${paciente.nombre}`.toLowerCase().includes(texto) ||
        (digitos !== '' && paciente.dni.includes(digitos))
      );
    })
    // La base ya las manda ordenadas; se vuelve a ordenar por las dudas de los filtros del navegador
    .sort((a, b) => new Date(a.fecha_recepcion) - new Date(b.fecha_recepcion));
  const cantidad = (clave) =>
    clave === 'todas' ? ordenes.length : ordenes.filter((orden) => orden.estado === clave).length;
  // Análisis que todavía no tienen resultado en las órdenes que se están mostrando
  const sinResultado = visibles.reduce((suma, orden) => {
    const { total, conResultado } = avanceDeOrden(orden);
    return suma + (total - conResultado);
  }, 0);

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Trabajo pendiente · {sucursal.nombre}</p>
          <h1 className="lims-panel-titulo">Bandeja de trabajo</h1>
          <p className="lims-panel-texto mb-0">
            Órdenes de su sucursal con análisis por procesar. Primero las que hace más tiempo que esperan.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="bandeja-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="bandeja-titulo" className="lims-lista-titulo">
              Órdenes pendientes
            </h2>
            {!cargando && !error && (
              <p className="lims-lista-resumen mb-0" aria-live="polite">
                Mostrando {visibles.length} de {ordenes.length}{' '}
                {ordenes.length === 1 ? 'orden pendiente' : 'órdenes pendientes'}
                {sinResultado > 0 && ` · ${sinResultado} análisis sin resultado`}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn lims-btn-pill lims-btn-secundario"
            onClick={recargar}
            disabled={cargando}
          >
            <ArrowClockwise className="lims-icono me-2" aria-hidden="true" />
            Actualizar
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
            <label htmlFor="bandeja-fecha" className="visually-hidden">
              Día de recepción
            </label>
            <input
              type="date"
              id="bandeja-fecha"
              className="form-control w-auto"
              max={hoyTucuman()}
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
            {fecha && (
              <button
                type="button"
                className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                onClick={() => setFecha('')}
              >
                Ver todas
              </button>
            )}
            <div className="lims-lista-busqueda">
              <MagnifyingGlass className="lims-icono" aria-hidden="true" />
              <label htmlFor="buscar-bandeja" className="visually-hidden">
                Buscar por número, DNI o paciente
              </label>
              <input
                type="search"
                id="buscar-bandeja"
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
            Cargando órdenes pendientes…
          </div>
        ) : error ? (
          <div className="lims-lista-aviso" role="alert">
            <span>No se pudieron cargar las órdenes pendientes.</span>
            <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <div className="lims-lista-aviso">
            {ordenes.length === 0
              ? 'No hay órdenes con análisis pendientes en su sucursal.'
              : 'No hay órdenes que coincidan con los filtros.'}
          </div>
        ) : (
          <div className={`lims-tabla-contenedor${tarjetas ? ' lims-tabla-contenedor--tarjetas' : ''}`}>
            <table className="table align-middle mb-0 lims-tabla-perfiles">
              <thead>
                <tr>
                  <th scope="col">Orden</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Recibida</th>
                  <th scope="col">Análisis</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((orden) => {
                  const { total, conResultado } = avanceDeOrden(orden);
                  const porcentaje = total === 0 ? 0 : Math.round((conResultado / total) * 100);
                  return (
                    <tr key={orden.id} className="lims-fila-clicable" onClick={() => abrir(orden)}>
                      <td className="lims-celda-nombre">
                        <span>
                          <span className="lims-codigo">{orden.nro_orden}</span>
                          <span className="lims-celda-identidad">Orden del {fechaCorta(orden.fecha_orden)}</span>
                        </span>
                      </td>
                      <td data-label="Paciente">
                        <span className="lims-celda-nombre-texto">
                          {orden.pacientes.apellido}, {orden.pacientes.nombre}
                        </span>
                        <span className="lims-celda-identidad">DNI {orden.pacientes.dni}</span>
                      </td>
                      <td data-label="Recibida">
                        {fechaDe(orden.fecha_recepcion)}
                        <span className="lims-celda-identidad">
                          {horaDe(orden.fecha_recepcion)} hs · {esperaDe(orden.fecha_recepcion)}
                        </span>
                      </td>
                      <td data-label="Análisis">
                        <span className="lims-avance">
                          <span className="lims-avance-texto">
                            {conResultado} de {total} con resultado
                          </span>
                          <span className="lims-avance-barra" aria-hidden="true">
                            <span style={{ width: `${porcentaje}%` }} />
                          </span>
                        </span>
                      </td>
                      <td data-label="Estado">
                        <span className={`lims-estado-orden lims-estado-orden--${orden.estado}`}>
                          {ESTADOS_ORDEN[orden.estado]}
                        </span>
                      </td>
                      <td className="text-end lims-celda-acciones">
                        <button
                          type="button"
                          className="btn lims-btn-pill lims-btn-primario lims-btn-chico"
                          aria-label={`Abrir la orden ${orden.nro_orden}`}
                          onClick={(evento) => {
                            // La fila entera también abre la orden: el botón no repite la navegación
                            evento.stopPropagation();
                            abrir(orden);
                          }}
                        >
                          <ArrowRight className="lims-icono me-1" aria-hidden="true" />
                          Abrir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {abierta && (
        <ModalResultados
          key={abierta}
          ordenId={abierta}
          perfil={perfil}
          lectura={!ROLES_RESULTADOS.includes(perfil.rol)}
          onCerrar={() => setAbierta(null)}
          onGuardado={() => {
            // Al guardar o validar, la orden puede cambiar de estado o salir de la bandeja
            setAbierta(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

export default PanelTecnico;
