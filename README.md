# LIMS Laboratorio Bioquímico — Frontend

Sitio web de un laboratorio de análisis clínicos de San Miguel de Tucumán, desarrollado en React como parte del Trabajo Final Integrador de la Tecnicatura Universitaria en Programación (TUP).

El sitio presenta los servicios del laboratorio y da acceso a dos portales: el **portal del paciente**, donde cada paciente ingresa con su DNI para consultar sus resultados, y el **acceso del personal interno** del laboratorio.

**Equipo:** Agustín Maidana Diaz · Axel Molina · Lara Ain Serrano

## Funcionalidades

- **Inicio** con presentación del laboratorio, contador animado de estadísticas, servicios destacados y accesos directos a los dos portales.
- **Servicios**: listado completo de los servicios del laboratorio, generado a partir de un arreglo de datos.
- **Login del paciente** con DNI (acepta el DNI con puntos o espacios) y contraseña, validación de campos, mensajes de error y botón para mostrar u ocultar la contraseña. En el primer ingreso se le pide elegir una contraseña propia y cargar su email real.
- **Login del personal** con usuario y contraseña, con la misma validación.
- **Autenticación real con Supabase Auth**: la sesión se mantiene al recargar la página y se puede cerrar.
- **Perfil del usuario**: al ingresar se muestran sus datos (nombre, rol, DNI o usuario, etc.), pedidos a la API de Supabase con Axios, con aviso de carga y manejo de errores.
- **Navegación sin recargar la página** entre las distintas vistas, con barra de navegación y pie comunes a todo el sitio.
- **Diseño adaptable** a celular, tablet y escritorio.

## Tecnologías

| Tecnología | Uso |
|---|---|
| [React 19](https://react.dev/) | Interfaz basada en componentes |
| [Vite 8](https://vite.dev/) | Servidor de desarrollo y compilación |
| [React Router 7](https://reactrouter.com/) | Navegación entre páginas (`react-router-dom`) |
| [Bootstrap 5.3](https://getbootstrap.com/) y [React Bootstrap](https://react-bootstrap.github.io/) | Grilla, formularios y barra de navegación |
| [Supabase](https://supabase.com/) | Base de datos PostgreSQL y autenticación (`@supabase/supabase-js`) |
| [Axios](https://axios-http.com/) | Peticiones HTTP a la API de Supabase |
| [SweetAlert2](https://sweetalert2.github.io/) | Ventanas de aviso al usuario cuando falla una petición |
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

# 3. Configurar las variables de entorno (ver "Autenticación con Supabase")
cp .env.example .env

# 4. Levantar el servidor de desarrollo
npm run dev
```

El sitio queda disponible en http://localhost:5173.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila el sitio para producción en la carpeta `dist/` |
| `npm run preview` | Sirve localmente la versión compilada |
| `npm run lint` | Revisa el código con ESLint |

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
│   │   ├── LoginSuccess.jsx     Mensaje de sesión iniciada (lo usan los dos logins)
│   │   ├── PerfilUsuario.jsx    Perfil del usuario, pedido a la API con Axios
│   │   └── PrimerIngreso.jsx    Primer ingreso del paciente: contraseña propia y email real
│   ├── data/                Contenido separado de los componentes
│   │   ├── servicios.js         Servicios del laboratorio
│   │   └── estadisticas.js      Números del contador
│   ├── hooks/
│   │   └── useMetadatos.js      Título y metadatos SEO de cada página
│   ├── lib/                 Conexión con Supabase
│   │   ├── supabase.js          Cliente de Supabase (lee las variables de .env.local)
│   │   └── auth.js              Inicio y cierre de sesión, y el hook useSesion
│   ├── pages/               Una vista por ruta
│   │   ├── Home.jsx
│   │   ├── Servicios.jsx
│   │   ├── LoginPaciente.jsx
│   │   └── LoginPersonal.jsx
│   ├── App.jsx              Definición de rutas
│   ├── main.jsx             Punto de entrada (envuelve la app en BrowserRouter)
│   └── index.css            Variables de color y estilos globales
├── .env.example             Variables de entorno necesarias (se copia como .env, que no se sube a git)
└── index.html               Metadatos SEO y Open Graph
```

## Conceptos de React aplicados

- **Componentes:** la interfaz está dividida en piezas reutilizables (`Navbar`, `Footer`, `ServiceCard`, `StatsCounter`, `LoginSuccess`). `Navbar` y `Footer` se escriben una sola vez en `App.jsx` y aparecen en todas las páginas.
- **Pages:** cada ruta tiene su propia página en `src/pages/`.
- **Props:** `ServiceCard` recibe foto, ícono, título y descripción; `StatsCounter` recibe la lista de estadísticas; `LoginSuccess` recibe el texto, la fecha y la función para cerrar sesión, así lo comparten los dos logins.
- **`map()`:** las tarjetas de servicios (en Inicio y en Servicios) y las estadísticas se generan recorriendo los arreglos de `src/data/`, sin repetir código. Para sumar un servicio alcanza con agregarlo al arreglo.
- **React Router:** `BrowserRouter` en `main.jsx`; `Routes` y `Route` en `App.jsx`; `NavLink` en el menú (marca la página actual) y `Link` en los botones; `useLocation` para bajar hasta una sección cuando la URL trae un ancla (`/#contacto`).
- **`useState`:** en los logins guarda lo que escribe el usuario, los errores de validación, si se muestra la contraseña y si se está enviando el formulario. Cada cambio de estado vuelve a dibujar la pantalla.
- **`useEffect`:**
  - `useMetadatos` actualiza el título y la descripción de la página; sus dependencias (`titulo`, `descripcion`, `indexar`) hacen que solo se vuelva a ejecutar si esos datos cambian.
  - `App.jsx` baja hasta la sección indicada cada vez que cambia la ruta o el ancla (dependencias `[pathname, hash]`).
  - `PerfilUsuario` hace la petición a la API al aparecer en pantalla; sus dependencias (`userId`, `intento`) hacen que se repita solo si cambia el usuario o se aprieta "Reintentar".
  - `useSesion` (`src/lib/auth.js`) se suscribe a los cambios de sesión de Supabase y se desuscribe al desmontar el componente.
  - `StatsCounter` arranca la animación cuando el contador entra en pantalla, con un `IntersectionObserver` que se desconecta al desmontar el componente.

## SEO

- Título y meta descripción propios en cada página (`useMetadatos`), porque en una SPA el `index.html` es uno solo para todas las rutas.
- `<html lang="es">` y etiquetas semánticas: `nav`, `main`, `section`, `article`, `header`, `footer`.
- Un solo `<h1>` por página y jerarquía de títulos ordenada (`h1` → `h2` → `h3`).
- Texto alternativo en las imágenes.
- Open Graph en `index.html` para que el enlace se vea con título y descripción al compartirlo.
- `robots.txt` y `sitemap.xml` en `public/`.
- Las páginas de login llevan `noindex`, para que los buscadores no las muestren en los resultados.

## Consumo de la API (TP8)

La API que se consume es la **API REST de Supabase**, que genera automáticamente
una dirección para cada tabla de la base de datos del laboratorio. Se usa para
mostrar el **perfil** de la persona que ingresó, en `src/components/PerfilUsuario.jsx`.

- **URL en variable de entorno:** `const API_URL = import.meta.env.VITE_API_URL;`.
  La dirección no está escrita en ningún componente; se define en el `.env`.
- **Axios:** ``axios.get(`${API_URL}/perfiles`, { headers, params })``. `params`
  indica qué columnas traer (`select`) y de quién (`id=eq.<id de la persona>`).
- **`useState`:** guarda los datos recibidos (`perfil`), si está cargando
  (`cargando`) y si falló (`error`).
- **`useEffect`:** hace la petición cuando el componente aparece en pantalla.
- **Estado de carga:** mientras la API no responde se muestra "Cargando su perfil…".
- **Manejo de errores:** un `try/catch` captura el fallo, muestra un mensaje en
  pantalla con el botón "Reintentar" y abre una ventana de **SweetAlert2**.
- **Seguridad:** la petición lleva el token de la sesión (`Authorization: Bearer`),
  así la base devuelve solo lo que esa persona puede ver (políticas RLS). Cada
  paciente ve solo su perfil.

## Autenticación con Supabase

El login usa [Supabase Auth](https://supabase.com/docs/guides/auth). La base de
datos, sus migraciones y las políticas de seguridad (RLS) viven en la carpeta
`LIMS-Laboratorio-db`, separada de este repositorio.

### Configuración

1. Copiar `.env.example` como `.env`.
2. Completar `VITE_API_URL`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`
   con los datos del proyecto (Supabase → Project Settings).
3. Reiniciar `npm run dev` (Vite lee las variables solo al arrancar).

`.env` no se sube a git: está en el `.gitignore`. La clave *publishable* es
pública por diseño: lo que protege los datos son las políticas RLS de la base.
En el deploy (Vercel) las mismas tres variables se cargan en
*Settings → Environment Variables*, porque el `.env` no viaja con el código.

### Cómo ingresa cada usuario

Supabase Auth trabaja con email, pero nadie escribe uno para entrar: el
frontend arma un email interno que nunca recibe correos.

| Portal | Ingresa con | Email interno |
|---|---|---|
| Paciente (`/login-paciente`) | DNI | `<dni>@pacientes.lims.local` |
| Personal interno (`/login-personal`) | Usuario (ej: `bioq_perez`) | `<usuario>@personal.lims.local` |

- **Pacientes:** recepción les crea la cuenta con una contraseña provisoria
  (Edge Function `crear-paciente`). En el primer ingreso se les pide elegir una
  contraseña propia y cargar su email real, que se usa para avisarles cuando sus
  resultados están listos.
- **Personal:** cada cuenta tiene un rol (`admin`, `bioquimico`, `tecnico`,
  `recepcion`) que define qué puede ver y modificar.

### Usuarios de prueba

Se crean ejecutando `seed_usuarios_prueba.sql` (en `LIMS-Laboratorio-db`) en el
SQL Editor de Supabase.

| Portal | Usuario | Contraseña | Rol |
|---|---|---|---|
| Paciente | DNI `30123456` | `Paciente2026` (provisoria) | paciente |
| Personal interno | `bioq_perez` | `Lab2026!` | bioquimico |
| Personal interno | `recepcion` | `Recep2026!` | recepcion |
| Personal interno | `admin` | `Admin2026!` | admin |
