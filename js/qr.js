// ============================================================
//  M BEAUTY STUDIO — Generación QR + WhatsApp
// ============================================================

class GeneradorQR {

  // ----------------------------------------------------------
  // Generar QR
  // ----------------------------------------------------------
  static generar(contenido, containerId, opciones = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    new QRCode(container, {
      text:          contenido,
      width:         opciones.width  || 180,
      height:        opciones.height || 180,
      colorDark:     '#5E432A',
      colorLight:    '#F8F5F2',
      correctLevel:  QRCode.CorrectLevel.H,
    });
  }

  // ----------------------------------------------------------
  // Generar el texto que va dentro del QR de SEÑA / TRANSFERENCIA
  // ----------------------------------------------------------
  static _contenidoQrSena(datos) {
    return (
      `Transferencia M Beauty Studio\n` +
      `Banco: ${dataStore.getBanco()}\n` +
      `Titular: ${dataStore.getTitular()}\n` +
      `Cuenta: ${dataStore.getCuenta()}\n` +
      `Monto: BOB ${datos.montoSena}\n` +
      `Ref: ${datos.numeroReserva}`
    );
  }

  // ----------------------------------------------------------
  // Renderizar tarjeta completa de confirmación (con seña + QR)
  // ----------------------------------------------------------
  static renderTarjetaConfirmacion(datos, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const tieneSena = datos.montoSena > 0;

    const listaServiciosHtml = Array.isArray(datos.servicios)
      ? datos.servicios.map(s => `
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;padding:0.25rem 0;">
            <span>${s.nombre}</span>
            <span style="font-weight:600;">BOB ${s.precio}</span>
          </div>
        `).join('')
      : `<div style="display:flex;justify-content:space-between;font-size:0.85rem;padding:0.25rem 0;">
           <span>${datos.servicio}</span><span style="font-weight:600;">BOB ${datos.precio}</span>
         </div>`;

    target.innerHTML = `
      <div class="qr-container animate-fadeInUp">

        <!-- Badge verificado -->
        <div class="qr-badge-verificado">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Reserva Registrada
        </div>

        <!-- Número de reserva -->
        <p style="font-size:0.8rem;color:var(--color-texto-sec);margin-bottom:0.5rem;letter-spacing:0.05em;text-transform:uppercase;">
          Código de reserva
        </p>
        <h2 style="font-family:var(--fuente-principal);color:var(--color-acento);font-size:1.75rem;margin-bottom:1.5rem;">
          ${datos.numeroReserva}
        </h2>

        <!-- Resumen de la reserva -->
        <div style="background:var(--color-fondo);border-radius:0.75rem;padding:1.25rem;margin-bottom:1.5rem;text-align:left;">

          <p style="font-size:0.75rem;color:var(--color-texto-sec);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.4rem;">Servicios</p>
          ${listaServiciosHtml}

          <div style="border-top:1px solid var(--color-secundario);margin:0.75rem 0;"></div>

          ${this._filaResumen('Fecha',     datos.fechaLegible || datos.fecha)}
          ${this._filaResumen('Hora',      `${datos.hora}${datos.horaFin ? ' a ' + datos.horaFin : ''}`)}
          ${this._filaResumen('Cliente',   datos.nombre)}
          ${this._filaResumen('Teléfono',  datos.telefono)}
          ${this._filaResumen('Total',     `BOB ${datos.precioTotal}`)}
        </div>

        ${tieneSena ? this._bloqueSena(datos) : this._bloqueSinSena(datos)}

        <!-- Botones de acción -->
        <div style="margin-top:1.75rem;display:flex;flex-direction:column;gap:0.75rem;align-items:center;">
          <a id="btn-whatsapp-confirmar" href="#" target="_blank" class="btn-whatsapp" style="width:100%;justify-content:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            ${tieneSena ? 'Enviar comprobante por WhatsApp' : 'Avisar al estudio por WhatsApp'}
          </a>
          <button onclick="window.print()" class="btn-secondary" style="width:100%;">
            🖨️ Guardar / Imprimir comprobante
          </button>
        </div>

      </div>
    `;

    // Configurar el botón de WhatsApp
    const btnWA = document.getElementById('btn-whatsapp-confirmar');
    if (btnWA) {
      btnWA.href = WhatsAppHelper.generarLink('reserva', datos);
    }

    // Generar el QR de seña (si aplica) — se hace después de insertar el HTML
    // porque el contenedor #qr-sena recién existe en este punto
    if (tieneSena) {
      this.generar(this._contenidoQrSena(datos), 'qr-sena', { width: 150, height: 150 });
    }
  }

  // ----------------------------------------------------------
  // Bloque con QR de transferencia + monto de seña
  // ----------------------------------------------------------
  static _bloqueSena(datos) {
    return `
      <div style="background:#FFF9F0;border:2px solid var(--color-acento);border-radius:0.75rem;padding:1.25rem;margin-bottom:1.5rem;">
        <p style="font-weight:700;color:var(--color-botones);margin-bottom:0.25rem;">
          💳 Seña requerida: BOB ${datos.montoSena}
        </p>
        <p style="font-size:0.8rem;color:var(--color-texto-sec);margin-bottom:1rem;">
          Escaneá el QR o transferí manualmente para reservar tu turno. Luego enviá la captura por WhatsApp.
        </p>

        <div id="qr-sena" style="display:inline-block;padding:0.75rem;background:white;border-radius:0.5rem;margin-bottom:1rem;"></div>

        <div style="text-align:left;font-size:0.85rem;background:white;border-radius:0.5rem;padding:0.75rem;">
          <p><strong>Banco:</strong> ${dataStore.getBanco()}</p>
          <p><strong>Titular:</strong> ${dataStore.getTitular()}</p>
          <p><strong>Cuenta:</strong> ${dataStore.getCuenta()}</p>
          <p><strong>Monto:</strong> BOB ${datos.montoSena}</p>
          <p><strong>Referencia:</strong> ${datos.numeroReserva}</p>
        </div>
      </div>
    `;
  }

  static _bloqueSinSena(datos) {
    return `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:0.75rem;padding:1rem;margin-bottom:1.5rem;">
        <p style="font-size:0.85rem;color:#15803d;">
          ✓ No se requiere adelanto para esta reserva. Tu turno está registrado y en espera de confirmación del estudio.
        </p>
      </div>
    `;
  }

  static _filaResumen(label, valor) {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--color-secundario);">
        <span style="font-size:0.8rem;color:var(--color-texto-sec);text-transform:uppercase;letter-spacing:0.04em;">${label}</span>
        <span style="font-size:0.9rem;font-weight:600;color:var(--color-texto);">${valor}</span>
      </div>
    `;
  }
}

// ============================================================
//  WhatsApp Helper
// ============================================================

class WhatsAppHelper {

  static generarLink(tipo, datos) {
    let mensaje = '';
    const numero = dataStore.getWhatsapp ? dataStore.getWhatsapp() : CONFIG.negocio.whatsapp;

    switch (tipo) {
      case 'reserva':
        mensaje = CONFIG.whatsappMensajes.reserva(datos);
        break;
      case 'consulta':
        mensaje = CONFIG.whatsappMensajes.consulta(datos.nombre || 'un cliente');
        break;
      case 'curso':
        mensaje = CONFIG.whatsappMensajes.curso(datos);
        break;
      default:
        mensaje = `Hola! Me comunico desde el sitio web de ${CONFIG.negocio.nombre}.`;
    }

    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  }

  static abrirWhatsApp(tipo, datos) {
    const link = this.generarLink(tipo, datos);
    window.open(link, '_blank');
  }
}
