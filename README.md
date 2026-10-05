# LIMS Laboratorio Bioquímico — Frontend

Sitio web de un laboratorio de análisis clínicos de San Miguel de Tucumán, desarrollado en React como parte del Trabajo Final Integrador de la Tecnicatura Universitaria en Programación (TUP).

El sitio informa a los pacientes cómo prepararse para sus estudios, los horarios y las obras sociales con las que trabaja el laboratorio, y les da acceso a un portal para consultar sus resultados ingresando con su DNI. El personal del laboratorio tiene su propio acceso al sistema interno.

**Sitio publicado:** https://lims-laboratorio-frontend.vercel.app

**Equipo:** Agustín Maidana Diaz · Axel Molina · Lara Ain Serrano

## Funcionalidades

- **Inicio** con un carrusel de fotos que avanza solo, se pausa al pasar el mouse o con el foco del teclado, tiene botón de pausa y respeta la preferencia "reducir movimiento" del sistema.
- **Accesos rápidos** a resultados, preparación, obras sociales y contacto.
- **Estado "Abierto ahora / Cerrado"** calculado en vivo según el horario de atención y la hora de Tucumán.
- Secciones de **cómo ver los resultados**, **estudios por área**, **preparación para el estudio**, **obras sociales** (cinta de logos que se desplaza sola), **equipo** (tarjetas que se destacan al pasar el mouse), **servicios** y **preguntas frecuentes**.
- **Login del paciente** con DNI (acepta el DNI con puntos) y contraseña, con validación de campos y opción para mostrar la contraseña.
- **Login del personal** con usuario o matrícula y contraseña.
- **Sesión simulada** guardada en `sessionStorage`: se mantiene al recargar la página y se puede cerrar.
- **Diseño adaptable** a celular, tablet y escritorio, con textos de al menos 16 px en el celular.

> Los logins de esta versión son simulados: validan contra credenciales fijas en el código y no se conectan a una base de datos.

## Tecnologías

| Tecnología | Uso |
|---|---|
| [React 19](https://react.dev/) | Interfaz basada en componentes |
| [Vite 8](https://vite.dev/) | Servidor de desarrollo y compilación |
| [React Router 7](https://reactrouter.com/) | Navegación entre páginas (`react-router-dom`) |
| [Bootstrap 5.3](https://getbootstrap.com/) y [React Bootstrap](https://react-bootstrap.github.io/) | Grilla, barra de navegación y acordeón |
| [Phosphor Icons](https://phosphoricons.com/) | Íconos (`@phosphor-icons/react`) |
| CSS propio | Paleta, tipografía (Inter) y estilos de cada componente |
| ESLint | Control de calidad del código |
| Vercel | Publicación del sitio |

## Instalación y ejecución

Requisitos: [Node.js](https://nodejs.org/) 20 o superior y npm.

```bash
# 1. Clonar el repositorio
git clone https://github.com/Laraain/LIMS-Laboratorio-frontend.git
cd LIMS-Laboratorio-frontend

# 2. Instalar las dependencias
npm install

# 3. Levantar el servidor de desarrollo
npm run dev
```

El sitio queda disponible en http://localhost:5173.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila el sitio para producción en la carpeta `dist/` |
| `npm run preview` | Sirve localmente la versión compilada |
| `npm run lint` | Revisa el código con ESLint |

### Credenciales de prueba

| Acceso | Usuario | Contraseña |
|---|---|---|
| Portal del paciente (`/login-paciente`) | DNI `30123456` | `Paciente2026` |
| Personal (`/login-personal`) | `bioq_perez` | `Lab2026!` |

## Rutas

| Ruta | Página |
|---|---|
| `/` | Inicio (todas las secciones) |
| `/login-paciente` | Ingreso del paciente |
| `/login-personal` | Ingreso del personal |
| `/servicios` | Redirige a la sección de servicios del inicio (`/#servicios`) |

## Estructura del proyecto

```
├── public/                  Archivos servidos tal cual: favicon, imagen para compartir, robots.txt, sitemap.xml
├── src/
│   ├── assets/              Fotos, logos de obras sociales y logo del laboratorio
│   ├── components/          Componentes reutilizables
│   │   ├── Navbar.jsx           Barra de navegación
│   │   ├── Footer.jsx           Pie con contacto y horarios
│   │   ├── Carrusel.jsx         Carrusel de fotos del inicio
│   │   ├── CintaLogos.jsx       Cinta que se desplaza sin fin (logos de obras sociales)
│   │   ├── EstadoAhora.jsx      Indicador "Abierto ahora / Cerrado"
│   │   ├── ServiceCard.jsx      Tarjeta de servicio
│   │   ├── LoginLayout.jsx      Pantalla dividida que comparten los dos logins
│   │   └── LoginSuccess.jsx     Mensaje de sesión iniciada
│   ├── data/                Contenido del sitio separado de los componentes
│   │   ├── laboratorio.js       Contacto, horarios, estudios, obras sociales, equipo, preguntas
│   │   └── servicios.js         Servicios del laboratorio
│   ├── hooks/
│   │   ├── useAlAparecer.js     Detecta cuándo un elemento entra en pantalla (animaciones al hacer scroll)
│   │   └── useMetadatos.js      Título, descripción y metadatos SEO de cada página
│   ├── pages/               Una vista por ruta
│   │   ├── Home.jsx
│   │   ├── LoginPaciente.jsx
│   │   └── LoginPersonal.jsx
│   ├── App.jsx              Definición de rutas
│   ├── main.jsx             Punto de entrada
│   └── index.css            Variables de color y estilos globales
├── index.html               Metadatos SEO, Open Graph y datos estructurados
└── vercel.json              Redirige todas las rutas a la app (necesario en una SPA)
```

El contenido (textos, horarios, obras sociales, equipo) vive en `src/data/` y las páginas lo recorren con `map()`, así que se puede editar sin tocar los componentes.

## Conceptos de React aplicados

- **Componentes y props:** por ejemplo, `ServiceCard` recibe foto, ícono, título y descripción, y `LoginLayout` recibe los textos, la foto y el formulario (`children`) de cada login.
- **`map()`:** las listas del inicio (accesos, pasos, estudios, preparación, obras sociales, equipo, servicios, preguntas) y las fotos del carrusel se generan a partir de los arreglos de `src/data/`.
- **React Router:** `Routes` y `Route` en `App.jsx`; `Link` y `NavLink` en el menú; `Navigate` para la redirección de `/servicios`; `useLocation` para bajar hasta una sección (`/#preparacion`).
- **`useState`:** campos, errores y sesión de los logins; foto actual y pausa del carrusel; estado de apertura del laboratorio.
- **`useEffect`:** temporizador del carrusel, actualización cada minuto de "Abierto ahora", título y metadatos de cada página, desplazamiento hasta la sección indicada en la URL, y un `IntersectionObserver` (`useAlAparecer`) que hace entrar las tarjetas de servicios cuando la sección aparece en pantalla.

## SEO

- Título y meta descripción propios en cada página, con `<link rel="canonical">`.
- Etiquetas semánticas (`nav`, `main`, `section`, `figure`, `footer`), un solo `<h1>` por página y jerarquía de títulos ordenada.
- Texto alternativo en las imágenes.
- Open Graph para que el enlace se vea con imagen y descripción al compartirlo.
- Datos estructurados de schema.org (`MedicalBusiness`, `DiagnosticLab`) con dirección, teléfono y horarios.
- `robots.txt`, `sitemap.xml` y `noindex` en las páginas de login.

## Créditos de imágenes

- Fotos de los logins: Gabrielle Henderson y National Cancer Institute en [Unsplash](https://unsplash.com/) (licencia de Unsplash).
- Retratos del equipo (Salvatierra, Paz y Herrera): Roy K, vaibhav vivian y SoyBreno en [Unsplash](https://unsplash.com/) (licencia de Unsplash).
- Íconos y favicon: [Phosphor Icons](https://phosphoricons.com/) (licencia MIT).
- Logos de obras sociales: tomados de los sitios oficiales de cada entidad; son marcas de sus respectivos titulares.
- Las personas del equipo y el listado de obras sociales son datos de maqueta para el trabajo práctico.
