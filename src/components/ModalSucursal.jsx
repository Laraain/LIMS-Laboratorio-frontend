import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { API_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';

// Mismas reglas que la base de datos (migración 20261023_01_sucursales.sql)
const FORMATO_PREFIJO = /^[A-Z0-9]{2,5}$/;
const BOXES_MINIMO = 1;
const BOXES_MAXIMO = 20;

// Ventana para agregar una sucursal o modificar una existente (solo admin).
// Props: sucursal (null para una nueva) · activas (cuántas sucursales activas hay, para no desactivar la última)
// onCerrar: cierra sin guardar · onGuardado: se llama después de guardar
function ModalSucursal({ sucursal, activas, onCerrar, onGuardado }) {
  const esNueva = !sucursal;
  const [nombre, setNombre] = useState(sucursal?.nombre ?? '');
  const [prefijo, setPrefijo] = useState(sucursal?.prefijo ?? '');
  const [localidad, setLocalidad] = useState(sucursal?.localidad ?? '');
  const [direccion, setDireccion] = useState(sucursal?.direccion ?? '');
  const [boxes, setBoxes] = useState(String(sucursal?.cantidad_boxes ?? 2));
  const [activa, setActiva] = useState(sucursal?.activa ?? true);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  // La última sucursal activa no se puede desactivar: nadie podría usar el panel
  const esUltimaActiva = !esNueva && sucursal.activa && activas <= 1;

  function limpiarError(campo) {
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    const datos = {
      nombre: nombre.trim(),
      prefijo: prefijo.trim().toUpperCase(),
      localidad: localidad.trim() || null,
      direccion: direccion.trim() || null,
      cantidad_boxes: Number(boxes),
      activa,
    };

    const nuevosErrores = {};
    if (datos.nombre === '') nuevosErrores.nombre = 'Ingrese el nombre de la sucursal.';
    if (!FORMATO_PREFIJO.test(datos.prefijo)) nuevosErrores.prefijo = 'De 2 a 5 letras mayúsculas o números.';
    if (!Number.isInteger(datos.cantidad_boxes) || datos.cantidad_boxes < BOXES_MINIMO || datos.cantidad_boxes > BOXES_MAXIMO) {
      nuevosErrores.boxes = `Un número entero de ${BOXES_MINIMO} a ${BOXES_MAXIMO}.`;
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    // Al editar, solo se envía lo que cambió
    const cambios = esNueva
      ? datos
      : Object.fromEntries(Object.entries(datos).filter(([campo, valor]) => valor !== (sucursal[campo] ?? null)));
    if (Object.keys(cambios).length === 0) {
      Swal.fire({ icon: 'info', title: 'No hay cambios', text: 'No modificó ningún dato.', confirmButtonColor: '#1c4e80' });
      return;
    }

    // El prefijo va en los números de orden: los ya emitidos no cambian, los nuevos usan el prefijo nuevo
    const avisos = [];
    if (!esNueva && 'prefijo' in cambios) {
      avisos.push(`Las órdenes nuevas van a empezar con ${datos.prefijo}; las ya cargadas conservan su número.`);
    }
    if (!esNueva && sucursal.activa && !activa) avisos.push('La sucursal no se va a poder elegir al entrar al panel.');

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: esNueva ? '¿Agregar la sucursal?' : '¿Guardar los cambios?',
      text: avisos.length > 0 ? avisos.join(' ') : `${datos.nombre} (${datos.prefijo})`,
      showCancelButton: true,
      confirmButtonText: esNueva ? 'Agregar' : 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      // "return=representation": la API devuelve la fila guardada. Sin permiso, responde sin filas.
      const headers = { ...(await encabezados()), Prefer: 'return=representation' };
      const respuesta = esNueva
        ? await axios.post(`${API_URL}/sucursales`, cambios, { headers })
        : await axios.patch(`${API_URL}/sucursales`, cambios, { headers, params: { id: `eq.${sucursal.id}` } });
      if (!Array.isArray(respuesta.data) || respuesta.data.length !== 1) {
        throw Object.assign(new Error('La API no devolvió la sucursal guardada'), {
          mensajeUsuario: 'No tiene permiso para modificar las sucursales.',
        });
      }
      await Swal.fire({
        icon: 'success',
        title: esNueva ? 'Sucursal agregada' : 'Cambios guardados',
        timer: 1600,
        showConfirmButton: false,
      });
      onGuardado();
    } catch (error) {
      console.error('No se pudo guardar la sucursal:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar la sucursal',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  const clase = (base, campo) => `${base}${errores[campo] ? ' is-invalid' : ''}`;

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          {esNueva ? 'Nueva sucursal' : 'Editar sucursal'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-sucursal" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-sm-8">
              <label htmlFor="sucursal-nombre" className="form-label fw-semibold small">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="sucursal-nombre"
                className={clase('form-control', 'nombre')}
                maxLength={60}
                placeholder="Ej: Centro"
                value={nombre}
                onChange={(evento) => {
                  setNombre(evento.target.value);
                  limpiarError('nombre');
                }}
              />
              {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
            </div>
            <div className="col-sm-4">
              <label htmlFor="sucursal-prefijo" className="form-label fw-semibold small">
                Prefijo <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="sucursal-prefijo"
                className={clase('form-control text-uppercase', 'prefijo')}
                maxLength={5}
                autoComplete="off"
                placeholder="Ej: CEN"
                aria-describedby="sucursal-prefijo-ayuda"
                value={prefijo}
                onChange={(evento) => {
                  setPrefijo(evento.target.value);
                  limpiarError('prefijo');
                }}
              />
              {errores.prefijo ? (
                <div className="invalid-feedback">{errores.prefijo}</div>
              ) : (
                <div className="form-text" id="sucursal-prefijo-ayuda">
                  Va en el número de orden.
                </div>
              )}
            </div>
            <div className="col-sm-6">
              <label htmlFor="sucursal-localidad" className="form-label fw-semibold small">
                Localidad
              </label>
              <input
                type="text"
                id="sucursal-localidad"
                className="form-control"
                maxLength={40}
                placeholder="Ej: San Miguel"
                aria-describedby="sucursal-localidad-ayuda"
                value={localidad}
                onChange={(evento) => setLocalidad(evento.target.value)}
              />
              <div className="form-text" id="sucursal-localidad-ayuda">
                Se muestra al lado del logo.
              </div>
            </div>
            <div className="col-sm-6">
              <label htmlFor="sucursal-direccion" className="form-label fw-semibold small">
                Dirección
              </label>
              <input
                type="text"
                id="sucursal-direccion"
                className="form-control"
                maxLength={120}
                value={direccion}
                onChange={(evento) => setDireccion(evento.target.value)}
              />
            </div>
            <div className="col-sm-6">
              <label htmlFor="sucursal-boxes" className="form-label fw-semibold small">
                Boxes de extracción <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                id="sucursal-boxes"
                className={clase('form-control', 'boxes')}
                min={BOXES_MINIMO}
                max={BOXES_MAXIMO}
                step={1}
                value={boxes}
                onChange={(evento) => {
                  setBoxes(evento.target.value);
                  limpiarError('boxes');
                }}
              />
              {errores.boxes && <div className="invalid-feedback">{errores.boxes}</div>}
            </div>
            {!esNueva && (
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    role="switch"
                    id="sucursal-activa"
                    className="form-check-input"
                    checked={activa}
                    disabled={esUltimaActiva}
                    onChange={(evento) => setActiva(evento.target.checked)}
                  />
                  <label htmlFor="sucursal-activa" className="form-check-label">
                    Sucursal activa
                  </label>
                </div>
                <div className="form-text">
                  {esUltimaActiva
                    ? 'Es la única sucursal activa: no se puede desactivar.'
                    : 'Una sucursal inactiva no se puede elegir al entrar al panel.'}
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" form="form-sucursal" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : esNueva ? 'Agregar sucursal' : 'Guardar cambios'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalSucursal;
