import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { PencilSimple } from '@phosphor-icons/react';
import ModalValorUb from '../components/ModalValorUb.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { formatearPesos, listarValoresUb, valoresDe, vigenteEn } from '../lib/aranceles.js';
import { hoyTucuman } from '../lib/hora.js';
import { listarObrasSociales } from '../lib/obrasSociales.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';

// "2026-10-01" → "01/10/2026"
function fechaCorta(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR');
}

// Aranceles, solo para administradores: el valor de la unidad bioquímica (UB) del particular y de cada
// obra social, con su coseguro y desde cuándo rige. Las UB de cada estudio se cargan en el catálogo.
// El precio de un estudio es sus UB por el valor de la UB; la base lo calcula al cargar la orden.
function Aranceles() {
  useMetadatos({
    titulo: 'Aranceles — LIMS Laboratorio',
    descripcion: 'Valor de la unidad bioquímica por obra social, solo para administradores.',
    ruta: '/panel/aranceles',
    indexar: false,
  });

  const { perfil } = useOutletContext();
  const [obras, setObras] = useState([]);
  const [valores, setValores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  // editando: { id, nombre } de la obra social (id null = particular) abierta en la ventana
  const [editando, setEditando] = useState(null);
  const esAdmin = perfil.rol === 'admin';

  useEffect(() => {
    if (!esAdmin) return undefined;
    let vigente = true;
    (async () => {
      try {
        const [listaObras, listaValores] = await Promise.all([listarObrasSociales(), listarValoresUb()]);
        if (!vigente) return;
        setObras(listaObras);
        setValores(listaValores);
      } catch (errorPeticion) {
        console.error('No se pudieron cargar los aranceles:', errorPeticion);
        if (vigente) setError(true);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [esAdmin, intento]);

  if (!esAdmin) return <Navigate to="/panel" replace />;

  function recargar() {
    setCargando(true);
    setError(false);
    setIntento((valor) => valor + 1);
  }

  const hoy = hoyTucuman();
  // Primero el particular, después las obras sociales (las inactivas al final)
  const filas = [
    { id: null, nombre: 'Particular', activa: true },
    ...[...obras].sort((a, b) => Number(b.activa) - Number(a.activa)),
  ].map((entidad) => {
    const historial = valoresDe(valores, entidad.id);
    // Un valor cargado con fecha futura: todavía no rige
    const proximo = [...historial].reverse().find((valor) => valor.vigente_desde > hoy) ?? null;
    return { entidad, historial, actual: vigenteEn(historial, hoy), proximo };
  });
  const sinValor = filas.filter((fila) => fila.entidad.activa && !fila.actual).length;

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Aranceles</h1>
          <p className="lims-panel-texto mb-0">
            El precio de cada estudio es sus unidades bioquímicas (UB, en el catálogo de análisis) por el valor de la UB
            de la obra social. Con obra social, el paciente paga el coseguro. Las órdenes ya cargadas conservan su precio.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="aranceles-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="aranceles-titulo" className="lims-lista-titulo">
              Valor de la UB
            </h2>
            {!cargando && !error && (
              <p className="lims-lista-resumen mb-0">
                {sinValor > 0
                  ? `${sinValor} sin valor cargado: sus estudios quedan sin precio`
                  : 'Todas las obras sociales activas tienen su valor cargado'}
              </p>
            )}
          </div>
        </div>

        {cargando ? (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Cargando aranceles…
          </div>
        ) : error ? (
          <div className="lims-lista-aviso" role="alert">
            <span>No se pudieron cargar los aranceles.</span>
            <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : (
          <div className="lims-tabla-contenedor">
            <table className="table align-middle mb-0 lims-tabla-perfiles">
              <thead>
                <tr>
                  <th scope="col">Obra social</th>
                  <th scope="col">Valor de la UB</th>
                  <th scope="col">Coseguro</th>
                  <th scope="col">Rige desde</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ entidad, historial, actual, proximo }) => (
                  <tr key={entidad.id ?? 'particular'}>
                    <td>
                      <span className="lims-celda-nombre-texto">{entidad.nombre}</span>
                      {!entidad.activa && <span className="lims-celda-identidad">Inactiva</span>}
                      {actual?.observaciones && <span className="lims-celda-identidad">{actual.observaciones}</span>}
                    </td>
                    <td data-label="Valor de la UB" className="lims-celda-numero">
                      {actual ? formatearPesos(actual.valor_ub) : <span className="text-warning-emphasis">Sin cargar</span>}
                      {proximo && (
                        <span className="lims-celda-identidad">
                          {formatearPesos(proximo.valor_ub)} desde el {fechaCorta(proximo.vigente_desde)}
                        </span>
                      )}
                    </td>
                    <td data-label="Coseguro" className="lims-celda-numero">
                      {entidad.id === null ? 'Paga todo' : actual ? `${Number(actual.coseguro_pct)}%` : '—'}
                    </td>
                    <td data-label="Rige desde">{actual ? fechaCorta(actual.vigente_desde) : '—'}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                        aria-label={`Actualizar el valor de ${entidad.nombre}`}
                        onClick={() => setEditando({ entidad, historial })}
                      >
                        <PencilSimple className="lims-icono me-1" aria-hidden="true" />
                        Actualizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <ModalValorUb
          key={editando.entidad.id ?? 'particular'}
          entidad={editando.entidad}
          valores={editando.historial}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}

export default Aranceles;
