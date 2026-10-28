import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PencilSimple, Plus, Power } from '@phosphor-icons/react';
import ModalObraSocial from '../components/ModalObraSocial.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { guardarObraSocial, listarObrasSociales } from '../lib/obrasSociales.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';

// ABM de obras sociales, solo para administradores: alta, edición y activar/desactivar.
// No se borran: los pacientes y las órdenes viejas las siguen referenciando.
// Las inactivas dejan de aparecer en los desplegables de pacientes y órdenes (ver useObrasSociales).
function ObrasSociales() {
  useMetadatos({
    titulo: 'Obras sociales — LIMS Laboratorio',
    descripcion: 'Obras sociales con las que trabaja el laboratorio, solo para administradores.',
    ruta: '/panel/obras-sociales',
    indexar: false,
  });

  const { perfil } = useOutletContext();
  const [obras, setObras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  // intento: cambia para volver a pedir la lista (después de guardar o al tocar "Reintentar")
  const [intento, setIntento] = useState(0);
  // editando: la obra social abierta en la ventana · creando: true mientras está abierta la de obra social nueva
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  // id de la obra social que se está activando o desactivando, para deshabilitar su botón
  const [cambiandoEstado, setCambiandoEstado] = useState(null);
  const esAdmin = perfil.rol === 'admin';

  useEffect(() => {
    if (!esAdmin) return undefined;
    let vigente = true;
    (async () => {
      try {
        const datos = await listarObrasSociales();
        if (vigente) setObras(datos);
      } catch (errorPeticion) {
        console.error('No se pudieron cargar las obras sociales:', errorPeticion);
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

  function cerrar() {
    setEditando(null);
    setCreando(false);
  }

  // Activar o desactivar en lugar de borrar
  async function cambiarEstado(obra) {
    const desactivar = obra.activa;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: desactivar ? `¿Desactivar ${obra.nombre}?` : `¿Activar ${obra.nombre}?`,
      text: desactivar
        ? 'No se va a poder elegir al cargar pacientes ni órdenes. Los pacientes que ya la tienen la conservan.'
        : 'Vuelve a aparecer para elegirla al cargar pacientes y órdenes.',
      showCancelButton: true,
      confirmButtonText: desactivar ? 'Desactivar' : 'Activar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setCambiandoEstado(obra.id);
    try {
      const guardada = await guardarObraSocial({ activa: !desactivar }, obra.id);
      // Se actualiza solo esa fila: no hace falta volver a pedir toda la lista
      setObras((previas) => previas.map((item) => (item.id === guardada.id ? guardada : item)));
    } catch (errorPeticion) {
      console.error('No se pudo cambiar el estado de la obra social:', errorPeticion);
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

  const activas = obras.filter((obra) => obra.activa).length;

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Obras sociales</h1>
          <p className="lims-panel-texto mb-0">
            Las obras sociales activas son las que se pueden elegir al cargar pacientes y órdenes.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="obras-sociales-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="obras-sociales-titulo" className="lims-lista-titulo">
              Obras sociales del laboratorio
            </h2>
            {!cargando && !error && (
              <p className="lims-lista-resumen mb-0">
                {obras.length} {obras.length === 1 ? 'obra social' : 'obras sociales'} · {activas}{' '}
                {activas === 1 ? 'activa' : 'activas'}
              </p>
            )}
          </div>
          <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => setCreando(true)}>
            <Plus className="lims-icono me-2" aria-hidden="true" />
            Nueva obra social
          </button>
        </div>

        {cargando ? (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Cargando obras sociales…
          </div>
        ) : error ? (
          <div className="lims-lista-aviso" role="alert">
            <span>No se pudieron cargar las obras sociales.</span>
            <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : obras.length === 0 ? (
          <div className="lims-lista-aviso">Todavía no hay obras sociales cargadas.</div>
        ) : (
          <div className="lims-tabla-contenedor">
            <table className="table align-middle mb-0 lims-tabla-perfiles">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Código</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {obras.map((obra) => (
                  <tr key={obra.id}>
                    <td>
                      <span className="lims-celda-nombre-texto">{obra.nombre}</span>
                    </td>
                    <td>{obra.codigo ? <span className="lims-codigo">{obra.codigo}</span> : <span className="text-muted">—</span>}</td>
                    <td>
                      <span className={`lims-cuenta${obra.activa ? '' : ' lims-cuenta--inactiva'}`}>
                        {obra.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                          aria-label={`Editar ${obra.nombre}`}
                          onClick={() => setEditando(obra)}
                        >
                          <PencilSimple className="lims-icono me-1" aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                          aria-label={`${obra.activa ? 'Desactivar' : 'Activar'} ${obra.nombre}`}
                          disabled={cambiandoEstado === obra.id}
                          onClick={() => cambiarEstado(obra)}
                        >
                          <Power className="lims-icono me-1" aria-hidden="true" />
                          {obra.activa ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* La misma ventana sirve para crear (sin obra social) y para editar (con la elegida) */}
      {(creando || editando) && (
        <ModalObraSocial
          key={editando?.id ?? 'nueva'}
          obraSocial={editando}
          onCerrar={cerrar}
          onGuardado={() => {
            cerrar();
            recargar();
          }}
        />
      )}
    </div>
  );
}

export default ObrasSociales;
