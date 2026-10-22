# LIMS Laboratorio Bioquímico — Frontend

Sitio web de un laboratorio de análisis clínicos de San Miguel de Tucumán, desarrollado en React como parte del Trabajo Final Integrador de la Tecnicatura Universitaria en Programación (TUP).

El sitio informa a los pacientes cómo prepararse para sus estudios, los horarios y las obras sociales con las que trabaja el laboratorio, y da acceso a dos portales: el **portal del paciente**, donde cada paciente ingresa con su DNI para consultar sus resultados, y el **acceso del personal interno** del laboratorio.

**Sitio publicado:** https://lims-laboratorio-frontend.vercel.app

**Equipo:** Agustín Maidana Diaz · Axel Molina · Lara Ain Serrano

## Funcionalidades

- **Inicio** con un carrusel de fotos que avanza solo, se pausa al pasar el mouse o con el foco del teclado, tiene botón de pausa y respeta la preferencia "reducir movimiento" del sistema.
- **Banda de datos clave** con dirección, horario de atención y horario de extracciones, y un indicador **"Abierto ahora / Cerrado"** calculado en vivo con la hora de Tucumán.
- **Cómo prepararse** y **cómo ver los resultados**, presentados como una línea de tiempo con íconos.
- Secciones de **estudios por área**, **obras sociales** (cinta de logos que se desplaza sola), **equipo** (tarjetas que se destacan al pasar el mouse), **servicios** (generados a partir de un arreglo de datos) y **preguntas frecuentes**.
- **Login del paciente** con DNI (acepta el DNI con puntos o espacios) y contraseña, validación de campos, mensajes de error y botón para mostrar u ocultar la contraseña. En el primer ingreso se le pide elegir una contraseña propia y cargar su email real.
- **Login del personal** con usuario y contraseña, con la misma validación.
- **Autenticación real con Supabase Auth**: la sesión se mantiene al recargar la página y se puede cerrar.
- **Panel de administración** (`/usuarios`): al ingresar como administrador se muestran todos los perfiles creados, con sus datos y roles, y un filtro por rol. Desde ahí el administrador **crea perfiles nuevos** (pacientes y personal) y **edita los existentes**, en ventanas (modales). Los demás usuarios ven solo su propio perfil.
- **Catálogo de análisis** (`/panel/analisis`): todo el personal ve los estudios que hace el laboratorio, con su tipo de muestra y tubo, valor de referencia, unidad y demora, con filtro por tipo de muestra y buscador. El administrador **agrega análisis**, **los edita** y **los da de baja** (no se borran: dejan de ofrecerse en órdenes nuevas), en una ventana con validación de cada campo.
- **Perfil del usuario**: al ingresar se muestran sus datos (nombre, rol, DNI o usuario, etc.), pedidos a la API de Supabase con Axios, con aviso de carga y manejo de errores.
- **Navegación sin recargar la página** entre las distintas vistas, con barra de navegación y pie comunes a todo el sitio.
- **Diseño adaptable** a celular, tablet y escritorio, con textos de al menos 16 px en el celular.

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

# 3. Crear el archivo .env con las variables de entorno (ver "Autenticación con Supabase")

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
| `/` | Inicio (todas las secciones) |
| `/servicios` | Redirige a la sección de servicios del inicio (`/#servicios`) |
| `/login-paciente` | Ingreso del paciente |
| `/login-personal` | Ingreso del personal interno |
| `/usuarios` | Listado de perfiles, con alta y edición (solo administradores) |

## Estructura del proyecto

```
├── public/                  Archivos servidos tal cual: favicon, imagen para compartir, robots.txt, sitemap.xml
├── src/
│   ├── assets/              Fotos, logos de obras sociales y logo del laboratorio
│   ├── components/          Componentes reutilizables
│   │   ├── Navbar.jsx           Barra de navegación
│   │   ├── Footer.jsx           Pie con enlaces, contacto, horarios y redes
│   │   ├── Carrusel.jsx         Carrusel de fotos del inicio
│   │   ├── CintaLogos.jsx       Cinta que se desplaza sin fin (logos de obras sociales)
│   │   ├── EstadoAhora.jsx      Indicador "Abierto ahora / Cerrado"
│   │   ├── IndicadorScroll.jsx  Flecha que avisa que se puede bajar (se oculta al desplazarse)
│   │   ├── ServiceCard.jsx      Tarjeta de servicio
│   │   ├── PreguntasFrecuentes.jsx  Preguntas que se despliegan con animación
│   │   ├── LoginLayout.jsx      Pantalla dividida que comparten los dos logins
│   │   ├── LoginSuccess.jsx     Mensaje de sesión iniciada (lo usan los dos logins)
│   │   ├── PrimerIngreso.jsx    Primer ingreso del paciente: contraseña propia y email real
│   │   ├── PerfilUsuario.jsx    Perfil del usuario, pedido a la API con Axios
│   │   ├── ListaPerfiles.jsx    Tabla con todos los perfiles, pedida a la API con Axios
│   │   ├── ModalEditarPerfil.jsx    Ventana para ver y modificar un perfil (PATCH con Axios)
│   │   └── ModalNuevoPerfil.jsx     Ventana para crear un paciente o una persona del personal
│   ├── data/                Contenido del sitio separado de los componentes
│   │   ├── laboratorio.js       Contacto, horarios, pasos, estudios, obras sociales, equipo, preguntas
│   │   ├── servicios.js         Servicios del laboratorio
│   │   └── roles.js             Nombre y color de cada rol
│   ├── hooks/
│   │   ├── useAlAparecer.js     Detecta cuándo un elemento entra en pantalla (animaciones al hacer scroll)
│   │   └── useMetadatos.js      Título, descripción y metadatos SEO de cada página
│   ├── lib/                 Conexión con Supabase
│   │   ├── supabase.js          Cliente de Supabase (lee las variables del .env)
│   │   ├── auth.js              Inicio y cierre de sesión, y el hook useSesion
│   │   └── api.js               Direcciones del .env, encabezados con el token y mensajes de error
│   ├── pages/               Una vista por ruta
│   │   ├── Home.jsx
│   │   ├── LoginPaciente.jsx
│   │   ├── LoginPersonal.jsx
│   │   └── Usuarios.jsx         Panel del administrador (lista de perfiles)
│   ├── App.jsx              Definición de rutas y manejo del scroll
│   ├── main.jsx             Punto de entrada (BrowserRouter y estilo de los íconos)
│   └── index.css            Variables de color y estilos globales
├── index.html               Metadatos SEO, Open Graph y datos estructurados
└── vercel.json              Redirige todas las rutas a la app (necesario en una SPA)
```

El contenido (textos, horarios, obras sociales, equipo) vive en `src/data/` y las páginas lo recorren con `map()`, así que se puede editar sin tocar los componentes.

## Conceptos de React aplicados

- **Componentes:** la interfaz está dividida en piezas reutilizables. `Navbar` y `Footer` se escriben una sola vez en `App.jsx` y aparecen en todas las páginas.
- **Pages:** cada ruta tiene su propia página en `src/pages/`.
- **Props:** `ServiceCard` recibe foto, ícono, título y descripción; `LoginLayout` recibe los textos, la foto y el formulario (`children`) de cada login; `LoginSuccess` recibe el texto, la fecha y la función para cerrar sesión, así lo comparten los dos logins.
- **`map()`:** las listas del inicio (pasos, estudios, preparación, obras sociales, equipo, servicios, preguntas) y las fotos del carrusel se generan a partir de los arreglos de `src/data/`. Para sumar un servicio alcanza con agregarlo al arreglo.
- **React Router:** `BrowserRouter` en `main.jsx`; `Routes` y `Route` en `App.jsx`; `NavLink` en el menú (marca la página actual) y `Link` en los botones; `Navigate` para la redirección de `/servicios` y para llevar al administrador a `/usuarios`; `useLocation` para bajar hasta una sección (`/#preparacion`).
- **`useState`:** en los logins guarda lo que escribe el usuario, los errores de validación, si se muestra la contraseña y si se está enviando el formulario; en el inicio, la foto actual y la pausa del carrusel, el estado de apertura del laboratorio y la pregunta frecuente abierta.
- **`useEffect`:**
  - `useMetadatos` actualiza el título, la descripción y la URL canónica; sus dependencias hacen que solo se vuelva a ejecutar si esos datos cambian.
  - `App.jsx` baja hasta la sección indicada en la URL, o vuelve arriba, en cada navegación.
  - El carrusel avanza con un temporizador y "Abierto ahora" se actualiza cada minuto; los dos se limpian al desmontar el componente.
  - `useAlAparecer` usa un `IntersectionObserver` para animar las tarjetas y los pasos cuando aparecen en pantalla.
  - `PerfilUsuario` hace la petición a la API al aparecer en pantalla; sus dependencias (`userId`, `intento`) hacen que se repita solo si cambia el usuario o se aprieta "Reintentar".
  - `useSesion` (`src/lib/auth.js`) se suscribe a los cambios de sesión de Supabase y se desuscribe al desmontar el componente.

## SEO

- Título y meta descripción propios en cada página, con `<link rel="canonical">`.
- Etiquetas semánticas (`nav`, `main`, `section`, `figure`, `footer`), un solo `<h1>` por página y jerarquía de títulos ordenada.
- Texto alternativo en las imágenes.
- Open Graph para que el enlace se vea con imagen y descripción al compartirlo.
- Datos estructurados de schema.org (`MedicalBusiness`, `DiagnosticLab`) con dirección, teléfono y horarios.
- `robots.txt`, `sitemap.xml` y `noindex` en las páginas de login.

## Consumo de la API (TP8)

La API que se consume es la **API REST de Supabase**, que genera automáticamente
una dirección para cada tabla de la base de datos del laboratorio. Se usa en dos lugares:

- `src/components/PerfilUsuario.jsx`: muestra el **perfil** de la persona que ingresó.
- `src/components/ListaPerfiles.jsx`: muestra la **tabla con todos los perfiles**, en el panel del administrador (`/usuarios`). Es la misma petición, pero sin filtrar por persona.
- `src/components/ModalEditarPerfil.jsx` y `src/components/ModalNuevoPerfil.jsx`: **modifican y crean** perfiles. Es la misma idea pero con otros verbos HTTP, explicados en "Alta y edición de perfiles".

Las dos siguen el mismo patrón:

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
  así la base devuelve solo lo que esa persona puede ver (políticas RLS). Con la
  misma petición, un paciente recibe solo su perfil y el personal recibe todos.
- **Acceso al panel:** la página `/usuarios` verifica la sesión (`useSesion`) y, si no
  es de un administrador, redirige al login con `<Navigate>`.

## Autenticación con Supabase

El login usa [Supabase Auth](https://supabase.com/docs/guides/auth). La base de
datos, sus migraciones y las políticas de seguridad (RLS) viven en la carpeta
`LIMS-Laboratorio-db`, separada de este repositorio.

### Configuración

1. Crear un archivo `.env` en la raíz del proyecto (junto a `package.json`) con estas tres
   variables, completadas con los datos del proyecto (Supabase → Project Settings):

   ```
   VITE_API_URL=https://<id-del-proyecto>.supabase.co/rest/v1
   VITE_SUPABASE_URL=https://<id-del-proyecto>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<clave publishable del proyecto>
   ```

   `VITE_API_URL` es la que usa Axios para consultar las tablas; las otras dos, el cliente de
   Supabase (login).
2. Reiniciar `npm run dev` (Vite lee las variables solo al arrancar).

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
  `recepcion`) que define qué puede ver y modificar. Un administrador les crea la
  cuenta con una contraseña provisoria (Edge Function `crear-personal`) y, en el
  primer ingreso, el sistema les exige elegir una propia.

### Alta y edición de perfiles (panel del administrador)

- **Editar:** el botón "Editar" de cada fila abre una ventana con los datos del perfil.
  Axios envía un `PATCH` a la tabla que corresponde (`perfiles`, `personal` o `pacientes`)
  con **solo los campos que cambiaron**, después de pedir confirmación con SweetAlert2.
  El DNI y el usuario no se pueden cambiar porque forman el email con el que la persona
  inicia sesión. El administrador no puede desactivar su propia cuenta ni cambiarse el rol.
- **Crear:** el botón "Nuevo perfil" abre una ventana con un formulario para paciente o
  para personal. Axios envía un `POST` a una **función de servidor** de Supabase
  (`crear-paciente` o `crear-personal`), porque crear una cuenta de acceso necesita la
  clave secreta, que nunca puede estar en el navegador. La función crea la cuenta, el
  perfil y los datos asociados, y devuelve una contraseña provisoria que se muestra
  **una sola vez** para entregársela a la persona.
- **Seguridad:** las dos funciones de servidor verifican la sesión (y que quien llama sea
  administrador, en el caso del personal), y las políticas RLS de la base impiden que otro
  rol modifique perfiles. Las funciones y la migración del primer ingreso del personal
  están en `LIMS-Laboratorio-db` (`functions/crear-personal`, `migrations/20261013_01_*`).

### Acceso al panel de administración

Las contraseñas no se publican en este repositorio. El primer administrador se crea
directamente en Supabase y, desde `/usuarios`, ese administrador da de alta al resto del
personal y a los pacientes: cada persona recibe una contraseña provisoria que debe
cambiar en su primer ingreso. Quien necesite una cuenta de administrador debe pedírsela
al equipo.

## Créditos de imágenes

- Fotos de los logins: Gabrielle Henderson y National Cancer Institute en [Unsplash](https://unsplash.com/) (licencia de Unsplash).
- Retratos del equipo (Salvatierra, Paz y Herrera): Roy K, vaibhav vivian y SoyBreno en [Unsplash](https://unsplash.com/) (licencia de Unsplash).
- Íconos y favicon: [Phosphor Icons](https://phosphoricons.com/) (licencia MIT).
- Logos de obras sociales: tomados de los sitios oficiales de cada entidad; son marcas de sus respectivos titulares.
- Las personas del equipo y el listado de obras sociales son datos de maqueta para el trabajo práctico.
