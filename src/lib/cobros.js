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

// Lo que faltaba pagar al momento de un cobro, para el comprobante (LIMS-46).
// Se suman los cobros que estaban vigentes en ese momento (no se habían anulado todavía),
// para que una reimpresión muestre los mismos números aunque después haya otro cobro o
// una anulación. Si el cobro todavía no está en la lista (recién registrado), se suma igual.
export function saldoAlCobro(orden, cobro) {
  const total = totalesDeOrden(orden).paciente;
  const momento = new Date(cobro.cobrado_en).getTime();
  const cobros = orden.cobros ?? [];
  const estaEnLaLista = cobros.some((otro) => otro.id === cobro.id);
  const cobrado = cobros
    .filter((otro) => {
      if (new Date(otro.cobrado_en).getTime() > momento) return false;
      // Estaba vigente en ese momento: todavía no se había anulado
      return !otro.anulado_en || new Date(otro.anulado_en).getTime() > momento;
    })
    .reduce((suma, otro) => suma + Number(otro.monto), 0);
  const cobradoConEste = !estaEnLaLista && !cobro.anulado_en ? cobrado + Number(cobro.monto) : cobrado;
  return Math.round((total - cobradoConEste) * 100) / 100;
}
