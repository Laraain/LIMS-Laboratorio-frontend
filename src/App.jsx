import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Servicios from './pages/Servicios.jsx';
import LoginPaciente from './pages/LoginPaciente.jsx';
import LoginPersonal from './pages/LoginPersonal.jsx';

function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const elemento = document.getElementById(hash.slice(1));
    elemento?.scrollIntoView({ behavior: 'smooth' });
  }, [pathname, hash]);

  return (
    <>
      <Navbar />
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
