import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import LoginPaciente from './pages/LoginPaciente.jsx';
import LoginPersonal from './pages/LoginPersonal.jsx';
import Panel from './pages/Panel.jsx';
import PanelInicio from './pages/PanelInicio.jsx';
import MiPerfil from './pages/MiPerfil.jsx';
import Usuarios from './pages/Usuarios.jsx';

// Componente principal: arma la estructura común (menú, página actual y pie) y define las rutas
function App() {
  const { pathname, search, hash, key, state } = useLocation();
  const navigate = useNavigate();
  const paginaAnterior = useRef(pathname);
  // El panel del personal dibuja su propia barra superior (con la sesión y el botón del menú lateral)
  // y no lleva el pie del sitio: es una herramienta de trabajo y el menú ocupa todo el alto
  const enPanel = pathname.startsWith('/panel');

  // El scroll lo maneja la app: si el navegador también restaura la posición al recargar, los dos se pelean
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // En cada navegación: si hay #seccion se baja hasta ella; si no, se vuelve arriba de todo.
  // key cambia en cada clic aunque la URL sea la misma (por ejemplo, tocar "Inicio" estando en el inicio).
  useEffect(() => {
    const mismaPagina = paginaAnterior.current === pathname;
    paginaAnterior.current = pathname;

    // Esta navegación solo limpió el ancla de la URL (ver más abajo): la posición ya es la correcta
    if (state?.anclaLimpia) return undefined;

    // Se espera un cuadro para que la página nueva esté pintada
    const id = requestAnimationFrame(() => {
      if (!hash) {
        // En la misma página se sube con animación; al cambiar de página se arranca arriba directamente
        window.scrollTo({ top: 0, behavior: mismaPagina ? 'smooth' : 'instant' });
        return;
      }
      const elemento = document.getElementById(hash.slice(1));
      if (elemento) {
        // Se descuenta el alto del encabezado fijo para que no tape el título de la sección
        const encabezado = document.querySelector('.lims-navbar')?.offsetHeight ?? 0;
        const destino = elemento.getBoundingClientRect().top + window.scrollY - encabezado;
        window.scrollTo({ top: destino, behavior: 'smooth' });
      }
      // Se quita el #seccion de la URL: al recargar la página no vuelve a saltar a la sección,
      // y tocar dos veces el mismo enlace del menú vuelve a desplazar
      navigate({ pathname, search }, { replace: true, state: { anclaLimpia: true } });
    });
    return () => cancelAnimationFrame(id);
  }, [key, pathname, search, hash, state, navigate]);

  return (
    <>
      {/* Navbar y Footer quedan fuera de <Routes>: se muestran en todas las páginas del sitio público */}
      {!enPanel && <Navbar />}
      {/* Cada Route asocia una dirección (path) con la página que se muestra */}
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Los servicios ahora son una sección de la home; la ruta vieja redirige ahí */}
        <Route path="/servicios" element={<Navigate to={{ pathname: '/', hash: '#servicios' }} replace />} />
        <Route path="/login-paciente" element={<LoginPaciente />} />
        <Route path="/login-personal" element={<LoginPersonal />} />
        {/* Panel del personal: Panel verifica la sesión y muestra el menú lateral; las rutas de adentro se dibujan en su <Outlet /> */}
        <Route path="/panel" element={<Panel />}>
          <Route index element={<PanelInicio />} />
          <Route path="perfil" element={<MiPerfil />} />
          {/* Solo para administradores: la propia página redirige al inicio del panel si el rol no es admin */}
          <Route path="usuarios" element={<Usuarios />} />
        </Route>
        {/* La administración de perfiles ahora vive dentro del panel; la ruta vieja redirige ahí */}
        <Route path="/usuarios" element={<Navigate to="/panel/usuarios" replace />} />
      </Routes>
      {!enPanel && <Footer />}
    </>
  );
}

export default App;
