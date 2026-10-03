import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Servicios from './pages/Servicios.jsx';

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
      </Routes>
      <Footer />
    </>
  );
}

export default App;
