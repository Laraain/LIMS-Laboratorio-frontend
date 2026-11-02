import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { totalesDeOrden } from './aranceles.js';

// Cobros por orden (LIMS-19): lo que paga el paciente, en una o varias partes y con distintos medios.
// La base no deja cobrar más de lo que falta ni borrar un cobro: se anula con motivo.

export const MEDIOS_PAGO = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
};

async function rpc(nombre, parametros) {
  const response = await axios.post(`${API_URL}/rpc/${nombre}`, parametros, { headers: await encabezados() });
  return response.data;
}

// Devuelve { cobro, total, cobrado, saldo }
export function registrarCobro(ordenId, monto, medioPago, observaciones) {
  return rpc('registrar_cobro', {
    p_orden_id: ordenId,
    p_monto: monto,
    p_medio_pago: medioPago,
    p_observaciones: observaciones || null,
  });
}

export function anularCobro(cobroId, motivo) {
  return rpc('anular_cobro', { p_cobro_id: cobroId, p_motivo: motivo });
}

// Cuenta de la orden con sus cobros (orden.cobros viene en el listado de órdenes).
// total: lo que paga el paciente · cobrado: suma de los cobros no anulados · saldo: lo que falta
export function cuentaDeOrden(orden) {
  const total = totalesDeOrden(orden).paciente;
  const cobrado = (orden.cobros ?? [])
    .filter((cobro) => !cobro.anulado_en)
    .reduce((suma, cobro) => suma + Number(cobro.monto), 0);
  // Redondeo a centavos: sumar decimales en JavaScript deja restos como 0,0000001
  const saldo = Math.round((total - cobrado) * 100) / 100;
  return { total, cobrado, saldo, pagada: total > 0 && saldo <= 0 };
}
