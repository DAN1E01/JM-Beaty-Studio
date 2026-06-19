// ============================================================
// CARRITO DE SERVICIOS — JM Beauty Studio
// ============================================================

let carritoServicios = [];

// ----------------------------------------------------------
// Agregar o quitar un servicio (toggle)
// ----------------------------------------------------------
function toggleServicioCarrito(boton) {
  const id        = boton.dataset.id;
  const nombre    = boton.dataset.nombre;
  const precio    = Number(boton.dataset.precio);
  const duracion  = Number(boton.dataset.duracion);

  const yaExiste = carritoServicios.some(s => s.id === id);

  if (yaExiste) {
    carritoServicios = carritoServicios.filter(s => s.id !== id);
  } else {
    carritoServicios.push({ id, nombre, precio, duracion });
  }

  actualizarVistaCarrito();
}

// ----------------------------------------------------------
// Actualizar todo lo visual: badge, lista del modal, totales
// ----------------------------------------------------------
function actualizarVistaCarrito() {
  const cantidad = carritoServicios.length;
  const badge    = document.getElementById('carrito-badge');

  badge.textContent  = cantidad;
  badge.style.display = cantidad > 0 ? 'inline-block' : 'none';

  renderListaCarrito();
}

function renderListaCarrito() {
  const lista     = document.getElementById('carrito-lista');
  const vacio     = document.getElementById('carrito-vacio');
  const resumen   = document.getElementById('carrito-resumen');
  const btnContinuar = document.getElementById('btn-continuar-reserva');

  if (carritoServicios.length === 0) {
    lista.innerHTML = '';
    vacio.classList.remove('d-none');
    resumen.classList.add('d-none');
    btnContinuar.disabled = true;
    return;
  }

  vacio.classList.add('d-none');
  resumen.classList.remove('d-none');
  btnContinuar.disabled = false;

  lista.innerHTML = carritoServicios.map(s => `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
      <div>
        <p class="mb-0 fw-semibold">${s.nombre}</p>
        <small class="text-muted">${s.duracion} min — Bs. ${s.precio}</small>
      </div>
      <button class="btn btn-sm btn-outline-danger rounded-circle" onclick="quitarDelCarrito('${s.id}')">✕</button>
    </div>
  `).join('');

  const duracionTotal = carritoServicios.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoServicios.reduce((sum, s) => sum + s.precio, 0);

  document.getElementById('carrito-duracion').textContent = `${duracionTotal} min`;
  document.getElementById('carrito-total').textContent    = `Bs. ${precioTotal}`;
}

function quitarDelCarrito(id) {
  carritoServicios = carritoServicios.filter(s => s.id !== id);
  actualizarVistaCarrito();

  // También "desmarcar" visualmente el botón de esa card, si lo necesitamos más adelante
}

// ----------------------------------------------------------
// Conectar todos los botones "Agendar Cita" al cargar la página
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-agregar-carrito').forEach(boton => {
    boton.addEventListener('click', () => toggleServicioCarrito(boton));
  });

  document.getElementById('btn-continuar-reserva').addEventListener('click', abrirModalReserva);

  // Botón Volver: de paso 2 a paso 1
  document.getElementById('btn-volver-reserva').addEventListener('click', () => {
    document.getElementById('reserva-paso-1').classList.remove('d-none');
    document.getElementById('reserva-paso-2').classList.add('d-none');
    document.getElementById('btn-siguiente-reserva').textContent = 'Continuar →';
    document.getElementById('btn-volver-reserva').classList.add('d-none');
  });
});

// ----------------------------------------------------------
// Abrir el modal de reserva (cierra el del carrito primero)
// ----------------------------------------------------------
async function abrirModalReserva() {
  // Cerrar modal del carrito
  const modalCarritoEl = document.getElementById('modalCarrito');
  const modalCarrito    = bootstrap.Modal.getInstance(modalCarritoEl);
  modalCarrito.hide();

  // Setear el subtítulo con resumen
  const cantidad      = carritoServicios.length;
  const duracionTotal = carritoServicios.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoServicios.reduce((sum, s) => sum + s.precio, 0);

  document.getElementById('reserva-subtitulo').textContent =
    `${cantidad} servicio${cantidad > 1 ? 's' : ''} — ${duracionTotal} min — Bs. ${precioTotal}`;

  // Pedir los horarios ocupados ANTES de mostrar el calendario
  document.getElementById('calendario-container').innerHTML =
    '<p class="text-center text-muted">⏳ Cargando calendario...</p>';

  const ocupados = await obtenerOcupadosDesdeSheets();

  // Abrir modal de reserva
  setTimeout(() => {
    const modalReserva = new bootstrap.Modal(document.getElementById('modalReserva'));
    modalReserva.show();
    inicializarCalendario(ocupados, duracionTotal);
  }, 300);
}

// ----------------------------------------------------------
// Traer los horarios ocupados desde el Apps Script
// ----------------------------------------------------------
async function obtenerOcupadosDesdeSheets() {
  try {
    console.log('Obteniendo horarios desde:', `${CONFIG.scriptUrl}?action=getHorarios`);
    const res  = await fetch(`${CONFIG.scriptUrl}?action=getHorarios`);
    const data = await res.json();
    console.log('Horarios ocupados recibidos:', data);
    
    // Transformar las claves de fecha al formato ISO YYYY-MM-DD
    const ocupadosTransformados = {};
    if (data.ocupados) {
      for (const [fechaKey, horarios] of Object.entries(data.ocupados)) {
        // La clave puede ser un string de fecha o un objeto Date
        let fechaISO;
        if (fechaKey instanceof Date) {
          fechaISO = formatearFechaISO(fechaKey);
        } else {
          // Si ya viene como string ISO, usar directo
          fechaISO = fechaKey;
        }
        // Si no matcheó, intentar parsear
        if (!ocupadosTransformados[fechaISO]) {
          const fechaParsed = new Date(fechaKey);
          if (!isNaN(fechaParsed)) {
            fechaISO = formatearFechaISO(fechaParsed);
          }
        }
        ocupadosTransformados[fechaISO] = horarios;
      }
    }
    console.log('Horarios transformados:', ocupadosTransformados);
    return ocupadosTransformados;
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    return {};
  }
}
// ============================================================
// CALENDARIO DE RESERVAS
// ============================================================

let calOcupados        = {};
let calDuracionServicio = 60;
let calDiaSeleccionado  = null;
let calHoraSeleccionada = null;

function inicializarCalendario(ocupados, duracionTotal) {
  calOcupados         = ocupados;
  calDuracionServicio = duracionTotal;
  calDiaSeleccionado  = null;
  calHoraSeleccionada = null;

  renderDiasCalendario();
}

// ----------------------------------------------------------
// Mostrar los próximos 14 días como botones (simple, sin mes/año)
// ----------------------------------------------------------
function renderDiasCalendario() {
  const contenedor = document.getElementById('calendario-container');
  const hoy = new Date();

  let html = '<div class="d-flex flex-wrap gap-2 justify-content-center mb-3" id="cal-dias"></div>';
  html += '<div id="cal-horarios"></div>';
  contenedor.innerHTML = html;

  const diasContainer = document.getElementById('cal-dias');
  const nombresDias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  for (let i = 0; i < 14; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);

    const fechaStr = formatearFechaISO(fecha);
    const diaSemana = fecha.getDay();

    // Por ahora asumimos Lunes a Sábado habilitados (0=Domingo cerrado)
    const habilitado = diaSemana !== 0;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn btn-sm rounded-pill px-3 ' + (habilitado ? 'btn-outline-secondary' : 'btn-light disabled');
    boton.innerHTML = `${nombresDias[diaSemana]}<br><strong>${fecha.getDate()}</strong>`;
    boton.style.lineHeight = '1.2';

    if (habilitado) {
      boton.addEventListener('click', () => seleccionarDiaCalendario(fechaStr, boton));
    } else {
      boton.disabled = true;
    }

    diasContainer.appendChild(boton);
  }
}

function formatearFechaISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function seleccionarDiaCalendario(fechaStr, botonClickeado) {
  calDiaSeleccionado  = fechaStr;
  calHoraSeleccionada = null;

  // Marcar visualmente el día seleccionado
  document.querySelectorAll('#cal-dias button').forEach(b => b.classList.remove('btn-primary-pink', 'text-white'));
  botonClickeado.classList.add('btn-primary-pink', 'text-white');
  botonClickeado.classList.remove('btn-outline-secondary');

  renderHorariosDelDia(fechaStr);
}

function renderHorariosDelDia(fechaStr) {
  const contenedor = document.getElementById('cal-horarios');
  const slots = generarSlotsDelDia();
  const ocupadosDelDia = calOcupados[fechaStr] || [];

  console.log('Renderizando horarios para:', fechaStr);
  console.log('Slots generados:', slots.length);
  console.log('Ocupados para este día:', ocupadosDelDia);

  if (slots.length === 0) {
    contenedor.innerHTML = '<p class="text-center text-muted small">No hay horarios disponibles este día.</p>';
    return;
  }

  let html = '<div class="d-flex flex-wrap gap-2 justify-content-center">';

  slots.forEach(slot => {
    const ocupado = estaOcupado(slot, calDuracionServicio, ocupadosDelDia);

    html += `
      <button type="button"
        class="btn btn-sm rounded-pill px-3 ${ocupado ? 'btn-light disabled text-decoration-line-through' : 'btn-outline-secondary'}"
        ${ocupado ? 'disabled' : `onclick="seleccionarHoraCalendario('${slot}', this)"`}>
        ${slot}
      </button>
    `;
  });

  html += '</div>';
  contenedor.innerHTML = html;
}

// ----------------------------------------------------------
// Generar horarios cada 30 min entre apertura y cierre
// (por ahora fijo 9:00 a 19:00 — lo conectamos a Config después)
// ----------------------------------------------------------
function generarSlotsDelDia() {
  const apertura = 9 * 60;   // 9:00 en minutos
  const cierre   = 19 * 60;  // 19:00 en minutos
  const slots = [];

  for (let m = apertura; m + calDuracionServicio <= cierre; m += 30) {
    const h  = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${h}:${mm}`);
  }

  return slots;
}

// ----------------------------------------------------------
// Verificar si un horario se solapa con alguna reserva existente
// ----------------------------------------------------------
function estaOcupado(horaInicio, duracionMin, reservasDelDia) {
  const [h, m] = horaInicio.split(':').map(Number);
  const inicioMin = h * 60 + m;
  const finMin    = inicioMin + duracionMin;

  return reservasDelDia.some(r => {
    const [hi, mi] = r.inicio.split(':').map(Number);
    const [hf, mf] = r.fin.split(':').map(Number);
    const ocupadoInicio = hi * 60 + mi;
    const ocupadoFin    = hf * 60 + mf;

    // Hay solapamiento si el nuevo turno empieza antes de que termine el ocupado
    // Y termina después de que empiece el ocupado
    return inicioMin < ocupadoFin && finMin > ocupadoInicio;
  });
}

function seleccionarHoraCalendario(hora, botonClickeado) {
  calHoraSeleccionada = hora;

  document.querySelectorAll('#cal-horarios button').forEach(b => {
    b.classList.remove('btn-primary-pink', 'text-white');
    if (!b.disabled) b.classList.add('btn-outline-secondary');
  });

  botonClickeado.classList.add('btn-primary-pink', 'text-white');
  botonClickeado.classList.remove('btn-outline-secondary');
}
document.getElementById('btn-siguiente-reserva').addEventListener('click', () => {
  const pasoActual = document.getElementById('reserva-paso-1').classList.contains('d-none') ? 2 : 1;

  if (pasoActual === 1) {
    irAPaso2();
  } else if (pasoActual === 2) {
    confirmarReservaFinal();
  }
});

function irAPaso2() {
  if (!calDiaSeleccionado || !calHoraSeleccionada) {
    alert('Por favor elegí un día y un horario antes de continuar.');
    return;
  }

  // Armar resumen visual
  const duracionTotal = carritoServicios.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoServicios.reduce((sum, s) => sum + s.precio, 0);

  const listaServicios = carritoServicios.map(s =>
    `<div class="d-flex justify-content-between"><span>${s.nombre}</span><span>Bs. ${s.precio}</span></div>`
  ).join('');

  document.getElementById('resumen-reserva').innerHTML = `
    ${listaServicios}
    <hr>
    <div class="d-flex justify-content-between"><span>Fecha</span><strong>${calDiaSeleccionado}</strong></div>
    <div class="d-flex justify-content-between"><span>Hora</span><strong>${calHoraSeleccionada}</strong></div>
    <div class="d-flex justify-content-between"><span>Total</span><strong class="text-primary-pink">Bs. ${precioTotal}</strong></div>
  `;

  // Cambiar de paso visualmente
  document.getElementById('reserva-paso-1').classList.add('d-none');
  document.getElementById('reserva-paso-2').classList.remove('d-none');
  document.getElementById('btn-siguiente-reserva').textContent = 'Confirmar reserva ✓';
  document.getElementById('btn-volver-reserva').classList.remove('d-none');
}
async function confirmarReservaFinal() {
  const nombre   = document.getElementById('inp-nombre-cliente').value.trim();
  const telefonoInput = document.getElementById('inp-telefono-cliente').value.trim();
  const errorDiv = document.getElementById('errores-reserva');

  // Validaciones básicas
  const errores = [];
  if (nombre.length < 2) errores.push('Ingresá tu nombre completo.');
  if (telefonoInput.replace(/\D/g, '').length < 7) errores.push('Ingresá un teléfono válido.');

  if (errores.length > 0) {
    errorDiv.classList.remove('d-none');
    errorDiv.innerHTML = errores.map(e => `<div>• ${e}</div>`).join('');
    return;
  }

  errorDiv.classList.add('d-none');

  // Sanitizar teléfono: solo números, sin espacios ni caracteres especiales
  const telefono = telefonoInput.replace(/\D/g, '');

  // Armar el número de reserva
  const numeroReserva = generarNumeroReserva();
  const duracionTotal = carritoServicios.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoServicios.reduce((sum, s) => sum + s.precio, 0);

  const datosReserva = {
    numeroReserva,
    nombre,
    telefono,
    servicios:     carritoServicios.map(s => s.nombre).join(', '),
    _serviciosData: carritoServicios, // guardamos los datos originales para el resumen
    duracionTotal,
    precioTotal,
    montoSena:     0,
    fecha:         calDiaSeleccionado,
    hora:          calHoraSeleccionada,
  };

  // Deshabilitar botón mientras se envía (evita doble click)
  const btnConfirmar = document.getElementById('btn-siguiente-reserva');
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Guardando...';

  try {
    await enviarReservaASheets(datosReserva);
    mostrarPasoConfirmacion(datosReserva);
  } catch (error) {
    alert('Hubo un problema al guardar tu reserva. Intentá de nuevo.');
    console.error(error);
  } finally {
    btnConfirmar.disabled = false;
  }
}

function generarNumeroReserva() {
  const fecha  = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 900 + 100);
  return `MB-${fecha}-${random}`;
}

async function enviarReservaASheets(datos) {
  const res = await fetch(CONFIG.scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(datos),
  });
  return res.json();
}
function mostrarPasoConfirmacion(datos) {
  // Ocultar paso 2, mostrar paso 3
  document.getElementById('reserva-paso-2').classList.add('d-none');
  document.getElementById('reserva-paso-3').classList.remove('d-none');

  // Ocultar los botones de footer (ya no se necesitan en este paso)
  document.getElementById('btn-volver-reserva').classList.add('d-none');
  document.getElementById('btn-siguiente-reserva').classList.add('d-none');

  const mensajeWhatsapp = construirMensajeWhatsapp(datos);
  const linkWhatsapp     = `https://wa.me/+59175936698?text=${encodeURIComponent(mensajeWhatsapp)}`;

  document.getElementById('confirmacion-contenido').innerHTML = `
    <div class="badge bg-success-subtle text-success rounded-pill px-3 py-2 mb-3">
      ✓ Reserva registrada
    </div>

    <p class="text-muted small mb-1">Código de reserva</p>
    <h4 class="fw-bold text-primary-pink mb-4">${datos.numeroReserva}</h4>

    <div class="bg-light rounded-4 p-3 mb-4 text-start">
      ${datos._serviciosData.map(s => `
        <div class="d-flex justify-content-between"><span>${s.nombre}</span><span>Bs. ${s.precio}</span></div>
      `).join('')}
      <hr>
      <div class="d-flex justify-content-between"><span>Fecha</span><strong>${datos.fecha}</strong></div>
      <div class="d-flex justify-content-between"><span>Hora</span><strong>${datos.hora}</strong></div>
      <div class="d-flex justify-content-between"><span>Total</span><strong class="text-primary-pink">Bs. ${datos.precioTotal}</strong></div>
    </div>

    <p class="fw-semibold mb-2">Escaneá para realizar tu pago / seña</p>
    <img src="../img/qr.jpeg" alt="QR de pago" class="img-fluid rounded-4 mb-4" style="max-width: 220px;">

    <a href="${linkWhatsapp}" target="_blank" class="btn btn-success rounded-pill w-100 mb-2">
      📲 Enviar comprobante por WhatsApp
    </a>
    <button type="button" class="btn btn-outline-secondary rounded-pill w-100" data-bs-dismiss="modal">
      Cerrar
    </button>
  `;
}

function construirMensajeWhatsapp(datos) {
  const listaServicios = datos._serviciosData.map(s => `   • ${s.nombre} — Bs. ${s.precio}`).join('\n');

  return (
    `Hola! 👋 Soy *${datos.nombre}* y acabo de realizar una reserva:\n\n` +
    `📌 *Servicios:*\n${listaServicios}\n\n` +
    `📅 *Fecha:* ${datos.fecha}\n` +
    `🕐 *Hora:* ${datos.hora}\n` +
    `💰 *Total:* Bs. ${datos.precioTotal}\n` +
    `📞 *Teléfono:* ${datos.telefono}\n` +
    `🔖 *N° Reserva:* ${datos.numeroReserva}\n\n` +
    `Adjunto comprobante de pago. ¡Gracias! 🌸`
  );
}