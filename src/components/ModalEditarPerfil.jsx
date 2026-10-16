import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import ROLES from '../data/roles.js';
import { API_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import { ROLES_PERSONAL } from '../lib/auth.js';

// PATCH a una tabla: modifica la fila cuya columna sea igual al valor indicado.
// Si la política de seguridad no deja modificar esa fila, la API responde bien pero sin filas:
// se trata como error para no avisar un "guardado" que no ocurrió.
async function modificar(tabla, columna, valor, datos, headers) {
  const response = await axios.patch(`${API_URL}/${tabla}`, datos, {
    headers,
    params: { [columna]: `eq.${valor}` },
  });
  if (!Array.isArray(response.data) || response.data.length !== 1) {
    throw Object.assign(new Error(`No se pudo modificar la tabla ${tabla}`), {
      mensajeUsuario: 'No tiene permiso para modificar este perfil, o el perfil ya no existe.',
    });
  }
}

// Ventana para ver los datos de un perfil y, si se decide, modificarlos.
// Props: perfil (la fila que eligió el admin) · idActual (el id del admin que está logueado)
// onCerrar: cierra la ventana sin guardar · onGuardado: se llama después de guardar
function ModalEditarPerfil({ perfil, idActual, onCerrar, onGuardado }) {
  const esPersonal = perfil.rol !== 'paciente';
  // El admin no puede desactivar su propia cuenta ni cambiarse el rol: se quedaría sin acceso
  const esMiCuenta = perfil.id === idActual;

  // Estados (useState): cada campo del formulario arranca con el valor actual del perfil.
  // La ventana se crea de nuevo para cada perfil (ver key en ListaPerfiles), por eso alcanza con inicializarlos así.
  const [nombre, setNombre] = useState(perfil.nombre);
  const [apellido, setApellido] = useState(perfil.apellido);
  const [telefono, setTelefono] = useState(perfil.telefono ?? '');
  const [activo, setActivo] = useState(perfil.activo);
  const [rol, setRol] = useState(perfil.rol);
  const [cargo, setCargo] = useState(perfil.personal?.cargo ?? '');
  const [matricula, setMatricula] = useState(perfil.personal?.matricula ?? '');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(evento) {
    // Evita que el navegador recargue la página al enviar el formulario
    evento.preventDefault();

    // Validación: nombre y apellido obligatorios; el bioquímico necesita matrícula
    const nuevosErrores = {
      nombre: nombre.trim() === '',
      apellido: apellido.trim() === '',
      matricula: esPersonal && rol === 'bioquimico' && matricula.trim() === '',
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    // Solo se envía lo que cambió: se compara cada campo con el valor que tenía el perfil
    const nuevoPerfil = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim() || null,
      activo,
      ...(esPersonal && { rol }),
    };
    const cambiosPerfil = Object.fromEntries(
      Object.entries(nuevoPerfil).filter(([campo, valor]) => valor !== (perfil[campo] ?? null)),
    );
    const cambiosPersonal = {};
    if (esPersonal) {
      if ((cargo.trim() || null) !== (perfil.personal?.cargo ?? null)) cambiosPersonal.cargo = cargo.trim() || null;
      if ((matricula.trim() || null) !== (perfil.personal?.matricula ?? null)) {
        cambiosPersonal.matricula = matricula.trim() || null;
      }
    }
    // El paciente guarda su nombre y teléfono también en su ficha: se mantienen iguales
    const cambiosFicha = {};
    if (!esPersonal) {
      ['nombre', 'apellido', 'telefono'].forEach((campo) => {
        if (campo in cambiosPerfil) cambiosFicha[campo] = cambiosPerfil[campo];
      });
    }

    const hayPerfil = Object.keys(cambiosPerfil).length > 0;
    const hayPersonal = Object.keys(cambiosPersonal).length > 0;
    const hayFicha = Object.keys(cambiosFicha).length > 0;
    if (!hayPerfil && !hayPersonal && !hayFicha) {
      Swal.fire({ icon: 'info', title: 'No hay cambios', text: 'No modificó ningún dato.', confirmButtonColor: '#1c4e80' });
      return;
    }

    // SweetAlert2 pide confirmar antes de enviar nada a la base de datos
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Guardar los cambios?',
      text:
        perfil.activo && !activo
          ? 'La cuenta quedará inactiva: la persona no podrá iniciar sesión.'
          : `Se van a modificar los datos de ${perfil.apellido}, ${perfil.nombre}.`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    let seGuardoAlgo = false;
    try {
      // Cada PATCH va a una tabla distinta; "return=representation" hace que la API devuelva la fila modificada
      const headers = { ...(await encabezados()), Prefer: 'return=representation' };
      if (hayPerfil) {
        await modificar('perfiles', 'id', perfil.id, cambiosPerfil, headers);
        seGuardoAlgo = true;
      }
      if (hayPersonal) {
        await modificar('personal', 'perfil_id', perfil.id, cambiosPersonal, headers);
        seGuardoAlgo = true;
      }
      if (hayFicha) {
        await modificar('pacientes', 'perfil_id', perfil.id, cambiosFicha, headers);
        seGuardoAlgo = true;
      }
      await Swal.fire({
        icon: 'success',
        title: 'Cambios guardados',
        timer: 1600,
        showConfirmButton: false,
      });
      onGuardado();
    } catch (error) {
      console.error('No se pudo guardar el perfil:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar los cambios',
        text: seGuardoAlgo
          ? `${mensajeDeErrorApi(error)} Se guardaron solo algunos cambios: revise los datos.`
          : mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      // Si algo llegó a guardarse, se actualiza la lista para que muestre lo que quedó en la base
      if (seGuardoAlgo) onGuardado();
      else setGuardando(false);
    }
  }

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    // scrollable: en pantallas chicas solo se desplaza el formulario; el título y los botones quedan a la vista
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          Editar perfil
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-editar-perfil" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-sm-6">
              <label htmlFor="editar-nombre" className="form-label fw-semibold small">
                Nombre
              </label>
              <input
                type="text"
                id="editar-nombre"
                className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                maxLength={60}
                value={nombre}
                onChange={(evento) => {
                  setNombre(evento.target.value);
                  setErrores((previos) => ({ ...previos, nombre: false }));
                }}
              />
              {errores.nombre && <div className="invalid-feedback">Ingrese el nombre.</div>}
            </div>
            <div className="col-sm-6">
              <label htmlFor="editar-apellido" className="form-label fw-semibold small">
                Apellido
              </label>
              <input
                type="text"
                id="editar-apellido"
                className={`form-control ${errores.apellido ? 'is-invalid' : ''}`}
                maxLength={60}
                value={apellido}
                onChange={(evento) => {
                  setApellido(evento.target.value);
                  setErrores((previos) => ({ ...previos, apellido: false }));
                }}
              />
              {errores.apellido && <div className="invalid-feedback">Ingrese el apellido.</div>}
            </div>

            <div className="col-sm-6">
              <label htmlFor="editar-identidad" className="form-label fw-semibold small">
                {esPersonal ? 'Usuario' : 'DNI'}
              </label>
              {/* El DNI y el usuario forman el email con el que inicia sesión: solo se muestran, no se cambian */}
              <input
                type="text"
                id="editar-identidad"
                className="form-control"
                value={perfil.pacientes?.dni ?? perfil.personal?.usuario ?? ''}
                disabled
                aria-describedby="editar-identidad-ayuda"
              />
              <div className="form-text" id="editar-identidad-ayuda">
                No se puede cambiar: es con lo que inicia sesión.
              </div>
            </div>
            <div className="col-sm-6">
              <label htmlFor="editar-telefono" className="form-label fw-semibold small">
                Teléfono
              </label>
              <input
                type="tel"
                id="editar-telefono"
                className="form-control"
                maxLength={30}
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
              />
            </div>

            {esPersonal && (
              <>
                <div className="col-sm-6">
                  <label htmlFor="editar-rol" className="form-label fw-semibold small">
                    Rol
                  </label>
                  <select
                    id="editar-rol"
                    className="form-select"
                    value={rol}
                    disabled={esMiCuenta}
                    onChange={(evento) => {
                      setRol(evento.target.value);
                      setErrores((previos) => ({ ...previos, matricula: false }));
                    }}
                  >
                    {/* map(): una opción por cada rol del personal */}
                    {ROLES_PERSONAL.map((clave) => (
                      <option key={clave} value={clave}>
                        {ROLES[clave].nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-6">
                  <label htmlFor="editar-cargo" className="form-label fw-semibold small">
                    Cargo
                  </label>
                  <input
                    type="text"
                    id="editar-cargo"
                    className="form-control"
                    maxLength={60}
                    value={cargo}
                    onChange={(evento) => setCargo(evento.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="editar-matricula" className="form-label fw-semibold small">
                    Matrícula {rol === 'bioquimico' && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    id="editar-matricula"
                    className={`form-control ${errores.matricula ? 'is-invalid' : ''}`}
                    maxLength={30}
                    value={matricula}
                    onChange={(evento) => {
                      setMatricula(evento.target.value);
                      setErrores((previos) => ({ ...previos, matricula: false }));
                    }}
                  />
                  {errores.matricula && (
                    <div className="invalid-feedback">La matrícula es obligatoria para un bioquímico.</div>
                  )}
                </div>
              </>
            )}

            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  type="checkbox"
                  role="switch"
                  id="editar-activo"
                  className="form-check-input"
                  checked={activo}
                  disabled={esMiCuenta}
                  onChange={(evento) => setActivo(evento.target.checked)}
                />
                <label htmlFor="editar-activo" className="form-check-label">
                  Cuenta activa
                </label>
              </div>
              <div className="form-text">
                {esMiCuenta
                  ? 'Su propia cuenta no se puede desactivar ni cambiar de rol.'
                  : 'Una cuenta inactiva no puede iniciar sesión.'}
              </div>
            </div>
          </div>
        </form>
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          className="btn lims-btn-pill lims-btn-secundario"
          onClick={onCerrar}
          disabled={guardando}
        >
          Cancelar
        </button>
        {/* form="..." conecta este botón (fuera del <form>) con el formulario de arriba */}
        <button type="submit" form="form-editar-perfil" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalEditarPerfil;
