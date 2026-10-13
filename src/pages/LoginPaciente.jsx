import { useState } from 'react';
import LoginSuccess from '../components/LoginSuccess.jsx';
import PerfilUsuario from '../components/PerfilUsuario.jsx';
import PrimerIngreso from '../components/PrimerIngreso.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { cerrarSesion, emailDePaciente, iniciarSesion, useSesion } from '../lib/auth.js';
import './LoginPaciente.css';

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
    <main id="contenido" className="py-5 d-flex justify-content-center px-3">
      <div className="row g-0 shadow-lg rounded-4 overflow-hidden w-100 lims-login-card">
        <div className="col-md-5 lims-login-aside text-white p-4 p-md-5 d-flex flex-column">
          <p className="h2 fw-bold mt-4 mb-3 text-white">Sus resultados, cuando los necesite</p>
          <p className="mb-4 lims-login-aside-text">
            Consulte informes validados, el estado de sus muestras y sus turnos desde un solo lugar.
          </p>
          <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
            <li className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-circle-check text-success" aria-hidden="true"></i>
              <span className="small">Informes con firma electrónica</span>
            </li>
            <li className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-circle-check text-success" aria-hidden="true"></i>
              <span className="small">Estado de la muestra en tiempo real</span>
            </li>
            <li className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-circle-check text-success" aria-hidden="true"></i>
              <span className="small">Historial completo descargable</span>
            </li>
          </ul>
        </div>

        <div className="col-md-7 bg-white p-4 p-md-5 d-flex flex-column justify-content-center">
          <span className="lims-login-badge mb-3">
            <i className="fa-solid fa-user" aria-hidden="true"></i>Portal del paciente
          </span>
          <h1 className="h3 fw-bold text-dark mb-2">Ingrese a su cuenta</h1>
          <p className="text-muted mb-4">
            Use su DNI y la contraseña que le entregó el laboratorio, o la que eligió en su primer ingreso.
          </p>

          {/* && : el cartel de error solo se muestra si error tiene texto */}
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
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="dni" className="form-label fw-semibold small">
                  DNI
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="fa-solid fa-id-card text-muted" aria-hidden="true"></i>
                  </span>
                  <input
                    type="text"
                    className={`form-control ${dniInvalido ? 'is-invalid' : ''}`}
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

              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-semibold small">
                  Contraseña
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="fa-solid fa-lock text-muted" aria-hidden="true"></i>
                  </span>
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    className={`form-control ${passwordInvalido ? 'is-invalid' : ''}`}
                    id="password"
                    placeholder="••••••••"
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
                    className="input-group-text bg-white"
                    aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setMostrarPassword((valor) => !valor)}
                  >
                    <i
                      className={`fa-regular ${mostrarPassword ? 'fa-eye-slash' : 'fa-eye'} text-muted`}
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>
                {passwordInvalido && (
                  <div className="invalid-feedback d-block" id="passwordError">
                    Ingrese su contraseña.
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={enviando}>
                <i className="fa-solid fa-right-to-bracket me-2" aria-hidden="true"></i>
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default LoginPaciente;
