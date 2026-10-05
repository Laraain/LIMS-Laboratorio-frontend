import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import LoginPaciente from './pages/LoginPaciente.jsx';
import LoginPersonal from './pages/LoginPersonal.jsx';

function App() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  // El scroll lo maneja la app: si el navegador también restaura la posición al recargar, los dos se pelean
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    if (!hash) return undefined;
    // Se espera un cuadro para que la página nueva esté pintada; se descuenta el alto del encabezado fijo
    const id = requestAnimationFrame(() => {
      const elemento = document.getElementById(hash.slice(1));
      if (elemento) {
        const encabezado = document.querySelector('.lims-navbar')?.offsetHeight ?? 0;
        const destino = elemento.getBoundingClientRect().top + window.scrollY - encabezado;
        window.scrollTo({ top: destino, behavior: 'smooth' });
      }
      // Se quita el #seccion de la URL: al recargar la página no vuelve a saltar a la sección,
      // y tocar dos veces el mismo enlace del menú vuelve a desplazar
      navigate({ pathname, search }, { replace: true });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, search, hash, navigate]);

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
