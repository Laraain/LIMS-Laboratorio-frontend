# LIMS Laboratorio — Frontend

Migración a React del sitio de LIMS Laboratorio (sistema de gestión para
laboratorio bioquímico), a partir del sitio estático original. Proyecto
académico — Trabajo Final Integrador (TUP).

## Tecnologías

- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) para la navegación entre páginas
- [React Bootstrap](https://react-bootstrap.github.io/) + Bootstrap 5
- Font Awesome (iconos) y Google Fonts (IBM Plex Sans)

## Estructura del proyecto

```
src/
  components/   Componentes reutilizables (Navbar, Footer, ServiceCard)
  pages/        Vistas/páginas de la aplicación (Home, Servicios)
  data/         Datos estáticos usados por los componentes (servicios.js)
  App.jsx       Define las rutas de la aplicación
  main.jsx      Punto de entrada: monta React Router y los estilos globales
```

Cada página vive en `src/pages` y compone componentes de `src/components`,
reutilizando los mismos bloques (por ejemplo `ServiceCard`) en distintas
vistas mediante props.

## Instalación y ejecución

Requisitos: [Node.js](https://nodejs.org/) instalado.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

Otros comandos disponibles:

```bash
npm run build     # compila la aplicación para producción
npm run preview   # sirve el build de producción localmente
npm run lint      # corre ESLint sobre el proyecto
```

## Login simulado — credenciales de prueba

No hay backend: la autenticación es simulada en el cliente, con las
credenciales fijas en el código y la sesión guardada en `sessionStorage`.

| Portal | Usuario | Contraseña |
|---|---|---|
| Paciente (`/login-paciente`) | DNI `30123456` | `Paciente2026` |
| Personal interno (`/login-personal`) | `bioq_perez` | `Lab2026!` |

## Ramas

- `main`: rama de despliegue (deploy).
- `dev`: rama de integración/pruebas, base de las ramas de feature.

Las nuevas funcionalidades se desarrollan en ramas creadas a partir de `dev`
y se integran mediante Pull Request.
