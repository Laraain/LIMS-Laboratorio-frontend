import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import { leerConfiguracion } from '../lib/fila.js';
import useMetadatos from '../hooks/useMetadatos.js';
import '../components/ListaPerfiles.css';
import '../components/Fila.css';

// Mismo rango que la base de datos (tabla configuracion)
const BOXES_MINIMO = 1;
const BOXES_MAXIMO = 20;

// Configuración del laboratorio, solo para administradores. Por ahora: cuántos boxes de extracción hay.
function Configuracion() {
  useMetadatos({
    titulo: 'Configuración — LIMS Laboratorio',
    descripcion: 'Parámetros del laboratorio, solo para administradores.',
    ruta: '/panel/configuracion',
    indexar: false,
  });

  const { perfil } = useOutletContext();
  // guardado: el valor que tiene la base · boxes: lo que está escrito en el campo
  const [guardado, setGuardado] = useState(null);
  const [boxes, setBoxes] = useState('');
  const [error, setError] = useState(false);
  const [errorCampo, setErrorCampo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    leerConfiguracion()
      .then((configuracion) => {
        if (!vigente) return;
        setGuardado(configuracion.cantidad_boxes);
        setBoxes(String(configuracion.cantidad_boxes));
      })
      .catch((errorPeticion) => {
        console.error('No se pudo leer la configuración:', errorPeticion);
        if (vigente) setError(true);
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (perfil.rol !== 'admin') return <Navigate to="/panel" replace />;

  async function handleSubmit(evento) {
    evento.preventDefault();
    const cantidad = Number(boxes);
    if (!Number.isInteger(cantidad) || cantidad < BOXES_MINIMO || cantidad > BOXES_MAXIMO) {
      setErrorCampo(true);
      return;
    }
    if (cantidad === guardado) {
      Swal.fire({ icon: 'info', title: 'No hay cambios', text: 'La cantidad de boxes es la misma.', confirmButtonColor: '#1c4e80' });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Guardar la cantidad de boxes?',
      text:
        cantidad < guardado
          ? `Quedan habilitados del Box 1 al Box ${cantidad}. Los boxes que se quitan ya no pueden llamar pacientes.`
          : `Quedan habilitados del Box 1 al Box ${cantidad}.`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;

    setGuardando(true);
    try {
      // La tabla tiene una sola fila (id = true). Si la política no deja modificarla, la API responde sin filas.
      const response = await axios.patch(
        `${API_URL}/configuracion`,
        { cantidad_boxes: cantidad, updated_at: new Date().toISOString(), updated_by: perfil.id },
        { headers: { ...(await encabezados()), Prefer: 'return=representation' }, params: { id: 'eq.true' } },
      );
      if (!Array.isArray(response.data) || response.data.length !== 1) {
        throw Object.assign(new Error('La API no devolvió la configuración guardada'), {
          mensajeUsuario: 'No tiene permiso para modificar la configuración.',
        });
      }
      setGuardado(response.data[0].cantidad_boxes);
      Swal.fire({ icon: 'success', title: 'Configuración guardada', timer: 1600, showConfirmButton: false });
    } catch (errorPeticion) {
      console.error('No se pudo guardar la configuración:', errorPeticion);
      Swal.fire({
        icon: 'error',
        title: 'No pudimos guardar la configuración',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Configuración</h1>
          <p className="lims-panel-texto mb-0">Parámetros del laboratorio que usa el sistema.</p>
        </div>
      </header>

      <section className="lims-config" aria-labelledby="config-boxes-titulo">
        <h2 id="config-boxes-titulo" className="lims-lista-titulo">
          Boxes de extracción
        </h2>

        {error && (
          <div className="lims-lista-aviso" role="alert">
            No se pudo leer la configuración. Recargue la página.
          </div>
        )}
        {!error && guardado === null && (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Cargando…
          </div>
        )}
        {!error && guardado !== null && (
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="config-boxes" className="form-label fw-semibold small">
              Cantidad de boxes
            </label>
            <div className="d-flex flex-wrap gap-2 align-items-start">
              <div className="lims-config-campo">
                <input
                  type="number"
                  id="config-boxes"
                  className={`form-control ${errorCampo ? 'is-invalid' : ''}`}
                  min={BOXES_MINIMO}
                  max={BOXES_MAXIMO}
                  step={1}
                  value={boxes}
                  aria-describedby="config-boxes-ayuda"
                  onChange={(evento) => {
                    setBoxes(evento.target.value);
                    setErrorCampo(false);
                  }}
                />
                {errorCampo && (
                  <div className="invalid-feedback">
                    Ingrese un número entero de {BOXES_MINIMO} a {BOXES_MAXIMO}.
                  </div>
                )}
              </div>
              <button type="submit" className="btn lims-btn-pill lims-btn-primario" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
            <p id="config-boxes-ayuda" className="form-text mb-0">
              En la pantalla de extracción cada técnico elige entre Box 1 y Box {guardado}.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

export default Configuracion;
