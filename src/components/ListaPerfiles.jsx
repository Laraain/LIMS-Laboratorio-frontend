import { useEffect, useState } from 'react';
import axios from 'axios';
import { MagnifyingGlass, PencilSimple, UserPlus } from '@phosphor-icons/react';
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
  // busqueda: texto del buscador (filtra por nombre, apellido, DNI o usuario)
  const [busqueda, setBusqueda] = useState('');
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
        <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
          Reintentar
        </button>
      </div>
    );
  }

  // Cantidad de perfiles de cada rol, para mostrarla en los botones del filtro
  const cantidadPorRol = perfiles.reduce((cuenta, perfil) => {
    cuenta[perfil.rol] = (cuenta[perfil.rol] ?? 0) + 1;
    return cuenta;
  }, {});

  // Aplica el filtro de rol y la búsqueda sobre la lista que ya llegó (no vuelve a pedir nada a la API)
  const texto = busqueda.trim().toLowerCase();
  const visibles = perfiles.filter((perfil) => {
    if (filtroRol !== 'todos' && perfil.rol !== filtroRol) return false;
    if (!texto) return true;
    const identidad = perfil.pacientes?.dni ?? perfil.personal?.usuario ?? '';
    return `${perfil.nombre} ${perfil.apellido} ${identidad}`.toLowerCase().includes(texto);
  });

  // Botones del filtro: "Todos" más un botón por cada rol que tenga al menos un perfil
  const opcionesFiltro = [
    { clave: 'todos', nombre: 'Todos', cantidad: perfiles.length },
    ...Object.entries(ROLES)
      .filter(([clave]) => cantidadPorRol[clave])
      .map(([clave, rol]) => ({ clave, nombre: rol.nombre, cantidad: cantidadPorRol[clave] })),
  ];

  return (
    <section className="lims-lista" aria-labelledby="usuarios-titulo">
      <div className="lims-lista-encabezado">
        <div>
          <h2 id="usuarios-titulo" className="lims-lista-titulo">
            Perfiles creados
          </h2>
          <p className="lims-lista-resumen mb-0" aria-live="polite">
            Mostrando {visibles.length} de {perfiles.length} perfiles
          </p>
        </div>
        <button
          type="button"
          className="btn lims-btn-pill lims-btn-primario"
          onClick={() => setCreando(true)}
        >
          <UserPlus className="lims-icono me-2" aria-hidden="true" />
          Nuevo perfil
        </button>
      </div>

      <div className="lims-lista-controles">
        <div className="lims-lista-filtro" role="group" aria-label="Filtrar por rol">
          {/* map(): un botón por cada opción del filtro; aria-pressed indica cuál está elegido */}
          {opcionesFiltro.map((opcion) => (
            <button
              key={opcion.clave}
              type="button"
              className="lims-filtro-boton"
              aria-pressed={filtroRol === opcion.clave}
              onClick={() => setFiltroRol(opcion.clave)}
            >
              {opcion.nombre}
              <span className="lims-filtro-cantidad">{opcion.cantidad}</span>
            </button>
          ))}
        </div>
        <div className="lims-lista-busqueda">
          <MagnifyingGlass className="lims-icono" aria-hidden="true" />
          <label htmlFor="buscar-perfil" className="visually-hidden">
            Buscar por nombre, DNI o usuario
          </label>
          <input
            type="search"
            id="buscar-perfil"
            placeholder="Buscar por nombre, DNI o usuario"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="lims-lista-aviso">No hay perfiles que coincidan con la búsqueda.</div>
      ) : (
        <div className="lims-tabla-contenedor">
          {/* En pantallas chicas, cada fila se muestra como tarjeta (ver ListaPerfiles.css): data-label es el texto de cada dato */}
          <table className="table align-middle mb-0 lims-tabla-perfiles">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Rol</th>
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
                  <td className="lims-celda-nombre">
                    <span className="lims-avatar" aria-hidden="true">
                      {perfil.nombre.charAt(0)}
                      {perfil.apellido.charAt(0)}
                    </span>
                    <span>
                      <span className="lims-celda-nombre-texto">
                        {perfil.apellido}, {perfil.nombre}
                      </span>
                      <span className="lims-celda-identidad">
                        {perfil.pacientes?.dni ? `DNI ${perfil.pacientes.dni}` : (perfil.personal?.usuario ?? '—')}
                      </span>
                    </span>
                  </td>
                  <td data-label="Rol">
                    <span className={`lims-rol lims-rol--${perfil.rol}`}>{ROLES[perfil.rol]?.nombre ?? perfil.rol}</span>
                  </td>
                  <td data-label="Cargo">{perfil.personal?.cargo ?? '—'}</td>
                  <td data-label="Teléfono">{perfil.telefono ?? '—'}</td>
                  <td data-label="Cuenta">
                    <span className={`lims-cuenta${perfil.activo ? '' : ' lims-cuenta--inactiva'}`}>
                      {perfil.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td data-label="Alta">{new Date(perfil.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="text-end lims-celda-acciones">
                    <button
                      type="button"
                      className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
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
      )}

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
