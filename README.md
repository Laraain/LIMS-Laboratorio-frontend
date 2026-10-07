# LIMS Laboratorio Bioquímico — Frontend

Sitio web de un laboratorio de análisis clínicos de San Miguel de Tucumán, desarrollado en React como parte del Trabajo Final Integrador de la Tecnicatura Universitaria en Programación (TUP).

El sitio presenta los servicios del laboratorio y da acceso a dos portales: el **portal del paciente**, donde cada paciente ingresa con su DNI para consultar sus resultados, y el **acceso del personal interno** del laboratorio.

**Equipo:** Agustín Maidana Diaz · Axel Molina · Lara Ain Serrano

## Funcionalidades

- **Inicio** con presentación del laboratorio, contador animado de estadísticas, servicios destacados y accesos directos a los dos portales.
- **Servicios**: listado completo de los servicios del laboratorio, generado a partir de un arreglo de datos.
- **Login del paciente** con DNI (acepta el DNI con puntos o espacios) y contraseña, validación de campos, mensajes de error y botón para mostrar u ocultar la contraseña.
- **Login del personal** con usuario y contraseña, con la misma validación.
- **Sesión simulada** guardada en `sessionStorage`: se mantiene al recargar la página y se puede cerrar.
- **Navegación sin recargar la página** entre las distintas vistas, con barra de navegación y pie comunes a todo el sitio.
- **Diseño adaptable** a celular, tablet y escritorio.

> Los logins de esta versión son simulados: validan contra credenciales fijas en el código y todavía no se conectan a una base de datos.

## Tecnologías

| Tecnología | Uso |
|---|---|
| [React 19](https://react.dev/) | Interfaz basada en componentes |
| [Vite 8](https://vite.dev/) | Servidor de desarrollo y compilación |
| [React Router 7](https://reactrouter.com/) | Navegación entre páginas (`react-router-dom`) |
| [Bootstrap 5.3](https://getbootstrap.com/) y [React Bootstrap](https://react-bootstrap.github.io/) | Grilla, formularios y barra de navegación |
| [Font Awesome 6](https://fontawesome.com/) | Íconos |
| CSS propio | Paleta de colores, tipografía (IBM Plex Sans) y estilos de cada componente |
| ESLint | Control de calidad del código |

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
| Personal interno (`/login-personal`) | `bioq_perez` | `Lab2026!` |

## Rutas

| Ruta | Página |
|---|---|
| `/` | Inicio |
| `/servicios` | Servicios del laboratorio |
| `/login-paciente` | Ingreso del paciente |
| `/login-personal` | Ingreso del personal interno |

## Estructura del proyecto

```
├── public/                  Archivos servidos tal cual: favicon, robots.txt y sitemap.xml
├── src/
│   ├── assets/              Logo e imágenes
│   ├── components/          Componentes reutilizables
│   │   ├── Navbar.jsx           Barra de navegación
│   │   ├── Footer.jsx           Pie con contacto y redes
│   │   ├── ServiceCard.jsx      Tarjeta de un servicio
│   │   ├── StatsCounter.jsx     Contador animado de estadísticas
│   │   └── LoginSuccess.jsx     Mensaje de sesión iniciada (lo usan los dos logins)
│   ├── data/                Contenido separado de los componentes
│   │   ├── servicios.js         Servicios del laboratorio
│   │   └── estadisticas.js      Números del contador
│   ├── hooks/
│   │   └── useMetadatos.js      Título y metadatos SEO de cada página
│   ├── pages/               Una vista por ruta
│   │   ├── Home.jsx
│   │   ├── Servicios.jsx
│   │   ├── LoginPaciente.jsx
│   │   └── LoginPersonal.jsx
│   ├── App.jsx              Definición de rutas
│   ├── main.jsx             Punto de entrada (envuelve la app en BrowserRouter)
│   └── index.css            Variables de color y estilos globales
└── index.html               Metadatos SEO y Open Graph
```

## Conceptos de React aplicados

- **Componentes:** la interfaz está dividida en piezas reutilizables (`Navbar`, `Footer`, `ServiceCard`, `StatsCounter`, `LoginSuccess`). `Navbar` y `Footer` se escriben una sola vez en `App.jsx` y aparecen en todas las páginas.
- **Pages:** cada ruta tiene su propia página en `src/pages/`.
- **Props:** `ServiceCard` recibe foto, ícono, título y descripción; `StatsCounter` recibe la lista de estadísticas; `LoginSuccess` recibe el texto, la fecha y la función para cerrar sesión, así lo comparten los dos logins.
- **`map()`:** las tarjetas de servicios (en Inicio y en Servicios) y las estadísticas se generan recorriendo los arreglos de `src/data/`, sin repetir código. Para sumar un servicio alcanza con agregarlo al arreglo.
- **React Router:** `BrowserRouter` en `main.jsx`; `Routes` y `Route` en `App.jsx`; `NavLink` en el menú (marca la página actual) y `Link` en los botones; `useLocation` para bajar hasta una sección cuando la URL trae un ancla (`/#contacto`).
- **`useState`:** en los logins guarda lo que escribe el usuario, los errores de validación, si se muestra la contraseña y la sesión iniciada. Cada cambio de estado vuelve a dibujar la pantalla.
- **`useEffect`:**
  - `useMetadatos` actualiza el título y la descripción de la página; sus dependencias (`titulo`, `descripcion`, `indexar`) hacen que solo se vuelva a ejecutar si esos datos cambian.
  - `App.jsx` baja hasta la sección indicada cada vez que cambia la ruta o el ancla (dependencias `[pathname, hash]`).
  - `StatsCounter` arranca la animación cuando el contador entra en pantalla, con un `IntersectionObserver` que se desconecta al desmontar el componente.

## SEO

- Título y meta descripción propios en cada página (`useMetadatos`), porque en una SPA el `index.html` es uno solo para todas las rutas.
- `<html lang="es">` y etiquetas semánticas: `nav`, `main`, `section`, `article`, `header`, `footer`.
- Un solo `<h1>` por página y jerarquía de títulos ordenada (`h1` → `h2` → `h3`).
- Texto alternativo en las imágenes.
- Open Graph en `index.html` para que el enlace se vea con título y descripción al compartirlo.
- `robots.txt` y `sitemap.xml` en `public/`.
- Las páginas de login llevan `noindex`, para que los buscadores no las muestren en los resultados.
