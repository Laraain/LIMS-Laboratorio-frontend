import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Coins, Flask, Receipt, UserPlus } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase.js';
import useMetadatos from '../hooks/useMetadatos.js';
import './Dashboard.css';

const COLOR_PRIMARIO = '#1c4e80';
const COLOR_ACENTO = '#2bb59a';
const NOMBRES_MEDIO_PAGO = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
};
const NOMBRES_ESTADO = {
  abierta: 'Abiertas',
  en_proceso: 'En proceso',
  completa: 'Completas',
  informada: 'Informadas',
  anulada: 'Anuladas',
};

const formatoPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat('es-AR');

// Las fechas del filtro son días "de calendario" (AAAA-MM-DD), sin hora ni zona
function aTexto(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function primerDiaDelMes() {
  const hoy = new Date();
  return aTexto(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

function haceDias(cantidad) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - cantidad);
  return aTexto(fecha);
}

// "2026-11-02" -> "02/11" para los ejes de los gráficos
function diaCorto(texto) {
  const [, mes, dia] = texto.split('-');
  return `${dia}/${mes}`;
}

// Tarjeta con un número grande, su título y una línea de detalle
function TarjetaMetrica({ icono: Icono, titulo, valor, detalle }) {
  return (
    <article className="lims-metrica">
      <span className="lims-metrica-icono" aria-hidden="true">
        <Icono />
      </span>
      <p className="lims-metrica-titulo">{titulo}</p>
      <p className="lims-metrica-valor">{valor}</p>
      <p className="lims-metrica-detalle">{detalle}</p>
    </article>
  );
}

function Grafico({ titulo, descripcion, vacio, children }) {
  return (
    <section className="lims-grafico">
      <h2 className="lims-grafico-titulo">{titulo}</h2>
      <p className="lims-grafico-descripcion">{descripcion}</p>
      {vacio ? <p className="lims-grafico-vacio">No hay datos en este período.</p> : <div className="lims-grafico-area">{children}</div>}
    </section>
  );
}

// Pantalla del dueño del laboratorio (solo administradores): números clave del período
// filtrables por sucursal. Los cálculos los hace la base con la función metricas_dashboard.
function Dashboard() {
  useMetadatos({
    titulo: 'Métricas — LIMS Laboratorio',
    descripcion: 'Métricas de estudios y facturación por sucursal, solo para administradores.',
    ruta: '/panel/metricas',
    indexar: false,
  });

  const { perfil } = useOutletContext();
  const [desde, setDesde] = useState(primerDiaDelMes);
  const [hasta, setHasta] = useState(() => aTexto(new Date()));
  const [sucursalId, setSucursalId] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [estado, setEstado] = useState({ clave: '', datos: null, error: '' });

  const esAdmin = perfil.rol === 'admin';
  const rangoValido = desde && hasta && desde <= hasta;
  // Identifica qué filtros se están mirando: mientras la respuesta guardada sea de otros filtros, se está cargando
  const clave = `${desde}|${hasta}|${sucursalId}`;

  // Las sucursales para el filtro se cargan una sola vez
  useEffect(() => {
    if (!esAdmin) return;
    supabase
      .from('sucursales')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setSucursales(data ?? []));
  }, [esAdmin]);

  // Cada vez que cambia un filtro se piden los números de nuevo.
  // "ignorar" evita que una respuesta lenta pise a una más nueva.
  useEffect(() => {
    if (!esAdmin || !rangoValido) return undefined;
    let ignorar = false;
    supabase
      .rpc('metricas_dashboard', {
        p_desde: desde,
        p_hasta: hasta,
        p_sucursal_id: sucursalId ? Number(sucursalId) : null,
      })
      .then(({ data, error }) => {
        if (ignorar) return;
        if (error) {
          setEstado({ clave, datos: null, error: 'No se pudieron cargar las métricas. Intente nuevamente.' });
        } else {
          setEstado({ clave, datos: data, error: '' });
        }
      });
    return () => {
      ignorar = true;
    };
  }, [esAdmin, rangoValido, desde, hasta, sucursalId, clave]);

  if (!esAdmin) return <Navigate to="/panel" replace />;

  const { datos, error } = estado;
  const cargando = rangoValido && estado.clave !== clave;
  const totales = datos?.totales;
  const porDia = (datos?.por_dia ?? []).map((fila) => ({ ...fila, etiqueta: diaCorto(fila.dia) }));
  const topAnalisis = datos?.top_analisis ?? [];
  const totalMedios = (datos?.por_medio_pago ?? []).reduce((suma, fila) => suma + fila.monto, 0);

  function elegirRango(nuevoDesde) {
    setDesde(nuevoDesde);
    setHasta(aTexto(new Date()));
  }

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Métricas del laboratorio</h1>
          <p className="lims-panel-texto mb-0">Estudios, facturación y rendimiento de cada sucursal.</p>
        </div>
      </header>

      <form className="lims-filtros" onSubmit={(evento) => evento.preventDefault()} aria-label="Filtros de métricas">
        <div className="lims-filtros-campo">
          <label htmlFor="filtro-sucursal">Sucursal</label>
          <select
            id="filtro-sucursal"
            className="form-select"
            value={sucursalId}
            onChange={(evento) => setSucursalId(evento.target.value)}
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="lims-filtros-campo">
          <label htmlFor="filtro-desde">Desde</label>
          <input id="filtro-desde" type="date" className="form-control" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="lims-filtros-campo">
          <label htmlFor="filtro-hasta">Hasta</label>
          <input id="filtro-hasta" type="date" className="form-control" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="lims-filtros-atajos">
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => elegirRango(haceDias(6))}>
            7 días
          </button>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => elegirRango(haceDias(29))}>
            30 días
          </button>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => elegirRango(primerDiaDelMes())}>
            Este mes
          </button>
        </div>
      </form>

      {!rangoValido && (
        <p className="alert alert-warning" role="alert">
          Elija un rango de fechas válido: la fecha “desde” no puede ser posterior a “hasta”.
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
              detalle={`${formatoNumero.format(totales.estudios)} ${totales.estudios === 1 ? 'estudio pedido' : 'estudios pedidos'}`}
            />
            <TarjetaMetrica
              icono={UserPlus}
              titulo="Pacientes nuevos"
              valor={formatoNumero.format(totales.pacientes_nuevos)}
              detalle="Registrados en el período"
            />
            <TarjetaMetrica
              icono={Coins}
              titulo="Cobrado"
              valor={formatoPesos.format(totales.cobrado)}
              detalle={`Los pacientes deben ${formatoPesos.format(totales.facturado_pacientes)} en total`}
            />
            <TarjetaMetrica
              icono={Flask}
              titulo="A facturar a obras sociales"
              valor={formatoPesos.format(totales.facturado_obras_sociales)}
              detalle="Suma de los estudios cubiertos"
            />
          </div>

          <div className="lims-graficos">
            <Grafico
              titulo="Órdenes y estudios por día"
              descripcion="Cuántas órdenes se recibieron y cuántos estudios se pidieron."
              vacio={totales.ordenes === 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={porDia} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(28, 78, 128, 0.06)' }} />
                  <Bar dataKey="ordenes" name="Órdenes" fill={COLOR_PRIMARIO} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="estudios" name="Estudios" fill={COLOR_ACENTO} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Grafico>

            <Grafico
              titulo="Cobrado por día"
              descripcion="Lo que entró a caja, sin contar los cobros anulados."
              vacio={totales.cobrado === 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={porDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="relleno-cobrado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_PRIMARIO} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLOR_PRIMARIO} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(valor) => `$${formatoNumero.format(valor)}`} width={72} />
                  <Tooltip formatter={(valor) => formatoPesos.format(valor)} />
                  <Area type="monotone" dataKey="cobrado" name="Cobrado" stroke={COLOR_PRIMARIO} strokeWidth={2} fill="url(#relleno-cobrado)" />
                </AreaChart>
              </ResponsiveContainer>
            </Grafico>

            <Grafico
              titulo="Estudios más pedidos"
              descripcion="Los 8 análisis que más se piden en el período."
              vacio={topAnalisis.length === 0}
            >
              <ResponsiveContainer width="100%" height={Math.max(220, topAnalisis.length * 36 + 24)}>
                <BarChart data={topAnalisis} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef1f5" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(28, 78, 128, 0.06)' }} />
                  <Bar dataKey="cantidad" name="Pedidos" fill={COLOR_ACENTO} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Grafico>

            <section className="lims-grafico">
              <h2 className="lims-grafico-titulo">Órdenes por estado</h2>
              <p className="lims-grafico-descripcion">Incluye las anuladas para ver cuántas se cayeron.</p>
              <ul className="lims-estados">
                {datos.por_estado.length === 0 && <li className="lims-grafico-vacio">No hay datos en este período.</li>}
                {datos.por_estado.map((fila) => (
                  <li key={fila.estado} className={`lims-estado lims-estado--${fila.estado}`}>
                    <span>{NOMBRES_ESTADO[fila.estado] ?? fila.estado}</span>
                    <strong>{formatoNumero.format(fila.cantidad)}</strong>
                  </li>
                ))}
              </ul>
              <h3 className="lims-grafico-subtitulo">Cobrado por medio de pago</h3>
              <ul className="lims-medios">
                {datos.por_medio_pago.length === 0 && <li className="lims-grafico-vacio">No hay cobros en este período.</li>}
                {datos.por_medio_pago.map((fila) => (
                  <li key={fila.medio_pago}>
                    <div className="lims-medios-linea">
                      <span>{NOMBRES_MEDIO_PAGO[fila.medio_pago] ?? fila.medio_pago}</span>
                      <strong>{formatoPesos.format(fila.monto)}</strong>
                    </div>
                    <div className="lims-medios-barra" aria-hidden="true">
                      <span style={{ width: `${totalMedios ? (fila.monto / totalMedios) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="lims-grafico lims-tabla-sucursales">
            <h2 className="lims-grafico-titulo">Rendimiento por sucursal</h2>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Sucursal</th>
                    <th scope="col" className="text-end">Órdenes</th>
                    <th scope="col" className="text-end">Estudios</th>
                    <th scope="col" className="text-end">Facturado</th>
                    <th scope="col" className="text-end">Cobrado</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {!datos && cargando && rangoValido && (
        <p className="text-muted text-center py-5" role="status">
          Cargando métricas…
        </p>
      )}
    </div>
  );
}

export default Dashboard;
