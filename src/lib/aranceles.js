import axios from 'axios';
import { API_URL, encabezados } from './api.js';

// Aranceles según el Nomenclador Bioquímico Único (NBU): cada estudio vale una cantidad de unidades
// bioquímicas (UB, en el catálogo) y cada obra social paga un valor por UB. El particular tiene el suyo.
// Con obra social, el paciente paga el coseguro (un % de lo que vale el estudio) y la obra social el resto.
// La base calcula el precio de cada estudio al cargar la orden y lo guarda: un aumento no cambia órdenes viejas.

const CAMPOS_VALOR = 'id,obra_social_id,valor_ub,coseguro_pct,vigente_desde,observaciones,creado_en';

const PESOS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

export function formatearPesos(valor) {
  return PESOS.format(Number(valor));
}

// Todos los valores de UB cargados (el historial completo), del más nuevo al más viejo
export async function listarValoresUb() {
  const response = await axios.get(`${API_URL}/valores_ub`, {
    headers: await encabezados(),
    params: { select: CAMPOS_VALOR, order: 'vigente_desde.desc' },
  });
  return response.data;
}

// Guarda un valor nuevo. Si ya hay uno para esa obra social en esa fecha, lo reemplaza (id)
export async function guardarValorUb(datos, id = null) {
  const headers = { ...(await encabezados()), Prefer: 'return=representation' };
  const response = id
    ? await axios.patch(`${API_URL}/valores_ub`, datos, { headers, params: { id: `eq.${id}` } })
    : await axios.post(`${API_URL}/valores_ub`, datos, { headers });
  if (!Array.isArray(response.data) || response.data.length !== 1) {
    throw Object.assign(new Error('La API no devolvió el valor guardado'), {
      mensajeUsuario: 'Solo un administrador puede cambiar los aranceles.',
    });
  }
  return response.data[0];
}

// Los valores de una obra social (null = particular), del más nuevo al más viejo
export function valoresDe(valores, obraSocialId) {
  return valores.filter((valor) => (valor.obra_social_id ?? null) === (obraSocialId ?? null));
}

// El valor que rige en una fecha ("AAAA-MM-DD"): el más nuevo que ya empezó
export function vigenteEn(valores, fecha) {
  return valores.find((valor) => valor.vigente_desde <= fecha) ?? null;
}

// Cuánto paga el paciente y cuánto la obra social por toda la orden.
// Los componentes (ej: Neutrófilos) se cobran con su estudio; sinArancel: estudios sin precio cargado
export function totalesDeOrden(orden) {
  const pedidos = (orden.orden_analisis ?? []).filter((estudio) => !estudio.padre_id);
  return pedidos.reduce(
    (totales, estudio) => {
      if (estudio.importe_paciente === null || estudio.importe_paciente === undefined) {
        totales.sinArancel += 1;
        return totales;
      }
      totales.paciente += Number(estudio.importe_paciente);
      totales.obraSocial += Number(estudio.importe_obra_social ?? 0);
      return totales;
    },
    { paciente: 0, obraSocial: 0, sinArancel: 0 },
  );
}
