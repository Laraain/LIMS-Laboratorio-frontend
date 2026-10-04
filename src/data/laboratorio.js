import fotoExtraccion from '../assets/home/carrusel-extraccion.webp';
import fotoMuestras from '../assets/home/carrusel-muestras.webp';
import fotoEquipamiento from '../assets/home/carrusel-equipamiento.webp';
import fotoAtencion from '../assets/home/carrusel-atencion.webp';
import fotoEquipo1 from '../assets/home/equipo-1.webp';
import fotoEquipo2 from '../assets/home/equipo-2.webp';
import fotoEquipo3 from '../assets/home/equipo-3.webp';
import logoPami from '../assets/obras-sociales/pami.svg';
import logoSubsidioSalud from '../assets/obras-sociales/subsidio-salud.png';
import logoOsde from '../assets/obras-sociales/osde.svg';
import logoSwissMedical from '../assets/obras-sociales/swiss-medical.svg';
import logoGaleno from '../assets/obras-sociales/galeno.png';
import logoMedife from '../assets/obras-sociales/medife.svg';
import logoSancorSalud from '../assets/obras-sociales/sancor-salud.svg';
import logoOsecac from '../assets/obras-sociales/osecac.gif';
import logoOsprera from '../assets/obras-sociales/osprera.png';
import logoUnionPersonal from '../assets/obras-sociales/union-personal.png';

// Los valores entre corchetes son marcadores: reemplazarlos por datos reales.
export const contacto = {
  direccion: 'Av. Belgrano y Cuyo, San Miguel de Tucumán',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Av.+Belgrano+y+Cuyo,+San+Miguel+de+Tucum%C3%A1n',
  telefono: '[TELÉFONO]',
  email: 'contacto@limslaboratorio.com.ar',
  // Número en formato internacional sin signos (ej. 5493810000000). Mientras sea null no se muestra el botón de WhatsApp.
  whatsapp: null,
};

// Horario de EJEMPLO: reemplazar por el real. Días: 0 = domingo ... 6 = sábado.
export const horarios = {
  atencion: [
    { dias: [1, 2, 3, 4, 5], desde: '07:00', hasta: '19:00' },
    { dias: [6], desde: '08:00', hasta: '12:00' },
  ],
  textoAtencion: 'Lunes a viernes de 7:00 a 19:00 · Sábados de 8:00 a 12:00',
  textoExtracciones: 'Extracciones de lunes a sábados hasta las 10:00',
};

export const carrusel = [
  { id: 'extraccion', src: fotoExtraccion, alt: 'Extracción de sangre con guantes descartables', leyenda: 'Extracción' },
  { id: 'muestras', src: fotoMuestras, alt: 'Tubos de muestras de sangre en el laboratorio', leyenda: 'Procesamiento de muestras' },
  { id: 'equipamiento', src: fotoEquipamiento, alt: 'Centrífuga de laboratorio con muestras', leyenda: 'Equipamiento' },
  { id: 'atencion', src: fotoAtencion, alt: 'Recepcionista atendiendo a un paciente en el mostrador', leyenda: 'Atención' },
];

export const accesos = [
  { id: 'resultados', texto: 'Resultados', to: '/login-paciente' },
  { id: 'preparacion', texto: 'Preparación', to: '/#preparacion' },
  { id: 'obras-sociales', texto: 'Obras sociales', to: '/#obras-sociales' },
  { id: 'contacto', texto: 'Contacto', to: '/#contacto' },
];

export const pasosResultados = [
  {
    titulo: 'Se realiza el estudio',
    texto: 'En recepción le entregamos una contraseña provisoria para ingresar al portal.',
  },
  {
    titulo: 'Le avisamos cuando está listo',
    texto: 'Cuando un bioquímico matriculado valida el informe, aparece en el portal y le enviamos un correo.',
  },
  {
    titulo: 'Ingresa con su DNI',
    texto: 'Consulte o descargue su informe desde el celular o la computadora, sin pasar por el laboratorio.',
  },
];

export const areas = [
  { id: 'hematologia', nombre: 'Hematología', estudios: 'Hemograma, coagulograma, eritrosedimentación, grupo y factor' },
  { id: 'quimica', nombre: 'Química clínica', estudios: 'Glucemia, perfil lipídico, hepatograma, urea y creatinina' },
  { id: 'endocrinologia', nombre: 'Endocrinología', estudios: 'TSH, T4 libre, insulina, hormonas sexuales' },
  { id: 'orina', nombre: 'Orina', estudios: 'Orina completa, urocultivo, orina de 24 horas' },
  { id: 'inmunologia', nombre: 'Inmunología y serología', estudios: 'Hepatitis, HIV, VDRL, Chagas, toxoplasmosis' },
  { id: 'microbiologia', nombre: 'Microbiología', estudios: 'Cultivos, antibiogramas, exudados' },
];

export const preparacion = [
  {
    titulo: 'Ayuno',
    texto: 'Para análisis de sangre de rutina, ayuno de 8 a 12 horas. Puede tomar agua. No suspenda su medicación sin consultar a su médico.',
  },
  {
    titulo: 'Muestra de orina',
    texto: 'Primera orina de la mañana, en frasco estéril. Higienícese antes y descarte el primer chorro.',
  },
  {
    titulo: 'Qué traer',
    texto: 'DNI, orden médica vigente y credencial de su obra social.',
  },
];

// Listado de maqueta con obras sociales y prepagas habituales en Argentina: confirmar con qué convenios trabaja el laboratorio.
// Logos tomados de los sitios oficiales; OSDE, OSPRERA y Unión Personal venían en blanco y se pasaron a gris oscuro.
export const obrasSociales = [
  { id: 'pami', nombre: 'PAMI', logo: logoPami },
  { id: 'subsidio-salud', nombre: 'Subsidio de Salud', logo: logoSubsidioSalud },
  { id: 'osde', nombre: 'OSDE', logo: logoOsde },
  { id: 'swiss-medical', nombre: 'Swiss Medical', logo: logoSwissMedical },
  { id: 'galeno', nombre: 'Galeno', logo: logoGaleno },
  { id: 'medife', nombre: 'Medifé', logo: logoMedife },
  { id: 'sancor-salud', nombre: 'SanCor Salud', logo: logoSancorSalud },
  { id: 'osecac', nombre: 'OSECAC', logo: logoOsecac },
  { id: 'osprera', nombre: 'OSPRERA', logo: logoOsprera },
  { id: 'union-personal', nombre: 'Unión Personal', logo: logoUnionPersonal },
];

// Personas ficticias para la maqueta: reemplazar por el equipo real.
export const equipo = [
  { id: 1, foto: fotoEquipo1, nombre: 'Bioq. Carolina Medina', cargo: 'Directora técnica' },
  { id: 2, foto: fotoEquipo2, nombre: 'Bioq. Florencia Ríos', cargo: 'Hematología y química clínica' },
  { id: 3, foto: fotoEquipo3, nombre: 'Bioq. Martín Ibáñez', cargo: 'Microbiología' },
];

export const preguntas = [
  {
    id: 'portal',
    pregunta: '¿Cómo ingreso al portal de resultados?',
    respuesta: 'Con su DNI y la contraseña provisoria que le entregamos en recepción. En el primer ingreso le pediremos que la cambie y que registre su correo electrónico.',
  },
  {
    id: 'cuando',
    pregunta: '¿Cuándo están mis resultados?',
    respuesta: 'Depende del estudio. Cuando el informe está validado aparece en el portal y le avisamos por correo electrónico.',
  },
  {
    id: 'ayuno',
    pregunta: '¿Tengo que ir en ayunas?',
    respuesta: 'Para la mayoría de los análisis de sangre, sí: entre 8 y 12 horas. Si tiene dudas sobre su estudio, consúltenos antes de venir.',
  },
  {
    id: 'llevar',
    pregunta: '¿Qué tengo que llevar?',
    respuesta: 'Su DNI, la orden médica y la credencial de su obra social.',
  },
  {
    id: 'contrasena',
    pregunta: 'Olvidé mi contraseña, ¿qué hago?',
    respuesta: 'Comuníquese con el laboratorio y lo ayudamos a recuperar el acceso.',
  },
];
