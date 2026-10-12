import fotoExtraccion from '../assets/servicios/extraccion.jpg';
import fotoCalidad from '../assets/servicios/calidad.jpg';
import fotoResultados from '../assets/servicios/resultados.jpg';
import fotoTrazabilidad from '../assets/servicios/trazabilidad.jpg';

// Datos de los servicios. Las páginas recorren este arreglo con map() y generan una ServiceCard por cada uno:
// para agregar un servicio alcanza con sumar un objeto acá, sin tocar los componentes.
// id: identificador único (React lo usa como key) · icono: clase de Font Awesome · variante: color (azul o verde)
const servicios = [
  {
    id: 'extraccion',
    foto: fotoExtraccion,
    altFoto: 'Área de extracción y toma de muestras',
    icono: 'fa-solid fa-vial',
    variante: 'azul',
    titulo: 'Área de extracción',
    descripcion:
      'Protocolos seguros para toma de muestras ambulatorias y pediátricas bajo estrictas normas de bioseguridad.',
  },
  {
    id: 'calidad',
    foto: fotoCalidad,
    altFoto: 'Control de calidad en análisis clínicos',
    icono: 'fa-solid fa-flask',
    variante: 'verde',
    titulo: 'Control de calidad',
    descripcion:
      'Validación automatizada de estándares analíticos y reactivos mediante nuestro sistema integrado LIMS.',
  },
  {
    id: 'resultados',
    foto: fotoResultados,
    altFoto: 'Portal de resultados digitales de laboratorio',
    icono: 'fa-solid fa-microscope',
    variante: 'azul',
    titulo: 'Portal de resultados',
    descripcion:
      'Acceso digital inmediato a informes validados con firma electrónica para médicos y pacientes.',
  },
  {
    id: 'trazabilidad',
    foto: fotoTrazabilidad,
    altFoto: 'Trazabilidad digital de muestras en el laboratorio',
    icono: 'fa-solid fa-route',
    variante: 'verde',
    titulo: 'Trazabilidad de muestras',
    descripcion:
      'Seguimiento en tiempo real del estado de cada muestra, desde la extracción hasta la validación final.',
  },
];

export default servicios;
