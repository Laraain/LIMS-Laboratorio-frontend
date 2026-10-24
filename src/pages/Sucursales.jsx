import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { PencilSimple, Plus } from '@phosphor-icons/react';
import ModalSucursal from '../components/ModalSucursal.jsx';
import useMetadatos from '../hooks/useMetadatos.js';
import '../components/ListaPerfiles.css';
import '../components/ListaAnalisis.css';

// Sucursales del laboratorio, solo para administradores: nombre, localidad, prefijo y boxes de cada una.
function Sucursales() {
  useMetadatos({
    titulo: 'Sucursales — LIMS Laboratorio',
    descripcion: 'Sucursales del laboratorio, solo para administradores.',
    ruta: '/panel/sucursales',
    indexar: false,
  });

  // sucursales y recargarSucursales vienen de Panel.jsx: al guardar se recarga la lista de todo el panel
  const { perfil, sucursales, recargarSucursales } = useOutletContext();
  // editando: la sucursal abierta en la ventana · creando: true mientras está abierta la de sucursal nueva
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);

  if (perfil.rol !== 'admin') return <Navigate to="/panel" replace />;

  const activas = sucursales.filter((sucursal) => sucursal.activa).length;

  function cerrar() {
    setEditando(null);
    setCreando(false);
  }

  return (
    <div className="container px-3 px-lg-4">
      <header className="lims-panel-cabecera">
        <div>
          <p className="lims-panel-etiqueta">Administración</p>
          <h1 className="lims-panel-titulo">Sucursales</h1>
          <p className="lims-panel-texto mb-0">
            Cada sucursal tiene su fila de atención, sus boxes de extracción y su numeración de órdenes.
          </p>
        </div>
      </header>

      <section className="lims-lista" aria-labelledby="config-sucursales-titulo">
        <div className="lims-lista-encabezado">
          <div>
            <h2 id="config-sucursales-titulo" className="lims-lista-titulo">
              Sucursales del laboratorio
            </h2>
            <p className="lims-lista-resumen mb-0">
              {sucursales.length} {sucursales.length === 1 ? 'sucursal' : 'sucursales'} · {activas}{' '}
              {activas === 1 ? 'activa' : 'activas'}
            </p>
          </div>
          <button type="button" className="btn lims-btn-pill lims-btn-primario" onClick={() => setCreando(true)}>
            <Plus className="lims-icono me-2" aria-hidden="true" />
            Nueva sucursal
          </button>
        </div>

        <div className="lims-tabla-contenedor">
          <table className="table align-middle mb-0 lims-tabla-perfiles">
            <thead>
              <tr>
                <th scope="col">Sucursal</th>
                <th scope="col">Prefijo</th>
                <th scope="col">Boxes</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map((sucursal) => (
                <tr key={sucursal.id}>
                  <td>
                    <span className="lims-celda-nombre-texto">{sucursal.nombre}</span>
                    <span className="lims-celda-identidad">
                      {[sucursal.localidad, sucursal.direccion].filter(Boolean).join(' · ') || 'Sin localidad ni dirección cargadas'}
                    </span>
                  </td>
                  <td>
                    <span className="lims-codigo">{sucursal.prefijo}</span>
                  </td>
                  <td className="lims-celda-numero">{sucursal.cantidad_boxes}</td>
                  <td>
                    <span className={`lims-cuenta${sucursal.activa ? '' : ' lims-cuenta--inactiva'}`}>
                      {sucursal.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                      aria-label={`Editar ${sucursal.nombre}`}
                      onClick={() => setEditando(sucursal)}
                    >
                      <PencilSimple className="lims-icono me-1" aria-hidden="true" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(creando || editando) && (
        <ModalSucursal
          key={editando?.id ?? 'nueva'}
          sucursal={editando}
          activas={activas}
          onCerrar={cerrar}
          onGuardado={() => {
            cerrar();
            recargarSucursales();
          }}
        />
      )}
    </div>
  );
}

export default Sucursales;
