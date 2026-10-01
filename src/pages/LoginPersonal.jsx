import { useEffect, useState } from 'react';
import LoginSuccess from '../components/LoginSuccess.jsx';
import './LoginPersonal.css';

const CREDENCIALES = { usuario: 'bioq_perez', password: 'Lab2026!' };
const SESSION_KEY = 'lims_personal_activo';

function leerSesion() {
  try {
    const datos = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (datos && typeof datos.usuario === 'string' && typeof datos.fecha === 'string') return datos;
  } catch {
    // sessionStorage puede estar bloqueado o con un valor corrupto: nunca debe romper la página
  }
  return null;
}

function guardarSesion(usuario, fecha) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ usuario, fecha }));
  } catch {
    // ver leerSesion()
  }
}

function borrarSesion() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ver leerSesion()
  }
}

function LoginPersonal() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usuarioInvalido, setUsuarioInvalido] = useState(false);
  const [passwordInvalido, setPasswordInvalido] = useState(false);
  const [sesion, setSesion] = useState(() => leerSesion());

  useEffect(() => {
    document.title = 'Login Personal Interno — LIMS Laboratorio';
  }, []);

  function handleSubmit(evento) {
    evento.preventDefault();
    setError('');

    const usuarioLimpio = usuario.trim();
    const usuarioOk = usuarioLimpio !== '';
    const passwordOk = password !== '';

    setUsuarioInvalido(!usuarioOk);
    setPasswordInvalido(!passwordOk);
    if (!usuarioOk || !passwordOk) return;

    if (usuarioLimpio === CREDENCIALES.usuario && password === CREDENCIALES.password) {
      const fecha = new Date().toLocaleString('es-AR');
      guardarSesion(usuarioLimpio, fecha);
      setSesion({ usuario: usuarioLimpio, fecha });
    } else {
      setError('Usuario o contraseña incorrectos. Verifique sus credenciales e intente nuevamente.');
    }
  }

  function handleLogout() {
    borrarSesion();
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
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

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
