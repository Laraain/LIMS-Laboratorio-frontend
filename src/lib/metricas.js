import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { diaDe, hoyTucuman } from './hora.js';

// Dashboard de métricas del admin (LIMS-22). Todos los números los calcula la base con metricas_dashboard,
// para un período y, si se elige, una sucursal (sucursalId null = todas).

async function rpc(nombre, parametros) {
  const response = await axios.post(`${API_URL}/rpc/${nombre}`, parametros, { headers: await encabezados() });
  return response.data;
}

// desde y hasta: "AAAA-MM-DD" (días de Tucumán, los dos incluidos)
export function metricasDashboard(desde, hasta, sucursalId) {
  return rpc('metricas_dashboard', { p_desde: desde, p_hasta: hasta, p_sucursal_id: sucursalId });
}

// Detalle de las tarjetas de alerta: qué órdenes del período están atrasadas y cuáles tienen saldo.
// Usa las mismas reglas que metricas_dashboard:
// - atrasada: sin informar y vencido el plazo (recepción + días de demora del estudio más lento)
// - con saldo: lo que paga el paciente (estudios sin padre_id) menos lo cobrado sin anular, mayor a cero
// Devuelve { atrasadas: [...], conSaldo: [...] }, cada orden con { id, nro, paciente, dni, sucursal, recibida, ... }
export async function detalleDeAlertas(desde, hasta, sucursalId) {
  const params = {
    select:
      'id,nro_orden,estado,fecha_recepcion,sucursales(nombre),pacientes(apellido,nombre,dni),' +
      'orden_analisis(padre_id,importe_paciente,analisis(dias_demora)),cobros(monto,anulado_en)',
    estado: 'neq.anulada',
    and: `(fecha_recepcion.gte.${desde}T00:00:00-03:00,fecha_recepcion.lte.${hasta}T23:59:59.999-03:00)`,
    order: 'fecha_recepcion.asc',
  };
  if (sucursalId) params.sucursal_id = `eq.${sucursalId}`;
  const response = await axios.get(`${API_URL}/ordenes`, { headers: await encabezados(), params });

  const hoy = hoyTucuman();
  const atrasadas = [];
  const conSaldo = [];
  for (const orden of response.data) {
    const recibida = diaDe(orden.fecha_recepcion);
    const base = {
      id: orden.id,
      nro: orden.nro_orden,
      paciente: `${orden.pacientes.apellido}, ${orden.pacientes.nombre}`,
      dni: orden.pacientes.dni,
      sucursal: orden.sucursales?.nombre ?? '',
      recibida,
      estado: orden.estado,
    };
    const demora = Math.max(0, ...orden.orden_analisis.map((estudio) => estudio.analisis?.dias_demora ?? 0));
    const vence = sumarDias(recibida, demora);
    if (orden.estado !== 'informada' && vence < hoy) {
      atrasadas.push({ ...base, vence, diasDeAtraso: diasDelPeriodo(vence, hoy) - 1 });
    }
    const total = orden.orden_analisis
      .filter((estudio) => !estudio.padre_id)
      .reduce((suma, estudio) => suma + Number(estudio.importe_paciente ?? 0), 0);
    const cobrado = (orden.cobros ?? []).filter((cobro) => !cobro.anulado_en).reduce((suma, cobro) => suma + Number(cobro.monto), 0);
    const saldo = Math.round((total - cobrado) * 100) / 100;
    if (saldo > 0) conSaldo.push({ ...base, total, cobrado, saldo });
  }
  // Primero lo más urgente: el que más días lleva atrasado y el que más debe
  atrasadas.sort((a, b) => b.diasDeAtraso - a.diasDeAtraso);
  conSaldo.sort((a, b) => b.saldo - a.saldo);
  return { atrasadas, conSaldo };
}

// Suma (o resta) días a una fecha "AAAA-MM-DD". Se calcula en UTC para que el cambio de horario no corra el día
export function sumarDias(fecha, dias) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

// Días que abarca el período, contando los dos extremos
export function diasDelPeriodo(desde, hasta) {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000) + 1;
}

// El período anterior, del mismo largo y pegado al elegido (ej: 1 al 30/11 → 2 al 31/10)
export function periodoAnterior(desde, hasta) {
  const largo = diasDelPeriodo(desde, hasta);
  return { desde: sumarDias(desde, -largo), hasta: sumarDias(desde, -1) };
}

// Atajos del filtro de fechas. Todos terminan hoy (hora de Tucumán)
export const ATAJOS = [
  { clave: '7', texto: '7 días', desde: (hoy) => sumarDias(hoy, -6) },
  { clave: '30', texto: '30 días', desde: (hoy) => sumarDias(hoy, -29) },
  { clave: 'mes', texto: 'Este mes', desde: (hoy) => `${hoy.slice(0, 8)}01` },
];

export function rangoDeAtajo(clave) {
  const hoy = hoyTucuman();
  const atajo = ATAJOS.find((opcion) => opcion.clave === clave);
  return { desde: atajo.desde(hoy), hasta: hoy };
}
