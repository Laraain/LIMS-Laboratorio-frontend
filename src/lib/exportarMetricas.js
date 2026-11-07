import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { diaDe, fechaDe, horaDe } from './hora.js';
import { descargar, generarCsv, generarXlsx, paraNombreDeArchivo } from './hojasDeCalculo.js';

// Informe exportable del dashboard (LIMS-23): las cifras de metricas_dashboard del período (y del anterior,
// para comparar) más el detalle de las órdenes, en Excel (.xlsx, una hoja por sección) o CSV.
// Cómo se describe cada hoja y cómo se arman los archivos: ver hojasDeCalculo.js (lo comparte con LIMS-47).

const NOMBRES_MEDIO_PAGO = { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia' };
const NOMBRES_ESTADO = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  completa: 'Completa',
  informada: 'Informada',
  anulada: 'Anulada',
};
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Una fila por orden del período, anuladas incluidas (con sus montos en cero)
async function leerDetalleDeOrdenes(desde, hasta, sucursalId) {
  const params = {
    select:
      'nro_orden,estado,fecha_recepcion,motivo_anulacion,sucursales(nombre),pacientes(apellido,nombre,dni),' +
      'obras_sociales(nombre),medicos(apellido,nombre),orden_analisis(padre_id,importe_paciente,importe_obra_social),' +
      'cobros(monto,anulado_en)',
    and: `(fecha_recepcion.gte.${desde}T00:00:00-03:00,fecha_recepcion.lte.${hasta}T23:59:59.999-03:00)`,
    order: 'fecha_recepcion.asc',
  };
  if (sucursalId) params.sucursal_id = `eq.${sucursalId}`;
  const response = await axios.get(`${API_URL}/ordenes`, { headers: await encabezados(), params });

  return response.data.map((orden) => {
    const anulada = orden.estado === 'anulada';
    // Los componentes de un estudio (padre_id) no se cuentan ni se cobran aparte
    const estudios = orden.orden_analisis.filter((estudio) => !estudio.padre_id);
    const paciente = anulada ? 0 : estudios.reduce((suma, estudio) => suma + Number(estudio.importe_paciente ?? 0), 0);
    const obraSocial = anulada ? 0 : estudios.reduce((suma, estudio) => suma + Number(estudio.importe_obra_social ?? 0), 0);
    const cobrado = anulada
      ? 0
      : (orden.cobros ?? []).filter((cobro) => !cobro.anulado_en).reduce((suma, cobro) => suma + Number(cobro.monto), 0);
    return [
      orden.nro_orden,
      diaDe(orden.fecha_recepcion),
      orden.sucursales?.nombre ?? '',
      `${orden.pacientes.apellido}, ${orden.pacientes.nombre}`,
      orden.pacientes.dni,
      orden.obras_sociales?.nombre ?? 'Particular',
      orden.medicos ? `${orden.medicos.apellido}, ${orden.medicos.nombre}` : 'Sin pedido médico',
      NOMBRES_ESTADO[orden.estado] ?? orden.estado,
      estudios.length,
      paciente,
      obraSocial,
      cobrado,
      Math.max(Math.round((paciente - cobrado) * 100) / 100, 0),
      anulada ? orden.motivo_anulacion ?? '' : '',
    ];
  });
}

function fraccion(parte, total) {
  return total ? parte / total : null;
}

// Variación entre períodos como fracción (0,12 = +12 %); vacía si el anterior es 0 o no hay dato
function variacion(actual, anterior) {
  if (actual === null || anterior === null || anterior === undefined || Number(anterior) === 0) return null;
  return (Number(actual) - Number(anterior)) / Number(anterior);
}

// Arma todas las hojas a partir de lo que devuelve metricas_dashboard (este período y el anterior)
// y del detalle de órdenes. filtros: { desde, hasta, sucursal (nombre) }
function armarHojas(datos, anterior, detalle, filtros) {
  const t = datos.totales;
  const p = anterior?.totales ?? {};
  const indicador = (nombre, tipo, actual, previo) => [
    nombre,
    { valor: actual, tipo },
    { valor: previo ?? null, tipo },
    { valor: variacion(actual, previo), tipo: 'porcentaje' },
  ];
  const fueraDeRango = (d) => fraccion(d?.calidad?.fuera_de_rango, d?.calidad?.resultados);
  const rechazados = (d) => fraccion(d?.calidad?.tubos_rechazados, d?.calidad?.tubos);
  const retirados = (d) => fraccion(d?.fila?.retirados, d?.fila?.llegadas);

  const hojas = [
    // Los datos del informe van en su propia hoja: así todas las demás arrancan con los títulos en la
    // fila 1, que es lo que esperan Power BI y las tablas dinámicas de Excel
    {
      nombre: 'Información',
      tabla: 'Informacion',
      columnas: [
        { titulo: 'Dato', tipo: 'texto', ancho: 20 },
        { titulo: 'Valor', tipo: 'texto', ancho: 34 },
      ],
      filas: [
        ['Informe', 'Métricas del laboratorio'],
        ['Desde', { valor: filtros.desde, tipo: 'fecha' }],
        ['Hasta', { valor: filtros.hasta, tipo: 'fecha' }],
        ['Sucursal', filtros.sucursal],
        ['Período anterior desde', { valor: filtros.anteriorDesde, tipo: 'fecha' }],
        ['Período anterior hasta', { valor: filtros.anteriorHasta, tipo: 'fecha' }],
        // Hora de Tucumán en 24 h (toLocaleString en es-AR usa 12 h sin "p. m." y confunde)
        ['Generado', `${fechaDe(new Date())} ${horaDe(new Date())} h`],
      ],
    },
    {
      nombre: 'Resumen',
      tabla: 'Resumen',
      columnas: [
        { titulo: 'Indicador', tipo: 'texto', ancho: 34 },
        { titulo: 'Este período', tipo: 'numero', ancho: 18 },
        { titulo: 'Período anterior', tipo: 'numero', ancho: 18 },
        { titulo: 'Variación', tipo: 'porcentaje', ancho: 12 },
      ],
      filas: [
        indicador('Órdenes', 'numero', t.ordenes, p.ordenes),
        indicador('Estudios', 'numero', t.estudios, p.estudios),
        indicador('Pacientes atendidos', 'numero', t.pacientes, p.pacientes),
        indicador('A cargo del paciente', 'pesos', Number(t.facturado_pacientes), p.facturado_pacientes),
        indicador('A facturar a obras sociales', 'pesos', Number(t.facturado_obras_sociales), p.facturado_obras_sociales),
        indicador('Cobrado', 'pesos', Number(t.cobrado), p.cobrado),
        indicador('Pendiente de cobro', 'pesos', Number(t.pendiente_cobro), p.pendiente_cobro),
        indicador('Órdenes con saldo', 'numero', t.ordenes_con_saldo, p.ordenes_con_saldo),
        indicador('Órdenes atrasadas', 'numero', t.atrasadas, p.atrasadas),
        indicador('Días hasta informar (promedio)', 'decimal', datos.tiempos.dias_hasta_informar, anterior?.tiempos?.dias_hasta_informar),
        indicador('Espera en la fila (minutos)', 'numero', datos.tiempos.espera_fila_minutos, anterior?.tiempos?.espera_fila_minutos),
        indicador('Resultados fuera de rango', 'porcentaje', fueraDeRango(datos), fueraDeRango(anterior)),
        indicador('Tubos rechazados o no obtenidos', 'porcentaje', rechazados(datos), rechazados(anterior)),
        indicador('Llegadas a la fila', 'numero', datos.fila.llegadas, anterior?.fila?.llegadas),
        indicador('Se retiraron sin atenderse', 'porcentaje', retirados(datos), retirados(anterior)),
        indicador('Cobros anulados', 'numero', datos.caja.cobros_anulados, anterior?.caja?.cobros_anulados),
        indicador('Monto de cobros anulados', 'pesos', Number(datos.caja.monto_anulado), anterior?.caja?.monto_anulado),
        indicador('Faltante de caja', 'pesos', Number(datos.caja.faltante), anterior?.caja?.faltante),
        indicador('Sobrante de caja', 'pesos', Number(datos.caja.sobrante), anterior?.caja?.sobrante),
      ],
    },
    {
      nombre: 'Por día',
      tabla: 'PorDia',
      columnas: [
        { titulo: 'Día', tipo: 'fecha', ancho: 12 },
        { titulo: 'Órdenes', tipo: 'numero', ancho: 10 },
        { titulo: 'Estudios', tipo: 'numero', ancho: 10 },
        { titulo: 'Cobrado', tipo: 'pesos', ancho: 16 },
      ],
      filas: datos.por_dia.map((fila) => [fila.dia, fila.ordenes, fila.estudios, Number(fila.cobrado)]),
    },
    {
      nombre: 'Órdenes por estado',
      tabla: 'OrdenesPorEstado',
      columnas: [
        { titulo: 'Estado', tipo: 'texto', ancho: 16 },
        { titulo: 'Órdenes', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.por_estado.map((fila) => [NOMBRES_ESTADO[fila.estado] ?? fila.estado, fila.cantidad]),
    },
    {
      nombre: 'Medios de pago',
      tabla: 'MediosDePago',
      columnas: [
        { titulo: 'Medio de pago', tipo: 'texto', ancho: 16 },
        { titulo: 'Cobros', tipo: 'numero', ancho: 10 },
        { titulo: 'Monto', tipo: 'pesos', ancho: 16 },
        { titulo: 'Porcentaje', tipo: 'porcentaje', ancho: 12 },
      ],
      filas: datos.por_medio_pago.map((fila) => [
        NOMBRES_MEDIO_PAGO[fila.medio_pago] ?? fila.medio_pago,
        fila.cantidad,
        Number(fila.monto),
        fraccion(Number(fila.monto), Number(t.cobrado)),
      ]),
    },
    {
      nombre: 'Obras sociales',
      tabla: 'ObrasSociales',
      columnas: [
        { titulo: 'Obra social', tipo: 'texto', ancho: 24 },
        { titulo: 'Órdenes', tipo: 'numero', ancho: 10 },
        { titulo: 'A facturar a la obra social', tipo: 'pesos', ancho: 24 },
        { titulo: 'A cargo del paciente', tipo: 'pesos', ancho: 20 },
      ],
      filas: datos.por_obra_social.map((fila) => [
        fila.nombre,
        fila.ordenes,
        Number(fila.facturado_obra_social),
        Number(fila.facturado_paciente),
      ]),
    },
    {
      nombre: 'Tubos rechazados',
      tabla: 'TubosRechazados',
      columnas: [
        { titulo: 'Motivo', tipo: 'texto', ancho: 44 },
        { titulo: 'Tubos', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.calidad.motivos.map((fila) => [fila.motivo, fila.cantidad]),
    },
    {
      nombre: 'Horas pico',
      tabla: 'HorasPico',
      columnas: [
        { titulo: 'Día de la semana', tipo: 'texto', ancho: 18 },
        { titulo: 'Hora', tipo: 'texto', ancho: 12 },
        { titulo: 'Llegadas', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.fila.por_hora.map((fila) => [
        DIAS_SEMANA[fila.dia_semana - 1],
        `${String(fila.hora).padStart(2, '0')} a ${String(fila.hora + 1).padStart(2, '0')} h`,
        fila.cantidad,
      ]),
    },
    {
      nombre: 'Cajas con diferencia',
      tabla: 'CajasConDiferencia',
      columnas: [
        { titulo: 'Fecha', tipo: 'fecha', ancho: 12 },
        { titulo: 'Sucursal', tipo: 'texto', ancho: 18 },
        { titulo: 'Diferencia', tipo: 'pesos', ancho: 14 },
        { titulo: 'Observaciones', tipo: 'texto', ancho: 40 },
      ],
      filas: datos.caja.con_diferencia.map((fila) => [fila.fecha, fila.sucursal, Number(fila.diferencia), fila.observaciones ?? '']),
    },
    {
      nombre: 'Por sucursal',
      tabla: 'PorSucursal',
      columnas: [
        { titulo: 'Sucursal', tipo: 'texto', ancho: 18 },
        { titulo: 'Órdenes', tipo: 'numero', ancho: 10 },
        { titulo: 'Estudios', tipo: 'numero', ancho: 10 },
        { titulo: 'Facturado', tipo: 'pesos', ancho: 16 },
        { titulo: 'Cobrado', tipo: 'pesos', ancho: 16 },
        { titulo: 'Pendiente de cobro', tipo: 'pesos', ancho: 18 },
        { titulo: 'Órdenes atrasadas', tipo: 'numero', ancho: 18 },
        { titulo: 'Días hasta informar', tipo: 'decimal', ancho: 18 },
      ],
      filas: datos.por_sucursal.map((fila) => [
        fila.nombre,
        fila.ordenes,
        fila.estudios,
        Number(fila.facturado),
        Number(fila.cobrado),
        Number(fila.pendiente_cobro),
        fila.atrasadas,
        fila.dias_hasta_informar,
      ]),
    },
    {
      nombre: 'Estudios más pedidos',
      tabla: 'EstudiosMasPedidos',
      columnas: [
        { titulo: 'Código', tipo: 'texto', ancho: 10 },
        { titulo: 'Estudio', tipo: 'texto', ancho: 30 },
        { titulo: 'Pedidos', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.top_analisis.map((fila) => [fila.codigo, fila.nombre, fila.cantidad]),
    },
    {
      nombre: 'Médicos que más derivan',
      tabla: 'MedicosQueMasDerivan',
      columnas: [
        { titulo: 'Médico', tipo: 'texto', ancho: 28 },
        { titulo: 'Matrícula', tipo: 'texto', ancho: 12 },
        { titulo: 'Órdenes', tipo: 'numero', ancho: 10 },
        { titulo: 'Estudios', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.top_medicos.map((fila) => [`${fila.apellido}, ${fila.nombre}`, fila.matricula, fila.ordenes, fila.estudios]),
    },
    {
      nombre: 'Detalle de órdenes',
      tabla: 'DetalleOrdenes',
      columnas: [
        { titulo: 'Orden', tipo: 'texto', ancho: 16 },
        { titulo: 'Recibida', tipo: 'fecha', ancho: 12 },
        { titulo: 'Sucursal', tipo: 'texto', ancho: 14 },
        { titulo: 'Paciente', tipo: 'texto', ancho: 26 },
        { titulo: 'DNI', tipo: 'texto', ancho: 12 },
        { titulo: 'Obra social', tipo: 'texto', ancho: 18 },
        { titulo: 'Médico', tipo: 'texto', ancho: 24 },
        { titulo: 'Estado', tipo: 'texto', ancho: 12 },
        { titulo: 'Estudios', tipo: 'numero', ancho: 10 },
        { titulo: 'A cargo del paciente', tipo: 'pesos', ancho: 18 },
        { titulo: 'A facturar a la obra social', tipo: 'pesos', ancho: 22 },
        { titulo: 'Cobrado', tipo: 'pesos', ancho: 14 },
        { titulo: 'Saldo', tipo: 'pesos', ancho: 14 },
        { titulo: 'Motivo de anulación', tipo: 'texto', ancho: 30 },
      ],
      filas: detalle,
    },
  ];
  // "Por sucursal" solo tiene sentido con todas las sucursales
  return filtros.todas ? hojas : hojas.filter((hoja) => hoja.nombre !== 'Por sucursal');
}

// Nombre del archivo: metricas_todas_2026-10-04_al_2026-11-02.xlsx
function nombreDeArchivo(filtros, extension) {
  const sucursal = filtros.todas ? 'todas' : paraNombreDeArchivo(filtros.sucursal);
  return `metricas_${sucursal}_${filtros.desde}_al_${filtros.hasta}.${extension}`;
}

// Arma y descarga el informe. formato: 'xlsx' | 'csv'
// datos y anterior: lo que devolvió metricas_dashboard (ya cargado en la pantalla)
// filtros: { desde, hasta, anteriorDesde, anteriorHasta, sucursalId, sucursal (nombre), todas }
export async function exportarInforme(formato, datos, anterior, filtros) {
  const detalle = await leerDetalleDeOrdenes(filtros.desde, filtros.hasta, filtros.sucursalId);
  const hojas = armarHojas(datos, anterior, detalle, filtros);
  if (formato === 'csv') {
    descargar(new Blob([generarCsv(hojas)], { type: 'text/csv;charset=utf-8' }), nombreDeArchivo(filtros, 'csv'));
  } else {
    descargar(await generarXlsx(hojas), nombreDeArchivo(filtros, 'xlsx'));
  }
}
