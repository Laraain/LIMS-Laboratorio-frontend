import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import LoginLayout from '../components/LoginLayout.jsx';
import PrimerIngreso from '../components/PrimerIngreso.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { ROLES_PERSONAL, cerrarSesion, emailDePersonal, iniciarSesion, useSesion } from '../lib/auth.js';
// Foto de National Cancer Institute en Unsplash (licencia libre)
import fotoPersonal from '../assets/login/login-personal.webp';

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
  // useSesion (src/lib/auth.js) devuelve la sesión activa: cargando (se está verificando), perfil (quién ingresó)
  // y refrescar (vuelve a leer la sesión)
  const { cargando, perfil, refrescar } = useSesion(ROLES_PERSONAL);

  // Título y descripción de la pestaña; noindex para que los buscadores no muestren el login
  useMetadatos({
    titulo: 'Login Personal Interno — LIMS Laboratorio',
    descripcion: 'Acceso al sistema interno del laboratorio para el personal autorizado.',
    ruta: '/login-personal',
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

  // Con la sesión iniciada se entra al panel del personal (salvo que todavía tenga la contraseña provisoria:
  // antes tiene que elegir una propia)
  if (perfil && !perfil.debe_cambiar_password) return <Navigate to="/panel" replace />;

  return (
    <LoginLayout
      etiqueta="Acceso del personal"
      titulo="Ingreso al sistema"
      descripcion="Use su usuario y su contraseña para gestionar muestras y validar resultados."
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

      {/* Renderizado condicional: mientras se verifica la sesión se avisa; si todavía usa la contraseña provisoria
         se le pide elegir una propia; si no, el formulario. Con la sesión completa ya se redirigió al panel (arriba). */}
      {cargando ? (
        <p className="text-muted text-center py-4" role="status">
          Verificando sesión…
        </p>
      ) : perfil?.debe_cambiar_password ? (
        <PrimerIngreso nombre={perfil.nombre} pedirEmail={false} onCompletado={refrescar} onCancelar={handleLogout} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="lims-login-form">
          <div>
            <label htmlFor="usuario" className="lims-login-label">
              Usuario
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
                Ingrese su usuario: entre 3 y 32 letras, números, puntos o guiones (ej: bioq_perez).
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

          <button
            type="submit"
            className="btn lims-btn-pill lims-btn-primario lims-btn-grande w-100"
            disabled={enviando}
          >
            {enviando ? 'Ingresando…' : 'Ingresar al sistema'}
          </button>
        </form>
      )}
    </LoginLayout>
  );
}
 
export default LoginPersonal;
