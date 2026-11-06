import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import LoginLayout from '../components/LoginLayout.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import { mensajeDeError } from '../lib/auth.js';
import { guardarPasswordRecuperada } from '../lib/password.js';
import { supabase, supabaseConfigurado } from '../lib/supabase.js';
// Foto de Gabrielle Henderson en Unsplash (licencia libre)
import fotoPaciente from '../assets/login/login-paciente.webp';

const LARGO_MINIMO = 8;

// Lee el error que deja Supabase en la dirección cuando el link no sirve (ej: #error_code=otp_expired)
function errorDelLink() {
  const datos = new URLSearchParams(window.location.hash.slice(1));
  if (!datos.get('error')) return '';
  return datos.get('error_code') === 'otp_expired'
    ? 'El link venció o ya se usó. Pida uno nuevo desde el ingreso del portal.'
    : 'El link no es válido. Pida uno nuevo desde el ingreso del portal.';
}

// Destino del link que llega por mail (LIMS-45). Supabase abre la sesión con el link
// (lo lee de la dirección al cargar la página) y acá el paciente elige su contraseña nueva.
function RestablecerPassword() {
  const navigate = useNavigate();
  // estado: verificando · listo (hay sesión, se muestra el formulario) · invalido
  const [motivo, setMotivo] = useState(() => errorDelLink());
  const [estado, setEstado] = useState(() => (supabaseConfigurado && !errorDelLink() ? 'verificando' : 'invalido'));
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useMetadatos({
    titulo: 'Restablecer contraseña — LIMS Laboratorio',
    descripcion: 'Elija una contraseña nueva para el portal de resultados.',
    ruta: '/restablecer-password',
    indexar: false,
  });

  useEffect(() => {
    if (estado !== 'verificando') return undefined;
    let vigente = true;
    // PASSWORD_RECOVERY llega cuando Supabase terminó de leer el link
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (vigente && (evento === 'PASSWORD_RECOVERY' || (evento === 'INITIAL_SESSION' && sesion))) setEstado('listo');
    });
    // Si en unos segundos no hay sesión, el link no sirvió
    const espera = setTimeout(async () => {
      const { data: actual } = await supabase.auth.getSession();
      if (!vigente) return;
      if (actual.session) setEstado('listo');
      else {
        setMotivo('El link no es válido. Pida uno nuevo desde el ingreso del portal.');
        setEstado('invalido');
      }
    }, 4000);
    return () => {
      vigente = false;
      clearTimeout(espera);
      data.subscription.unsubscribe();
    };
  }, [estado]);

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    const nuevosErrores = {
      password: password.length < LARGO_MINIMO,
      confirmacion: confirmacion !== password,
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setEnviando(true);
    try {
      await guardarPasswordRecuperada(password);
      navigate('/mis-estudios', { replace: true });
    } catch (errorGuardado) {
      console.error('No se pudo guardar la contraseña nueva:', errorGuardado);
      const detalle = errorGuardado?.message ?? '';
      setError(
        /pedido de recuperación/i.test(detalle)
          ? 'El pedido venció. Pida un link nuevo desde el ingreso del portal.'
          : /should be different from the old password/i.test(detalle)
            ? 'La contraseña nueva tiene que ser distinta de la que tenía.'
            : mensajeDeError(errorGuardado),
      );
      setEnviando(false);
    }
  }

  return (
    <LoginLayout
      etiqueta="Portal del paciente"
      titulo="Elija una contraseña nueva"
      descripcion="Va a usarla, junto con su DNI, para ingresar al portal de resultados."
      foto={fotoPaciente}
      altFoto="Mujer en un sillón de su casa mirando el celular"
      leyenda="Sus resultados, validados por un bioquímico matriculado, disponibles desde el celular."
      pie={<Link to="/login-paciente">Volver al ingreso</Link>}
    >
      {estado === 'verificando' && (
        <p className="text-muted text-center py-4" role="status">
          Verificando el link…
        </p>
      )}

      {estado === 'invalido' && (
        <div className="lims-login-form">
          <div className="alert alert-danger mb-0" role="alert">
            {motivo || 'El link no es válido. Pida uno nuevo desde el ingreso del portal.'}
          </div>
          <Link to="/login-paciente" className="btn lims-btn-pill lims-btn-primario w-100">
            Ir al ingreso
          </Link>
        </div>
      )}

      {estado === 'listo' && (
        <form onSubmit={handleSubmit} noValidate className="lims-login-form">
          {error && (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="password-nueva" className="lims-login-label">
              Contraseña nueva
            </label>
            <div className={`lims-campo${errores.password ? ' is-invalid' : ''}`}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                id="password-nueva"
                maxLength={128}
                autoComplete="new-password"
                aria-describedby="passwordNuevaError"
                aria-invalid={Boolean(errores.password)}
                value={password}
                onChange={(evento) => {
                  setPassword(evento.target.value);
                  setErrores((previos) => ({ ...previos, password: false }));
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
            {errores.password && (
              <div className="invalid-feedback d-block" id="passwordNuevaError">
                Use al menos {LARGO_MINIMO} caracteres.
              </div>
            )}
          </div>
          <div>
            <label htmlFor="password-confirmacion" className="lims-login-label">
              Repita la contraseña
            </label>
            <div className={`lims-campo${errores.confirmacion ? ' is-invalid' : ''}`}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                id="password-confirmacion"
                maxLength={128}
                autoComplete="new-password"
                aria-describedby="passwordConfirmacionError"
                aria-invalid={Boolean(errores.confirmacion)}
                value={confirmacion}
                onChange={(evento) => {
                  setConfirmacion(evento.target.value);
                  setErrores((previos) => ({ ...previos, confirmacion: false }));
                }}
              />
            </div>
            {errores.confirmacion && (
              <div className="invalid-feedback d-block" id="passwordConfirmacionError">
                Las contraseñas no coinciden.
              </div>
            )}
          </div>
          <button type="submit" className="btn lims-btn-pill lims-btn-primario lims-btn-grande w-100" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar y entrar'}
          </button>
        </form>
      )}
    </LoginLayout>
  );
}

export default RestablecerPassword;
