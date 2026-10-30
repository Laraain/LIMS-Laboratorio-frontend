// Fecha y hora de Tucumán, sin importar la zona horaria de la computadora que abre el sitio

const ZONA = 'America/Argentina/Tucuman';
const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Día de la semana (0 = domingo ... 6 = sábado) y minutos desde la medianoche, en Tucumán
export function horaLocal() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((p) => p.type === tipo).value;
  return { dia: DIAS[valor('weekday')], minutos: Number(valor('hour')) * 60 + Number(valor('minute')) };
}

// "09:30" → 570
export const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Fecha de hoy en Tucumán como "AAAA-MM-DD" (el formato que guarda la base)
export function hoyTucuman() {
  // en-CA escribe las fechas como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
}

// Hora de una fecha de la base ("2026-10-22T11:05:00Z") en Tucumán: "08:05"
export function horaDe(fechaIso) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(fechaIso),
  );
}

// Día de una fecha de la base en Tucumán, como "AAAA-MM-DD" (sirve para comparar con un <input type="date">)
export function diaDe(fechaIso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(fechaIso));
}

// Fecha de una fecha de la base en Tucumán, como se lee acá: "22/10/2026"
export function fechaDe(fechaIso) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA }).format(new Date(fechaIso));
}

// Edad en años cumplidos a partir de la fecha de nacimiento ("AAAA-MM-DD")
export function edadDesde(fechaNacimiento) {
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
  const [anioHoy, mesHoy, diaHoy] = hoyTucuman().split('-').map(Number);
  const yaCumplio = mesHoy > mes || (mesHoy === mes && diaHoy >= dia);
  return anioHoy - anio - (yaCumplio ? 0 : 1);
}
