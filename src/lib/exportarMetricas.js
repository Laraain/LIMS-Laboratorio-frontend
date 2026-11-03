import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { diaDe, fechaDe, horaDe } from './hora.js';

// Informe exportable del dashboard (LIMS-23): las cifras de metricas_dashboard del período (y del anterior,
// para comparar) más el detalle de las órdenes, en Excel (.xlsx, una hoja por sección) o CSV.
//
// Cada hoja se describe una sola vez y sirve para los dos formatos:
// { nombre, columnas: [{ titulo, tipo, ancho }], filas: [[valor, ...]] }
// tipo: 'texto' | 'numero' | 'pesos' | 'porcentaje' (valor entre 0 y 1) | 'fecha' ("AAAA-MM-DD") | 'decimal'
// Una celda puede traer su propio tipo: { valor, tipo } (en el resumen cada fila es de un tipo distinto).

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
    {
      nombre: 'Resumen',
      encabezado: [
        ['Informe del laboratorio'],
        ['Período', `${formatoFecha(filtros.desde)} al ${formatoFecha(filtros.hasta)}`],
        ['Sucursal', filtros.sucursal],
        ['Período anterior', `${formatoFecha(filtros.anteriorDesde)} al ${formatoFecha(filtros.anteriorHasta)}`],
        // Hora de Tucumán en 24 h (toLocaleString en es-AR usa 12 h sin "p. m." y confunde)
        ['Generado', `${fechaDe(new Date())} ${horaDe(new Date())} h`],
      ],
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
      columnas: [
        { titulo: 'Estado', tipo: 'texto', ancho: 16 },
        { titulo: 'Órdenes', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.por_estado.map((fila) => [NOMBRES_ESTADO[fila.estado] ?? fila.estado, fila.cantidad]),
    },
    {
      nombre: 'Medios de pago',
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
      columnas: [
        { titulo: 'Motivo', tipo: 'texto', ancho: 44 },
        { titulo: 'Tubos', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.calidad.motivos.map((fila) => [fila.motivo, fila.cantidad]),
    },
    {
      nombre: 'Horas pico',
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
      columnas: [
        { titulo: 'Código', tipo: 'texto', ancho: 10 },
        { titulo: 'Estudio', tipo: 'texto', ancho: 30 },
        { titulo: 'Pedidos', tipo: 'numero', ancho: 10 },
      ],
      filas: datos.top_analisis.map((fila) => [fila.codigo, fila.nombre, fila.cantidad]),
    },
    {
      nombre: 'Médicos que más derivan',
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

// "2026-11-02" → "02/11/2026"
function formatoFecha(texto) {
  if (!texto) return '';
  const [anio, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${anio}`;
}

// Celda → { valor, tipo }, tomando el tipo de la columna si la celda no trae el suyo
function celda(valor, columna) {
  if (valor !== null && typeof valor === 'object') return { valor: valor.valor, tipo: valor.tipo };
  return { valor, tipo: columna.tipo };
}

// ── CSV ───────────────────────────────────────
// Separador ";" y coma decimal (como lo abre Excel en español), BOM para que respete los acentos.
// Las secciones van una debajo de otra, separadas por una línea en blanco.

function textoCsv(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (tipo === 'fecha') return formatoFecha(valor);
  if (tipo === 'porcentaje') return (Number(valor) * 100).toFixed(1).replace('.', ',');
  if (tipo === 'pesos') return Number(valor).toFixed(2).replace('.', ',');
  if (tipo === 'decimal') return String(Number(valor)).replace('.', ',');
  if (tipo === 'numero') return String(valor);
  const texto = String(valor);
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function generarCsv(hojas) {
  const lineas = [];
  for (const hoja of hojas) {
    lineas.push(textoCsv(hoja.nombre.toUpperCase(), 'texto'));
    for (const fila of hoja.encabezado ?? []) lineas.push(fila.map((valor) => textoCsv(valor, 'texto')).join(';'));
    if (hoja.encabezado) lineas.push('');
    // En el CSV los porcentajes van como número (12,8) y el título de la columna dice "%"
    lineas.push(hoja.columnas.map((columna) => textoCsv(columna.tipo === 'porcentaje' ? `${columna.titulo} (%)` : columna.titulo, 'texto')).join(';'));
    if (hoja.filas.length === 0) lineas.push('Sin datos en este período');
    for (const fila of hoja.filas) {
      lineas.push(
        fila
          .map((valor, indice) => {
            const { valor: v, tipo } = celda(valor, hoja.columnas[indice]);
            return textoCsv(v, tipo);
          })
          .join(';'),
      );
    }
    lineas.push('');
  }
  // BOM (U+FEFF) al principio: así Excel abre el archivo como UTF-8 y respeta los acentos
  return String.fromCharCode(0xfeff) + lineas.join('\r\n');
}

// ── Excel ─────────────────────────────────────
// ExcelJS es pesada: se descarga recién cuando alguien exporta, no al abrir el panel.

const FORMATOS_EXCEL = {
  numero: '#,##0',
  decimal: '#,##0.0',
  pesos: '"$" #,##0.00',
  porcentaje: '0.0%',
  fecha: 'dd/mm/yyyy',
};

function valorExcel(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (tipo === 'fecha') {
    const [anio, mes, dia] = valor.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
  }
  if (['numero', 'decimal', 'pesos', 'porcentaje'].includes(tipo)) return Number(valor);
  return String(valor);
}

async function generarXlsx(hojas) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'LIMS Laboratorio';
  libro.created = new Date();

  for (const hoja of hojas) {
    const ws = libro.addWorksheet(hoja.nombre.slice(0, 31));
    let filaActual = 1;
    for (const [indice, fila] of (hoja.encabezado ?? []).entries()) {
      const r = ws.getRow(filaActual);
      fila.forEach((valor, columna) => {
        r.getCell(columna + 1).value = valor;
      });
      r.getCell(1).font = { bold: true, size: indice === 0 ? 14 : 11 };
      filaActual += 1;
    }
    if (hoja.encabezado) filaActual += 1;

    const titulos = ws.getRow(filaActual);
    hoja.columnas.forEach((columna, indice) => {
      const c = titulos.getCell(indice + 1);
      c.value = columna.titulo;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C4E80' } };
      c.alignment = { vertical: 'middle', wrapText: true };
      ws.getColumn(indice + 1).width = columna.ancho;
    });
    // Los títulos quedan fijos al bajar
    ws.views = [{ state: 'frozen', ySplit: filaActual }];
    filaActual += 1;

    if (hoja.filas.length === 0) {
      ws.getRow(filaActual).getCell(1).value = 'Sin datos en este período';
      ws.getRow(filaActual).getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
    }
    for (const fila of hoja.filas) {
      const r = ws.getRow(filaActual);
      fila.forEach((valor, indice) => {
        const { valor: v, tipo } = celda(valor, hoja.columnas[indice]);
        const c = r.getCell(indice + 1);
        c.value = valorExcel(v, tipo);
        if (FORMATOS_EXCEL[tipo]) c.numFmt = FORMATOS_EXCEL[tipo];
      });
      filaActual += 1;
    }
  }

  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function descargar(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Se libera después de que el navegador empezó la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Nombre del archivo: metricas_todas_2026-10-04_al_2026-11-02.xlsx
function nombreDeArchivo(filtros, extension) {
  const sucursal = filtros.todas
    ? 'todas'
    : filtros.sucursal
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
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
