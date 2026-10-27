import { useEffect, useState } from 'react';
import axios from 'axios';
import { List, MagnifyingGlass, PencilSimple, SquaresFour, UserPlus } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import { API_URL, encabezados, mensajeDeErrorApi } from '../lib/api.js';
import ModalEditarPerfil from './ModalEditarPerfil.jsx';
import ModalNuevoPerfil from './ModalNuevoPerfil.jsx';
import './ListaPerfiles.css';

// Vista con la que arranca la lista: en pantallas de menos de 1200px la tabla no entra, así que se usan tarjetas
function vistaInicial() {
  return window.matchMedia('(max-width: 1199.98px)').matches ? 'tarjetas' : 'lista';
}

const VISTAS = [
  { clave: 'lista', nombre: 'Lista', icono: List },
  { clave: 'tarjetas', nombre: 'Tarjetas', icono: SquaresFour },
];

// Los campos de la ficha que se piden a la API: los datos personales y la obra social con su nombre.
// perfiles(activo) sirve para que el admin vea el estado de la cuenta en la ventana de edición.
const CAMPOS =
  'id,perfil_id,dni,nombre,apellido,fecha_nacimiento,sexo,telefono,domicilio,obra_social_id,nro_afiliado,obras_sociales(nombre),perfiles(activo)';

// Arma el objeto que espera ModalEditarPerfil: el perfil (id, puede ser nulo) y su ficha de paciente
function perfilDelPaciente(paciente) {
  return {
    id: paciente.perfil_id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    telefono: paciente.telefono,
    activo: paciente.perfiles?.activo ?? true,
    rol: 'paciente',
    pacientes: {
      dni: paciente.dni,
      fecha_nacimiento: paciente.fecha_nacimiento,
      sexo: paciente.sexo,
      domicilio: paciente.domicilio,
      obra_social_id: paciente.obra_social_id,
      nro_afiliado: paciente.nro_afiliado,
    },
  };
}

// Texto que se muestra en la columna Obra social: el nombre y, si tiene, el número de afiliado
function ObraSocial({ paciente }) {
  if (!paciente.obras_sociales?.nombre) return <span className="lims-celda-identidad">Particular</span>;
  return (
    <>
      <span>{paciente.obras_sociales.nombre}</span>
      {paciente.nro_afiliado && <span className="lims-celda-identidad">Afiliado {paciente.nro_afiliado}</span>}
    </>
  );
}

// Lista de pacientes con buscador por DNI (también busca por nombre y apellido).
// Desde acá recepción y el admin dan de alta pacientes y editan sus datos, incluida la obra social.
// Prop esAdmin: el admin además mantiene sincronizado el perfil y puede activar o desactivar la cuenta.
function ListaPacientes({ esAdmin = false }) {
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState(vistaInicial);
  // editando: el paciente que se está editando (null si no hay ninguna ventana abierta)
  // creando: true mientras está abierta la ventana de paciente nuevo
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    // vigente pasa a false si el componente desaparece antes de que llegue la respuesta: se descarta el resultado
    let vigente = true;

    async function cargarPacientes() {
      try {
        const response = await axios.get(`${API_URL}/pacientes`, {
          headers: await encabezados(),
          params: { select: CAMPOS, order: 'apellido.asc,nombre.asc' },
        });
        if (vigente) setPacientes(response.data);
      } catch (errorPeticion) {
        if (!vigente) return;
        console.error('No se pudo cargar la lista de pacientes:', errorPeticion);
        setError(true);
        Swal.fire({
          icon: 'error',
          title: 'No pudimos cargar los pacientes',
          text: mensajeDeErrorApi(errorPeticion),
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#1c4e80',
        });
      } finally {
        if (vigente) setCargando(false);
      }
    }

    cargarPacientes();
    return () => {
      vigente = false;
    };
  }, [intento]);

  // Vuelve a pedir los datos después de crear o editar un paciente, para mostrar lo que quedó en la base
  function recargar() {
    setCargando(true);
    setError(false);
    setIntento((valor) => valor + 1);
  }

  if (cargando) {
    return (
      <div className="lims-lista-aviso" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Cargando pacientes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="lims-lista-aviso" role="alert">
        <span>No se pudo cargar la lista de pacientes.</span>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario lims-btn-chico" onClick={recargar}>
          Reintentar
        </button>
      </div>
    );
  }

  // La búsqueda se hace sobre la lista que ya llegó (no vuelve a pedir nada a la API).
  // El DNI se compara sin puntos ni espacios, así "30.123.456" encuentra a "30123456".
  const texto = busqueda.trim().toLowerCase();
  const digitos = texto.replace(/[.\s]/g, '');
  const visibles = pacientes.filter((paciente) => {
    if (!texto) return true;
    const porNombre = `${paciente.apellido} ${paciente.nombre}`.toLowerCase().includes(texto);
    const porDni = digitos !== '' && paciente.dni.includes(digitos);
    return porNombre || porDni;
  });

  return (
    <section className="lims-lista" aria-labelledby="pacientes-titulo">
      <div className="lims-lista-encabezado">
        <div>
          <h2 id="pacientes-titulo" className="lims-lista-titulo">
            Pacientes registrados
          </h2>
          <p className="lims-lista-resumen mb-0" aria-live="polite">
            Mostrando {visibles.length} de {pacientes.length} pacientes
          </p>
        </div>
        <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => setCreando(true)}>
          <UserPlus className="lims-icono me-2" aria-hidden="true" />
          Nuevo paciente
        </button>
      </div>

      <div className="lims-lista-controles">
        <div className="lims-lista-herramientas">
          <div className="lims-lista-vista" role="group" aria-label="Forma de ver los pacientes">
            {VISTAS.map(({ clave, nombre, icono: Icono }) => (
              <button
                key={clave}
                type="button"
                className="lims-vista-boton"
                aria-pressed={vista === clave}
                onClick={() => setVista(clave)}
              >
                <Icono className="lims-icono" aria-hidden="true" />
                {nombre}
              </button>
            ))}
          </div>
          <div className="lims-lista-busqueda">
            <MagnifyingGlass className="lims-icono" aria-hidden="true" />
            <label htmlFor="buscar-paciente" className="visually-hidden">
              Buscar por DNI, nombre o apellido
            </label>
            <input
              type="search"
              id="buscar-paciente"
              placeholder="Buscar por DNI, nombre o apellido"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="lims-lista-aviso">
          {pacientes.length === 0
            ? 'Todavía no hay pacientes registrados. Use "Nuevo paciente" para dar de alta al primero.'
            : 'No hay pacientes que coincidan con la búsqueda.'}
        </div>
      ) : (
        <div className={`lims-tabla-contenedor${vista === 'tarjetas' ? ' lims-tabla-contenedor--tarjetas' : ''}`}>
          {/* En la vista de tarjetas, cada fila se muestra como tarjeta (ver ListaPerfiles.css): data-label es el texto de cada dato */}
          <table className="table align-middle mb-0 lims-tabla-perfiles">
            <thead>
              <tr>
                <th scope="col">Paciente</th>
                <th scope="col">DNI</th>
                <th scope="col">Obra social</th>
                <th scope="col">Teléfono</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* map(): por cada paciente arma una fila de la tabla, sin repetir código */}
              {visibles.map((paciente) => (
                <tr key={paciente.id}>
                  <td className="lims-celda-nombre">
                    <span className="lims-avatar" aria-hidden="true">
                      {paciente.nombre.charAt(0)}
                      {paciente.apellido.charAt(0)}
                    </span>
                    <span>
                      <span className="lims-celda-nombre-texto">
                        {paciente.apellido}, {paciente.nombre}
                      </span>
                      <span className="lims-celda-identidad">
                        {paciente.fecha_nacimiento
                          ? `Nació el ${new Date(`${paciente.fecha_nacimiento}T00:00:00`).toLocaleDateString('es-AR')}`
                          : 'Sin fecha de nacimiento'}
                      </span>
                    </span>
                  </td>
                  <td data-label="DNI">{paciente.dni}</td>
                  <td data-label="Obra social">
                    <ObraSocial paciente={paciente} />
                  </td>
                  <td data-label="Teléfono">{paciente.telefono || '—'}</td>
                  <td className="text-end lims-celda-acciones">
                    <button
                      type="button"
                      className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                      aria-label={`Editar a ${paciente.apellido}, ${paciente.nombre}`}
                      onClick={() => setEditando(paciente)}
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

      {/* Las ventanas solo existen mientras están abiertas. key: cada paciente arma su propio formulario */}
      {editando && (
        <ModalEditarPerfil
          key={editando.id}
          perfil={perfilDelPaciente(editando)}
          pacienteId={editando.id}
          soloDatos={!esAdmin}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
      {creando && (
        <ModalNuevoPerfil
          soloPacientes
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

export default ListaPacientes;
