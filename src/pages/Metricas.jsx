import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Clock, Coins, Receipt, Warning } from '@phosphor-icons/react';
import useMetadatos from '../hooks/useMetadatos.js';
import { mensajeDeErrorApi } from '../lib/api.js';
import { ATAJOS, metricasDashboard, periodoAnterior, rangoDeAtajo } from '../lib/metricas.js';
import { useSucursales } from '../lib/sucursal.js';
import './Metricas.css';

const COLOR_PRIMARIO = '#1c4e80';
const COLOR_ACENTO = '#2bb59a';

const NOMBRES_MEDIO_PAGO = { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia' };
const NOMBRES_ESTADO = {
  abierta: 'Abiertas',
  en_proceso: 'En proceso',
  completa: 'Completas',
  informada: 'Informadas',
  anulada: 'Anuladas',
};
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Secciones que el admin puede mostrar u ocultar. "sucursales" solo aparece con "Todas las sucursales"
const SECCIONES = [
  { clave: 'actividad', texto: 'Actividad' },
  { clave: 'facturacion', texto: 'Facturación y cobros' },
  { clave: 'obras', texto: 'Por obra social' },
  { clave: 'tiempos', texto: 'Tiempos' },
  { clave: 'calidad', texto: 'Calidad' },
  { clave: 'fila', texto: 'Fila de atención' },
  { clave: 'caja', texto: 'Control de caja' },
  { clave: 'estudios', texto: 'Estudios más pedidos' },
  { clave: 'medicos', texto: 'Médicos que más derivan' },
  { clave: 'sucursales', texto: 'Por sucursal' },
];
const CLAVE_SECCIONES = 'lims-metricas-secciones';

const formatoPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat('es-AR');
const formatoDecimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

// Las secciones ocultas se recuerdan en este navegador. localStorage puede fallar (navegación privada):
// en ese caso se muestran todas
function leerOcultas() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_SECCIONES) ?? '[]');
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

function guardarOcultas(ocultas) {
  try {
    localStorage.setItem(CLAVE_SECCIONES, JSON.stringify(ocultas));
  } catch {
    // Sin almacenamiento la elección dura hasta recargar la página
  }
}

// "2026-11-02" → "02/11"
function diaCorto(texto) {
  const [, mes, dia] = texto.split('-');
  return `${dia}/${mes}`;
}

function porcentaje(parte, total) {
  return total ? `${formatoDecimal.format((parte / total) * 100)} %` : '—';
}

// Variación contra el período anterior: { texto, sube } o null si no hay con qué comparar
function variacion(actual, anterior) {
  if (anterior === undefined || anterior === null) return null;
  if (Number(anterior) === 0) return Number(actual) === 0 ? { texto: 'Igual que el período anterior', sube: null } : null;
  const cambio = ((Number(actual) - Number(anterior)) / Number(anterior)) * 100;
  if (Math.abs(cambio) < 0.05) return { texto: 'Igual que el período anterior', sube: null };
  return { texto: `${cambio > 0 ? '+' : ''}${formatoDecimal.format(cambio)} % vs. período anterior`, sube: cambio > 0 };
}

// Tarjeta con un número grande. comparacion: resultado de variacion() · alerta: resalta el valor en rojo
function TarjetaMetrica({ icono: Icono, titulo, valor, detalle, comparacion, alerta = false }) {
  return (
    <article className="lims-metrica">
      <span className={`lims-metrica-icono${alerta ? ' lims-metrica-icono--alerta' : ''}`} aria-hidden="true">
        <Icono />
      </span>
      <p className="lims-metrica-titulo">{titulo}</p>
      <p className={`lims-metrica-valor${alerta ? ' text-danger' : ''}`}>{valor}</p>
      {detalle && <p className="lims-metrica-detalle">{detalle}</p>}
      {comparacion && (
        <p
          className={`lims-metrica-comparacion${
            comparacion.sube === null ? '' : comparacion.sube ? ' lims-metrica-comparacion--sube' : ' lims-metrica-comparacion--baja'
          }`}
        >
          {comparacion.sube === true && <ArrowUp aria-hidden="true" />}
          {comparacion.sube === false && <ArrowDown aria-hidden="true" />}
          {comparacion.texto}
        </p>
      )}
    </article>
  );
}

// Caja de una sección. ancho: ocupa las dos columnas en pantallas grandes
function Seccion({ titulo, descripcion, ancho = false, children }) {
  return (
    <section className={`lims-grafico${ancho ? ' lims-grafico--ancho' : ''}`}>
      <h2 className="lims-grafico-titulo">{titulo}</h2>
      {descripcion && <p className="lims-grafico-descripcion">{descripcion}</p>}
      {children}
    </section>
  );
}

function Vacio({ texto = 'No hay datos en este período.' }) {
  return <p className="lims-grafico-vacio">{texto}</p>;
}

// Número chico con su etiqueta, para las secciones (ej: "Días hasta informar · 1,6")
function Dato({ etiqueta, valor, detalle }) {
  return (
    <div className="lims-cifra">
      <span className="lims-cifra-etiqueta">{etiqueta}</span>
      <strong className="lims-cifra-valor">{valor}</strong>
      {detalle && <span className="lims-cifra-detalle">{detalle}</span>}
    </div>
  );
}

// Lista con barras proporcionales al mayor valor (medios de pago, obras sociales, médicos, motivos)
function ListaConBarras({ filas, color = 'var(--bs-primary)' }) {
  const maximo = Math.max(...filas.map((fila) => fila.valor), 0);
  return (
    <ul className="lims-barras">
      {filas.map((fila) => (
        <li key={fila.clave}>
          <div className="lims-barras-linea">
            <span>{fila.nombre}</span>
            <strong>{fila.texto}</strong>
          </div>
          {fila.detalle && <span className="lims-barras-detalle">{fila.detalle}</span>}
          <div className="lims-barras-barra" aria-hidden="true">
            <span style={{ width: `${maximo ? (fila.valor / maximo) * 100 : 0}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Llegadas a la fila por hora (filas) y día de la semana (columnas): más oscuro = más pacientes.
// Solo las horas en que llegó alguien, así una llegada fuera de horario no estira la tabla.
// Lunes a sábado siempre; el domingo solo si hubo llegadas.
function HorasPico({ porHora }) {
  const horas = [...new Set(porHora.map((celda) => celda.hora))].sort((a, b) => a - b);
  const dias = porHora.some((celda) => celda.dia_semana === 7) ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
  const maximo = Math.max(...porHora.map((celda) => celda.cantidad));
  const cantidad = (dia, hora) => porHora.find((celda) => celda.dia_semana === dia && celda.hora === hora)?.cantidad ?? 0;
  const franja = (hora) => `${String(hora).padStart(2, '0')} a ${String(hora + 1).padStart(2, '0')} h`;

  return (
    <table className="lims-calor">
      <caption className="visually-hidden">Pacientes que llegaron a la fila por hora y día de la semana</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="visually-hidden">Hora</span>
          </th>
          {dias.map((dia) => (
            <th key={dia} scope="col">
              {DIAS_SEMANA[dia - 1]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {horas.map((hora) => (
          <tr key={hora}>
            <th scope="row">{franja(hora)}</th>
            {dias.map((dia) => {
              const valor = cantidad(dia, hora);
              const intensidad = maximo ? valor / maximo : 0;
              return (
                <td
                  key={dia}
                  className={intensidad < 0.5 ? 'lims-calor-claro' : undefined}
                  title={`${DIAS_SEMANA[dia - 1]}, ${franja(hora)}: ${valor} ${valor === 1 ? 'paciente' : 'pacientes'}`}
                  style={{ '--intensidad': intensidad }}
                >
                  {valor || ''}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Pantalla del dueño del laboratorio (solo administradores): números clave del período, filtrables por
// sucursal y comparados con el período anterior. Las cuentas las hace la base (metricas_dashboard).
function Metricas() {
  useMetadatos({
    titulo: 'Métricas — LIMS Laboratorio',
    descripcion: 'Métricas del laboratorio por sucursal y período, solo para administradores.',
    ruta: '/panel/metricas',
    indexar: false,
  });

  const { perfil } = useOutletContext();
  const esAdmin = perfil.rol === 'admin';
  const { sucursales } = useSucursales(esAdmin);
  const [rango, setRango] = useState(() => rangoDeAtajo('mes'));
  const [sucursalId, setSucursalId] = useState('');
  const [ocultas, setOcultas] = useState(leerOcultas);
  const [estado, setEstado] = useState({ clave: '', datos: null, anterior: null, error: '' });

  const { desde, hasta } = rango;
  const rangoValido = Boolean(desde && hasta && desde <= hasta);
  // Qué filtros se están mirando: mientras la respuesta guardada sea de otros filtros, se está cargando
  const clave = `${desde}|${hasta}|${sucursalId}`;
  const atajoElegido = ATAJOS.find((atajo) => {
    const opcion = rangoDeAtajo(atajo.clave);
    return opcion.desde === desde && opcion.hasta === hasta;
  })?.clave;

  // Cada vez que cambia un filtro se piden el período y el anterior (para comparar).
  // "ignorar" evita que una respuesta lenta pise a una más nueva
  useEffect(() => {
    if (!esAdmin || !rangoValido) return undefined;
    let ignorar = false;
    const sucursal = sucursalId ? Number(sucursalId) : null;
    const previo = periodoAnterior(desde, hasta);
    Promise.all([metricasDashboard(desde, hasta, sucursal), metricasDashboard(previo.desde, previo.hasta, sucursal)])
      .then(([datos, anterior]) => {
        if (!ignorar) setEstado({ clave, datos, anterior, error: '' });
      })
      .catch((errorPeticion) => {
        console.error('No se pudieron cargar las métricas:', errorPeticion);
        if (!ignorar) setEstado({ clave, datos: null, anterior: null, error: mensajeDeErrorApi(errorPeticion) });
      });
    return () => {
      ignorar = true;
    };
  }, [esAdmin, rangoValido, desde, hasta, sucursalId, clave]);

  if (!esAdmin) return <Navigate to="/panel" replace />;

  const { datos, anterior, error } = estado;
  const cargando = rangoValido && estado.clave !== clave;
  const todas = !sucursalId;
  const visible = (seccion) => !ocultas.includes(seccion) && (seccion !== 'sucursales' || todas);

  function alternarSeccion(seccion) {
    const nuevas = ocultas.includes(seccion) ? ocultas.filter((otra) => otra !== seccion) : [...ocultas, seccion];
    setOcultas(nuevas);
    guardarOcultas(nuevas);
  }

  function cambiarFecha(campo, valor) {
    setRango((previo) => ({ ...previo, [campo]: valor }));
  }

  const totales = datos?.totales;
  const previos = anterior?.totales;

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Métricas del laboratorio</h1>
          <p className="lims-panel-texto mb-0">Actividad, facturación, tiempos y calidad de cada sucursal.</p>
        </div>
      </header>

      <form className="lims-filtros" onSubmit={(evento) => evento.preventDefault()} aria-label="Filtros de métricas">
        <div className="lims-filtros-campo lims-filtros-sucursal">
          <label htmlFor="filtro-sucursal">Sucursal</label>
          <select id="filtro-sucursal" className="form-select" value={sucursalId} onChange={(evento) => setSucursalId(evento.target.value)}>
            <option value="">Todas las sucursales</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="lims-filtros-campo lims-filtros-fechas">
          <legend>Período</legend>
          <div className="lims-filtros-periodo">
            <input
              type="date"
              className="form-control"
              aria-label="Desde"
              value={desde}
              max={hasta}
              onChange={(evento) => cambiarFecha('desde', evento.target.value)}
            />
            <span aria-hidden="true">—</span>
            <input
              type="date"
              className="form-control"
              aria-label="Hasta"
              value={hasta}
              min={desde}
              onChange={(evento) => cambiarFecha('hasta', evento.target.value)}
            />
          </div>
        </fieldset>
        <div className="lims-filtros-atajos" role="group" aria-label="Períodos rápidos">
          {ATAJOS.map((atajo) => (
            <button
              key={atajo.clave}
              type="button"
              className={`btn ${atajoElegido === atajo.clave ? 'btn-primary' : 'btn-outline-primary'}`}
              aria-pressed={atajoElegido === atajo.clave}
              onClick={() => setRango(rangoDeAtajo(atajo.clave))}
            >
              {atajo.texto}
            </button>
          ))}
        </div>
      </form>

      <div className="lims-secciones" role="group" aria-label="Secciones visibles">
        <span className="lims-secciones-etiqueta">Mostrar:</span>
        {SECCIONES.filter((seccion) => seccion.clave !== 'sucursales' || todas).map((seccion) => {
          const activa = !ocultas.includes(seccion.clave);
          return (
            <button
              key={seccion.clave}
              type="button"
              className={`lims-seccion-chip${activa ? ' lims-seccion-chip--activa' : ''}`}
              aria-pressed={activa}
              onClick={() => alternarSeccion(seccion.clave)}
            >
              {seccion.texto}
            </button>
          );
        })}
      </div>

      {!rangoValido && (
        <p className="alert alert-warning" role="alert">
          Elija un período válido: la fecha de inicio no puede ser posterior a la de fin.
        </p>
      )}
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}

      {datos && (
        <div className={cargando ? 'lims-dashboard lims-dashboard--cargando' : 'lims-dashboard'} aria-busy={cargando}>
          <div className="lims-metricas">
            <TarjetaMetrica
              icono={Receipt}
              titulo="Órdenes"
              valor={formatoNumero.format(totales.ordenes)}
              detalle={`${formatoNumero.format(totales.estudios)} ${totales.estudios === 1 ? 'estudio' : 'estudios'} · ${formatoNumero.format(totales.pacientes)} ${totales.pacientes === 1 ? 'paciente' : 'pacientes'}`}
              comparacion={variacion(totales.ordenes, previos?.ordenes)}
            />
            <TarjetaMetrica
              icono={Coins}
              titulo="Cobrado"
              valor={formatoPesos.format(totales.cobrado)}
              detalle="Lo que entró a caja, sin cobros anulados"
              comparacion={variacion(totales.cobrado, previos?.cobrado)}
            />
            <TarjetaMetrica
              icono={Warning}
              titulo="Pendiente de cobro"
              valor={formatoPesos.format(totales.pendiente_cobro)}
              detalle={`${formatoNumero.format(totales.ordenes_con_saldo)} ${totales.ordenes_con_saldo === 1 ? 'orden con saldo' : 'órdenes con saldo'}`}
              alerta={Number(totales.pendiente_cobro) > 0}
            />
            <TarjetaMetrica
              icono={Clock}
              titulo="Órdenes atrasadas"
              valor={formatoNumero.format(totales.atrasadas)}
              detalle="Sin informar y con el plazo vencido"
              alerta={totales.atrasadas > 0}
            />
          </div>

          <div className="lims-graficos">
            {visible('actividad') && (
              <Seccion titulo="Actividad por día" descripcion="Órdenes recibidas y estudios pedidos cada día." ancho>
                {totales.ordenes === 0 ? (
                  <Vacio />
                ) : (
                  <div className="lims-actividad">
                    <div className="lims-grafico-area">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart
                          data={datos.por_dia.map((fila) => ({ ...fila, etiqueta: diaCorto(fila.dia) }))}
                          margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
                          <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
                          <Line type="monotone" dataKey="ordenes" name="Órdenes" stroke={COLOR_PRIMARIO} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="estudios" name="Estudios" stroke={COLOR_ACENTO} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="lims-grafico-subtitulo mt-0">Órdenes por estado</h3>
                      <ul className="lims-estados">
                        {datos.por_estado.map((fila) => (
                          <li key={fila.estado} className={`lims-estado lims-estado--${fila.estado}`}>
                            <span>{NOMBRES_ESTADO[fila.estado] ?? fila.estado}</span>
                            <strong>{formatoNumero.format(fila.cantidad)}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </Seccion>
            )}

            {visible('facturacion') && (
              <Seccion titulo="Facturación y cobros" descripcion="Lo que se factura por los estudios del período y lo que se cobró.">
                <div className="lims-cifras">
                  <Dato
                    etiqueta="A cargo del paciente"
                    valor={formatoPesos.format(totales.facturado_pacientes)}
                    detalle={variacion(totales.facturado_pacientes, previos?.facturado_pacientes)?.texto}
                  />
                  <Dato
                    etiqueta="A facturar a obras sociales"
                    valor={formatoPesos.format(totales.facturado_obras_sociales)}
                    detalle={variacion(totales.facturado_obras_sociales, previos?.facturado_obras_sociales)?.texto}
                  />
                </div>
                <h3 className="lims-grafico-subtitulo">Cobrado por medio de pago</h3>
                {datos.por_medio_pago.length === 0 ? (
                  <Vacio texto="No hay cobros en este período." />
                ) : (
                  <ListaConBarras
                    filas={datos.por_medio_pago.map((fila) => ({
                      clave: fila.medio_pago,
                      nombre: NOMBRES_MEDIO_PAGO[fila.medio_pago] ?? fila.medio_pago,
                      valor: Number(fila.monto),
                      texto: formatoPesos.format(fila.monto),
                      detalle: `${formatoNumero.format(fila.cantidad)} ${fila.cantidad === 1 ? 'cobro' : 'cobros'}`,
                    }))}
                  />
                )}
              </Seccion>
            )}

            {visible('obras') && (
              <Seccion titulo="Por obra social" descripcion="Órdenes de cada obra social y lo que hay que facturarle.">
                {datos.por_obra_social.length === 0 ? (
                  <Vacio />
                ) : (
                  <ListaConBarras
                    color="#5b6fd6"
                    filas={datos.por_obra_social.map((fila) => ({
                      clave: fila.obra_social_id ?? 'particular',
                      nombre: fila.nombre,
                      valor: fila.ordenes,
                      texto: `${formatoNumero.format(fila.ordenes)} ${fila.ordenes === 1 ? 'orden' : 'órdenes'}`,
                      detalle: fila.obra_social_id
                        ? `A facturar ${formatoPesos.format(fila.facturado_obra_social)} · paciente ${formatoPesos.format(fila.facturado_paciente)}`
                        : `Paciente ${formatoPesos.format(fila.facturado_paciente)}`,
                    }))}
                  />
                )}
              </Seccion>
            )}

            {visible('tiempos') && (
              <Seccion titulo="Tiempos" descripcion="Cuánto tardan los resultados y cuánto esperan los pacientes.">
                <div className="lims-cifras">
                  <Dato
                    etiqueta="Días hasta informar"
                    valor={datos.tiempos.dias_hasta_informar === null ? '—' : formatoDecimal.format(datos.tiempos.dias_hasta_informar)}
                    detalle={`Promedio de ${formatoNumero.format(datos.tiempos.informadas)} ${datos.tiempos.informadas === 1 ? 'orden informada' : 'órdenes informadas'}`}
                  />
                  <Dato
                    etiqueta="Órdenes atrasadas"
                    valor={formatoNumero.format(datos.tiempos.atrasadas)}
                    detalle="Sin informar y con el plazo vencido"
                  />
                  <Dato
                    etiqueta="Espera en la fila"
                    valor={datos.tiempos.espera_fila_minutos === null ? '—' : `${formatoNumero.format(datos.tiempos.espera_fila_minutos)} min`}
                    detalle={`Promedio de ${formatoNumero.format(datos.tiempos.llamados)} ${datos.tiempos.llamados === 1 ? 'paciente llamado' : 'pacientes llamados'}`}
                  />
                </div>
              </Seccion>
            )}

            {visible('calidad') && (
              <Seccion titulo="Calidad" descripcion="Resultados fuera del valor de referencia y tubos que hubo que descartar.">
                <div className="lims-cifras">
                  <Dato
                    etiqueta="Resultados fuera de rango"
                    valor={porcentaje(datos.calidad.fuera_de_rango, datos.calidad.resultados)}
                    detalle={`${formatoNumero.format(datos.calidad.fuera_de_rango)} de ${formatoNumero.format(datos.calidad.resultados)}`}
                  />
                  <Dato
                    etiqueta="Tubos rechazados o no obtenidos"
                    valor={porcentaje(datos.calidad.tubos_rechazados, datos.calidad.tubos)}
                    detalle={`${formatoNumero.format(datos.calidad.tubos_rechazados)} de ${formatoNumero.format(datos.calidad.tubos)}`}
                  />
                </div>
                {datos.calidad.motivos.length > 0 && (
                  <>
                    <h3 className="lims-grafico-subtitulo">Motivos más comunes</h3>
                    <ListaConBarras
                      color="#c0392b"
                      filas={datos.calidad.motivos.map((fila) => ({
                        clave: fila.motivo,
                        nombre: fila.motivo,
                        valor: fila.cantidad,
                        texto: formatoNumero.format(fila.cantidad),
                      }))}
                    />
                  </>
                )}
              </Seccion>
            )}

            {visible('fila') && (
              <Seccion titulo="Fila de atención" descripcion="Pacientes que llegaron, los que se fueron sin atenderse y las horas pico.">
                <div className="lims-cifras">
                  <Dato etiqueta="Llegadas" valor={formatoNumero.format(datos.fila.llegadas)} />
                  <Dato
                    etiqueta="Se retiraron sin atenderse"
                    valor={porcentaje(datos.fila.retirados, datos.fila.llegadas)}
                    detalle={`${formatoNumero.format(datos.fila.retirados)} ${datos.fila.retirados === 1 ? 'paciente' : 'pacientes'}`}
                  />
                </div>
                <h3 className="lims-grafico-subtitulo">Horas pico de llegada</h3>
                {datos.fila.por_hora.length === 0 ? <Vacio texto="No hubo llegadas en este período." /> : <HorasPico porHora={datos.fila.por_hora} />}
              </Seccion>
            )}

            {visible('caja') && (
              <Seccion titulo="Control de caja" descripcion="Cobros anulados y cajas que cerraron con diferencia de efectivo.">
                <div className="lims-cifras">
                  <Dato
                    etiqueta="Cobros anulados"
                    valor={formatoNumero.format(datos.caja.cobros_anulados)}
                    detalle={formatoPesos.format(datos.caja.monto_anulado)}
                  />
                  <Dato etiqueta="Faltante" valor={formatoPesos.format(datos.caja.faltante)} />
                  <Dato etiqueta="Sobrante" valor={formatoPesos.format(datos.caja.sobrante)} />
                </div>
                <h3 className="lims-grafico-subtitulo">Cajas con diferencia</h3>
                {datos.caja.con_diferencia.length === 0 ? (
                  <Vacio
                    texto={
                      datos.caja.cajas_cerradas === 0
                        ? 'No se cerró ninguna caja en este período.'
                        : `Las ${formatoNumero.format(datos.caja.cajas_cerradas)} cajas cerradas coinciden con lo esperado.`
                    }
                  />
                ) : (
                  <ul className="lims-cajas">
                    {datos.caja.con_diferencia.map((fila) => (
                      <li key={`${fila.fecha}-${fila.sucursal}`}>
                        <div>
                          <strong>{diaCorto(fila.fecha)}</strong> · {fila.sucursal}
                          {fila.observaciones && <span className="lims-cajas-nota">{fila.observaciones}</span>}
                        </div>
                        <strong className={Number(fila.diferencia) < 0 ? 'text-danger' : 'text-success'}>
                          {Number(fila.diferencia) < 0 ? 'Faltan ' : 'Sobran '}
                          {formatoPesos.format(Math.abs(fila.diferencia))}
                        </strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Seccion>
            )}

            {visible('estudios') && (
              <Seccion titulo="Estudios más pedidos" descripcion="Los 8 análisis que más se pidieron en el período.">
                {datos.top_analisis.length === 0 ? (
                  <Vacio />
                ) : (
                  <div className="lims-grafico-area">
                    <ResponsiveContainer width="100%" height={Math.max(200, datos.top_analisis.length * 34 + 24)}>
                      <BarChart data={datos.top_analisis} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef1f5" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(28, 78, 128, 0.06)' }} />
                        <Bar dataKey="cantidad" name="Pedidos" fill={COLOR_ACENTO} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Seccion>
            )}

            {visible('medicos') && (
              <Seccion titulo="Médicos que más derivan" descripcion="Por cantidad de órdenes. Las órdenes sin pedido médico no cuentan.">
                {datos.top_medicos.length === 0 ? (
                  <Vacio />
                ) : (
                  <ListaConBarras
                    filas={datos.top_medicos.map((fila) => ({
                      clave: fila.medico_id,
                      nombre: `${fila.apellido}, ${fila.nombre}`,
                      valor: fila.ordenes,
                      texto: `${formatoNumero.format(fila.ordenes)} ${fila.ordenes === 1 ? 'orden' : 'órdenes'}`,
                      detalle: `MP ${fila.matricula} · ${formatoNumero.format(fila.estudios)} ${fila.estudios === 1 ? 'estudio' : 'estudios'}`,
                    }))}
                  />
                )}
              </Seccion>
            )}

            {visible('sucursales') && (
              <Seccion titulo="Por sucursal" descripcion="Las mismas cifras de cada sucursal, lado a lado." ancho>
                <div className="table-responsive">
                  <table className="table align-middle mb-0 lims-tabla-sucursales">
                    <thead>
                      <tr>
                        <th scope="col">Sucursal</th>
                        <th scope="col" className="text-end">Órdenes</th>
                        <th scope="col" className="text-end">Estudios</th>
                        <th scope="col" className="text-end">Facturado</th>
                        <th scope="col" className="text-end">Cobrado</th>
                        <th scope="col" className="text-end">Pendiente</th>
                        <th scope="col" className="text-end">Atrasadas</th>
                        <th scope="col" className="text-end">Días hasta informar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.por_sucursal.map((fila) => (
                        <tr key={fila.sucursal_id}>
                          <th scope="row">{fila.nombre}</th>
                          <td className="text-end">{formatoNumero.format(fila.ordenes)}</td>
                          <td className="text-end">{formatoNumero.format(fila.estudios)}</td>
                          <td className="text-end">{formatoPesos.format(fila.facturado)}</td>
                          <td className="text-end">{formatoPesos.format(fila.cobrado)}</td>
                          <td className="text-end">{formatoPesos.format(fila.pendiente_cobro)}</td>
                          <td className={`text-end${fila.atrasadas > 0 ? ' text-danger fw-semibold' : ''}`}>{formatoNumero.format(fila.atrasadas)}</td>
                          <td className="text-end">{fila.dias_hasta_informar === null ? '—' : formatoDecimal.format(fila.dias_hasta_informar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Seccion>
            )}
          </div>
        </div>
      )}

      {!datos && cargando && (
        <p className="text-muted text-center py-5" role="status">
          Cargando métricas…
        </p>
      )}
    </div>
  );
}

export default Metricas;
