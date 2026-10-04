import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import LoginLayout from '../components/LoginLayout.jsx';
import LoginSuccess from '../components/LoginSuccess.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
// Foto de Gabrielle Henderson en Unsplash (licencia libre)
import fotoPaciente from '../assets/login/login-paciente.webp';
 
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
    // sessionStorage puede estar bloqueado o con un valor corrupto: nunca debe romper la página
  }
  return null;
}
 
function guardarSesion(dni, fecha) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ dni, fecha }));
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
    descripcion: 'Ingrese con su DNI para consultar y descargar sus resultados de laboratorio.',
    ruta: '/login-paciente',
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
      guardarSesion(dniNormalizado, fecha);
      setSesion({ dni: dniNormalizado, fecha });
    } else {
      setError('DNI o contraseña incorrectos. Verifique sus datos e intente nuevamente.');
    }
  }
 
  function handleLogout() {
    borrarSesion();
    setSesion(null);
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

      {sesion ? (
        <LoginSuccess
          heading={`Bienvenido/a, DNI ${sesion.dni}`}
          fecha={sesion.fecha}
          onLogout={handleLogout}
          logoutLabel="Cerrar sesión"
          variant="primary"
        />
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

          <button type="submit" className="btn lims-btn-pill lims-btn-primario lims-btn-grande w-100">
            Ingresar
          </button>
        </form>
      )}
    </LoginLayout>
  );
}
 
export default LoginPaciente;
