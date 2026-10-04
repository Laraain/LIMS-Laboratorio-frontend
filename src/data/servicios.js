import fotoExtraccion from '../assets/servicios/extraccion.jpg';
import fotoCalidad from '../assets/servicios/calidad.jpg';
import fotoResultados from '../assets/servicios/resultados.jpg';
import fotoTrazabilidad from '../assets/servicios/trazabilidad.jpg';
import { Syringe, Flask, Microscope, Path } from '@phosphor-icons/react';

const servicios = [
  {
    id: 'extraccion',
    foto: fotoExtraccion,
    altFoto: 'Área de extracción y toma de muestras',
    icono: Syringe,
    variante: 'azul',
    titulo: 'Área de extracción',
    descripcion:
      'Protocolos seguros para toma de muestras ambulatorias y pediátricas bajo estrictas normas de bioseguridad.',
  },
  {
    id: 'calidad',
    foto: fotoCalidad,
    altFoto: 'Control de calidad en análisis clínicos',
    icono: Flask,
    variante: 'verde',
    titulo: 'Control de calidad',
    descripcion:
      'Validación automatizada de estándares analíticos y reactivos mediante nuestro sistema integrado LIMS.',
  },
  {
    id: 'resultados',
    foto: fotoResultados,
    altFoto: 'Portal de resultados digitales de laboratorio',
    icono: Microscope,
    variante: 'azul',
    titulo: 'Portal de resultados',
    descripcion:
      'Acceso digital inmediato a informes validados con firma electrónica para médicos y pacientes.',
  },
  {
    id: 'trazabilidad',
    foto: fotoTrazabilidad,
    altFoto: 'Trazabilidad digital de muestras en el laboratorio',
    icono: Path,
    variante: 'verde',
    titulo: 'Trazabilidad de muestras',
    descripcion:
      'Seguimiento en tiempo real del estado de cada muestra, desde la extracción hasta la validación final.',
  },
];

export default servicios;
