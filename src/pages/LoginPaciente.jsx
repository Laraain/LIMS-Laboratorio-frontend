import { useState } from 'react';
import LoginSuccess from '../components/LoginSuccess.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import './LoginPaciente.css';
 
const CREDENCIALES = { dni: '30123456', password: 'Paciente2026' };
const SESSION_KEY = 'lims_paciente_activo';
 
// En Argentina el DNI se escribe muchas veces con puntos (30.123.456)
function normalizarDni(valor) {
  return valor.replace(/[.\s]/g, '');
}
 
function esDniValido(valor) {
  return /^\d{7,8}$/.test(valor);
}
 
function leerSesion() {
  try {
    const datos = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (datos && typeof datos.dni === 'string' && typeof datos.fecha === 'string') return datos;
  } catch {
    // Si lo guardado no es un JSON válido, JSON.parse lanza un error: se ignora y no hay sesión
  }
  return null;
}
 
function LoginPaciente() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [dniInvalido, setDniInvalido] = useState(false);
  const [passwordInvalido, setPasswordInvalido] = useState(false);
  const [sesion, setSesion] = useState(() => leerSesion());
 
  useMetadatos({
    titulo: 'Portal del Paciente — LIMS Laboratorio',
    descripcion: 'Ingrese con su DNI y contraseña para consultar sus resultados de laboratorio.',
    indexar: false,
  });
 
  function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
 
    const dniNormalizado = normalizarDni(dni);
    const dniOk = esDniValido(dniNormalizado);
    const passwordOk = password !== '';
 
    setDniInvalido(!dniOk);
    setPasswordInvalido(!passwordOk);
    if (!dniOk || !passwordOk) return;
 
    if (dniNormalizado === CREDENCIALES.dni && password === CREDENCIALES.password) {
      const fecha = new Date().toLocaleString('es-AR');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ dni: dniNormalizado, fecha }));
      setSesion({ dni: dniNormalizado, fecha });
    } else {
      setError('DNI o contraseña incorrectos. Verifique sus datos e intente nuevamente.');
    }
  }
 
  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setSesion(null);
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
          <p className="text-muted mb-4">Use su DNI y la contraseña que definió al registrarse.</p>
 
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
 
          {sesion ? (
            <LoginSuccess
              heading={`Bienvenido/a, DNI ${sesion.dni}`}
              fecha={sesion.fecha}
              onLogout={handleLogout}
              logoutLabel="Cerrar sesión"
              variant="primary"
            />
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
 
              <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold">
                <i className="fa-solid fa-right-to-bracket me-2" aria-hidden="true"></i>
                Ingresar
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
 
export default LoginPaciente;
