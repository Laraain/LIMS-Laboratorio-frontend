import { useEffect, useState } from 'react';
import axios from 'axios';
import { PencilSimple, UserPlus } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import ROLES from '../data/roles.js';
import { supabase } from '../lib/supabase.js';
import ModalEditarPerfil from './ModalEditarPerfil.jsx';
import ModalNuevoPerfil from './ModalNuevoPerfil.jsx';
import './ListaPerfiles.css';

// La URL de la API NO se escribe en el código: viene del archivo .env (variable VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL;
// Clave pública del proyecto (también viene del .env): Supabase la pide en cada petición
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Tabla con todos los perfiles creados. Los pide a la API con Axios apenas aparece en pantalla.
// La base de datos (políticas RLS) solo devuelve todos los perfiles si quien consulta es del personal.
// Desde acá el admin también crea perfiles nuevos y edita los existentes, en ventanas (modales).
// Prop idActual: el id del admin logueado, para que no pueda desactivarse a sí mismo.
function ListaPerfiles({ idActual }) {
  // Estados (useState): cada vez que uno cambia, React vuelve a dibujar el componente
  // perfiles: la lista que devolvió la API · cargando: true hasta que la API responde
  // error: true si la petición falló · intento: se suma 1 al apretar "Reintentar" para repetir la petición
  // filtroRol: rol elegido en el filtro ("todos" muestra todos los perfiles)
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [filtroRol, setFiltroRol] = useState('todos');
  // editando: el perfil que se está editando en la ventana (null si no hay ninguna abierta)
  // creando: true mientras está abierta la ventana de perfil nuevo
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);

  // useEffect: la petición se hace al aparecer el componente y de nuevo solo si cambia intento
  useEffect(() => {
    // vigente pasa a false si el componente desaparece antes de que llegue la respuesta: se descarta el resultado
    let vigente = true;

    async function cargarPerfiles() {
      try {
        if (!API_URL) throw new Error('Falta VITE_API_URL en el archivo .env');

        // Supabase identifica a quien consulta con el token de su sesión
        const { data: sesion } = await supabase.auth.getSession();
        const token = sesion.session?.access_token;

        // GET a la tabla "perfiles". params arma lo que va después del "?" de la URL:
        // select = qué columnas traer (pacientes y personal son datos de otras tablas relacionadas)
        // order = cómo ordenar (por apellido y después por nombre)
        const response = await axios.get(`${API_URL}/perfiles`, {
          headers: { apikey: API_KEY, Authorization: `Bearer ${token}` },
          params: {
            select: 'id,nombre,apellido,rol,telefono,activo,created_at,pacientes(dni),personal(usuario,cargo,matricula)',
            order: 'apellido.asc,nombre.asc',
          },
        });

        if (vigente) setPerfiles(response.data);
      } catch (errorPeticion) {
        if (!vigente) return;
        console.error('No se pudo cargar la lista de perfiles:', errorPeticion);
        setError(true);
        // SweetAlert2: ventana para avisarle al usuario que algo falló
        Swal.fire({
          icon: 'error',
          title: 'No pudimos cargar los usuarios',
          text: 'Verifique su conexión e intente nuevamente.',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#1c4e80',
        });
      } finally {
        if (vigente) setCargando(false);
      }
    }

    cargarPerfiles();
    return () => {
      vigente = false;
    };
  }, [intento]);

  // Vuelve a pedir los datos: reinicia los estados y cambia intento para que se ejecute el useEffect.
  // Se usa en "Reintentar" y también después de crear o editar un perfil, para mostrar lo que quedó en la base.
  function recargar() {
    setCargando(true);
    setError(false);
    setIntento((valor) => valor + 1);
  }

  if (cargando) {
    return (
      <div className="lims-lista-aviso" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Cargando usuarios…
      </div>
    );
  }

  if (error) {
    return (
      <div className="lims-lista-aviso" role="alert">
        <span>No se pudo cargar la lista de usuarios.</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={recargar}>
          Reintentar
        </button>
      </div>
    );
  }

  // Aplica el filtro de rol sobre la lista que ya llegó (no vuelve a pedir nada a la API)
  const visibles = filtroRol === 'todos' ? perfiles : perfiles.filter((perfil) => perfil.rol === filtroRol);

  return (
    <section aria-labelledby="usuarios-titulo">
      <div className="lims-lista-encabezado">
        <h2 id="usuarios-titulo" className="lims-lista-titulo">
          Perfiles creados
        </h2>
        <div className="lims-lista-acciones">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreando(true)}>
            <UserPlus className="lims-icono me-2" aria-hidden="true" />
            Nuevo perfil
          </button>
          <div className="lims-lista-filtro">
            <label htmlFor="filtro-rol" className="form-label small mb-0">
              Rol
            </label>
            <select
              id="filtro-rol"
              className="form-select form-select-sm"
              value={filtroRol}
              onChange={(evento) => setFiltroRol(evento.target.value)}
            >
              <option value="todos">Todos</option>
              {/* map(): una opción por cada rol de la lista ROLES */}
              {Object.entries(ROLES).map(([clave, rol]) => (
                <option key={clave} value={clave}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="text-muted small" aria-live="polite">
        Mostrando {visibles.length} de {perfiles.length} perfiles.
      </p>

      <div className="table-responsive">
        {/* En pantallas chicas, cada fila se muestra como tarjeta (ver ListaPerfiles.css): data-label es el texto de cada dato */}
        <table className="table align-middle lims-tabla-perfiles">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Rol</th>
              <th scope="col">DNI / Usuario</th>
              <th scope="col">Cargo</th>
              <th scope="col">Teléfono</th>
              <th scope="col">Cuenta</th>
              <th scope="col">Alta</th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* map(): por cada perfil arma una fila de la tabla, sin repetir código */}
            {visibles.map((perfil) => (
              <tr key={perfil.id}>
                <td className="fw-semibold lims-celda-nombre">
                  {perfil.apellido}, {perfil.nombre}
                </td>
                <td data-label="Rol">
                  <span className={`badge text-bg-${ROLES[perfil.rol]?.color ?? 'secondary'}`}>
                    {ROLES[perfil.rol]?.nombre ?? perfil.rol}
                  </span>
                </td>
                <td data-label="DNI / Usuario">{perfil.pacientes?.dni ?? perfil.personal?.usuario ?? '—'}</td>
                <td data-label="Cargo">{perfil.personal?.cargo ?? '—'}</td>
                <td data-label="Teléfono">{perfil.telefono ?? '—'}</td>
                <td
                  data-label="Cuenta"
                  className={perfil.activo ? 'text-success fw-semibold' : 'text-danger fw-semibold'}
                >
                  {perfil.activo ? 'Activa' : 'Inactiva'}
                </td>
                <td data-label="Alta">{new Date(perfil.created_at).toLocaleDateString('es-AR')}</td>
                <td className="text-end lims-celda-acciones">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    aria-label={`Editar a ${perfil.apellido}, ${perfil.nombre}`}
                    onClick={() => setEditando(perfil)}
                  >
                    <PencilSimple className="lims-icono me-1" aria-hidden="true" />
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Las ventanas solo existen mientras están abiertas. key={editando.id}: cada perfil arma su propio formulario */}
      {editando && (
        <ModalEditarPerfil
          key={editando.id}
          perfil={editando}
          idActual={idActual}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
      {creando && (
        <ModalNuevoPerfil
          onCerrar={() => setCreando(false)}
          onCreado={() => {
            setCreando(false);
            recargar();
          }}
        />
      )}
    </section>
  );
}

export default ListaPerfiles;
