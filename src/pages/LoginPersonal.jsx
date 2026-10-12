import { useState } from 'react';
import LoginSuccess from '../components/LoginSuccess.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import './LoginPersonal.css';
 
// Credenciales fijas de prueba: el login es simulado, todavía no hay base de datos.
// SESSION_KEY es el nombre con el que se guarda la sesión en sessionStorage.
const CREDENCIALES = { usuario: 'bioq_perez', password: 'Lab2026!' };
const SESSION_KEY = 'lims_personal_activo';
 
// Lee la sesión guardada en sessionStorage, que dura mientras la pestaña esté abierta (aunque se recargue la página).
// Devuelve los datos si son válidos, o null si no hay sesión.
function leerSesion() {
  try {
    const datos = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (datos && typeof datos.usuario === 'string' && typeof datos.fecha === 'string') return datos;
  } catch {
    // Si lo guardado no es un JSON válido, JSON.parse lanza un error: se ignora y no hay sesión
  }
  return null;
}
 
function LoginPersonal() {
  // Estados del formulario (useState): cada vez que uno cambia, React vuelve a dibujar la pantalla.
  // usuario y password: lo que el usuario escribe en cada campo
  // error: mensaje cuando los datos no coinciden con las credenciales
  // usuarioInvalido / passwordInvalido: marcan en rojo el campo que quedó vacío o mal escrito
  // sesion: datos de la sesión iniciada; se lee de sessionStorage una sola vez, al cargar la página
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usuarioInvalido, setUsuarioInvalido] = useState(false);
  const [passwordInvalido, setPasswordInvalido] = useState(false);
  const [sesion, setSesion] = useState(() => leerSesion());
 
  // Título y descripción de la pestaña; noindex para que los buscadores no muestren el login
  useMetadatos({
    titulo: 'Login Personal Interno — LIMS Laboratorio',
    descripcion: 'Acceso al sistema interno del laboratorio para el personal autorizado.',
    indexar: false,
  });
 
  // Se ejecuta al enviar el formulario: valida los campos y los compara con las credenciales
  function handleSubmit(evento) {
    // Evita que el navegador recargue la página al enviar el formulario
    evento.preventDefault();
    setError('');
 
    const usuarioLimpio = usuario.trim();
    const usuarioOk = usuarioLimpio !== '';
    const passwordOk = password !== '';
 
    setUsuarioInvalido(!usuarioOk);
    setPasswordInvalido(!passwordOk);
    // Si algún campo está mal se corta acá: los errores ya quedaron marcados con los set de arriba
    if (!usuarioOk || !passwordOk) return;
 
    // Si coinciden con las credenciales se guarda la sesión y se muestra la bienvenida; si no, el mensaje de error
    if (usuarioLimpio === CREDENCIALES.usuario && password === CREDENCIALES.password) {
      const fecha = new Date().toLocaleString('es-AR');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ usuario: usuarioLimpio, fecha }));
      setSesion({ usuario: usuarioLimpio, fecha });
    } else {
      setError('Usuario o contraseña incorrectos. Verifique sus credenciales e intente nuevamente.');
    }
  }
 
  // Cierra la sesión: la borra de sessionStorage y deja el formulario vacío
  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setSesion(null);
    setUsuario('');
    setPassword('');
    setUsuarioInvalido(false);
    setPasswordInvalido(false);
  }
 
  return (
    <main id="contenido" className="d-flex justify-content-center align-items-center py-5 lims-login-personal-main">
      <div className="w-100 mx-3 lims-login-personal-card">
        <div className="text-center mb-4">
          <span className="lims-login-icon mb-3">
            <i className="fa-solid fa-user-shield" aria-hidden="true"></i>
          </span>
          <h1 className="h4 text-primary fw-bold">Acceso Personal Interno</h1>
          <p className="text-muted small mb-0">Ingrese sus credenciales de sistema para continuar</p>
        </div>
 
        <div className="card shadow-lg border-0">
          <div className="card-body p-4 p-md-5">
            {/* && : el cartel de error solo se muestra si error tiene texto */}
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
 
            {/* Renderizado condicional: si hay sesión se muestra la bienvenida; si no, el formulario.
               El formulario es controlado: cada input muestra el valor de su estado (value) y lo actualiza al escribir (onChange).
               noValidate desactiva los mensajes del navegador para usar los propios. */}
            {sesion ? (
              <LoginSuccess
                heading={`Bienvenido/a, ${sesion.usuario}`}
                fecha={sesion.fecha}
                onLogout={handleLogout}
                logoutLabel="Cerrar sesión"
                variant="dark"
              />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="usuario" className="form-label fw-semibold small">
                    Usuario / Matrícula
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="fa-solid fa-user text-muted" aria-hidden="true"></i>
                    </span>
                    <input
                      type="text"
                      className={`form-control ${usuarioInvalido ? 'is-invalid' : ''}`}
                      id="usuario"
                      placeholder="Ej: bioq_perez"
                      required
                      maxLength={64}
                      autoComplete="username"
                      aria-describedby="usuarioError"
                      aria-invalid={usuarioInvalido}
                      value={usuario}
                      onChange={(evento) => {
                        setUsuario(evento.target.value);
                        setUsuarioInvalido(false);
                      }}
                    />
                  </div>
                  {usuarioInvalido && (
                    <div className="invalid-feedback d-block" id="usuarioError">
                      Ingrese su usuario o matrícula.
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
                      type="password"
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
                  </div>
                  {passwordInvalido && (
                    <div className="invalid-feedback d-block" id="passwordError">
                      Ingrese su contraseña.
                    </div>
                  )}
                </div>
 
                <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold">
                  <i className="fa-solid fa-right-to-bracket me-2" aria-hidden="true"></i>
                  Ingresar al Sistema
                </button>
              </form>
            )}
          </div>
        </div>
 
        <div className="d-flex gap-2 mt-3 p-3 rounded-3 lims-login-note">
          <i className="fa-solid fa-shield-halved text-primary mt-1" aria-hidden="true"></i>
          <p className="mb-0 small text-muted">
            Todos los accesos y las validaciones de resultados quedan registrados con usuario, fecha y hora.
          </p>
        </div>
      </div>
    </main>
  );
}
 
export default LoginPersonal;
