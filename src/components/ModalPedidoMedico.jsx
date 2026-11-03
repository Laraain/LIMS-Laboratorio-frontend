import { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { Eye, FilePdf, Paperclip, X } from '@phosphor-icons/react';
import { mensajeDeErrorApi } from '../lib/api.js';
import { linkDelAdjunto } from '../lib/adjuntos.js';
import './ModalOrden.css';

// Pedido médico adjunto de una orden, solo para mirar (LIMS-34). La ventana de la orden se edita
// solo mientras está abierta; esta se abre desde el listado en cualquier estado, para que el
// personal pueda consultar el pedido cuando la orden ya está en proceso o informada.
// Props: orden (con sus orden_adjuntos) · onCerrar
function ModalPedidoMedico({ orden, onCerrar }) {
  const adjuntos = orden.orden_adjuntos ?? [];
  // vistas: link firmado de cada foto, para mostrar la miniatura
  const [vistas, setVistas] = useState({});
  const [abriendo, setAbriendo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    const fotos = (orden.orden_adjuntos ?? []).filter((adjunto) => adjunto.tipo !== 'application/pdf');
    Promise.all(
      fotos.map((adjunto) =>
        linkDelAdjunto(adjunto.path, 600)
          .then((link) => [adjunto.id, link])
          .catch((errorPeticion) => {
            console.error('No se pudo abrir la miniatura del pedido médico:', errorPeticion);
            return null;
          }),
      ),
    ).then((pares) => {
      if (vigente) setVistas(Object.fromEntries(pares.filter(Boolean)));
    });
    return () => {
      vigente = false;
    };
  }, [orden]);

  // La pestaña se abre antes de pedir el link para que el navegador no la bloquee como ventana emergente
  async function abrir(adjunto) {
    setError('');
    const pestania = window.open('', '_blank');
    setAbriendo(adjunto.id);
    try {
      const link = await linkDelAdjunto(adjunto.path);
      if (pestania) pestania.location.href = link;
      else window.location.assign(link);
    } catch (errorPeticion) {
      pestania?.close();
      console.error('No se pudo abrir el pedido médico:', errorPeticion);
      setError(mensajeDeErrorApi(errorPeticion));
    } finally {
      setAbriendo(null);
    }
  }

  return (
    <Modal show onHide={onCerrar} centered scrollable contentClassName="lims-modal">
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5 fw-bold mb-0">
          Pedido médico · {orden.nro_orden}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-1">
          {orden.pacientes.apellido}, {orden.pacientes.nombre}
        </p>
        <p className="form-text mt-0">
          {orden.estado === 'abierta'
            ? 'Para agregar o quitar archivos, edite la orden.'
            : 'La orden ya no está abierta: los archivos se pueden ver pero no cambiar.'}
        </p>

        <ul className="lims-orden-adjuntos">
          {adjuntos.map((adjunto) => (
            <li key={adjunto.id}>
              {vistas[adjunto.id] ? (
                <img src={vistas[adjunto.id]} alt="" className="lims-adjunto-miniatura" />
              ) : (
                <span className="lims-adjunto-icono" aria-hidden="true">
                  {adjunto.tipo === 'application/pdf' ? <FilePdf /> : <Paperclip />}
                </span>
              )}
              <span className="lims-adjunto-nombre" title={adjunto.nombre}>
                {adjunto.nombre}
              </span>
              <button
                type="button"
                className="btn lims-btn-pill lims-btn-secundario lims-btn-chico"
                onClick={() => abrir(adjunto)}
                disabled={abriendo === adjunto.id}
              >
                <Eye className="lims-icono me-1" aria-hidden="true" />
                {abriendo === adjunto.id ? 'Abriendo…' : 'Abrir'}
              </button>
            </li>
          ))}
        </ul>
        {error && <div className="text-danger small mt-1">{error}</div>}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn lims-btn-pill lims-btn-secundario" onClick={onCerrar}>
          <X className="lims-icono me-1" aria-hidden="true" />
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalPedidoMedico;
