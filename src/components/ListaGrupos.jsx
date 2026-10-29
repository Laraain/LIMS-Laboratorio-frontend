import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { PencilSimple, Plus, Power } from '@phosphor-icons/react';
import { API_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import { cambiarEstadoGrupo, listarGrupos } from '../lib/grupos.js';
import ModalGrupo from './ModalGrupo.jsx';
import './ListaPerfiles.css';
import './ListaAnalisis.css';

// Cuántos estudios se nombran en la lista antes de resumir con "y N más"
const ESTUDIOS_VISIBLES = 4;

// Grupos de estudios del catálogo (ej: "Sangre completa"). Los ve todo el personal.
// Prop puedeEditar: true para el administrador, que crea, edita y activa o desactiva grupos.
// La base (políticas RLS) igual rechaza cualquier cambio que no venga de un administrador.
function ListaGrupos({ puedeEditar }) {
  const [grupos, setGrupos] = useState([]);
  // catalogo: estudios para elegir al armar un grupo (solo hace falta para el admin)
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  // editando: el grupo abierto en la ventana · creando: true mientras está abierta la de grupo nuevo
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const [datosGrupos, respuestaCatalogo] = await Promise.all([
          listarGrupos(),
          puedeEditar
            ? axios.get(`${API_URL}/analisis`, {
                headers: await encabezados(),
                params: { select: 'id,codigo,nombre,activo', padre_id: 'is.null', order: 'nombre.asc' },
              })
            : Promise.resolve({ data: [] }),
        ]);
        if (vigente) {
          setGrupos(datosGrupos);
          setCatalogo(respuestaCatalogo.data);
        }
      } catch (errorPeticion) {
        console.error('No se pudieron cargar los grupos:', errorPeticion);
        if (vigente) setError(true);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [intento, puedeEditar]);

  function recargar() {
    setCargando(true);
    setError(false);
    setIntento((valor) => valor + 1);
  }

  function cerrar() {
    setEditando(null);
    setCreando(false);
  }

  async function cambiarEstado(grupo) {
    const desactivar = grupo.activo;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: desactivar ? `¿Desactivar ${grupo.nombre}?` : `¿Activar ${grupo.nombre}?`,
      text: desactivar
        ? 'No se va a poder elegir al cargar órdenes. Las órdenes ya cargadas no cambian.'
        : 'Vuelve a aparecer para elegirlo al cargar órdenes.',
      showCancelButton: true,
      confirmButtonText: desactivar ? 'Desactivar' : 'Activar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setCambiandoEstado(grupo.id);
    try {
      const guardado = await cambiarEstadoGrupo(grupo.id, !desactivar);
      // Se actualiza solo esa fila: no hace falta volver a pedir toda la lista
      setGrupos((previos) => previos.map((item) => (item.id === guardado.id ? { ...item, activo: guardado.activo } : item)));
    } catch (errorPeticion) {
      console.error('No se pudo cambiar el estado del grupo:', errorPeticion);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos cambiar el estado',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setCambiandoEstado(null);
    }
  }

  const activos = grupos.filter((grupo) => grupo.activo).length;

  return (
    <section className="lims-lista" aria-labelledby="grupos-titulo">
      <div className="lims-lista-encabezado">
        <div>
          <h2 id="grupos-titulo" className="lims-lista-titulo">
            Grupos de estudios
          </h2>
          {!cargando && !error && (
            <p className="lims-lista-resumen mb-0">
              {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} · {activos} {activos === 1 ? 'activo' : 'activos'}.
              Al cargar una orden, elegir un grupo agrega todos sus estudios.
            </p>
          )}
        </div>
        {puedeEditar && (
          <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => setCreando(true)}>
            <Plus className="lims-icono me-2" aria-hidden="true" />
            Nuevo grupo
          </button>
        )}
      </div>

      {cargando ? (
        <div className="lims-lista-aviso" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Cargando grupos…
        </div>
      ) : error ? (
        <div className="lims-lista-aviso" role="alert">
          <span>No se pudieron cargar los grupos.</span>
          <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
            Reintentar
          </button>
        </div>
      ) : grupos.length === 0 ? (
        <div className="lims-lista-aviso">Todavía no hay grupos de estudios.</div>
      ) : (
        <div className="lims-tabla-contenedor">
          <table className="table align-middle mb-0 lims-tabla-perfiles">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col">Estudios</th>
                <th scope="col">Estado</th>
                {puedeEditar && (
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo) => {
                const restantes = grupo.estudios.length - ESTUDIOS_VISIBLES;
                return (
                  <tr key={grupo.id}>
                    <td className="lims-celda-nombre">
                      <span className="lims-codigo">{grupo.codigo}</span>
                      <span className="lims-celda-nombre-texto">{grupo.nombre}</span>
                    </td>
                    <td>
                      <span className="fw-semibold">{grupo.estudios.length}</span>
                      <span className="lims-celda-identidad">
                        {grupo.estudios
                          .slice(0, ESTUDIOS_VISIBLES)
                          .map((estudio) => estudio.nombre)
                          .join(', ')}
                        {restantes > 0 && ` y ${restantes} más`}
                      </span>
                    </td>
                    <td>
                      <span className={`lims-cuenta${grupo.activo ? '' : ' lims-cuenta--inactiva'}`}>
                        {grupo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {puedeEditar && (
                      <td className="text-end">
                        <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                            aria-label={`Editar ${grupo.nombre}`}
                            onClick={() => setEditando(grupo)}
                          >
                            <PencilSimple className="lims-icono me-1" aria-hidden="true" />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                            aria-label={`${grupo.activo ? 'Desactivar' : 'Activar'} ${grupo.nombre}`}
                            disabled={cambiandoEstado === grupo.id}
                            onClick={() => cambiarEstado(grupo)}
                          >
                            <Power className="lims-icono me-1" aria-hidden="true" />
                            {grupo.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* La misma ventana sirve para crear (sin grupo) y para editar (con el elegido) */}
      {(creando || editando) && (
        <ModalGrupo
          key={editando?.id ?? 'nuevo'}
          grupo={editando}
          catalogo={catalogo}
          onCerrar={cerrar}
          onGuardado={() => {
            cerrar();
            recargar();
          }}
        />
      )}
    </section>
  );
}

export default ListaGrupos;
