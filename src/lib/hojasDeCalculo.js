// Exportación a Excel (.xlsx) y CSV, compartida por los informes del panel (LIMS-23 métricas, LIMS-47 liquidación).
//
// Cada hoja se describe una sola vez y sirve para los dos formatos:
// { nombre, tabla, columnas: [{ titulo, tipo, ancho }], filas: [[valor, ...]], total? }
// tipo: 'texto' | 'numero' | 'pesos' | 'porcentaje' (valor entre 0 y 1) | 'fecha' ("AAAA-MM-DD") | 'decimal'
// Una celda puede traer su propio tipo: { valor, tipo } (en el resumen de métricas cada fila es de un tipo distinto).
// total (opcional): { etiqueta, sumar: [índices de columna] } agrega una fila de total al pie.

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

// Suma de cada columna del total (las celdas vacías no cuentan); redondeada a centavos
function sumasDelTotal(hoja) {
  const sumas = {};
  for (const indice of hoja.total.sumar) {
    const suma = hoja.filas.reduce((acumulado, fila) => {
      const { valor } = celda(fila[indice], hoja.columnas[indice]);
      return valor === null || valor === undefined || valor === '' ? acumulado : acumulado + Number(valor);
    }, 0);
    sumas[indice] = Math.round(suma * 100) / 100;
  }
  return sumas;
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

export function generarCsv(hojas) {
  const lineas = [];
  for (const hoja of hojas) {
    lineas.push(textoCsv(hoja.nombre.toUpperCase(), 'texto'));
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
    if (hoja.total && hoja.filas.length > 0) {
      const sumas = sumasDelTotal(hoja);
      lineas.push(
        hoja.columnas
          .map((columna, indice) => (indice === 0 ? textoCsv(hoja.total.etiqueta, 'texto') : indice in sumas ? textoCsv(sumas[indice], columna.tipo) : ''))
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
// Cada hoja es una "Tabla de Excel" con nombre (ej: DetalleOrdenes) que empieza en A1: así Power BI y las
// tablas dinámicas la reconocen sola, con los tipos de cada columna.

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

export async function generarXlsx(hojas) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'LIMS Laboratorio';
  libro.created = new Date();

  for (const hoja of hojas) {
    const ws = libro.addWorksheet(hoja.nombre.slice(0, 31));
    hoja.columnas.forEach((columna, indice) => {
      ws.getColumn(indice + 1).width = columna.ancho;
    });
    // Los títulos quedan fijos al bajar
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Sin filas no se arma la tabla (Excel la marca como dañada): quedan solo los títulos, sin textos de
    // aviso que le cambien el tipo a las columnas
    if (hoja.filas.length === 0) {
      hoja.columnas.forEach((columna, indice) => {
        const c = ws.getCell(1, indice + 1);
        c.value = columna.titulo;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C4E80' } };
      });
      continue;
    }

    const celdas = hoja.filas.map((fila) => fila.map((valor, indice) => celda(valor, hoja.columnas[indice])));
    // El total al pie es la fila de totales de la tabla: Excel la recalcula si se filtra
    const sumas = hoja.total ? sumasDelTotal(hoja) : null;
    ws.addTable({
      name: hoja.tabla,
      ref: 'A1',
      headerRow: true,
      totalsRow: Boolean(sumas),
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: hoja.columnas.map((columna, indice) => ({
        name: columna.titulo,
        filterButton: true,
        ...(sumas && indice === 0 ? { totalsRowLabel: hoja.total.etiqueta } : {}),
        // totalsRowResult: el valor ya calculado, para que se vea aunque Excel no recalcule al abrir
        ...(sumas && indice in sumas ? { totalsRowFunction: 'sum', totalsRowResult: sumas[indice] } : {}),
      })),
      rows: celdas.map((fila) => fila.map(({ valor, tipo }) => valorExcel(valor, tipo))),
    });
    // El formato va celda por celda: en el resumen de métricas cada fila es de un tipo distinto (pesos, cantidad, %)
    celdas.forEach((fila, numeroFila) => {
      fila.forEach(({ tipo }, indice) => {
        if (FORMATOS_EXCEL[tipo]) ws.getCell(numeroFila + 2, indice + 1).numFmt = FORMATOS_EXCEL[tipo];
      });
    });
    if (sumas) {
      const filaTotal = ws.getRow(celdas.length + 2);
      filaTotal.font = { bold: true };
      Object.keys(sumas).forEach((indice) => {
        const formato = FORMATOS_EXCEL[hoja.columnas[indice].tipo];
        if (formato) filaTotal.getCell(Number(indice) + 1).numFmt = formato;
      });
    }
  }

  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function descargar(blob, nombreArchivo) {
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

// Texto para un nombre de archivo: sin acentos, en minúsculas y con guiones ("Concepción" → "concepcion")
export function paraNombreDeArchivo(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
