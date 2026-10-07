import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Servicios from './pages/Servicios.jsx';
import LoginPaciente from './pages/LoginPaciente.jsx';
import LoginPersonal from './pages/LoginPersonal.jsx';

// Componente principal: arma la estructura común (menú, página actual y pie) y define las rutas
function App() {
  // useLocation devuelve la URL actual: pathname es la ruta (/servicios) y hash el ancla (#contacto)
  const { pathname, hash } = useLocation();

  // Si la URL trae un ancla (por ejemplo /#contacto), baja con scroll suave hasta esa sección.
  // Se ejecuta cada vez que cambia la ruta o el ancla, que son sus dependencias.
  useEffect(() => {
    if (!hash) return;
    const elemento = document.getElementById(hash.slice(1));
    elemento?.scrollIntoView({ behavior: 'smooth' });
  }, [pathname, hash]);

  return (
    <>
      {/* Navbar y Footer quedan fuera de <Routes>: se muestran en todas las páginas */}
      <Navbar />
      {/* Cada Route asocia una dirección (path) con la página que se muestra */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/login-paciente" element={<LoginPaciente />} />
        <Route path="/login-personal" element={<LoginPersonal />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
