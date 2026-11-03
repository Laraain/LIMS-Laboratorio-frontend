import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { hoyTucuman } from './hora.js';

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
