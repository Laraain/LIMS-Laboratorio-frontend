import { useEffect, useState, useSyncExternalStore } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { ROLES_PERSONAL, cerrarSesion, useSesion } from '../lib/auth.js';
import './Panel.css';

// Desde este ancho para abajo el menú lateral se abre por encima del contenido (igual que en Sidebar.css)
const CONSULTA_MOVIL = '(max-width: 991.98px)';
// Clave del navegador donde se recuerda si el menú quedó abierto o escondido en la PC
const CLAVE_MENU = 'lims-panel-menu';

// useSyncExternalStore mantiene esMovil al día cuando cambia el ancho de la ventana
function suscribirAncho(avisar) {
  const consulta = window.matchMedia(CONSULTA_MOVIL);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
}

function esMovilAhora() {
  return window.matchMedia(CONSULTA_MOVIL).matches;
}

// localStorage puede fallar (navegación privada o datos bloqueados): en ese caso el menú arranca abierto
function leerMenuAbierto() {
  try {
    return localStorage.getItem(CLAVE_MENU) !== 'cerrado';
  } catch {
    return true;
  }
}

function guardarMenuAbierto(abierto) {
  try {
    localStorage.setItem(CLAVE_MENU, abierto ? 'abierto' : 'cerrado');
  } catch {
    // Sin almacenamiento no se recuerda la preferencia, pero el menú funciona igual
  }
}

// Estructura de todas las páginas del panel del personal: barra de arriba con la sesión,
// menú lateral según el rol y, a la derecha, la página elegida (<Outlet />).
// Solo se entra con una sesión del personal; si no, se vuelve al login.
function Panel() {
  const navigate = useNavigate();
  const { cargando, perfil, fecha } = useSesion(ROLES_PERSONAL);
  const esMovil = useSyncExternalStore(suscribirAncho, esMovilAhora);
  // En la PC el menú arranca como se dejó la última vez; en el celular arranca escondido
  const [abiertoEscritorio, setAbiertoEscritorio] = useState(leerMenuAbierto);
  const [abiertoMovil, setAbiertoMovil] = useState(false);
  const menuAbierto = esMovil ? abiertoMovil : abiertoEscritorio;

  // En el celular, la tecla Escape cierra el menú
  useEffect(() => {
    if (!esMovil || !abiertoMovil) return undefined;
    function alPresionar(evento) {
      if (evento.key === 'Escape') setAbiertoMovil(false);
    }
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [esMovil, abiertoMovil]);

  function alternarMenu() {
    if (esMovil) {
      setAbiertoMovil(!abiertoMovil);
      return;
    }
    setAbiertoEscritorio(!abiertoEscritorio);
    guardarMenuAbierto(!abiertoEscritorio);
  }

  // Cierra la sesión en Supabase y vuelve al login del personal
  async function handleCerrarSesion() {
    await cerrarSesion();
    navigate('/login-personal', { replace: true });
  }

  // Mientras se verifica la sesión se muestra la barra común y un aviso
  if (cargando) {
    return (
      <>
        <Navbar />
        <main id="contenido" className="lims-panel-verificando">
          <p className="text-muted text-center" role="status">
            Verificando sesión…
          </p>
        </main>
      </>
    );
  }

  // Sin sesión del personal se vuelve al login (Navigate redirige sin recargar la página).
  // Si todavía tiene la contraseña provisoria, el login le pide elegir una propia antes de entrar.
  if (!perfil || perfil.debe_cambiar_password) return <Navigate to="/login-personal" replace />;

  return (
    <>
      <Navbar
        perfil={perfil}
        fecha={fecha}
        menuAbierto={menuAbierto}
        onAlternarMenu={alternarMenu}
        onCerrarSesion={handleCerrarSesion}
      />
      <div className={`lims-panel ${menuAbierto ? 'lims-panel--abierto' : 'lims-panel--cerrado'}`}>
        <Sidebar
          perfil={perfil}
          abierto={menuAbierto}
          onCerrar={() => setAbiertoMovil(false)}
          // En el celular, elegir una opción cierra el menú para ver la página
          onNavegar={() => setAbiertoMovil(false)}
        />
        <main id="contenido" className="lims-panel-contenido">
          {/* Cada página del panel recibe quién ingresó y cuándo con useOutletContext() */}
          <Outlet context={{ perfil, fecha }} />
        </main>
      </div>
    </>
  );
}

export default Panel;
