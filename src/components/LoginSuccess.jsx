import { CheckCircle, SignOut } from '@phosphor-icons/react';
import './LoginSuccess.css';
 
function LoginSuccess({ heading, fecha, onLogout, logoutLabel, variant }) {
  return (
    <div className="text-center py-3">
      <span className="lims-success-icon mb-3">
        <CheckCircle aria-hidden="true" />
      </span>
      <h2 className="h5 fw-bold mb-1 text-break">{heading}</h2>
      <p className="text-muted small mb-4">Sesión iniciada el {fecha}</p>
      <button
        type="button"
        className={`btn btn-outline-${variant} rounded-pill w-100 py-2 fw-semibold`}
        onClick={onLogout}
      >
        <SignOut className="lims-icono me-2" aria-hidden="true" />
        {logoutLabel}
      </button>
    </div>
  );
}
 
export default LoginSuccess;
