import axios from 'axios';
import { API_URL, encabezados } from './api.js';
import { supabase } from './supabase.js';

// Pedido médico escaneado que respalda una orden (LIMS-34). Hasta 5 fotos o PDF
// por orden, en el bucket privado "pedidos". Lo ve solo el personal de la
// sucursal: el paciente no lo ve en su portal.

export const MAX_ADJUNTOS = 5;
export const TIPOS_ADJUNTOS = ['image/jpeg', 'image/png', 'application/pdf'];

// El mismo límite que el bucket. Una foto de celular puede pesar más: se achica
// antes de subirla, así que se acepta hasta 20 MB.
const PESO_MAXIMO = 5 * 1024 * 1024;
const PESO_MAXIMO_FOTO = 20 * 1024 * 1024;
const LADO_MAXIMO = 1600;
const CALIDAD_FOTO = 0.8;

// Devuelve el problema del archivo, o null si se puede subir
export function validarAdjunto(archivo) {
  if (!TIPOS_ADJUNTOS.includes(archivo.type)) {
    return 'Solo se aceptan fotos JPG o PNG, o un PDF.';
  }
  if (archivo.size === 0) {
    return 'El archivo está vacío.';
  }
  if (archivo.type === 'application/pdf' && archivo.size > PESO_MAXIMO) {
    return 'El PDF no puede pesar más de 5 MB.';
  }
  if (archivo.type !== 'application/pdf' && archivo.size > PESO_MAXIMO_FOTO) {
    return 'La foto es muy pesada (máximo 20 MB).';
  }
  return null;
}

function errorConMensaje(error, mensaje) {
  return Object.assign(error instanceof Error ? error : new Error(mensaje), { mensajeUsuario: mensaje });
}

// Nombre del archivo dentro del bucket: sin acentos ni espacios, y único, para
// que dos adjuntos con el mismo nombre original no se pisen.
function nombreEnStorage(archivo) {
  const limpio =
    archivo.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(-80) || 'pedido';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${limpio}`;
}

// Achica una foto en el navegador: 1600 px de lado y calidad 0,8. Así una foto
// de celular de varios MB queda en unos cientos de KB y no llena el Storage.
function achicarFoto(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.naturalWidth, imagen.naturalHeight));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(imagen.naturalWidth * escala);
      lienzo.height = Math.round(imagen.naturalHeight * escala);
      const contexto = lienzo.getContext('2d');
      // El JPEG no tiene transparencia: el fondo blanco evita que salga negro
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, lienzo.width, lienzo.height);
      contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      lienzo.toBlob(
        (blob) => {
          if (!blob) {
            reject(errorConMensaje(null, 'No se pudo preparar la foto. Pruebe con otra.'));
            return;
          }
          const nombre = `${archivo.name.replace(/\.[^.]+$/, '') || 'pedido'}.jpg`;
          resolve(new File([blob], nombre, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        CALIDAD_FOTO,
      );
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(errorConMensaje(null, 'No se pudo leer la foto. Pruebe con otra.'));
    };
    imagen.src = url;
  });
}

// Link para abrir un adjunto. El archivo está en un lugar privado: el link vence
// a los pocos minutos (como el del informe PDF, LIMS-15).
export async function linkDelAdjunto(path, segundos = 120) {
  const { data, error } = await supabase.storage.from('pedidos').createSignedUrl(path, segundos);
  if (error) throw errorConMensaje(error, 'No se pudo abrir el pedido médico.');
  return data.signedUrl;
}

// Sube un archivo y lo registra en la orden. Si el registro falla, borra el
// archivo para no dejarlo suelto en el bucket.
export async function subirAdjunto(ordenId, archivo) {
  const problema = validarAdjunto(archivo);
  if (problema) throw errorConMensaje(null, problema);

  const preparado = archivo.type === 'application/pdf' ? archivo : await achicarFoto(archivo);
  if (preparado.size > PESO_MAXIMO) {
    throw errorConMensaje(null, 'El archivo no puede pesar más de 5 MB.');
  }

  const path = `${ordenId}/${nombreEnStorage(preparado)}`;
  const { error: errorSubida } = await supabase.storage.from('pedidos').upload(path, preparado, {
    contentType: preparado.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (errorSubida) {
    console.error('No se pudo subir el pedido médico:', errorSubida);
    throw errorConMensaje(errorSubida, 'No se pudo subir el pedido médico. Intente nuevamente.');
  }

  try {
    const response = await axios.post(
      `${API_URL}/orden_adjuntos`,
      {
        orden_id: ordenId,
        path,
        nombre: archivo.name,
        tipo: preparado.type,
        tamano: preparado.size,
      },
      { headers: { ...(await encabezados()), Prefer: 'return=representation' } },
    );
    return response.data[0];
  } catch (errorPeticion) {
    // Sin la fila, el archivo no se ve desde la orden: no se deja en el bucket
    await supabase.storage.from('pedidos').remove([path]);
    throw errorPeticion;
  }
}

// Quita el archivo y su registro. Primero el archivo: si no se puede, no se
// borra la fila y la orden sigue mostrando el adjunto.
export async function eliminarAdjunto(adjunto) {
  const { error } = await supabase.storage.from('pedidos').remove([adjunto.path]);
  if (error) {
    console.error('No se pudo borrar el archivo del pedido médico:', error);
    throw errorConMensaje(error, 'No se pudo quitar el pedido médico. Intente nuevamente.');
  }
  await axios.delete(`${API_URL}/orden_adjuntos`, {
    headers: await encabezados(),
    params: { id: `eq.${adjunto.id}` },
  });
}
