// Funciones para mostrar y leer los datos del catálogo de análisis

// Muestra un número con el formato argentino: 150000 → "150.000" · 0.6 → "0,6"
export function formatearNumero(valor) {
  return Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 4 });
}

// Arma el texto del valor de referencia según qué datos tenga cargados el análisis:
// mínimo y máximo → "36 – 50" · solo máximo → "Hasta 200" · solo mínimo → "Desde 70" · texto → "Negativo"
export function textoReferencia({ valor_ref_min: minimo, valor_ref_max: maximo, valor_ref_texto: texto }) {
  const hayMinimo = minimo !== null && minimo !== undefined;
  const hayMaximo = maximo !== null && maximo !== undefined;
  if (hayMinimo && hayMaximo) return `${formatearNumero(minimo)} – ${formatearNumero(maximo)}`;
  if (hayMaximo) return `Hasta ${formatearNumero(maximo)}`;
  if (hayMinimo) return `Desde ${formatearNumero(minimo)}`;
  return texto || '—';
}

// Convierte lo que se escribió en un campo numérico en un número para la base.
// Acepta la coma decimal ("0,6") y devuelve null si el campo quedó vacío o NaN si no es un número.
export function leerNumero(texto) {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  return /^-?\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : NaN;
}

// Lo contrario: pasa el número de la base al campo del formulario, con coma decimal
export function numeroParaCampo(valor) {
  return valor === null || valor === undefined ? '' : String(valor).replace('.', ',');
}
