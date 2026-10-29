import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { MagnifyingGlass, NotePencil, WarningCircle } from '@phosphor-icons/react';
import ModalResultados from '../components/ModalResultados.jsx';
import { ROLES_RESULTADOS } from '../data/roles.js';
import useMetadatos from '../hooks/useMetadatos.js';
import { hoyTucuman } from '../lib/hora.js';
import { useOrdenes } from '../lib/ordenes.js';
import { resultadoDe } from '../lib/resultados.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';

// En pantallas de menos de 1200px la tabla no entra: cada orden se muestra como tarjeta
function enTarjetas() {
  return window.matchMedia('(max-width: 1199.98px)').matches;
}

const FILTROS = [
  { clave: 'faltan', nombre: 'Con resultados por cargar' },
  { clave: 'todas', nombre: 'Todas' },
];

// Cuántos estudios de la orden tienen resultado y cuántos quedaron fuera de rango
function avance(orden) {
  const resultados = orden.orden_analisis.map(resultadoDe).filter(Boolean);
  return {
    total: orden.orden_analisis.length,
    cargados: resultados.length,
    fuera: resultados.filter((resultado) => resultado.fuera_de_rango).length,
  };
}

// Carga de resultados: después de las 10, recepción pasa al sistema los resultados que anotó el técnico.
// También la usa el bioquímico si hace falta. La validación del bioquímico es otra etapa (LIMS-14).
function Resultados() {
  useMetadatos({
    titulo: 'Resultados — LIMS Laboratorio',
    descripcion: 'Carga de resultados de las órdenes de la sucursal.',
    ruta: '/panel/resultados',
    indexar: false,
  });

  const { perfil, sucursal } = useOutletContext();
  const [fecha, setFecha] = useState(hoyTucuman);
  const [filtro, setFiltro] = useState('faltan');
  const [busqueda, setBusqueda] = useState('');
  const [tarjetas] = useState(enTarjetas);
  const [abierta, setAbierta] = useState(null);
  const { ordenes, cargando, error, recargar } = useOrdenes(sucursal.id, fecha);

  if (!ROLES_RESULTADOS.includes(perfil.rol)) return <Navigate to="/panel" replace />;

  // Las anuladas no llevan resultados
  const vigentes = ordenes.filter((orden) => orden.estado !== 'anulada');
  const conFaltantes = vigentes.filter((orden) => {
    const { total, cargados } = avance(orden);
    return cargados < total;
  });
  const texto = busqueda.trim().toLowerCase();
  const digitos = texto.replace(/[.\s]/g, '');
  const visibles = (filtro === 'faltan' ? conFaltantes : vigentes).filter((orden) => {
    if (!texto) return true;
    const paciente = orden.pacientes;
    return (
      orden.nro_orden.toLowerCase().includes(texto) ||
      `${paciente.apellido} ${paciente.nombre}`.toLowerCase().includes(texto) ||
      (digitos !== '' && paciente.dni.includes(digitos))
    );
  });
  const cantidad = (clave) => (clave === 'faltan' ? conFaltantes.length : vigentes.length);

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Resultados · {sucursal.nombre}</p>
          <h1 className="lims-panel-titulo">Carga de resultados</h1>
          <p className="lims-panel-texto mb-0">
            Pase al sistema los resultados de cada orden. El sistema marca los que quedan fuera del valor de referencia
            según el sexo y la edad del paciente; después los valida el bioquímico.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="resultados-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="resultados-titulo" className="lims-lista-titulo">
              {fecha === hoyTucuman() ? 'Órdenes de hoy' : `Órdenes del ${new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR')}`}
            </h2>
            {!cargando && !error && (
              <p className="lims-lista-resumen mb-0" aria-live="polite">
                {conFaltantes.length} de {vigentes.length} {vigentes.length === 1 ? 'orden' : 'órdenes'} con resultados por cargar
              </p>
            )}
          </div>
        </div>

        <div className="lims-lista-controles">
          <div className="lims-lista-filtro" role="group" aria-label="Filtrar órdenes">
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
            <label htmlFor="resultados-fecha" className="visually-hidden">
              Día de recepción de la orden
            </label>
            <input
              type="date"
              id="resultados-fecha"
              className="form-control w-auto"
              max={hoyTucuman()}
              value={fecha}
              onChange={(evento) => evento.target.value && setFecha(evento.target.value)}
            />
            <div className="lims-lista-busqueda">
              <MagnifyingGlass className="lims-icono" aria-hidden="true" />
              <label htmlFor="buscar-resultado" className="visually-hidden">
                Buscar por número, DNI o paciente
              </label>
              <input
                type="search"
                id="buscar-resultado"
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
            {vigentes.length === 0
              ? 'No hay órdenes recibidas ese día.'
              : filtro === 'faltan' && !texto
                ? 'Todas las órdenes de ese día tienen sus resultados cargados.'
                : 'No hay órdenes que coincidan con la búsqueda.'}
          </div>
        ) : (
          <div className={`lims-tabla-contenedor${tarjetas ? ' lims-tabla-contenedor--tarjetas' : ''}`}>
            <table className="table align-middle mb-0 lims-tabla-perfiles">
              <thead>
                <tr>
                  <th scope="col">Orden</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Resultados</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((orden) => {
                  const { total, cargados, fuera } = avance(orden);
                  return (
                    <tr key={orden.id}>
                      <td className="lims-celda-nombre">
                        <span>
                          <span className="lims-codigo">{orden.nro_orden}</span>
                          <span className="lims-celda-identidad">
                            {total} {total === 1 ? 'estudio' : 'estudios'}
                          </span>
                        </span>
                      </td>
                      <td data-label="Paciente">
                        <span className="lims-celda-nombre-texto">
                          {orden.pacientes.apellido}, {orden.pacientes.nombre}
                        </span>
                        <span className="lims-celda-identidad">DNI {orden.pacientes.dni}</span>
                      </td>
                      <td data-label="Resultados">
                        <span className="fw-semibold">
                          {cargados} de {total}
                        </span>
                        {fuera > 0 && (
                          <span className="lims-celda-identidad text-warning-emphasis">
                            <WarningCircle className="me-1" aria-hidden="true" />
                            {fuera} fuera de rango
                          </span>
                        )}
                      </td>
                      <td className="text-end lims-celda-acciones">
                        <button
                          type="button"
                          className="btn lims-btn-pill lims-btn-primario lims-btn-chico"
                          aria-label={`Cargar resultados de la orden ${orden.nro_orden}`}
                          onClick={() => setAbierta(orden.id)}
                        >
                          <NotePencil className="lims-icono me-1" aria-hidden="true" />
                          {cargados === 0 ? 'Cargar' : 'Ver y corregir'}
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
          onCerrar={() => setAbierta(null)}
          onGuardado={() => {
            setAbierta(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

export default Resultados;
