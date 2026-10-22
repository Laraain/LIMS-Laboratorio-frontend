import { useEffect, useState } from 'react';
import axios from 'axios';
import { MagnifyingGlass, PencilSimple, Plus } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import { API_URL, encabezados } from '../lib/api.js';
import { textoReferencia } from '../lib/analisis.js';
import ModalAnalisis from './ModalAnalisis.jsx';
import './ListaPerfiles.css';
import './ListaAnalisis.css';

// Vista con la que arranca la lista: en pantallas de menos de 1200px la tabla no entra, así que se usan tarjetas
function vistaInicial() {
  return window.matchMedia('(max-width: 1199.98px)').matches ? 'tarjetas' : 'lista';
}

// Tabla con todos los análisis del catálogo. Pide a la API los análisis y los tipos de muestra al aparecer.
// Prop puedeEditar: true para el administrador, que ve los botones para crear y editar.
// La base (políticas RLS) igual rechaza cualquier cambio que no venga de un administrador.
function ListaAnalisis({ puedeEditar }) {
  // analisis: la lista que devolvió la API · tipos: los tipos de muestra (para el filtro y el formulario)
  const [analisis, setAnalisis] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  // filtroTipo: id del tipo de muestra elegido ("todos" muestra todos) · busqueda: texto del buscador
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  // verInactivos: los análisis dados de baja se esconden salvo que se pida verlos
  const [verInactivos, setVerInactivos] = useState(false);
  const [vista] = useState(vistaInicial);
  // editando: el análisis abierto en la ventana · creando: true mientras está abierta la ventana de análisis nuevo
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    let vigente = true;

    async function cargarCatalogo() {
      try {
        if (!API_URL) throw new Error('Falta VITE_API_URL en el archivo .env');
        const headers = await encabezados();

        // Promise.all: las dos peticiones salen juntas y se espera a que lleguen ambas
        // tipos_muestra(nombre,tubo) trae el tipo de muestra de cada análisis desde su tabla relacionada
        const [respuestaAnalisis, respuestaTipos] = await Promise.all([
          axios.get(`${API_URL}/analisis`, {
            headers,
            params: {
              select: 'id,codigo,nombre,tipo_muestra_id,unidad,valor_ref_min,valor_ref_max,valor_ref_texto,dias_demora,activo,tipos_muestra(nombre,tubo)',
              order: 'nombre.asc',
            },
          }),
          axios.get(`${API_URL}/tipos_muestra`, {
            headers,
            params: { select: 'id,nombre,tubo', order: 'nombre.asc' },
          }),
        ]);

        if (vigente) {
          setAnalisis(respuestaAnalisis.data);
          setTipos(respuestaTipos.data);
        }
      } catch (errorPeticion) {
        if (!vigente) return;
        console.error('No se pudo cargar el catálogo de análisis:', errorPeticion);
        setError(true);
        Swal.fire({
          icon: 'error',
          title: 'No pudimos cargar el catálogo',
          text: 'Verifique su conexión e intente nuevamente.',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#1c4e80',
        });
      } finally {
        if (vigente) setCargando(false);
      }
    }

    cargarCatalogo();
    return () => {
      vigente = false;
    };
  }, [intento]);

  // Vuelve a pedir los datos: se usa en "Reintentar" y después de crear o editar un análisis
  function recargar() {
    setCargando(true);
    setError(false);
    setIntento((valor) => valor + 1);
  }

  if (cargando) {
    return (
      <div className="lims-lista-aviso" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Cargando análisis…
      </div>
    );
  }

  if (error) {
    return (
      <div className="lims-lista-aviso" role="alert">
        <span>No se pudo cargar el catálogo de análisis.</span>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
          Reintentar
        </button>
      </div>
    );
  }

  // Primero se separan activos e inactivos; los contadores del filtro cuentan solo lo que se puede ver
  const disponibles = verInactivos ? analisis : analisis.filter((item) => item.activo);
  const cantidadInactivos = analisis.length - analisis.filter((item) => item.activo).length;

  const cantidadPorTipo = disponibles.reduce((cuenta, item) => {
    cuenta[item.tipo_muestra_id] = (cuenta[item.tipo_muestra_id] ?? 0) + 1;
    return cuenta;
  }, {});

  // Filtro por tipo de muestra y búsqueda por código o nombre, sobre la lista que ya llegó
  const texto = busqueda.trim().toLowerCase();
  const visibles = disponibles.filter((item) => {
    if (filtroTipo !== 'todos' && item.tipo_muestra_id !== filtroTipo) return false;
    if (!texto) return true;
    return `${item.codigo} ${item.nombre}`.toLowerCase().includes(texto);
  });

  // Botones del filtro: "Todos" más un botón por cada tipo de muestra que tenga al menos un análisis
  const opcionesFiltro = [
    { clave: 'todos', nombre: 'Todos', cantidad: disponibles.length },
    ...tipos
      .filter((tipo) => cantidadPorTipo[tipo.id])
      .map((tipo) => ({ clave: tipo.id, nombre: tipo.nombre, cantidad: cantidadPorTipo[tipo.id] })),
  ];

  return (
    <section className="lims-lista" aria-labelledby="analisis-titulo">
      <div className="lims-lista-encabezado">
        <div>
          <h2 id="analisis-titulo" className="lims-lista-titulo">
            Análisis del laboratorio
          </h2>
          <p className="lims-lista-resumen mb-0" aria-live="polite">
            Mostrando {visibles.length} de {disponibles.length} análisis
          </p>
        </div>
        {puedeEditar && (
          <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => setCreando(true)}>
            <Plus className="lims-icono me-2" aria-hidden="true" />
            Nuevo análisis
          </button>
        )}
      </div>

      <div className="lims-lista-controles">
        <div className="lims-lista-filtro" role="group" aria-label="Filtrar por tipo de muestra">
          {opcionesFiltro.map((opcion) => (
            <button
              key={opcion.clave}
              type="button"
              className="lims-filtro-boton"
              aria-pressed={filtroTipo === opcion.clave}
              onClick={() => setFiltroTipo(opcion.clave)}
            >
              {opcion.nombre}
              <span className="lims-filtro-cantidad">{opcion.cantidad}</span>
            </button>
          ))}
        </div>
        <div className="lims-lista-herramientas">
          {/* El interruptor solo aparece si hay análisis dados de baja */}
          {cantidadInactivos > 0 && (
            <div className="form-check form-switch mb-0">
              <input
                type="checkbox"
                role="switch"
                id="ver-inactivos"
                className="form-check-input"
                checked={verInactivos}
                onChange={(evento) => {
                  setVerInactivos(evento.target.checked);
                  setFiltroTipo('todos');
                }}
              />
              <label htmlFor="ver-inactivos" className="form-check-label">
                Ver dados de baja ({cantidadInactivos})
              </label>
            </div>
          )}
          <div className="lims-lista-busqueda">
            <MagnifyingGlass className="lims-icono" aria-hidden="true" />
            <label htmlFor="buscar-analisis" className="visually-hidden">
              Buscar por código o nombre
            </label>
            <input
              type="search"
              id="buscar-analisis"
              placeholder="Buscar por código o nombre"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="lims-lista-aviso">
          {analisis.length === 0 ? 'Todavía no hay análisis cargados.' : 'No hay análisis que coincidan con la búsqueda.'}
        </div>
      ) : (
        <div className={`lims-tabla-contenedor${vista === 'tarjetas' ? ' lims-tabla-contenedor--tarjetas' : ''}`}>
          {/* Usa los estilos de la tabla de perfiles: en la vista de tarjetas cada fila es una tarjeta (data-label es el título de cada dato) */}
          <table className="table align-middle mb-0 lims-tabla-perfiles">
            <thead>
              <tr>
                <th scope="col">Análisis</th>
                <th scope="col">Muestra</th>
                <th scope="col">Valor de referencia</th>
                <th scope="col">Unidad</th>
                <th scope="col">Demora</th>
                <th scope="col">Estado</th>
                {puedeEditar && (
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibles.map((item) => (
                <tr key={item.id}>
                  <td className="lims-celda-nombre">
                    <span className="lims-codigo">{item.codigo}</span>
                    <span className="lims-celda-nombre-texto">{item.nombre}</span>
                  </td>
                  <td data-label="Muestra">
                    {/* Un solo bloque: en la vista de tarjetas la celda reparte sus hijos a los costados */}
                    <span>
                      <span className="d-block">{item.tipos_muestra?.nombre ?? '—'}</span>
                      {item.tipos_muestra?.tubo && (
                        <span className="lims-celda-identidad">{item.tipos_muestra.tubo}</span>
                      )}
                    </span>
                  </td>
                  <td data-label="Valor de referencia" className="lims-celda-numero">
                    {textoReferencia(item)}
                  </td>
                  <td data-label="Unidad">{item.unidad ?? '—'}</td>
                  <td data-label="Demora" className="lims-celda-numero">
                    {item.dias_demora === null
                      ? '—'
                      : item.dias_demora === 0
                        ? 'En el día'
                        : `${item.dias_demora} ${item.dias_demora === 1 ? 'día' : 'días'}`}
                  </td>
                  <td data-label="Estado">
                    <span className={`lims-cuenta${item.activo ? '' : ' lims-cuenta--inactiva'}`}>
                      {item.activo ? 'Activo' : 'Dado de baja'}
                    </span>
                  </td>
                  {puedeEditar && (
                    <td className="text-end lims-celda-acciones">
                      <button
                        type="button"
                        className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                        aria-label={`Editar ${item.nombre}`}
                        onClick={() => setEditando(item)}
                      >
                        <PencilSimple className="lims-icono me-1" aria-hidden="true" />
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* La misma ventana sirve para crear (sin analisis) y para editar (con el análisis elegido) */}
      {(creando || editando) && (
        <ModalAnalisis
          key={editando?.id ?? 'nuevo'}
          analisis={editando}
          tipos={tipos}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={() => {
            setCreando(false);
            setEditando(null);
            recargar();
          }}
        />
      )}
    </section>
  );
}

export default ListaAnalisis;
