import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { supabase } from '../lib/supabase.js';
import './PerfilUsuario.css';

// La URL de la API NO se escribe en el código: viene del archivo .env (variable VITE_API_URL).
// Es la dirección de la API REST de Supabase, con la forma https://<proyecto>.supabase.co/rest/v1
const API_URL = import.meta.env.VITE_API_URL;
// Clave pública del proyecto (también viene del .env): Supabase la pide en cada petición
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Nombre legible de cada rol que guarda la base de datos
const ROLES = {
  paciente: 'Paciente',
  admin: 'Administrador',
  bioquimico: 'Bioquímico',
  tecnico: 'Técnico',
  recepcion: 'Recepción',
};

// Muestra los datos de la cuenta que ingresó. Los pide a la API con Axios apenas aparece en pantalla.
// Prop userId: el id de la persona, que recibe desde el login.
function PerfilUsuario({ userId }) {
  // Estados (useState): cada vez que uno cambia, React vuelve a dibujar el componente
  // perfil: los datos que devolvió la API (null mientras no llegaron)
  // cargando: true hasta que la API responde, para mostrar el aviso de carga
  // error: true si la petición falló, para mostrar el mensaje y el botón "Reintentar"
  // intento: se suma 1 al apretar "Reintentar"; como el useEffect depende de él, vuelve a hacer la petición
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  // useEffect: la petición se hace al aparecer el componente y de nuevo solo si cambia userId o intento
  useEffect(() => {
    // vigente pasa a false si el componente desaparece antes de que llegue la respuesta (por ejemplo, al cerrar sesión):
    // en ese caso se descarta el resultado en vez de guardarlo
    let vigente = true;

    async function cargarPerfil() {
      try {
        if (!API_URL) throw new Error('Falta VITE_API_URL en el archivo .env');

        // Supabase identifica a quien consulta con el token de su sesión: así la base devuelve
        // solo lo que esa persona puede ver (políticas de seguridad RLS)
        const { data: sesion } = await supabase.auth.getSession();
        const token = sesion.session?.access_token;

        // GET a la tabla "perfiles". params arma lo que va después del "?" de la URL:
        // select = qué columnas traer (pacientes y personal son datos de otras tablas relacionadas) · id = de quién (eq. significa "igual a")
        const response = await axios.get(`${API_URL}/perfiles`, {
          headers: { apikey: API_KEY, Authorization: `Bearer ${token}` },
          params: {
            select: 'nombre,apellido,rol,telefono,activo,created_at,pacientes(dni),personal(usuario,matricula,cargo)',
            id: `eq.${userId}`,
          },
        });

        // La API devuelve una lista; como se filtró por id, el perfil es su único elemento
        if (vigente) setPerfil(response.data[0] ?? null);
      } catch (errorPeticion) {
        if (!vigente) return;
        console.error('No se pudo cargar el perfil:', errorPeticion);
        setError(true);
        // SweetAlert2: ventana para avisarle al usuario que algo falló
        Swal.fire({
          icon: 'error',
          title: 'No pudimos cargar su perfil',
          text: 'Verifique su conexión e intente nuevamente.',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#1c4e80',
        });
      } finally {
        if (vigente) setCargando(false);
      }
    }

    cargarPerfil();
    return () => {
      vigente = false;
    };
  }, [userId, intento]);

  // Vuelve a pedir los datos: reinicia los estados y cambia intento para que se ejecute el useEffect
  function handleReintentar() {
    setCargando(true);
    setError(false);
    setIntento((valor) => valor + 1);
  }

  if (cargando) {
    return (
      <div className="lims-perfil lims-perfil-aviso" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Cargando su perfil…
      </div>
    );
  }

  if (error) {
    return (
      <div className="lims-perfil lims-perfil-aviso" role="alert">
        <span>No se pudo cargar su perfil.</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleReintentar}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!perfil) {
    return <div className="lims-perfil lims-perfil-aviso">No encontramos los datos de su perfil.</div>;
  }

  // Filas a mostrar. Las que no tienen valor (por ejemplo "DNI" en el personal) se descartan con filter
  const filas = [
    { etiqueta: 'Nombre', valor: `${perfil.nombre} ${perfil.apellido}` },
    { etiqueta: 'Rol', valor: ROLES[perfil.rol] ?? perfil.rol },
    { etiqueta: 'DNI', valor: perfil.pacientes?.dni },
    { etiqueta: 'Usuario', valor: perfil.personal?.usuario },
    { etiqueta: 'Matrícula', valor: perfil.personal?.matricula },
    { etiqueta: 'Cargo', valor: perfil.personal?.cargo },
    { etiqueta: 'Teléfono', valor: perfil.telefono },
    { etiqueta: 'Cuenta', valor: perfil.activo ? 'Activa' : 'Inactiva' },
    { etiqueta: 'Alta', valor: new Date(perfil.created_at).toLocaleDateString('es-AR') },
  ].filter((fila) => fila.valor);

  return (
    <section className="lims-perfil" aria-labelledby="perfil-titulo">
      <h3 id="perfil-titulo" className="lims-perfil-titulo">
        Mi perfil
      </h3>
      <dl className="lims-perfil-lista">
        {/* map(): por cada fila arma un par etiqueta-valor, sin repetir código */}
        {filas.map((fila) => (
          <div key={fila.etiqueta} className="lims-perfil-fila">
            <dt>{fila.etiqueta}</dt>
            <dd>{fila.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default PerfilUsuario;
