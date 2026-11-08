import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FileCsv, FileXls } from '@phosphor-icons/react';
import useMetadatos from '../hooks/useMetadatos.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { formatearPesos } from '../lib/aranceles.js';
import { hoyTucuman } from '../lib/hora.js';
import { esImporteCero, exportarLiquidacion, leerLiquidacion, nombreDelMes, totalesDeLiquidacion } from '../lib/liquidacion.js';
import { listarObrasSociales } from '../lib/obrasSociales.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';

// "2026-10-01" → "01/10/2026"
function fechaCorta(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR');
}

// Mes anterior al de hoy, como "AAAA-MM": lo normal es liquidar el mes que terminó
function mesAnterior() {
  const [anio, mes] = hoyTucuman().split('-').map(Number);
  return mes === 1 ? `${anio - 1}-12` : `${anio}-${String(mes - 1).padStart(2, '0')}`;
}

// Liquidación mensual a obras sociales (LIMS-47), solo para administradores: se elige la obra social y el mes,
// se ve el detalle por estudio cubierto (con número de afiliado, médico y código NBU) y se exporta para presentarlo.
function Liquidacion() {
  useMetadatos({
    titulo: 'Liquidación a obras sociales — LIMS Laboratorio',
    descripcion: 'Detalle mensual de lo que se le factura a cada obra social, solo para administradores.',
    ruta: '/panel/liquidacion',
    indexar: false,
  });

  const { perfil } = useOutletContext();
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState('');
  const [mes, setMes] = useState(mesAnterior);
  // filas: null mientras no se eligió obra social o mientras carga
  const [filas, setFilas] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarObrasSociales()
      .then((lista) => vigente && setObras(lista))
      .catch((errorPeticion) => {
        console.error('No se pudieron cargar las obras sociales:', errorPeticion);
        if (vigente) setError('No se pudieron cargar las obras sociales.');
      });
    return () => {
      vigente = false;
    };
  }, []);

  // Se vuelve a pedir cada vez que cambia la obra social o el mes
  useEffect(() => {
    if (!obraId || !mes) return undefined;
    let vigente = true;
    const pedir = setTimeout(async () => {
      setCargando(true);
      setError('');
      try {
        const leidas = await leerLiquidacion(Number(obraId), mes);
        if (vigente) setFilas(leidas);
      } catch (errorPeticion) {
        console.error('No se pudo cargar la liquidación:', errorPeticion);
        if (vigente) {
          setFilas(null);
          setError(mensajeDeErrorApi(errorPeticion));
        }
      }
      if (vigente) setCargando(false);
    }, 0);
    return () => {
      vigente = false;
      clearTimeout(pedir);
    };
  }, [obraId, mes]);

  if (perfil.rol !== 'admin') return <Navigate to="/panel" replace />;

  const obra = obras.find((item) => String(item.id) === obraId) ?? null;
  const totales = filas ? totalesDeLiquidacion(filas) : null;

  async function exportar(formato) {
    setExportando(true);
    try {
      await exportarLiquidacion(formato, filas, obra, mes);
    } catch (errorPeticion) {
      console.error('No se pudo exportar la liquidación:', errorPeticion);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos armar el archivo',
        text: mensajeDeErrorApi(errorPeticion),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1c4e80',
      });
    }
    setExportando(false);
  }

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Liquidación a obras sociales</h1>
          <p className="lims-panel-texto mb-0">
            Lo que hay que presentarle a una obra social para cobrarle un mes: cada estudio que cubre, de las órdenes no
            anuladas recibidas ese mes en todas las sucursales.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="liquidacion-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="liquidacion-titulo" className="lims-lista-titulo">
              {obra ? `${obra.nombre} · ${nombreDelMes(mes)}` : 'Elija la obra social'}
            </h2>
            {totales && (
              <p className="lims-lista-resumen mb-0">
                {totales.ordenes} {totales.ordenes === 1 ? 'orden' : 'órdenes'} · {filas.length}{' '}
                {filas.length === 1 ? 'estudio' : 'estudios'} · total {formatearPesos(totales.total)}
              </p>
            )}
          </div>
          {totales && filas.length > 0 && (
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn lims-btn-pill lims-btn-primario" disabled={exportando} onClick={() => exportar('xlsx')}>
                <FileXls className="lims-icono me-2" aria-hidden="true" />
                {exportando ? 'Armando…' : 'Excel'}
              </button>
              <button type="button" className="btn lims-btn-pill lims-btn-secundario" disabled={exportando} onClick={() => exportar('csv')}>
                <FileCsv className="lims-icono me-2" aria-hidden="true" />
                CSV
              </button>
            </div>
          )}
        </div>

        <div className="row g-3 px-3 px-md-4 pt-3">
          <div className="col-sm-7 col-lg-5">
            <label htmlFor="liquidacion-obra" className="form-label fw-semibold small">
              Obra social
            </label>
            <select id="liquidacion-obra" className="form-select" value={obraId} onChange={(evento) => setObraId(evento.target.value)}>
              <option value="" disabled>
                Elija la obra social
              </option>
              {obras.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                  {item.activa ? '' : ' (inactiva)'}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-5 col-lg-3">
            <label htmlFor="liquidacion-mes" className="form-label fw-semibold small">
              Mes
            </label>
            <input
              type="month"
              id="liquidacion-mes"
              className="form-control"
              value={mes}
              max={hoyTucuman().slice(0, 7)}
              onChange={(evento) => setMes(evento.target.value || mesAnterior())}
            />
          </div>
        </div>

        {error ? (
          <div className="lims-lista-aviso" role="alert">
            <span>{error}</span>
          </div>
        ) : cargando ? (
          <div className="lims-lista-aviso" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Armando la liquidación…
          </div>
        ) : !filas ? null : filas.length === 0 ? (
          <div className="lims-lista-aviso" role="status">
            <span>No hay estudios cubiertos por esta obra social en {nombreDelMes(mes)}.</span>
          </div>
        ) : (
          <>
            {totales.sinArancel > 0 && (
              <p className="small text-warning-emphasis px-3 px-md-4 mt-3 mb-0">
                {totales.sinArancel} {totales.sinArancel === 1 ? 'estudio no tiene' : 'estudios no tienen'} arancel cargado: el
                importe queda vacío. Cargue el valor de la UB en Aranceles antes de presentar.
              </p>
            )}
            {totales.enCero > 0 && (
              <p className="small text-warning-emphasis px-3 px-md-4 mt-3 mb-0">
                {totales.enCero} {totales.enCero === 1 ? 'estudio sale' : 'estudios salen'} en $ 0 porque no{' '}
                {totales.enCero === 1 ? 'tiene' : 'tienen'} UB en el catálogo (por ejemplo, los índices del hemograma). Si la
                obra social los factura aparte, cargue sus UB en el Catálogo de análisis antes de presentar.
              </p>
            )}
            <div className="lims-tabla-contenedor mt-3">
              <table className="table align-middle mb-0 lims-tabla-perfiles">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Orden</th>
                    <th scope="col">Paciente</th>
                    <th scope="col">Médico</th>
                    <th scope="col">Estudio</th>
                    <th scope="col" className="text-end">
                      UB
                    </th>
                    <th scope="col" className="text-end">
                      A facturar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila, indice) => (
                    <tr key={`${fila.nro_orden}-${fila.codigo}-${indice}`}>
                      <td data-label="Fecha">{fechaCorta(fila.fecha)}</td>
                      <td data-label="Orden">
                        <span className="lims-codigo">{fila.nro_orden}</span>
                        <span className="lims-celda-identidad">{fila.sucursal}</span>
                      </td>
                      <td data-label="Paciente">
                        {fila.paciente}
                        <span className="lims-celda-identidad">
                          DNI {fila.dni} · Afiliado {fila.nro_afiliado ?? '—'}
                        </span>
                      </td>
                      <td data-label="Médico">
                        {fila.medico ?? '—'}
                        {/* La matrícula se muestra como está cargada (puede venir con "MP-" adelante) */}
                        {fila.matricula && <span className="lims-celda-identidad">Matrícula {fila.matricula}</span>}
                      </td>
                      <td data-label="Estudio">
                        {fila.estudio}
                        <span className="lims-celda-identidad">NBU {fila.codigo_nbu ?? '—'}</span>
                      </td>
                      <td data-label="UB" className="text-end">
                        {fila.ub ?? '—'}
                      </td>
                      <td data-label="A facturar" className="text-end">
                        {fila.importe_obra_social === null ? (
                          <span className="text-warning-emphasis">Sin arancel</span>
                        ) : (
                          <>
                            {formatearPesos(fila.importe_obra_social)}
                            {esImporteCero(fila) && <span className="lims-celda-identidad text-warning-emphasis">Sin UB</span>}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-semibold">
                    <td colSpan={6}>Total</td>
                    <td className="text-end">{formatearPesos(totales.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Liquidacion;
