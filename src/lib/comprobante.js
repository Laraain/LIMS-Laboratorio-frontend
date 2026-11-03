import { contacto, sitio } from '../data/laboratorio.js';
import { formatearPesos, totalesDeOrden } from './aranceles.js';
import { MEDIOS_PAGO, saldoAlCobro } from './cobros.js';
import { fechaDe, horaDe } from './hora.js';

// Comprobante de cobro para el paciente (LIMS-46).
// No es una factura: la facturación electrónica queda fuera del sistema.
// Se arma en una pestaña aparte para poder imprimirlo o guardarlo como PDF desde el
// diálogo del navegador, sin sumar una librería de PDF al front.

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nombreCompleto(persona) {
  if (!persona) return '';
  return [persona.apellido, persona.nombre].filter(Boolean).join(', ');
}

function filasDeEstudios(orden) {
  // Los componentes (ej: los valores de la fórmula leucocitaria) van con su estudio y no se cobran aparte
  const estudios = (orden.orden_analisis ?? []).filter((estudio) => !estudio.padre_id);
  if (estudios.length === 0) {
    return '<tr><td colspan="2" class="vacio">La orden no tiene estudios cargados.</td></tr>';
  }
  return estudios
    .map((estudio) => {
      const nombre = estudio.analisis?.nombre ?? estudio.grupos_analisis?.nombre ?? 'Estudio';
      const importe =
        estudio.importe_paciente === null || estudio.importe_paciente === undefined
          ? 'Sin arancel'
          : formatearPesos(estudio.importe_paciente);
      return `<tr><td>${escaparHtml(nombre)}</td><td class="numero">${escaparHtml(importe)}</td></tr>`;
    })
    .join('');
}

function avisoDeAnulacion(cobro) {
  if (!cobro.anulado_en) return '';
  const anuladoPor = nombreCompleto(cobro.anulador);
  return `
    <div class="aviso-anulado">
      <strong>Cobro anulado</strong>
      <p>Este comprobante no tiene validez: el cobro fue anulado el ${escaparHtml(fechaDe(cobro.anulado_en))} a las ${escaparHtml(horaDe(cobro.anulado_en))}.</p>
      <p><span class="etiqueta">Motivo:</span> ${escaparHtml(cobro.motivo_anulacion ?? 'Sin motivo registrado')}</p>
      ${anuladoPor ? `<p><span class="etiqueta">Anulado por:</span> ${escaparHtml(anuladoPor)}</p>` : ''}
    </div>`;
}

// Arma el HTML del comprobante y lo abre en una pestaña nueva.
// Devuelve false si el navegador bloqueó la ventana (hay que habilitar las ventanas emergentes).
export function abrirComprobante({ orden, cobro, sucursal }) {
  const ventana = window.open('', '_blank', 'width=880,height=1000');
  if (!ventana) return false;

  const total = totalesDeOrden(orden).paciente;
  const saldo = saldoAlCobro(orden, cobro);
  const anulado = Boolean(cobro.anulado_en);
  const cobrador = nombreCompleto(cobro.cobrador) || 'No registrado';
  const paciente = `${orden.pacientes?.apellido ?? ''}, ${orden.pacientes?.nombre ?? ''}`.replace(/^, |, $/g, '').trim();
  const sucursalNombre = sucursal?.nombre ?? 'Sucursal';
  const direccionSucursal = [sucursal?.direccion, sucursal?.localidad].filter(Boolean).join(', ');

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comprobante de pago ${escaparHtml(orden.nro_orden)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef1f5;
      color: #1e293b;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .acciones {
      position: sticky;
      top: 0;
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      justify-content: center;
      padding: .75rem;
      background: #fff;
      border-bottom: 1px solid #d8dee7;
    }
    .acciones button {
      padding: .5rem 1rem;
      border: 1px solid #1c4e80;
      border-radius: 999px;
      background: #1c4e80;
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .acciones button.secundario { background: #fff; color: #1c4e80; }
    .comprobante {
      position: relative;
      width: min(720px, calc(100% - 2rem));
      margin: 1.5rem auto;
      padding: 2rem;
      background: #fff;
      border-radius: .5rem;
      box-shadow: 0 2px 12px rgba(15, 32, 67, .08);
      overflow: hidden;
    }
    .encabezado {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #1c4e80;
    }
    .encabezado p { margin: 0 0 .15rem; }
    .nombre-laboratorio { font-size: 1.1rem; font-weight: 700; color: #1c4e80; }
    .sucursal { text-align: right; }
    .sucursal .etiqueta { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: #5b6472; }
    .sucursal .nombre-sucursal { font-weight: 700; }
    .titulo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; margin: 1.25rem 0 .75rem; }
    .titulo h1 { margin: 0; font-size: 1.05rem; text-transform: uppercase; letter-spacing: .08em; }
    .no-factura {
      margin: 0;
      padding: .15rem .55rem;
      border: 1px solid #b42318;
      border-radius: 999px;
      color: #b42318;
      font-size: .68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .aviso-anulado {
      margin: 0 0 1rem;
      padding: .75rem 1rem;
      border: 2px solid #b42318;
      border-radius: .5rem;
      background: #fef3f2;
      color: #b42318;
    }
    .aviso-anulado strong { display: block; margin-bottom: .25rem; font-size: .95rem; text-transform: uppercase; letter-spacing: .06em; }
    .aviso-anulado p { margin: 0 0 .2rem; }
    .aviso-anulado p:last-child { margin-bottom: 0; }
    .datos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .35rem 1.5rem; margin-bottom: 1.25rem; font-size: .85rem; }
    .dato { display: flex; gap: .35rem; }
    .dato .etiqueta { flex: 0 0 6rem; color: #5b6472; }
    .dato .valor { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    th, td { padding: .4rem .5rem; border-bottom: 1px solid #eef1f5; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; color: #5b6472; font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; }
    .numero { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .vacio { color: #5b6472; text-align: center; }
    tfoot td { border-top: 2px solid #d8dee7; border-bottom: 0; font-weight: 700; }
    .pago { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1.25rem; padding: 1rem; background: #f6f8fa; border-radius: .5rem; }
    .pago .etiqueta { display: block; color: #5b6472; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
    .pago .importe { display: block; margin-top: .1rem; font-size: 1.25rem; font-weight: 700; color: #1c4e80; }
    .pago .importe.falta { color: #b42318; }
    .observaciones { margin: 1rem 0 0; font-size: .82rem; }
    .observaciones .etiqueta { color: #5b6472; }
    .pie { margin-top: 1.5rem; padding-top: .75rem; border-top: 1px solid #d8dee7; color: #5b6472; font-size: .72rem; }
    .pie p { margin: 0 0 .25rem; }
    .marca-agua { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
    .marca-agua span { transform: rotate(-24deg); color: rgba(180, 35, 24, .12); font-size: 5.5rem; font-weight: 800; letter-spacing: .1em; }
    @media (max-width: 560px) {
      .datos, .pago { grid-template-columns: 1fr; }
      .sucursal { text-align: left; }
    }
    @media print {
      @page { margin: 12mm; }
      body { background: #fff; }
      .acciones { display: none; }
      .comprobante { width: auto; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="acciones">
    <button type="button" id="comprobante-imprimir">Imprimir o guardar PDF</button>
    <button type="button" class="secundario" id="comprobante-cerrar">Cerrar</button>
  </div>

  <main class="comprobante">
    ${anulado ? '<div class="marca-agua" aria-hidden="true"><span>ANULADO</span></div>' : ''}

    <header class="encabezado">
      <div>
        <p class="nombre-laboratorio">${escaparHtml(sitio.nombre)}</p>
        <p>${escaparHtml(contacto.direccion)}</p>
        <p>Tel. ${escaparHtml(contacto.telefono)} · ${escaparHtml(contacto.email)}</p>
      </div>
      <div class="sucursal">
        <p class="etiqueta">Sucursal</p>
        <p class="nombre-sucursal">${escaparHtml(sucursalNombre)}</p>
        ${direccionSucursal ? `<p>${escaparHtml(direccionSucursal)}</p>` : ''}
      </div>
    </header>

    <div class="titulo">
      <h1>Comprobante de pago</h1>
      <p class="no-factura">No es factura</p>
    </div>

    ${avisoDeAnulacion(cobro)}

    <section class="datos">
      <div class="dato"><span class="etiqueta">Orden</span><span class="valor">${escaparHtml(orden.nro_orden)}</span></div>
      <div class="dato"><span class="etiqueta">Paciente</span><span class="valor">${escaparHtml(paciente)}</span></div>
      <div class="dato"><span class="etiqueta">Fecha</span><span class="valor">${escaparHtml(fechaDe(cobro.cobrado_en))}</span></div>
      <div class="dato"><span class="etiqueta">DNI</span><span class="valor">${escaparHtml(orden.pacientes?.dni ?? '—')}</span></div>
      <div class="dato"><span class="etiqueta">Hora</span><span class="valor">${escaparHtml(horaDe(cobro.cobrado_en))}</span></div>
      <div class="dato"><span class="etiqueta">Cobrado por</span><span class="valor">${escaparHtml(cobrador)}</span></div>
    </section>

    <table>
      <thead>
        <tr><th scope="col">Estudio</th><th scope="col" class="numero">Paga el paciente</th></tr>
      </thead>
      <tbody>
        ${filasDeEstudios(orden)}
      </tbody>
      <tfoot>
        <tr><td>Total a cargo del paciente</td><td class="numero">${escaparHtml(formatearPesos(total))}</td></tr>
      </tfoot>
    </table>

    <section class="pago">
      <div>
        <span class="etiqueta">Monto cobrado</span>
        <span class="importe">${escaparHtml(formatearPesos(cobro.monto))}</span>
      </div>
      <div>
        <span class="etiqueta">Medio de pago</span>
        <span class="importe">${escaparHtml(MEDIOS_PAGO[cobro.medio_pago] ?? cobro.medio_pago)}</span>
      </div>
      <div>
        <span class="etiqueta">Falta pagar</span>
        <span class="importe${saldo > 0 ? ' falta' : ''}">${escaparHtml(formatearPesos(Math.max(saldo, 0)))}</span>
      </div>
    </section>

    ${cobro.observaciones ? `<p class="observaciones"><span class="etiqueta">Observaciones:</span> ${escaparHtml(cobro.observaciones)}</p>` : ''}

    <footer class="pie">
      <p><strong>Este comprobante no es factura.</strong> La facturación electrónica se emite por separado.</p>
      <p>Los importes son lo que paga el paciente; la parte de la obra social se factura aparte.</p>
      <p>El saldo es el que quedaba al registrarse este cobro.</p>
      <p>Para descargarlo, en el diálogo de impresión elija «Guardar como PDF».</p>
    </footer>
  </main>
</body>
</html>`;

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();

  ventana.document.getElementById('comprobante-imprimir')?.addEventListener('click', () => ventana.print());
  ventana.document.getElementById('comprobante-cerrar')?.addEventListener('click', () => ventana.close());
  ventana.focus();
  // Se abre el diálogo de impresión (donde también se puede guardar como PDF) después de dibujar
  setTimeout(() => {
    if (!ventana.closed) ventana.print();
  }, 350);

  return true;
}
