import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { fechaDe, horaDe } from './hora.js';
import { descargar, generarCsv, generarXlsx, paraNombreDeArchivo } from './hojasDeCalculo.js';

// Liquidación mensual a obras sociales (LIMS-47): lo que hay que presentarle a una obra social para
// cobrarle un mes. Una fila por estudio cubierto de sus órdenes no anuladas; lo arma la base.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-10" → "octubre de 2026"
export function nombreDelMes(mes) {
  const [anio, numero] = mes.split('-').map(Number);
  return `${MESES[numero - 1]} de ${anio}`;
}

// mes: "AAAA-MM". Devuelve las filas tal como las devuelve liquidacion_obra_social
export async function leerLiquidacion(obraSocialId, mes) {
  const response = await axios.post(
    `${API_URL}/rpc/liquidacion_obra_social`,
    { p_obra_social_id: obraSocialId, p_mes: `${mes}-01` },
    { headers: await encabezados() },
  );
  return response.data;
}

// Un estudio con 0 UB en el catálogo (ej: VCM, HCM y CHCM, que salen del hemograma) se presenta en $ 0
export function esImporteCero(fila) {
  return fila.importe_obra_social !== null && Number(fila.importe_obra_social) === 0;
}

// Total a facturar, estudios sin arancel (importe vacío: hay que cargar el valor de la UB antes de presentar)
// y estudios en $ 0 (sin UB en el catálogo: revisar si la obra social los factura aparte)
export function totalesDeLiquidacion(filas) {
  const total = filas.reduce((suma, fila) => suma + Number(fila.importe_obra_social ?? 0), 0);
  return {
    total: Math.round(total * 100) / 100,
    ordenes: new Set(filas.map((fila) => fila.nro_orden)).size,
    sinArancel: filas.filter((fila) => fila.importe_obra_social === null).length,
    enCero: filas.filter(esImporteCero).length,
  };
}

// Arma y descarga la planilla para la obra social. formato: 'xlsx' | 'csv'
// filas: lo que ya se leyó con leerLiquidacion · obraSocial: { nombre, codigo } · mes: "AAAA-MM"
export async function exportarLiquidacion(formato, filas, obraSocial, mes) {
  const { total, ordenes } = totalesDeLiquidacion(filas);
  const hojas = [
    // Los datos de la presentación van en su propia hoja: la del detalle arranca con los títulos en la fila 1
    {
      nombre: 'Información',
      tabla: 'Informacion',
      columnas: [
        { titulo: 'Dato', tipo: 'texto', ancho: 22 },
        { titulo: 'Valor', tipo: 'texto', ancho: 34 },
      ],
      filas: [
        ['Presentación', 'Liquidación mensual a obra social'],
        ['Obra social', obraSocial.nombre],
        ['Código', obraSocial.codigo ?? ''],
        ['Mes', nombreDelMes(mes)],
        ['Órdenes', { valor: ordenes, tipo: 'numero' }],
        ['Estudios', { valor: filas.length, tipo: 'numero' }],
        ['Total a facturar', { valor: total, tipo: 'pesos' }],
        // Hora de Tucumán en 24 h (toLocaleString en es-AR usa 12 h sin "p. m." y confunde)
        ['Generado', `${fechaDe(new Date())} ${horaDe(new Date())} h`],
      ],
    },
    {
      nombre: 'Detalle',
      tabla: 'Liquidacion',
      columnas: [
        { titulo: 'Fecha', tipo: 'fecha', ancho: 12 },
        { titulo: 'Orden', tipo: 'texto', ancho: 16 },
        { titulo: 'Sucursal', tipo: 'texto', ancho: 14 },
        { titulo: 'Paciente', tipo: 'texto', ancho: 26 },
        { titulo: 'DNI', tipo: 'texto', ancho: 12 },
        { titulo: 'Nro. de afiliado', tipo: 'texto', ancho: 18 },
        { titulo: 'Médico', tipo: 'texto', ancho: 24 },
        { titulo: 'Matrícula', tipo: 'texto', ancho: 12 },
        { titulo: 'Código NBU', tipo: 'texto', ancho: 12 },
        { titulo: 'Estudio', tipo: 'texto', ancho: 28 },
        { titulo: 'UB', tipo: 'decimal', ancho: 8 },
        { titulo: 'Valor de la UB', tipo: 'pesos', ancho: 14 },
        { titulo: 'A facturar', tipo: 'pesos', ancho: 14 },
        { titulo: 'Coseguro del paciente', tipo: 'pesos', ancho: 20 },
      ],
      filas: filas.map((fila) => [
        fila.fecha,
        fila.nro_orden,
        fila.sucursal ?? '',
        fila.paciente,
        fila.dni,
        fila.nro_afiliado ?? '',
        fila.medico ?? '',
        fila.matricula ?? '',
        fila.codigo_nbu ?? '',
        fila.estudio,
        fila.ub,
        fila.valor_ub,
        fila.importe_obra_social,
        fila.coseguro_paciente,
      ]),
      total: { etiqueta: 'Total', sumar: [12, 13] },
    },
  ];

  // liquidacion_pami_2026-10.xlsx
  const nombre = `liquidacion_${paraNombreDeArchivo(obraSocial.nombre)}_${mes}`;
  if (formato === 'csv') {
    descargar(new Blob([generarCsv(hojas)], { type: 'text/csv;charset=utf-8' }), `${nombre}.csv`);
  } else {
    descargar(await generarXlsx(hojas), `${nombre}.xlsx`);
  }
}
