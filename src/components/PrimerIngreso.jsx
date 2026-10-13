import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { mensajeDeError } from '../lib/auth.js';

const LARGO_MINIMO = 8;

function esEmailValido(valor) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor);
}

// Primer ingreso del paciente: reemplaza la contraseña provisoria que le entregó
// el laboratorio y carga el email donde va a recibir los avisos de sus resultados.
function PrimerIngreso({ nombre, onCompletado, onCancelar }) {
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [email, setEmail] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');

    const emailLimpio = email.trim();
    const nuevosErrores = {
      password: password.length < LARGO_MINIMO,
      confirmacion: confirmacion !== password,
      email: !esEmailValido(emailLimpio),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setEnviando(true);
    const { error: errorPassword } = await supabase.auth.updateUser({ password });
    if (errorPassword) {
      setError(mensajeDeError(errorPassword));
      setEnviando(false);
      return;
    }

    const { error: errorAlta } = await supabase.rpc('completar_primer_ingreso', { p_email: emailLimpio });
    setEnviando(false);
    if (errorAlta) {
      setError('Su contraseña se cambió, pero no se pudo guardar el email. Intente nuevamente.');
      return;
    }
    onCompletado();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="alert alert-info small" role="status">
        <strong>Hola, {nombre}.</strong> Es su primer ingreso: elija una contraseña propia y cargue el email
        donde quiere recibir el aviso cuando sus resultados estén listos.
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="nuevaPassword" className="form-label fw-semibold small">
          Nueva contraseña
        </label>
        <div className="input-group">
          <span className="input-group-text bg-white">
            <i className="fa-solid fa-lock text-muted" aria-hidden="true"></i>
          </span>
          <input
            type={mostrarPassword ? 'text' : 'password'}
            className={`form-control ${errores.password ? 'is-invalid' : ''}`}
            id="nuevaPassword"
            required
            maxLength={128}
            autoComplete="new-password"
            aria-describedby="nuevaPasswordAyuda"
            aria-invalid={Boolean(errores.password)}
            value={password}
            onChange={(evento) => {
              setPassword(evento.target.value);
              setErrores((previos) => ({ ...previos, password: false }));
            }}
          />
          <button
            type="button"
            className="input-group-text bg-white"
            aria-label={mostrarPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
            onClick={() => setMostrarPassword((valor) => !valor)}
          >
            <i
              className={`fa-regular ${mostrarPassword ? 'fa-eye-slash' : 'fa-eye'} text-muted`}
              aria-hidden="true"
            ></i>
          </button>
        </div>
        <div
          className={errores.password ? 'invalid-feedback d-block' : 'form-text'}
          id="nuevaPasswordAyuda"
        >
          Al menos {LARGO_MINIMO} caracteres.
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="confirmacionPassword" className="form-label fw-semibold small">
          Repita la nueva contraseña
        </label>
        <input
          type={mostrarPassword ? 'text' : 'password'}
          className={`form-control ${errores.confirmacion ? 'is-invalid' : ''}`}
          id="confirmacionPassword"
          required
          maxLength={128}
          autoComplete="new-password"
          aria-describedby="confirmacionError"
          aria-invalid={Boolean(errores.confirmacion)}
          value={confirmacion}
          onChange={(evento) => {
            setConfirmacion(evento.target.value);
            setErrores((previos) => ({ ...previos, confirmacion: false }));
          }}
        />
        {errores.confirmacion && (
          <div className="invalid-feedback d-block" id="confirmacionError">
            Las contraseñas no coinciden.
          </div>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="emailPaciente" className="form-label fw-semibold small">
          Email
        </label>
        <div className="input-group">
          <span className="input-group-text bg-white">
            <i className="fa-solid fa-envelope text-muted" aria-hidden="true"></i>
          </span>
          <input
            type="email"
            className={`form-control ${errores.email ? 'is-invalid' : ''}`}
            id="emailPaciente"
            placeholder="nombre@ejemplo.com"
            required
            maxLength={254}
            autoComplete="email"
            aria-describedby="emailError"
            aria-invalid={Boolean(errores.email)}
            value={email}
            onChange={(evento) => {
              setEmail(evento.target.value);
              setErrores((previos) => ({ ...previos, email: false }));
            }}
          />
        </div>
        {errores.email && (
          <div className="invalid-feedback d-block" id="emailError">
            Ingrese un email válido, por ejemplo nombre@ejemplo.com.
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar y continuar'}
      </button>
      <button type="button" className="btn btn-link w-100 mt-2 text-muted small" onClick={onCancelar}>
        Salir sin cambiar
      </button>
    </form>
  );
}

export default PrimerIngreso;
