import { useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { guardarGrupo } from '../lib/grupos.js';
import './ModalOrden.css';

// Mismas reglas que la base de datos (migración 20261029_02_grupos_estudios.sql)
const FORMATO_CODIGO = /^[A-Z0-9_-]{2,20}$/;

// Ventana para crear un grupo de estudios o modificar uno existente (solo admin).
// El estado activo/inactivo no se cambia acá: tiene su propio botón en la lista.
// Props: grupo (null para uno nuevo) · catalogo (estudios del catálogo, para elegir) · onCerrar · onGuardado
function ModalGrupo({ grupo, catalogo, onCerrar, onGuardado }) {
  const esNuevo = !grupo;
  const [nombre, setNombre] = useState(grupo?.nombre ?? '');
  const [codigo, setCodigo] = useState(grupo?.codigo ?? '');
  // estudios: los del grupo en el orden en que se listan
  const [estudios, setEstudios] = useState(grupo?.estudios ?? []);
  const [busqueda, setBusqueda] = useState('');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  function limpiarError(campo) {
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  function agregar(analisis) {
    setEstudios((previos) => [...previos, analisis]);
    setBusqueda('');
    limpiarError('estudios');
  }

  function quitar(id) {
    setEstudios((previos) => previos.filter((estudio) => estudio.id !== id));
  }

  // Sube o baja un estudio una posición en la lista (paso: -1 o +1)
  function mover(indice, paso) {
    setEstudios((previos) => {
      const copia = [...previos];
      [copia[indice], copia[indice + paso]] = [copia[indice + paso], copia[indice]];
      return copia;
    });
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    const datos = { nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() };
    const nuevosErrores = {
      nombre: datos.nombre === '' ? 'Ingrese el nombre del grupo.' : undefined,
      codigo: !FORMATO_CODIGO.test(datos.codigo) ? 'De 2 a 20 letras mayúsculas, números, guion o guion bajo.' : undefined,
      estudios: estudios.length === 0 ? 'Agregue al menos un estudio.' : undefined,
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: esNuevo ? '¿Crear el grupo?' : '¿Guardar los cambios?',
      text: `${datos.nombre} (${datos.codigo}) · ${estudios.length} ${estudios.length === 1 ? 'estudio' : 'estudios'}`,
      showCancelButton: true,
      confirmButtonText: esNuevo ? 'Crear' : 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      await guardarGrupo({ id: grupo?.id ?? null, ...datos, analisisIds: estudios.map((estudio) => estudio.id) });
      await Swal.fire({
        icon: 'success',
        title: esNuevo ? 'Grupo creado' : 'Cambios guardados',
        timer: 1600,
        showConfirmButton: false,
      });
      onGuardado();
    } catch (error) {
      console.error('No se pudo guardar el grupo:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar el grupo',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  // Estudios activos del catálogo que coinciden con lo que se escribe (sin repetir los ya agregados)
  const texto = busqueda.trim().toLowerCase();
  const elegidos = new Set(estudios.map((estudio) => estudio.id));
  const sugerencias = texto
    ? catalogo
        .filter((analisis) => analisis.activo && !elegidos.has(analisis.id))
        .filter((analisis) => `${analisis.codigo} ${analisis.nombre}`.toLowerCase().includes(texto))
        .slice(0, 8)
    : [];

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          {esNuevo ? 'Nuevo grupo de estudios' : 'Editar grupo de estudios'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-grupo" onSubmit={handleSubmit} noValidate>
          <div className="row g-3 lims-orden-bloque">
            <div className="col-sm-8">
              <label htmlFor="grupo-nombre" className="form-label fw-semibold small">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="grupo-nombre"
                className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                maxLength={60}
                placeholder="Ej: Sangre completa"
                value={nombre}
                onChange={(evento) => {
                  setNombre(evento.target.value);
                  limpiarError('nombre');
                }}
              />
              {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
            </div>
            <div className="col-sm-4">
              <label htmlFor="grupo-codigo" className="form-label fw-semibold small">
                Código <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="grupo-codigo"
                className={`form-control text-uppercase ${errores.codigo ? 'is-invalid' : ''}`}
                maxLength={20}
                autoComplete="off"
                placeholder="Ej: SANGRE"
                value={codigo}
                onChange={(evento) => {
                  setCodigo(evento.target.value);
                  limpiarError('codigo');
                }}
              />
              {errores.codigo && <div className="invalid-feedback">{errores.codigo}</div>}
            </div>
          </div>

          <fieldset className="lims-orden-bloque">
            <legend className="lims-orden-subtitulo">
              Estudios del grupo <span className="text-danger">*</span>
            </legend>
            <label htmlFor="grupo-estudio" className="visually-hidden">
              Agregar estudio por nombre o código
            </label>
            <input
              type="search"
              id="grupo-estudio"
              className={`form-control ${errores.estudios ? 'is-invalid' : ''}`}
              placeholder="Agregar estudio por nombre o código"
              autoComplete="off"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              onKeyDown={(evento) => {
                // Enter agrega la primera sugerencia, sin enviar el formulario
                if (evento.key === 'Enter') {
                  evento.preventDefault();
                  if (sugerencias[0]) agregar(sugerencias[0]);
                }
              }}
            />
            {texto && (
              <ul className="lims-orden-sugerencias">
                {sugerencias.length === 0 && <li className="lims-orden-sugerencia-vacia">No hay estudios que coincidan.</li>}
                {sugerencias.map((analisis) => (
                  <li key={analisis.id}>
                    <button type="button" onClick={() => agregar(analisis)}>
                      <Plus className="lims-icono" aria-hidden="true" />
                      <span className="lims-codigo">{analisis.codigo}</span>
                      <span>{analisis.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errores.estudios && <div className="text-danger small mt-1">{errores.estudios}</div>}

            {estudios.length > 0 && (
              <ol className="lims-orden-estudios">
                {estudios.map((estudio, indice) => (
                  <li key={estudio.id}>
                    <span className="lims-codigo">{estudio.codigo}</span>
                    <span className="lims-orden-estudio-nombre">
                      {estudio.nombre}
                      {!estudio.activo && <span className="lims-celda-identidad">Desactivado en el catálogo</span>}
                    </span>
                    <button
                      type="button"
                      className="lims-orden-quitar"
                      aria-label={`Subir ${estudio.nombre}`}
                      disabled={indice === 0}
                      onClick={() => mover(indice, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="lims-orden-quitar"
                      aria-label={`Bajar ${estudio.nombre}`}
                      disabled={indice === estudios.length - 1}
                      onClick={() => mover(indice, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="lims-orden-quitar"
                      aria-label={`Quitar ${estudio.nombre}`}
                      onClick={() => quitar(estudio.id)}
                    >
                      <Trash aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </fieldset>
        </form>
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" form="form-grupo" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : esNuevo ? 'Crear grupo' : 'Guardar cambios'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalGrupo;
