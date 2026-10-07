import './LoginSuccess.css';
 
// Mensaje de sesión iniciada que comparten los dos logins. Props:
// heading: texto de bienvenida · fecha: cuándo ingresó · onLogout: función que cierra la sesión
// logoutLabel: texto del botón · variant: color del botón (Bootstrap)
function LoginSuccess({ heading, fecha, onLogout, logoutLabel, variant }) {
  return (
    <div className="text-center py-3">
      <span className="lims-success-icon mb-3">
        <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
      </span>
      <h2 className="h5 fw-bold mb-1 text-break">{heading}</h2>
      <p className="text-muted small mb-4">Sesión iniciada el {fecha}</p>
      <button
        type="button"
        className={`btn btn-outline-${variant} w-100 py-2 fw-semibold`}
        onClick={onLogout}
      >
        <i className="fa-solid fa-right-from-bracket me-2" aria-hidden="true"></i>
        {logoutLabel}
      </button>
    </div>
  );
}
 
export default LoginSuccess;
