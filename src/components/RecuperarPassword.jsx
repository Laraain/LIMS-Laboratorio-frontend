import { useState } from 'react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { pedirRecuperacion } from '../lib/password.js';

// "¿Olvidó su contraseña?" del portal del paciente (LIMS-45): pide el DNI y, si el paciente
// cargó su email, le llega un link para elegir una nueva. La respuesta es siempre la misma,
// para no revelar si un DNI es paciente del laboratorio.
// Props: dniInicial (el que ya escribió en el login) · onVolver (vuelve al formulario de ingreso)
function RecuperarPassword({ dniInicial = '', onVolver }) {
  const [dni, setDni] = useState(dniInicial);
  const [dniInvalido, setDniInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    const dniNormalizado = dni.replace(/[.\s]/g, '');
    if (!/^\d{7,8}$/.test(dniNormalizado)) {
      setDniInvalido(true);
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await pedirRecuperacion(dniNormalizado);
      setEnviado(respuesta.mensaje);
    } catch (errorPeticion) {
      console.error('No se pudo pedir el link de recuperación:', errorPeticion);
      setError(mensajeDeErrorApi(errorPeticion));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="lims-login-form">
        <div className="alert alert-success mb-0" role="status">
          <p className="mb-2">{enviado}</p>
          <p className="mb-0 small">
            Revise su casilla (también la carpeta de spam). El link vence en 1 hora. Si no tiene un email cargado, pida
            una contraseña nueva en recepción.
          </p>
        </div>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario w-100" onClick={onVolver}>
          Volver al ingreso
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="lims-login-form">
      <p className="mb-0">
        Escriba su DNI. Si cargó su email en el primer ingreso, le enviamos un link para elegir una contraseña nueva.
      </p>
      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="dni-recuperar" className="lims-login-label">
          DNI
        </label>
        <div className={`lims-campo${dniInvalido ? ' is-invalid' : ''}`}>
          <input
            type="text"
            id="dni-recuperar"
            placeholder="Ej: 30123456"
            inputMode="numeric"
            maxLength={14}
            autoComplete="username"
            aria-describedby="dniRecuperarError"
            aria-invalid={dniInvalido}
            value={dni}
            onChange={(evento) => {
              setDni(evento.target.value);
              setDniInvalido(false);
            }}
          />
        </div>
        {dniInvalido && (
          <div className="invalid-feedback d-block" id="dniRecuperarError">
            Ingrese su DNI: solo números, 7 u 8 dígitos.
          </div>
        )}
      </div>
      <button type="submit" className="btn lims-btn-pill lims-btn-primario lims-btn-grande w-100" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviarme el link'}
      </button>
      <button type="button" className="btn lims-btn-pill lims-btn-secundario w-100" onClick={onVolver} disabled={enviando}>
        Volver al ingreso
      </button>
    </form>
  );
}

export default RecuperarPassword;
