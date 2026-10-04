import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoginLayout from '../components/LoginLayout.jsx';
import LoginSuccess from '../components/LoginSuccess.jsx';
// Foto de National Cancer Institute en Unsplash (licencia libre)
import fotoPersonal from '../assets/login/login-personal.webp';
 
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
    <LoginLayout
      etiqueta="Acceso del personal"
      titulo="Ingreso al sistema"
      descripcion="Use su usuario o matrícula y su contraseña para gestionar muestras y validar resultados."
      foto={fotoPersonal}
      altFoto="Bioquímica trabajando con el microscopio en el laboratorio"
      leyenda="Todos los accesos y las validaciones de resultados quedan registrados con usuario, fecha y hora."
      pie={
        <>
          ¿Es paciente? <Link to="/login-paciente">Ver mis resultados</Link>
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
          heading={`Bienvenido/a, ${sesion.usuario}`}
          fecha={sesion.fecha}
          onLogout={handleLogout}
          logoutLabel="Cerrar sesión"
          variant="primary"
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="lims-login-form">
          <div>
            <label htmlFor="usuario" className="lims-login-label">
              Usuario o matrícula
            </label>
            <div className={`lims-campo${usuarioInvalido ? ' is-invalid' : ''}`}>
              <input
                type="text"
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

          <div>
            <label htmlFor="password" className="lims-login-label">
              Contraseña
            </label>
            <div className={`lims-campo${passwordInvalido ? ' is-invalid' : ''}`}>
              <input
                type="password"
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
            </div>
            {passwordInvalido && (
              <div className="invalid-feedback d-block" id="passwordError">
                Ingrese su contraseña.
              </div>
            )}
          </div>

          <button type="submit" className="btn lims-btn-pill lims-btn-primario lims-btn-grande w-100">
            Ingresar al sistema
          </button>
        </form>
      )}
    </LoginLayout>
  );
}
 
export default LoginPersonal;
