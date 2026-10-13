import { useState } from 'react';
import LoginSuccess from '../components/LoginSuccess.jsx';
import PerfilUsuario from '../components/PerfilUsuario.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { ROLES_PERSONAL, cerrarSesion, emailDePersonal, iniciarSesion, useSesion } from '../lib/auth.js';
import './LoginPersonal.css';

// Mismo formato que exige la base de datos para el usuario: 3 a 32 caracteres (minúsculas, números, punto, guion)
function esUsuarioValido(valor) {
  return /^[a-z0-9._-]{3,32}$/.test(valor);
}

function LoginPersonal() {
  // Estados del formulario (useState): cada vez que uno cambia, React vuelve a dibujar la pantalla.
  // usuario y password: lo que el usuario escribe en cada campo
  // error: mensaje cuando los datos no coinciden con las credenciales
  // usuarioInvalido / passwordInvalido: marcan en rojo el campo que quedó vacío o mal escrito
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usuarioInvalido, setUsuarioInvalido] = useState(false);
  const [passwordInvalido, setPasswordInvalido] = useState(false);
  // enviando: true mientras se espera la respuesta del servidor (deshabilita el botón)
  const [enviando, setEnviando] = useState(false);
  // useSesion (src/lib/auth.js) devuelve la sesión activa: cargando (se está verificando), perfil (quién ingresó),
  // fecha (cuándo ingresó) y refrescar (vuelve a leer la sesión)
  const { cargando, perfil, fecha, refrescar } = useSesion(ROLES_PERSONAL);

  // Título y descripción de la pestaña; noindex para que los buscadores no muestren el login
  useMetadatos({
    titulo: 'Login Personal Interno — LIMS Laboratorio',
    descripcion: 'Acceso al sistema interno del laboratorio para el personal autorizado.',
    indexar: false,
  });

  // Se ejecuta al enviar el formulario: valida los campos y pide el ingreso a Supabase
  async function handleSubmit(evento) {
    // Evita que el navegador recargue la página al enviar el formulario
    evento.preventDefault();
    setError('');

    const usuarioLimpio = usuario.trim().toLowerCase();
    const usuarioOk = esUsuarioValido(usuarioLimpio);
    const passwordOk = password !== '';

    setUsuarioInvalido(!usuarioOk);
    setPasswordInvalido(!passwordOk);
    // Si algún campo está mal se corta acá: los errores ya quedaron marcados con los set de arriba
    if (!usuarioOk || !passwordOk) return;

    // Pide el ingreso a Supabase Auth (src/lib/auth.js). Si falla, se muestra el mensaje de error
    setEnviando(true);
    const resultado = await iniciarSesion(emailDePersonal(usuarioLimpio), password, ROLES_PERSONAL);
    setEnviando(false);
    if (resultado.error) {
      setError(
        resultado.error === 'credenciales'
          ? 'Usuario o contraseña incorrectos. Verifique sus credenciales e intente nuevamente.'
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

            {/* Renderizado condicional: mientras se verifica la sesión se avisa; si ya ingresó se muestra la bienvenida
               con su perfil; si no, el formulario. El formulario es controlado: cada input muestra el valor de su estado
               (value) y lo actualiza al escribir (onChange). noValidate desactiva los mensajes del navegador para usar los propios. */}
            {cargando ? (
              <p className="text-muted text-center py-4" role="status">
                Verificando sesión…
              </p>
            ) : perfil ? (
              <LoginSuccess
                heading={`Bienvenido/a, ${perfil.nombre} ${perfil.apellido}`}
                fecha={fecha}
                onLogout={handleLogout}
                logoutLabel="Cerrar sesión"
                variant="dark"
              >
                {/* Perfil traído de la API con Axios (ver PerfilUsuario.jsx) */}
                <PerfilUsuario userId={perfil.id} />
              </LoginSuccess>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="usuario" className="form-label fw-semibold small">
                    Usuario
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
                      Ingrese su usuario: entre 3 y 32 letras, números, puntos o guiones (ej: bioq_perez).
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

                <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold" disabled={enviando}>
                  <i className="fa-solid fa-right-to-bracket me-2" aria-hidden="true"></i>
                  {enviando ? 'Ingresando…' : 'Ingresar al Sistema'}
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
