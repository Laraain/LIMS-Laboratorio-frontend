import { SignOut } from '@phosphor-icons/react';
import { ESTADOS_TURNO, TIPOS_EXTRACCION } from '../lib/fila.js';
import { horaDe } from '../lib/hora.js';
import './Fila.css';

// Fila de atención de hoy, en el orden en que se atiende.
// Arriba los que esperan y los llamados; abajo, plegados, los que ya terminaron.
// Props: fila (turnos de hoy) · cargando · error · onRetirar (opcional: muestra "Se retiró" en los que esperan)
function FilaDelDia({ fila, cargando, error, onRetirar }) {
  const activos = fila.filter((turno) => turno.estado === 'en_espera' || turno.estado === 'llamado');
  const terminados = fila.filter((turno) => turno.estado === 'atendido' || turno.estado === 'se_retiro');
  const enEspera = activos.filter((turno) => turno.estado === 'en_espera').length;

  return (
    <section className="lims-fila" aria-labelledby="fila-titulo">
      <div className="lims-fila-encabezado">
        <h2 id="fila-titulo" className="lims-lista-titulo mb-0">
          Fila de hoy
        </h2>
        {/* aria-live: el lector de pantalla avisa cuando cambia la cantidad */}
        <p className="lims-fila-resumen mb-0" aria-live="polite">
          <strong>{enEspera}</strong> en espera · {fila.length} {fila.length === 1 ? 'registrado' : 'registrados'}
        </p>
      </div>

      {cargando && (
        <div className="lims-lista-aviso" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Cargando la fila…
        </div>
      )}
      {!cargando && error && (
        <div className="lims-lista-aviso" role="alert">
          No se pudo actualizar la fila. Se vuelve a intentar en unos segundos.
        </div>
      )}
      {!cargando && !error && fila.length === 0 && (
        <div className="lims-lista-aviso">Todavía no llegó ningún paciente hoy.</div>
      )}

      {activos.length > 0 && (
        <ol className="lims-fila-lista">
          {activos.map((turno) => (
            <ItemFila key={turno.id} turno={turno} onRetirar={onRetirar} />
          ))}
        </ol>
      )}

      {terminados.length > 0 && (
        <details className="lims-fila-terminados">
          <summary>
            Ya atendidos o retirados <span className="lims-filtro-cantidad">{terminados.length}</span>
          </summary>
          <ol className="lims-fila-lista">
            {terminados.map((turno) => (
              <ItemFila key={turno.id} turno={turno} />
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

// Un paciente de la fila: número, nombre, DNI, tipo, hora de llegada y estado
function ItemFila({ turno, onRetirar }) {
  const paciente = turno.pacientes;
  return (
    <li className={`lims-fila-item lims-fila-item--${turno.estado}`}>
      <span className="lims-fila-numero" aria-label={`Número ${turno.numero}`}>
        {turno.numero}
      </span>
      <span className="lims-fila-datos">
        <span className="lims-celda-nombre-texto">
          {paciente.apellido}, {paciente.nombre}
        </span>
        <span className="lims-celda-identidad">
          DNI {paciente.dni} · llegó {horaDe(turno.created_at)}
          {turno.tipo === 'pediatrica' && (
            <span className="lims-fila-etiqueta lims-fila-etiqueta--pediatrica">{TIPOS_EXTRACCION.pediatrica}</span>
          )}
        </span>
      </span>
      <span className={`lims-fila-estado lims-fila-estado--${turno.estado}`}>
        {ESTADOS_TURNO[turno.estado]}
        {turno.box && turno.estado !== 'en_espera' ? ` · Box ${turno.box}` : ''}
      </span>
      {onRetirar && turno.estado === 'en_espera' && (
        <button
          type="button"
          className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
          aria-label={`Marcar que ${paciente.apellido}, ${paciente.nombre} se retiró`}
          onClick={() => onRetirar(turno)}
        >
          <SignOut className="lims-icono me-1" aria-hidden="true" />
          Se retiró
        </button>
      )}
    </li>
  );
}

export default FilaDelDia;
