import { useState } from 'react';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import { mensajeDeErrorApi } from '../lib/api.js';
import { guardarObraSocial } from '../lib/obrasSociales.js';

const NOMBRE_MAXIMO = 60;
const CODIGO_MAXIMO = 20;

// Ventana para agregar una obra social o modificar una existente (solo admin).
// El estado activa/inactiva no se cambia acá: tiene su propio botón en la lista.
// Props: obraSocial (null para una nueva) · onCerrar: cierra sin guardar · onGuardado: se llama después de guardar
function ModalObraSocial({ obraSocial, onCerrar, onGuardado }) {
  const esNueva = !obraSocial;
  const [nombre, setNombre] = useState(obraSocial?.nombre ?? '');
  const [codigo, setCodigo] = useState(obraSocial?.codigo ?? '');
  const [errorNombre, setErrorNombre] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(evento) {
    evento.preventDefault();
    // El código es opcional: vacío se guarda como null, porque en la base es único y dos "" chocarían
    const datos = {
      nombre: nombre.trim(),
      codigo: codigo.trim().toUpperCase() || null,
    };

    if (datos.nombre === '') {
      setErrorNombre(true);
      return;
    }

    // Al editar, solo se envía lo que cambió
    const cambios = esNueva
      ? datos
      : Object.fromEntries(Object.entries(datos).filter(([campo, valor]) => valor !== (obraSocial[campo] ?? null)));
    if (Object.keys(cambios).length === 0) {
      Swal.fire({ icon: 'info', title: 'No hay cambios', text: 'No modificó ningún dato.', confirmButtonColor: '#1c4e80' });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: esNueva ? '¿Agregar la obra social?' : '¿Guardar los cambios?',
      text: datos.codigo ? `${datos.nombre} (${datos.codigo})` : datos.nombre,
      showCancelButton: true,
      confirmButtonText: esNueva ? 'Agregar' : 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      await guardarObraSocial(cambios, obraSocial?.id);
      await Swal.fire({
        icon: 'success',
        title: esNueva ? 'Obra social agregada' : 'Cambios guardados',
        timer: 1600,
        showConfirmButton: false,
      });
      onGuardado();
    } catch (error) {
      console.error('No se pudo guardar la obra social:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar la obra social',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          {esNueva ? 'Nueva obra social' : 'Editar obra social'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-obra-social" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-sm-8">
              <label htmlFor="obra-social-nombre" className="form-label fw-semibold small">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="obra-social-nombre"
                className={`form-control${errorNombre ? ' is-invalid' : ''}`}
                maxLength={NOMBRE_MAXIMO}
                placeholder="Ej: OSDE"
                value={nombre}
                onChange={(evento) => {
                  setNombre(evento.target.value);
                  setErrorNombre(false);
                }}
              />
              {errorNombre && <div className="invalid-feedback">Ingrese el nombre de la obra social.</div>}
            </div>
            <div className="col-sm-4">
              <label htmlFor="obra-social-codigo" className="form-label fw-semibold small">
                Código
              </label>
              <input
                type="text"
                id="obra-social-codigo"
                className="form-control text-uppercase"
                maxLength={CODIGO_MAXIMO}
                autoComplete="off"
                aria-describedby="obra-social-codigo-ayuda"
                value={codigo}
                onChange={(evento) => setCodigo(evento.target.value)}
              />
              <div className="form-text" id="obra-social-codigo-ayuda">
                Opcional.
              </div>
            </div>
          </div>
        </form>
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" form="form-obra-social" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : esNueva ? 'Agregar obra social' : 'Guardar cambios'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalObraSocial;
