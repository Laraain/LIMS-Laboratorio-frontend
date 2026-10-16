import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import LoginLayout from '../components/LoginLayout.jsx';
import LoginSuccess from '../components/LoginSuccess.jsx';
import PerfilUsuario from '../components/PerfilUsuario.jsx';
import PrimerIngreso from '../components/PrimerIngreso.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { cerrarSesion, emailDePaciente, iniciarSesion, useSesion } from '../lib/auth.js';
// Foto de Gabrielle Henderson en Unsplash (licencia libre)
import fotoPaciente from '../assets/login/login-paciente.webp';

// Roles que pueden entrar a este portal: la cuenta tiene que ser de un paciente
const ROLES_PORTAL = ['paciente'];

// En Argentina el DNI se escribe muchas veces con puntos (30.123.456)
function normalizarDni(valor) {
  return valor.replace(/[.\s]/g, '');
}

// Valida que tenga solo números y entre 7 y 8 dígitos (expresión regular)
function esDniValido(valor) {
  return /^\d{7,8}$/.test(valor);
}

function LoginPaciente() {
  // Estados del formulario (useState): cada vez que uno cambia, React vuelve a dibujar la pantalla.
  // dni y password: lo que el usuario escribe en cada campo
  // mostrarPassword: si la contraseña se ve o queda oculta con puntos
  // error: mensaje cuando los datos no coinciden con las credenciales
  // dniInvalido / passwordInvalido: marcan en rojo el campo que quedó vacío o mal escrito
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [dniInvalido, setDniInvalido] = useState(false);
  const [passwordInvalido, setPasswordInvalido] = useState(false);
  // enviando: true mientras se espera la respuesta del servidor (deshabilita el botón)
  const [enviando, setEnviando] = useState(false);
  // useSesion (src/lib/auth.js) devuelve la sesión activa: cargando (se está verificando), perfil (quién ingresó),
  // fecha (cuándo ingresó) y refrescar (vuelve a leer la sesión)
  const { cargando, perfil, fecha, refrescar } = useSesion(ROLES_PORTAL);

  // Título y descripción de la pestaña; noindex para que los buscadores no muestren el login
  useMetadatos({
    titulo: 'Portal del Paciente — LIMS Laboratorio',
    descripcion: 'Ingrese con su DNI y contraseña para consultar sus resultados de laboratorio.',
    ruta: '/login-paciente',
    indexar: false,
  });

  // Se ejecuta al enviar el formulario: valida los campos y pide el ingreso a Supabase
  async function handleSubmit(evento) {
    // Evita que el navegador recargue la página al enviar el formulario
    evento.preventDefault();
    setError('');

    const dniNormalizado = normalizarDni(dni);
    const dniOk = esDniValido(dniNormalizado);
    const passwordOk = password !== '';

    setDniInvalido(!dniOk);
    setPasswordInvalido(!passwordOk);
    // Si algún campo está mal se corta acá: los errores ya quedaron marcados con los set de arriba
    if (!dniOk || !passwordOk) return;

    // Pide el ingreso a Supabase Auth (src/lib/auth.js). Si falla, se muestra el mensaje de error
    setEnviando(true);
    const resultado = await iniciarSesion(emailDePaciente(dniNormalizado), password, ROLES_PORTAL);
    setEnviando(false);
    if (resultado.error) {
      setError(
        resultado.error === 'credenciales'
          ? 'DNI o contraseña incorrectos. Verifique sus datos e intente nuevamente.'
          : resultado.error,
      );
      return;
    }
    setPassword('');
    await refrescar();
  }

  // Cierra la sesión en Supabase y deja el formulario vacío
  async function handleLogout() {
    await cerrarSesion();
    setDni('');
    setPassword('');
    setDniInvalido(false);
    setPasswordInvalido(false);
  }

  return (
    <LoginLayout
      etiqueta="Portal del paciente"
      titulo="Ingrese a su cuenta"
      descripcion="Use su DNI y su contraseña. Si es su primer ingreso, use la contraseña provisoria que le entregamos en recepción."
      foto={fotoPaciente}
      altFoto="Mujer en un sillón de su casa mirando el celular"
      leyenda="Sus resultados, validados por un bioquímico matriculado, disponibles desde el celular."
      pie={
        <>
          ¿Es parte del personal? <Link to="/login-personal">Acceso personal</Link>
        </>
      }
    >
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Renderizado condicional: mientras se verifica la sesión se avisa; si el paciente todavía usa la contraseña
         provisoria se le pide elegir una propia; si ya ingresó se muestra la bienvenida con su perfil; si no, el formulario.
         El formulario es controlado: cada input muestra el valor de su estado (value) y lo actualiza al escribir (onChange).
         noValidate desactiva los mensajes del navegador para usar los propios. */}
      {cargando ? (
        <p className="text-muted text-center py-4" role="status">
          Verificando sesión…
        </p>
      ) : perfil?.debe_cambiar_password ? (
        <PrimerIngreso nombre={perfil.nombre} onCompletado={refrescar} onCancelar={handleLogout} />
      ) : perfil ? (
        <LoginSuccess
          heading={`Bienvenido/a, ${perfil.nombre} ${perfil.apellido}`}
          fecha={fecha}
          onLogout={handleLogout}
          logoutLabel="Cerrar sesión"
          variant="primary"
        >
          {/* Perfil traído de la API con Axios (ver PerfilUsuario.jsx) */}
          <PerfilUsuario userId={perfil.id} />
        </LoginSuccess>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="lims-login-form">
          <div>
            <label htmlFor="dni" className="lims-login-label">
              DNI
            </label>
            <div className={`lims-campo${dniInvalido ? ' is-invalid' : ''}`}>
              <input
                type="text"
                id="dni"
                placeholder="Ej: 30123456"
                required
                inputMode="numeric"
                maxLength={14}
                autoComplete="username"
                aria-describedby="dniError"
                aria-invalid={dniInvalido}
                value={dni}
                onChange={(evento) => {
                  setDni(evento.target.value);
                  setDniInvalido(false);
                }}
              />
            </div>
            {dniInvalido && (
              <div className="invalid-feedback d-block" id="dniError">
                Ingrese su DNI: solo números, 7 u 8 dígitos.
              </div>
            )}
          </div>

          <div>
            <div className="lims-login-fila-label">
              <label htmlFor="password" className="lims-login-label">
                Contraseña
              </label>
              <Link to="/#contacto" className="lims-login-link">
                ¿Olvidó su contraseña?
              </Link>
            </div>
            <div className={`lims-campo${passwordInvalido ? ' is-invalid' : ''}`}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                id="password"
                placeholder="Su contraseña"
                required
                maxLength={128}
                autoComplete="current-password"
                aria-describedby="passwordError"
                aria-invalid={passwordInvalido}
                value={password}
                onChange={(evento) => {
                  setPassword(evento.target.value);
                  setPasswordInvalido(false);
                }}
              />
              <button
                type="button"
                className="lims-campo-boton"
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setMostrarPassword((valor) => !valor)}
              >
                {mostrarPassword ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {passwordInvalido && (
              <div className="invalid-feedback d-block" id="passwordError">
                Ingrese su contraseña.
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn lims-btn-pill lims-btn-primario lims-btn-grande w-100"
            disabled={enviando}
          >
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      )}
    </LoginLayout>
  );
}
 
export default LoginPaciente;
