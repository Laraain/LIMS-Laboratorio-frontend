import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import LoginPaciente from './pages/LoginPaciente.jsx';
import LoginPersonal from './pages/LoginPersonal.jsx';

function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;
    // Se espera un cuadro para que la página nueva esté pintada; se descuenta el alto del encabezado fijo
    const id = requestAnimationFrame(() => {
      const elemento = document.getElementById(hash.slice(1));
      if (!elemento) return;
      const encabezado = document.querySelector('.lims-navbar')?.offsetHeight ?? 0;
      const destino = elemento.getBoundingClientRect().top + window.scrollY - encabezado;
      window.scrollTo({ top: destino, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, hash]);

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
