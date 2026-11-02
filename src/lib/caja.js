import axios from 'axios';
import { API_URL, encabezados } from './api.js';

// Caja diaria por sucursal (LIMS-20). Recepción la abre con el efectivo inicial y la cierra contando el efectivo.
// Para cobrar tiene que estar abierta; cerrada, no se anulan cobros de ese día (el admin la puede reabrir).
// Las cuentas (lo cobrado por medio de pago, lo esperado y la diferencia) las hace la base.

async function rpc(nombre, parametros) {
  const response = await axios.post(`${API_URL}/rpc/${nombre}`, parametros, { headers: await encabezados() });
  return response.data;
}

// Devuelve { fecha, caja, por_medio: [{ medio_pago, total, cantidad }], cobros_anulados, efectivo_esperado, diferencia }
// caja es null si ese día no se abrió. fecha: "AAAA-MM-DD" (null = hoy)
export function resumenCaja(sucursalId, fecha = null) {
  return rpc('resumen_caja', { p_sucursal_id: sucursalId, p_fecha: fecha });
}

export function abrirCaja(sucursalId, montoInicial) {
  return rpc('abrir_caja', { p_sucursal_id: sucursalId, p_monto_inicial: montoInicial });
}

// Devuelve el resumen del día cerrado. fecha: para cerrar una caja de otro día que quedó abierta
export function cerrarCaja(sucursalId, montoContado, observaciones, fecha = null) {
  return rpc('cerrar_caja', {
    p_sucursal_id: sucursalId,
    p_monto_contado: montoContado,
    p_observaciones: observaciones || null,
    p_fecha: fecha,
  });
}

// Solo el admin, con motivo
export function reabrirCaja(cajaId, motivo) {
  return rpc('reabrir_caja', { p_caja_id: cajaId, p_motivo: motivo });
}
