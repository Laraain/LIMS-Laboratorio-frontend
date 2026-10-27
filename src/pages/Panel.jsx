import { useEffect, useState, useSyncExternalStore } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import ElegirSucursal from '../components/ElegirSucursal.jsx';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { ROLES_PERSONAL, cerrarSesion, useSesion } from '../lib/auth.js';
import { guardarSucursal, olvidarSucursal, sucursalElegida, useSucursales } from '../lib/sucursal.js';
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
  const sesionValida = Boolean(perfil && !perfil.debe_cambiar_password);
  // Sucursal en la que trabaja hoy: se elige al entrar (ver ElegirSucursal)
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales, recargar: recargarSucursales } =
    useSucursales(sesionValida);
  const [idSucursal, setIdSucursal] = useState(sucursalElegida);
  // Si la sucursal elegida se desactivó (o todavía no se eligió), sucursal queda vacía y se vuelve a preguntar
  const sucursal = sucursales.find((opcion) => opcion.id === idSucursal && opcion.activa) ?? null;
  const sucursalesActivas = sucursales.filter((opcion) => opcion.activa);
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

  function elegirSucursal(id) {
    guardarSucursal(id);
    setIdSucursal(id);
  }

  // Vuelve a la pantalla de elección de sucursal, después de confirmar (evita cambiarla por un toque sin querer)
  async function cambiarSucursal() {
    const lugar = sucursal.localidad ? `${sucursal.nombre} (${sucursal.localidad})` : sucursal.nombre;
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Cambiar de sucursal?',
      text: `Está trabajando en ${lugar}. Va a volver a la pantalla para elegir la sucursal.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: `Seguir en ${sucursal.nombre}`,
      confirmButtonColor: '#1c4e80',
    });
    if (!isConfirmed) return;
    olvidarSucursal();
    setIdSucursal(null);
  }

  // Cierra la sesión en Supabase y vuelve al login del personal
  async function handleCerrarSesion() {
    olvidarSucursal();
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
  if (!sesionValida) return <Navigate to="/login-personal" replace />;

  // Todavía sin sucursal: antes de usar el panel se elige en cuál trabaja hoy
  if (!sucursal) {
    return (
      <>
        <Navbar perfil={perfil} fecha={fecha} onCerrarSesion={handleCerrarSesion} />
        <main id="contenido" className="lims-panel-verificando">
          <ElegirSucursal
            perfil={perfil}
            sucursales={sucursalesActivas}
            cargando={cargandoSucursales}
            error={errorSucursales}
            onReintentar={recargarSucursales}
            onElegir={elegirSucursal}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar
        perfil={perfil}
        fecha={fecha}
        sucursal={sucursal}
        onCambiarSucursal={cambiarSucursal}
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
          {/* Cada página del panel recibe con useOutletContext() quién ingresó, cuándo y en qué sucursal trabaja.
              recargarSucursales: la página Sucursales lo usa después de modificar una sucursal */}
          <Outlet context={{ perfil, fecha, sucursal, sucursales, recargarSucursales }} />
        </main>
      </div>
    </>
  );
}

export default Panel;
