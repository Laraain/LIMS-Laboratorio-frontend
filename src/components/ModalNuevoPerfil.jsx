import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Modal from 'react-bootstrap/Modal';
import ROLES from '../data/roles.js';
import { FUNCIONES_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import { ROLES_PERSONAL } from '../lib/auth.js';
import { datosObraSocial, erroresObraSocial } from '../lib/obrasSociales.js';
import CamposObraSocial from './CamposObraSocial.jsx';

// Valores con los que arranca el formulario (los dos tipos de perfil comparten estos campos)
const DATOS_INICIALES = {
  nombre: '',
  apellido: '',
  telefono: '',
  dni: '',
  fechaNacimiento: '',
  sexo: '',
  obraSocial: '',
  nroAfiliado: '',
  usuario: '',
  rol: 'tecnico',
  cargo: '',
  matricula: '',
};

// Escapa los caracteres especiales antes de armar el HTML de la ventana de SweetAlert2
function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Ventana para crear un perfil nuevo, de paciente o de personal.
// La cuenta de acceso solo se puede crear desde el servidor (necesita la clave secreta de Supabase), por eso
// el formulario llama a una función de servidor: crear-paciente o crear-personal.
// Props: onCerrar: cierra la ventana · onCreado: se llama después de crear el perfil
function ModalNuevoPerfil({ onCerrar, onCreado }) {
  // tipo: "paciente" o "personal" · datos: todos los campos del formulario · errores: campos mal cargados
  // guardando: true mientras se espera la respuesta del servidor
  const [tipo, setTipo] = useState('paciente');
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Devuelve una función que actualiza un solo campo de datos (y le quita el error marcado)
  function cambiar(campo) {
    return (evento) => {
      setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));
      setErrores((previos) => ({ ...previos, [campo]: false }));
    };
  }

  async function handleSubmit(evento) {
    // Evita que el navegador recargue la página al enviar el formulario
    evento.preventDefault();

    const dni = datos.dni.replace(/[.\s]/g, '');
    const usuario = datos.usuario.trim().toLowerCase();
    const hoy = new Date().toISOString().slice(0, 10);

    // Validación según el tipo de perfil (las mismas reglas que aplica la base de datos)
    const nuevosErrores = {
      nombre: datos.nombre.trim() === '',
      apellido: datos.apellido.trim() === '',
      ...(tipo === 'paciente'
        ? {
            dni: !/^\d{7,8}$/.test(dni),
            fechaNacimiento: datos.fechaNacimiento === '' || datos.fechaNacimiento > hoy || datos.fechaNacimiento < '1900-01-01',
            ...erroresObraSocial(datos.obraSocial, datos.nroAfiliado),
          }
        : {
            usuario: !/^[a-z0-9._-]{3,32}$/.test(usuario),
            matricula: datos.rol === 'bioquimico' && datos.matricula.trim() === '',
          }),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    const cuerpo =
      tipo === 'paciente'
        ? {
            dni,
            nombre: datos.nombre.trim(),
            apellido: datos.apellido.trim(),
            fecha_nacimiento: datos.fechaNacimiento,
            sexo: datos.sexo,
            telefono: datos.telefono.trim(),
            ...datosObraSocial(datos.obraSocial, datos.nroAfiliado),
          }
        : {
            usuario,
            nombre: datos.nombre.trim(),
            apellido: datos.apellido.trim(),
            rol: datos.rol,
            telefono: datos.telefono.trim(),
            matricula: datos.matricula.trim(),
            cargo: datos.cargo.trim(),
          };

    setGuardando(true);
    try {
      // POST a la función de servidor. La dirección sale del .env; el token de la sesión le dice quién llama
      const funcion = tipo === 'paciente' ? 'crear-paciente' : 'crear-personal';
      const response = await axios.post(`${FUNCIONES_URL}/${funcion}`, cuerpo, { headers: await encabezados() });

      // La contraseña provisoria se muestra UNA sola vez: el admin tiene que entregársela a la persona
      const acceso = response.data.dni ?? response.data.usuario;
      await Swal.fire({
        icon: 'success',
        title: 'Perfil creado',
        html:
          `<p class="mb-2">${tipo === 'paciente' ? 'DNI' : 'Usuario'}: <strong>${escapar(acceso)}</strong></p>` +
          `<p class="mb-2">Contraseña provisoria: <strong style="font-family: monospace; font-size: 1.25em;">${escapar(response.data.password_provisoria)}</strong></p>` +
          '<p class="text-muted small mb-0">Anótela y entréguesela a la persona: no se vuelve a mostrar. ' +
          'En su primer ingreso el sistema le va a pedir elegir una contraseña propia.</p>',
        confirmButtonText: 'Ya la anoté',
        confirmButtonColor: '#1c4e80',
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
      onCreado();
    } catch (error) {
      console.error('No se pudo crear el perfil:', error);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos crear el perfil',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
    }
  }

  return (
    // enforceFocus={false}: deja que la ventana de SweetAlert2 reciba el foco encima de este modal
    <Modal show onHide={guardando ? undefined : onCerrar} backdrop="static" enforceFocus={false} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton={!guardando}>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          Nuevo perfil
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form id="form-nuevo-perfil" onSubmit={handleSubmit} noValidate>
          <div className="lims-modal-tipo mb-3" role="group" aria-label="Tipo de perfil">
            <input
              type="radio"
              className="btn-check"
              name="tipo-perfil"
              id="tipo-paciente"
              checked={tipo === 'paciente'}
              onChange={() => {
                setTipo('paciente');
                setErrores({});
              }}
            />
            <label className="lims-modal-tipo-opcion" htmlFor="tipo-paciente">
              Paciente
            </label>
            <input
              type="radio"
              className="btn-check"
              name="tipo-perfil"
              id="tipo-personal"
              checked={tipo === 'personal'}
              onChange={() => {
                setTipo('personal');
                setErrores({});
              }}
            />
            <label className="lims-modal-tipo-opcion" htmlFor="tipo-personal">
              Personal del laboratorio
            </label>
          </div>

          <div className="row g-3">
            <div className="col-sm-6">
              <label htmlFor="nuevo-nombre" className="form-label fw-semibold small">
                Nombre
              </label>
              <input
                type="text"
                id="nuevo-nombre"
                className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                maxLength={60}
                value={datos.nombre}
                onChange={cambiar('nombre')}
              />
              {errores.nombre && <div className="invalid-feedback">Ingrese el nombre.</div>}
            </div>
            <div className="col-sm-6">
              <label htmlFor="nuevo-apellido" className="form-label fw-semibold small">
                Apellido
              </label>
              <input
                type="text"
                id="nuevo-apellido"
                className={`form-control ${errores.apellido ? 'is-invalid' : ''}`}
                maxLength={60}
                value={datos.apellido}
                onChange={cambiar('apellido')}
              />
              {errores.apellido && <div className="invalid-feedback">Ingrese el apellido.</div>}
            </div>

            {tipo === 'paciente' ? (
              <>
                <div className="col-sm-6">
                  <label htmlFor="nuevo-dni" className="form-label fw-semibold small">
                    DNI
                  </label>
                  <input
                    type="text"
                    id="nuevo-dni"
                    className={`form-control ${errores.dni ? 'is-invalid' : ''}`}
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="Ej: 30123456"
                    value={datos.dni}
                    onChange={cambiar('dni')}
                  />
                  {errores.dni && <div className="invalid-feedback">Solo números, 7 u 8 dígitos.</div>}
                </div>
                <div className="col-sm-6">
                  <label htmlFor="nuevo-nacimiento" className="form-label fw-semibold small">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    id="nuevo-nacimiento"
                    className={`form-control ${errores.fechaNacimiento ? 'is-invalid' : ''}`}
                    value={datos.fechaNacimiento}
                    onChange={cambiar('fechaNacimiento')}
                  />
                  {errores.fechaNacimiento && <div className="invalid-feedback">Ingrese una fecha válida.</div>}
                </div>
                <div className="col-sm-6">
                  <label htmlFor="nuevo-sexo" className="form-label fw-semibold small">
                    Sexo
                  </label>
                  <select id="nuevo-sexo" className="form-select" value={datos.sexo} onChange={cambiar('sexo')}>
                    <option value="">Sin especificar</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                    <option value="X">X</option>
                  </select>
                </div>
                <CamposObraSocial
                  prefijo="nuevo"
                  obraSocial={datos.obraSocial}
                  nroAfiliado={datos.nroAfiliado}
                  errores={errores}
                  onObraSocial={(valor) => {
                    setDatos((previos) => ({ ...previos, obraSocial: valor }));
                    setErrores((previos) => ({ ...previos, obraSocial: false, nroAfiliado: false }));
                  }}
                  onNroAfiliado={(valor) => {
                    setDatos((previos) => ({ ...previos, nroAfiliado: valor }));
                    setErrores((previos) => ({ ...previos, nroAfiliado: false }));
                  }}
                />
              </>
            ) : (
              <>
                <div className="col-sm-6">
                  <label htmlFor="nuevo-usuario" className="form-label fw-semibold small">
                    Usuario
                  </label>
                  <input
                    type="text"
                    id="nuevo-usuario"
                    className={`form-control ${errores.usuario ? 'is-invalid' : ''}`}
                    maxLength={32}
                    placeholder="Ej: bioq_gomez"
                    value={datos.usuario}
                    onChange={cambiar('usuario')}
                  />
                  {errores.usuario && (
                    <div className="invalid-feedback">Entre 3 y 32 letras minúsculas, números, punto o guiones.</div>
                  )}
                </div>
                <div className="col-sm-6">
                  <label htmlFor="nuevo-rol" className="form-label fw-semibold small">
                    Rol
                  </label>
                  <select id="nuevo-rol" className="form-select" value={datos.rol} onChange={cambiar('rol')}>
                    {/* map(): una opción por cada rol del personal */}
                    {ROLES_PERSONAL.map((clave) => (
                      <option key={clave} value={clave}>
                        {ROLES[clave].nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-6">
                  <label htmlFor="nuevo-cargo" className="form-label fw-semibold small">
                    Cargo
                  </label>
                  <input
                    type="text"
                    id="nuevo-cargo"
                    className="form-control"
                    maxLength={60}
                    value={datos.cargo}
                    onChange={cambiar('cargo')}
                  />
                </div>
                <div className="col-sm-6">
                  <label htmlFor="nuevo-matricula" className="form-label fw-semibold small">
                    Matrícula {datos.rol === 'bioquimico' && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    id="nuevo-matricula"
                    className={`form-control ${errores.matricula ? 'is-invalid' : ''}`}
                    maxLength={30}
                    value={datos.matricula}
                    onChange={cambiar('matricula')}
                  />
                  {errores.matricula && (
                    <div className="invalid-feedback">La matrícula es obligatoria para un bioquímico.</div>
                  )}
                </div>
              </>
            )}

            <div className="col-sm-6">
              <label htmlFor="nuevo-telefono" className="form-label fw-semibold small">
                Teléfono
              </label>
              <input
                type="tel"
                id="nuevo-telefono"
                className="form-control"
                maxLength={30}
                value={datos.telefono}
                onChange={cambiar('telefono')}
              />
            </div>
          </div>

          <p className="form-text mt-3 mb-0">
            Se crea el acceso con una contraseña provisoria que se muestra una sola vez. En su primer ingreso la persona
            elige una propia.
          </p>
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
        <button type="submit" form="form-nuevo-perfil" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear perfil'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalNuevoPerfil;
