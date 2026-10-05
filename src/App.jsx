import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import LoginPaciente from './pages/LoginPaciente.jsx';
import LoginPersonal from './pages/LoginPersonal.jsx';

function App() {
  const { pathname, search, hash, key, state } = useLocation();
  const navigate = useNavigate();
  const paginaAnterior = useRef(pathname);

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
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Los servicios ahora son una sección de la home; la ruta vieja redirige ahí */}
        <Route path="/servicios" element={<Navigate to={{ pathname: '/', hash: '#servicios' }} replace />} />
        <Route path="/login-paciente" element={<LoginPaciente />} />
        <Route path="/login-personal" element={<LoginPersonal />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
