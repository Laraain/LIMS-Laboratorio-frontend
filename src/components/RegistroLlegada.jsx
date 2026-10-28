import { Fragment, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { IdentificationCard, MagnifyingGlass, UserPlus, PencilSimple } from '@phosphor-icons/react';
import { API_URL, FUNCIONES_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import { ESTADOS_TURNO, TIPOS_EXTRACCION, registrarLlegada } from '../lib/fila.js';
import { edadDesde, hoyTucuman } from '../lib/hora.js';
import { datosObraSocial, erroresObraSocial, PARTICULAR } from '../lib/obrasSociales.js';
import CamposObraSocial from './CamposObraSocial.jsx';

const FICHA_VACIA = {
  nombre: '',
  apellido: '',
  fechaNacimiento: '',
  sexo: '',
  telefono: '',
  obraSocial: '',
  nroAfiliado: '',
};

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

async function buscarPorDni(dni) {
  const response = await axios.get(`${API_URL}/pacientes`, {
    headers: await encabezados(),
    params: {
      // Se agregaron sexo, telefono y obra_social_id para poder precargar el formulario de edición
      select: 'id,dni,nombre,apellido,fecha_nacimiento,sexo,telefono,obra_social_id,nro_afiliado,obras_sociales(nombre)',
      dni: `eq.${dni}`,
    },
  });
  return response.data[0] ?? null;
}

// Recepción: registra la llegada de un paciente a la fila del día.
// 1. Se busca por DNI. 2. Si no está cargado, se completa su ficha: al guardarla se crea también su cuenta del portal.
// 3. Se elige el tipo de extracción y se registra la llegada: la base le asigna el número del día.
// Props: fila (la fila de hoy, para avisar si ya está registrado) · sucursal (donde se registra la llegada)
// sucursales (todas, para nombrar la otra si el paciente ya está allá) · onRegistrado (se llama después de registrar)
function RegistroLlegada({ fila, sucursal, sucursales, onRegistrado }) {
  const [dniBuscado, setDniBuscado] = useState('');
  const [errorDni, setErrorDni] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  
  // Nuevo estado para controlar si estamos en modo edición
  const [editando, setEditando] = useState(false);
  
  const [tipo, setTipo] = useState('ambulatoria');
  const [ficha, setFicha] = useState(FICHA_VACIA);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const campoDni = useRef(null);
  const navigate = useNavigate();

  function reiniciar() {
    setDniBuscado('');
    setResultado(null);
    setEditando(false);
    setTipo('ambulatoria');
    setFicha(FICHA_VACIA);
    setErrores({});
    campoDni.current?.focus();
  }

  function cambiarFicha(campo, valor) {
    setFicha((previa) => ({ ...previa, [campo]: valor }));
    setErrores((previos) => ({ ...previos, [campo]: false }));
  }

  async function handleBuscar(evento) {
    evento.preventDefault();
    const dni = dniBuscado.replace(/[.\s]/g, '');
    if (!/^\d{7,8}$/.test(dni)) {
      setErrorDni(true);
      return;
    }

    setBuscando(true);
    try {
      const paciente = await buscarPorDni(dni);
      setResultado(paciente ? { paciente } : { nuevo: dni });
      setEditando(false);
      setFicha(FICHA_VACIA);
      setErrores({});
      setTipo('ambulatoria');
    } catch (error) {
      console.error('No se pudo buscar al paciente:', error);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos buscar al paciente',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setBuscando(false);
    }
  }

  function iniciarEdicion() {
    setFicha({
      nombre: resultado.paciente.nombre || '',
      apellido: resultado.paciente.apellido || '',
      fechaNacimiento: resultado.paciente.fecha_nacimiento || '',
      sexo: resultado.paciente.sexo || '',
      telefono: resultado.paciente.telefono || '',
      // En la base, obra_social_id nulo significa "particular"
      obraSocial: resultado.paciente.obra_social_id ? String(resultado.paciente.obra_social_id) : PARTICULAR,
      nroAfiliado: resultado.paciente.nro_afiliado || '',
    });
    setEditando(true);
  }

  async function guardarEdicion(evento) {
    evento.preventDefault();
    const nuevosErrores = {
      nombre: ficha.nombre.trim() === '',
      apellido: ficha.apellido.trim() === '',
      fechaNacimiento:
        ficha.fechaNacimiento === '' || ficha.fechaNacimiento > hoyTucuman() || ficha.fechaNacimiento < '1900-01-01',
      ...erroresObraSocial(ficha.obraSocial, ficha.nroAfiliado),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setGuardando(true);
    try {
      await axios.patch(
        `${API_URL}/pacientes?id=eq.${resultado.paciente.id}`,
        {
          nombre: ficha.nombre.trim(),
          apellido: ficha.apellido.trim(),
          fecha_nacimiento: ficha.fechaNacimiento,
          // "Sin especificar" se guarda como nulo: la base solo acepta F, M o X
          sexo: ficha.sexo || null,
          telefono: ficha.telefono.trim() || null,
          ...datosObraSocial(ficha.obraSocial, ficha.nroAfiliado),
        },
        { headers: await encabezados() }
      );

      // Recargamos el paciente para mostrar el resumen actualizado
      const pacienteActualizado = await buscarPorDni(resultado.paciente.dni);
      setResultado({ paciente: pacienteActualizado });
      setEditando(false);
      setFicha(FICHA_VACIA);

      Swal.fire({
        icon: 'success',
        title: 'Datos actualizados',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('No se pudo actualizar al paciente:', error);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos actualizar los datos',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setGuardando(false);
    }
  }

  async function mostrarNumero(turno, paciente, yaRegistrado) {
    // Un paciente se registra una sola vez por día: si ya está en la fila de la otra sucursal, se avisa y nada más
    if (turno.sucursal_id !== sucursal.id) {
      const otra = sucursales.find((opcion) => opcion.id === turno.sucursal_id);
      await Swal.fire({
        icon: 'warning',
        title: 'Ya está registrado en otra sucursal',
        html:
          `<p class="mb-1">${escapar(paciente.apellido)}, ${escapar(paciente.nombre)} está hoy en la fila de ` +
          `<strong>${escapar(otra?.nombre ?? 'otra sucursal')}</strong> con el número ${escapar(turno.numero)}.</p>` +
          '<p class="mb-0">Si se cambió de sucursal, pídale a esa recepción que lo marque como "Se retiró".</p>',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: yaRegistrado ? 'info' : 'success',
      title: yaRegistrado ? 'Ya estaba en la fila de hoy' : 'Llegada registrada',
      html:
        '<p class="mb-1">Número de atención</p>' +
        `<p class="lims-swal-numero">${escapar(turno.numero)}</p>` +
        `<p class="mb-3">${escapar(paciente.apellido)}, ${escapar(paciente.nombre)} · ${escapar(TIPOS_EXTRACCION[turno.tipo])}</p>` +
        '<p class="fw-semibold mb-0">¿Pasar a cargar la orden?</p>',
      showCancelButton: true,
      confirmButtonText: 'Cargar orden',
      cancelButtonText: 'Ahora no',
      confirmButtonColor: '#1c4e80',
      allowOutsideClick: false,
    });
    // paciente: { id, dni, nombre, apellido, obra_social_id } para precargar la orden
    if (isConfirmed) navigate('/panel/ordenes', { state: { paciente } });
  }

  async function registrarExistente() {
    const paciente = resultado.paciente;
    setGuardando(true);
    try {
      const { turno, ya_registrado: yaRegistrado } = await registrarLlegada(paciente.id, tipo, sucursal.id);
      onRegistrado();
      await mostrarNumero(turno, paciente, yaRegistrado);
      reiniciar();
    } catch (error) {
      console.error('No se pudo registrar la llegada:', error);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos registrar la llegada',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setGuardando(false);
    }
  }

  async function registrarNuevo(evento) {
    evento.preventDefault();
    const nuevosErrores = {
      nombre: ficha.nombre.trim() === '',
      apellido: ficha.apellido.trim() === '',
      fechaNacimiento:
        ficha.fechaNacimiento === '' || ficha.fechaNacimiento > hoyTucuman() || ficha.fechaNacimiento < '1900-01-01',
      ...erroresObraSocial(ficha.obraSocial, ficha.nroAfiliado),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    const dni = resultado.nuevo;
    setGuardando(true);
    let alta;
    try {
      const response = await axios.post(
        `${FUNCIONES_URL}/crear-paciente`,
        {
          dni,
          nombre: ficha.nombre.trim(),
          apellido: ficha.apellido.trim(),
          fecha_nacimiento: ficha.fechaNacimiento,
          // "Sin especificar" se guarda como nulo: la base solo acepta F, M o X
          sexo: ficha.sexo || null,
          telefono: ficha.telefono.trim() || null,
          ...datosObraSocial(ficha.obraSocial, ficha.nroAfiliado),
        },
        { headers: await encabezados() },
      );
      alta = response.data;
    } catch (error) {
      console.error('No se pudo dar de alta al paciente:', error);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos dar de alta al paciente',
        text: mensajeDeErrorApi(error),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setGuardando(false);
      return;
    }

    await Swal.fire({
      icon: 'success',
      title: 'Paciente dado de alta',
      html:
        `<p class="mb-2">DNI: <strong>${escapar(alta.dni)}</strong></p>` +
        `<p class="mb-2">Contraseña provisoria del portal: <strong style="font-family: monospace; font-size: 1.25em;">${escapar(alta.password_provisoria)}</strong></p>` +
        '<p class="text-muted small mb-0">Anótela y entréguesela al paciente: no se vuelve a mostrar. ' +
        'En su primer ingreso el portal le va a pedir elegir una contraseña propia.</p>',
      confirmButtonText: 'Ya la anoté',
      confirmButtonColor: '#1c4e80',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    try {
      const { turno, ya_registrado: yaRegistrado } = await registrarLlegada(alta.paciente_id, tipo, sucursal.id);
      onRegistrado();
      await mostrarNumero(
        turno,
        {
          id: alta.paciente_id,
          dni: resultado.nuevo,
          nombre: ficha.nombre.trim(),
          apellido: ficha.apellido.trim(),
          obra_social_id: datosObraSocial(ficha.obraSocial, ficha.nroAfiliado).obra_social_id,
        },
        yaRegistrado,
      );
      reiniciar();
    } catch (error) {
      console.error('No se pudo registrar la llegada:', error);
      await Swal.fire({
        icon: 'error',
        title: 'El paciente quedó dado de alta, pero no se registró su llegada',
        text: `${mensajeDeErrorApi(error)} Búsquelo de nuevo por DNI para registrarla.`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
      setResultado({ paciente: { id: alta.paciente_id, dni, nombre: ficha.nombre.trim(), apellido: ficha.apellido.trim(), fecha_nacimiento: ficha.fechaNacimiento } });
    } finally {
      setGuardando(false);
    }
  }

  const turnoDeHoy = resultado?.paciente && fila.find((turno) => turno.paciente_id === resultado.paciente.id);

  const selectorTipo = (
    <fieldset className="col-12">
      <legend className="form-label fw-semibold small mb-2">Tipo de extracción</legend>
      <div className="lims-modal-tipo" role="group">
        {Object.entries(TIPOS_EXTRACCION).map(([clave, nombre]) => (
          <Fragment key={clave}>
            <input
              type="radio"
              className="btn-check"
              name="tipo-extraccion"
              id={`tipo-${clave}`}
              checked={tipo === clave}
              onChange={() => setTipo(clave)}
            />
            <label className="lims-modal-tipo-opcion" htmlFor={`tipo-${clave}`}>
              {nombre}
            </label>
          </Fragment>
        ))}
      </div>
    </fieldset>
  );

  // Extraemos los inputs de la ficha para reutilizarlos en "Nuevo" y "Editar"
  const camposFicha = (
    <>
      <div className="col-sm-6">
        <label htmlFor="ficha-nombre" className="form-label fw-semibold small">
          Nombre <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          id="ficha-nombre"
          className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
          maxLength={60}
          value={ficha.nombre}
          onChange={(evento) => cambiarFicha('nombre', evento.target.value)}
        />
        {errores.nombre && <div className="invalid-feedback">Ingrese el nombre.</div>}
      </div>
      <div className="col-sm-6">
        <label htmlFor="ficha-apellido" className="form-label fw-semibold small">
          Apellido <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          id="ficha-apellido"
          className={`form-control ${errores.apellido ? 'is-invalid' : ''}`}
          maxLength={60}
          value={ficha.apellido}
          onChange={(evento) => cambiarFicha('apellido', evento.target.value)}
        />
        {errores.apellido && <div className="invalid-feedback">Ingrese el apellido.</div>}
      </div>
      <div className="col-sm-6">
        <label htmlFor="ficha-nacimiento" className="form-label fw-semibold small">
          Fecha de nacimiento <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          id="ficha-nacimiento"
          className={`form-control ${errores.fechaNacimiento ? 'is-invalid' : ''}`}
          max={hoyTucuman()}
          value={ficha.fechaNacimiento}
          onChange={(evento) => cambiarFicha('fechaNacimiento', evento.target.value)}
        />
        {errores.fechaNacimiento && <div className="invalid-feedback">Ingrese una fecha válida.</div>}
      </div>
      <div className="col-sm-6">
        <label htmlFor="ficha-sexo" className="form-label fw-semibold small">
          Sexo
        </label>
        <select
          id="ficha-sexo"
          className="form-select"
          value={ficha.sexo}
          onChange={(evento) => cambiarFicha('sexo', evento.target.value)}
        >
          <option value="">Sin especificar</option>
          <option value="F">Femenino</option>
          <option value="M">Masculino</option>
          <option value="X">X</option>
        </select>
      </div>
      <CamposObraSocial
        prefijo="ficha"
        obraSocial={ficha.obraSocial}
        nroAfiliado={ficha.nroAfiliado}
        errores={errores}
        onObraSocial={(valor) => {
          cambiarFicha('obraSocial', valor);
          setErrores((previos) => ({ ...previos, nroAfiliado: false }));
        }}
        onNroAfiliado={(valor) => cambiarFicha('nroAfiliado', valor)}
      />
      <div className="col-sm-6">
        <label htmlFor="ficha-telefono" className="form-label fw-semibold small">
          Teléfono
        </label>
        <input
          type="tel"
          id="ficha-telefono"
          className="form-control"
          maxLength={30}
          value={ficha.telefono}
          onChange={(evento) => cambiarFicha('telefono', evento.target.value)}
        />
      </div>
    </>
  );

  return (
    <section className="lims-registro" aria-labelledby="registro-titulo">
      <h2 id="registro-titulo" className="lims-lista-titulo">
        Registrar llegada
      </h2>

      <form className="lims-registro-busqueda" onSubmit={handleBuscar} noValidate>
        <label htmlFor="registro-dni" className="form-label fw-semibold small">
          DNI del paciente
        </label>
        <div className="d-flex gap-2">
          <input
            ref={campoDni}
            type="text"
            id="registro-dni"
            className={`form-control ${errorDni ? 'is-invalid' : ''}`}
            inputMode="numeric"
            maxLength={14}
            placeholder="Ej: 30123456"
            autoComplete="off"
            value={dniBuscado}
            aria-describedby={errorDni ? 'registro-dni-error' : undefined}
            onChange={(evento) => {
              setDniBuscado(evento.target.value);
              setErrorDni(false);
              setResultado(null);
            }}
          />
          <button type="submit" className="btn lims-btn-pill lims-btn-primario flex-shrink-0" disabled={buscando}>
            <MagnifyingGlass className="lims-icono me-1" aria-hidden="true" />
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {errorDni && (
          <div id="registro-dni-error" className="invalid-feedback d-block">
            Ingrese un DNI de 7 u 8 números.
          </div>
        )}
      </form>

      {/* Flujo: Paciente encontrado */}
      {resultado?.paciente && !editando && (
        <div className="lims-registro-resultado" aria-live="polite">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="lims-registro-paciente mb-0">
              <IdentificationCard className="lims-registro-paciente-icono" aria-hidden="true" />
              <div>
                <p className="lims-celda-nombre-texto mb-0">
                  {resultado.paciente.apellido}, {resultado.paciente.nombre}
                </p>
                <p className="lims-celda-identidad mb-0">
                  DNI {resultado.paciente.dni} · {edadDesde(resultado.paciente.fecha_nacimiento)} años ·{' '}
                  {resultado.paciente.obras_sociales
                    ? `${resultado.paciente.obras_sociales.nombre} (afiliado ${resultado.paciente.nro_afiliado})`
                    : 'Particular'}
                </p>
              </div>
            </div>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={iniciarEdicion}
            >
              <PencilSimple size={16} /> Editar datos
            </button>
          </div>

          {turnoDeHoy ? (
            <p className="lims-registro-ya mb-0">
              Ya está en la fila de hoy con el número <strong>{turnoDeHoy.numero}</strong> (
              {ESTADOS_TURNO[turnoDeHoy.estado].toLowerCase()}).
            </p>
          ) : (
            <div className="row g-3">
              {selectorTipo}
              <div className="col-12 d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn lims-btn-pill lims-btn-primario"
                  disabled={guardando}
                  onClick={registrarExistente}
                >
                  {guardando ? 'Registrando…' : 'Registrar llegada'}
                </button>
                <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={reiniciar} disabled={guardando}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flujo: Editando paciente existente */}
      {resultado?.paciente && editando && (
        <form className="lims-registro-resultado" onSubmit={guardarEdicion} noValidate aria-live="polite">
          <p className="fw-semibold text-primary mb-3">
            <PencilSimple className="me-2" aria-hidden="true" />
            Editando datos de {resultado.paciente.nombre} {resultado.paciente.apellido}
          </p>
          <div className="row g-3">
            {camposFicha}
            <div className="col-12 d-flex flex-wrap gap-2 mt-4">
              <button type="submit" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button 
                type="button" 
                className="btn lims-btn-pill lims-btn-secundario" 
                onClick={() => { setEditando(false); setFicha(FICHA_VACIA); setErrores({}); }} 
                disabled={guardando}
              >
                Cancelar edición
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Flujo: Paciente nuevo */}
      {resultado?.nuevo && (
        <form className="lims-registro-resultado" onSubmit={registrarNuevo} noValidate aria-live="polite">
          <p className="lims-registro-nuevo">
            <UserPlus className="lims-icono me-2" aria-hidden="true" />
            No hay ningún paciente con DNI <strong>{resultado.nuevo}</strong>. Complete su ficha: al guardarla se crea
            también su cuenta del portal.
          </p>
          <div className="row g-3">
            {camposFicha}
            {selectorTipo}
            <div className="col-12 d-flex flex-wrap gap-2 mt-4">
              <button type="submit" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Dar de alta y registrar llegada'}
              </button>
              <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={reiniciar} disabled={guardando}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

export default RegistroLlegada;
