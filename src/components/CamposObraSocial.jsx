import { PARTICULAR, useObrasSociales } from '../lib/obrasSociales.js';

// Selector de obra social y número de afiliado, para el alta de pacientes.
// Elegir una opción es obligatorio ("Particular" si no tiene); con obra social, el número de afiliado también.
// Props: prefijo (para los id de los campos) · obraSocial y nroAfiliado (valores) · errores ({ obraSocial, nroAfiliado })
// onObraSocial y onNroAfiliado: reciben el valor nuevo
function CamposObraSocial({ prefijo, obraSocial, nroAfiliado, errores, onObraSocial, onNroAfiliado }) {
  const { obras, cargando, error } = useObrasSociales();
  const tieneObraSocial = obraSocial !== '' && obraSocial !== PARTICULAR;

  return (
    <>
      <div className="col-sm-6">
        <label htmlFor={`${prefijo}-obra-social`} className="form-label fw-semibold small">
          Obra social <span className="text-danger">*</span>
        </label>
        <select
          id={`${prefijo}-obra-social`}
          className={`form-select ${errores.obraSocial ? 'is-invalid' : ''}`}
          value={obraSocial}
          disabled={cargando}
          onChange={(evento) => onObraSocial(evento.target.value)}
        >
          <option value="">{cargando ? 'Cargando…' : 'Elija una opción'}</option>
          <option value={PARTICULAR}>Particular (sin obra social)</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nombre}
            </option>
          ))}
        </select>
        {errores.obraSocial && <div className="invalid-feedback">Elija la obra social, o "Particular".</div>}
        {error && <div className="form-text text-danger">No se pudieron cargar las obras sociales.</div>}
      </div>
      <div className="col-sm-6">
        <label htmlFor={`${prefijo}-afiliado`} className="form-label fw-semibold small">
          Número de afiliado {tieneObraSocial && <span className="text-danger">*</span>}
        </label>
        <input
          type="text"
          id={`${prefijo}-afiliado`}
          className={`form-control ${errores.nroAfiliado ? 'is-invalid' : ''}`}
          maxLength={30}
          disabled={!tieneObraSocial}
          value={tieneObraSocial ? nroAfiliado : ''}
          onChange={(evento) => onNroAfiliado(evento.target.value)}
        />
        {errores.nroAfiliado && <div className="invalid-feedback">Ingrese el número de afiliado.</div>}
      </div>
    </>
  );
}

export default CamposObraSocial;
