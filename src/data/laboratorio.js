import fotoExtraccion from '../assets/home/carrusel-extraccion.webp';
import fotoMuestras from '../assets/home/carrusel-muestras.webp';
import fotoEquipamiento from '../assets/home/carrusel-equipamiento.webp';
import fotoAtencion from '../assets/home/carrusel-atencion.webp';
import fotoEquipo1 from '../assets/home/equipo-1.webp';
import fotoEquipo2 from '../assets/home/equipo-2.webp';
import fotoEquipo3 from '../assets/home/equipo-3.webp';
import fotoEquipo4 from '../assets/home/equipo-4.webp';
import fotoEquipo5 from '../assets/home/equipo-5.webp';
import fotoEquipo6 from '../assets/home/equipo-6.webp';
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

// Dominio del sitio publicado. Si cambia, actualizarlo también en index.html, public/robots.txt y public/sitemap.xml.
export const sitio = {
  url: 'https://lims-laboratorio-frontend.vercel.app',
  nombre: 'LIMS Laboratorio Bioquímico',
};

export const enlacesPie = [
  { texto: 'Inicio', to: '/' },
  { texto: 'Servicios', to: '/#servicios' },
  { texto: 'Preparación', to: '/#preparacion' },
  { texto: 'Obras sociales', to: '/#obras-sociales' },
  { texto: 'Preguntas frecuentes', to: '/#preguntas-frecuentes' },
  { texto: 'Ver mis resultados', to: '/login-paciente' },
  { texto: 'Acceso personal', to: '/login-personal' },
];

// Los valores entre corchetes son marcadores: reemplazarlos por datos reales.
// Si cambian el teléfono, la dirección o el horario, actualizar también el JSON-LD de index.html.
export const contacto = {
  direccion: 'Av. Belgrano y Cuyo, San Miguel de Tucumán',
  calle: 'Av. Belgrano y Cuyo',
  ciudad: 'San Miguel de Tucumán',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Av.+Belgrano+y+Cuyo,+San+Miguel+de+Tucum%C3%A1n',
  telefono: '381 341-9913',
  telefonoEnlace: 'tel:+543813419913',
  email: 'contacto@limslaboratorio.com.ar',
  // Número en formato internacional sin signos (ej. 5493810000000). Mientras sea null no se muestra el botón de WhatsApp.
  whatsapp: null,
};

// Redes del pie. Facebook e Instagram llevan a la página principal de cada red hasta que el laboratorio tenga cuentas.
export const redes = [
  { id: 'facebook', nombre: 'Facebook', url: 'https://www.facebook.com/' },
  { id: 'instagram', nombre: 'Instagram', url: 'https://www.instagram.com/' },
  { id: 'whatsapp', nombre: 'WhatsApp', url: 'https://wa.me/5493813419913' },
  { id: 'maps', nombre: 'Google Maps', url: contacto.mapa },
];

// Horario de atención. Si cambia, actualizar también el JSON-LD de index.html. Días: 0 = domingo ... 6 = sábado.
export const horarios = {
  atencion: [
    { dias: [1, 2, 3, 4, 5], desde: '07:00', hasta: '19:00' },
    { dias: [6], desde: '08:00', hasta: '12:00' },
  ],
  // Texto que se muestra en la banda de datos del inicio y en el pie
  lineasAtencion: [
    { dias: 'Lunes a viernes', horas: '7:00 a 19:00' },
    { dias: 'Sábados', horas: '8:00 a 12:00' },
  ],
  lineasExtracciones: [{ dias: 'Lunes a sábados', horas: '8:00 a 10:00' }],
};

export const carrusel = [
  { id: 'extraccion', src: fotoExtraccion, alt: 'Extracción de sangre con guantes descartables', leyenda: 'Extracción' },
  { id: 'muestras', src: fotoMuestras, alt: 'Tubos de muestras de sangre en el laboratorio', leyenda: 'Procesamiento de muestras' },
  { id: 'equipamiento', src: fotoEquipamiento, alt: 'Centrífuga de laboratorio con muestras', leyenda: 'Equipamiento' },
  { id: 'atencion', src: fotoAtencion, alt: 'Recepcionista atendiendo a un paciente en el mostrador', leyenda: 'Atención' },
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
// Fotos 4 a 6 de Unsplash (licencia libre): SoyBreno, vaibhav vivian y Roy K.
export const equipo = [
  { id: 6, foto: fotoEquipo6, nombre: 'Bioq. Jorge Salvatierra', cargo: 'Jefe de laboratorio' },
  { id: 1, foto: fotoEquipo1, nombre: 'Bioq. Carolina Medina', cargo: 'Directora técnica' },
  { id: 5, foto: fotoEquipo5, nombre: 'Bioq. Nicolás Paz', cargo: 'Endocrinología' },
  { id: 4, foto: fotoEquipo4, nombre: 'Bioq. Tomás Herrera', cargo: 'Inmunología y serología' },
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
