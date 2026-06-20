// ============================================================
// CARRITO DE CURSOS — JM Beauty Studio
// ============================================================

let carritoCursos = [];

// ----------------------------------------------------------
// Agregar o quitar un curso (toggle)
// ----------------------------------------------------------
function toggleCursoCarrito(boton) {
  const id        = boton.dataset.id;
  const nombre    = boton.dataset.nombre;
  const precio    = Number(boton.dataset.precio);
  const duracion  = Number(boton.dataset.duracion);

  const yaExiste = carritoCursos.some(s => s.id === id);

  if (yaExiste) {
    carritoCursos = carritoCursos.filter(s => s.id !== id);
  } else {
    carritoCursos.push({ id, nombre, precio, duracion });
  }

  actualizarVistaCarritoCursos();
}

// ----------------------------------------------------------
// Actualizar todo lo visual: badge, lista del modal, totales
// ----------------------------------------------------------
function actualizarVistaCarritoCursos() {
  const cantidad = carritoCursos.length;
  const badge    = document.getElementById('carrito-badge-cursos');

  badge.textContent  = cantidad;
  badge.style.display = cantidad > 0 ? 'inline-block' : 'none';

  renderListaCarritoCursos();
}

function renderListaCarritoCursos() {
  const lista     = document.getElementById('carrito-lista-cursos');
  const vacio     = document.getElementById('carrito-vacio-cursos');
  const resumen   = document.getElementById('carrito-resumen-cursos');
  const btnContinuar = document.getElementById('btn-continuar-reserva-cursos');

  if (carritoCursos.length === 0) {
    lista.innerHTML = '';
    vacio.classList.remove('d-none');
    resumen.classList.add('d-none');
    btnContinuar.disabled = true;
    return;
  }

  vacio.classList.add('d-none');
  resumen.classList.remove('d-none');
  btnContinuar.disabled = false;

  lista.innerHTML = carritoCursos.map(s => `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
      <div>
        <p class="mb-0 fw-semibold">${s.nombre}</p>
        <small class="text-muted">${s.duracion} min — BOB ${s.precio}</small>
      </div>
      <button class="btn btn-sm btn-outline-danger rounded-circle" onclick="quitarDelCarritoCursos('${s.id}')">✕</button>
    </div>
  `).join('');

  const duracionTotal = carritoCursos.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoCursos.reduce((sum, s) => sum + s.precio, 0);

  document.getElementById('carrito-duracion-cursos').textContent = `${duracionTotal} min`;
  document.getElementById('carrito-total-cursos').textContent    = `BOB ${precioTotal}`;
}

function quitarDelCarritoCursos(id) {
  carritoCursos = carritoCursos.filter(s => s.id !== id);
  actualizarVistaCarritoCursos();
}

// ----------------------------------------------------------
// Conectar todos los botones "Reservar mi Cupo" al cargar la página
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-agregar-curso').forEach(boton => {
    boton.addEventListener('click', () => toggleCursoCarrito(boton));
  });

  document.getElementById('btn-continuar-reserva-cursos').addEventListener('click', abrirModalReservaCursos);

  // Botón Volver: de paso 2 a paso 1
  document.getElementById('btn-volver-reserva-cursos').addEventListener('click', () => {
    document.getElementById('reserva-paso-1-cursos').classList.remove('d-none');
    document.getElementById('reserva-paso-2-cursos').classList.add('d-none');
    document.getElementById('btn-siguiente-reserva-cursos').textContent = 'Continuar →';
    document.getElementById('btn-volver-reserva-cursos').classList.add('d-none');
  });
});

// ----------------------------------------------------------
// Abrir el modal de reserva de cursos (cierra el del carrito primero)
// ----------------------------------------------------------
async function abrirModalReservaCursos() {
  // Cerrar modal del carrito
  const modalCarritoEl = document.getElementById('modalCarritoCursos');
  const modalCarrito    = bootstrap.Modal.getInstance(modalCarritoEl);
  modalCarrito.hide();

  // Setear el subtítulo con resumen
  const cantidad      = carritoCursos.length;
  const duracionTotal = carritoCursos.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoCursos.reduce((sum, s) => sum + s.precio, 0);

  document.getElementById('reserva-subtitulo-cursos').textContent =
    `${cantidad} curso${cantidad > 1 ? 's' : ''} — ${duracionTotal} min — BOB ${precioTotal}`;

  // Pedir los horarios ocupados ANTES de mostrar el calendario
  document.getElementById('calendario-container-cursos').innerHTML =
    '<p class="text-center text-muted">⏳ Cargando calendario...</p>';

  const ocupados = await obtenerOcupadosDesdeSheets();

  // Abrir modal de reserva
  setTimeout(() => {
    const modalReserva = new bootstrap.Modal(document.getElementById('modalReservaCursos'));
    modalReserva.show();
    inicializarCalendarioCursos(ocupados, duracionTotal);
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
        let fechaISO;
        if (fechaKey instanceof Date) {
          fechaISO = formatearFechaISO(fechaKey);
        } else {
          fechaISO = fechaKey;
        }
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
// CALENDARIO DE RESERVAS PARA CURSOS
// ============================================================

let calOcupadosCursos        = {};
let calDuracionCurso         = 60;
let calDiaSeleccionadoCurso  = null;
let calHoraSeleccionadaCurso = null;

function inicializarCalendarioCursos(ocupados, duracionTotal) {
  calOcupadosCursos         = ocupados;
  calDuracionCurso          = duracionTotal;
  calDiaSeleccionadoCurso   = null;
  calHoraSeleccionadaCurso  = null;

  renderDiasCalendarioCursos();
}

// ----------------------------------------------------------
// Mostrar los próximos 14 días como botones
// ----------------------------------------------------------
function formatearFechaISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderDiasCalendarioCursos() {
  const contenedor = document.getElementById('calendario-container-cursos');
  const hoy = new Date();

  let html = '<div class="d-flex flex-wrap gap-2 justify-content-center mb-3" id="cal-dias-cursos"></div>';
  html += '<div id="cal-horarios-cursos"></div>';
  contenedor.innerHTML = html;

  const diasContainer = document.getElementById('cal-dias-cursos');
  const nombresDias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  for (let i = 0; i < 14; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);

    const fechaStr = formatearFechaISO(fecha);
    const diaSemana = fecha.getDay();

    const habilitado = diaSemana !== 0;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn btn-sm rounded-pill px-3 ' + (habilitado ? 'btn-outline-secondary' : 'btn-light disabled');
    boton.innerHTML = `${nombresDias[diaSemana]}<br><strong>${fecha.getDate()}</strong>`;
    boton.style.lineHeight = '1.2';

    if (habilitado) {
      boton.addEventListener('click', () => seleccionarDiaCalendarioCursos(fechaStr, boton));
    } else {
      boton.disabled = true;
    }

    diasContainer.appendChild(boton);
  }
}

function seleccionarDiaCalendarioCursos(fechaStr, botonClickeado) {
  calDiaSeleccionadoCurso  = fechaStr;
  calHoraSeleccionadaCurso = null;

  document.querySelectorAll('#cal-dias-cursos button').forEach(b => b.classList.remove('btn-primary-pink', 'text-white'));
  botonClickeado.classList.add('btn-primary-pink', 'text-white');
  botonClickeado.classList.remove('btn-outline-secondary');

  renderHorariosDelDiaCursos(fechaStr);
}

function renderHorariosDelDiaCursos(fechaStr) {
  const contenedor = document.getElementById('cal-horarios-cursos');
  const slots = generarSlotsDelDiaCursos();
  const ocupadosDelDia = calOcupadosCursos[fechaStr] || [];

  if (slots.length === 0) {
    contenedor.innerHTML = '<p class="text-center text-muted small">No hay horarios disponibles este día.</p>';
    return;
  }

  let html = '<div class="d-flex flex-wrap gap-2 justify-content-center">';

  slots.forEach(slot => {
    const ocupado = estaOcupado(slot, calDuracionCurso, ocupadosDelDia);

    html += `
      <button type="button"
        class="btn btn-sm rounded-pill px-3 ${ocupado ? 'btn-light disabled text-decoration-line-through' : 'btn-outline-secondary'}"
        ${ocupado ? 'disabled' : `onclick="seleccionarHoraCalendarioCursos('${slot}', this)"`}>
        ${slot}
      </button>
    `;
  });

  html += '</div>';
  contenedor.innerHTML = html;
}

function generarSlotsDelDiaCursos() {
  const apertura = 9 * 60;
  const cierre   = 19 * 60;
  const slots = [];

  for (let m = apertura; m + calDuracionCurso <= cierre; m += 30) {
    const h  = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${h}:${mm}`);
  }

  return slots;
}

function estaOcupado(horaInicio, duracionMin, reservasDelDia) {
  const [h, m] = horaInicio.split(':').map(Number);
  const inicioMin = h * 60 + m;
  const finMin    = inicioMin + duracionMin;

  return reservasDelDia.some(r => {
    const [hi, mi] = r.inicio.split(':').map(Number);
    const [hf, mf] = r.fin.split(':').map(Number);
    const ocupadoInicio = hi * 60 + mi;
    const ocupadoFin    = hf * 60 + mf;

    return inicioMin < ocupadoFin && finMin > ocupadoInicio;
  });
}

function seleccionarHoraCalendarioCursos(hora, botonClickeado) {
  calHoraSeleccionadaCurso = hora;

  document.querySelectorAll('#cal-horarios-cursos button').forEach(b => {
    b.classList.remove('btn-primary-pink', 'text-white');
    if (!b.disabled) b.classList.add('btn-outline-secondary');
  });

  botonClickeado.classList.add('btn-primary-pink', 'text-white');
  botonClickeado.classList.remove('btn-outline-secondary');
}

// ----------------------------------------------------------
// Navegación entre pasos del modal de reserva
// ----------------------------------------------------------
document.getElementById('btn-siguiente-reserva-cursos').addEventListener('click', () => {
  const pasoActual = document.getElementById('reserva-paso-1-cursos').classList.contains('d-none') ? 2 : 1;

  if (pasoActual === 1) {
    irAPaso2Cursos();
  } else if (pasoActual === 2) {
    confirmarReservaFinalCursos();
  }
});

function irAPaso2Cursos() {
  if (!calDiaSeleccionadoCurso || !calHoraSeleccionadaCurso) {
    alert('Por favor elegí un día y un horario antes de continuar.');
    return;
  }

  const duracionTotal = carritoCursos.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoCursos.reduce((sum, s) => sum + s.precio, 0);

  const listaCursos = carritoCursos.map(s =>
    `<div class="d-flex justify-content-between"><span>${s.nombre}</span><span>BOB ${s.precio}</span></div>`
  ).join('');

  document.getElementById('resumen-reserva-cursos').innerHTML = `
    ${listaCursos}
    <hr>
    <div class="d-flex justify-content-between"><span>Fecha</span><strong>${calDiaSeleccionadoCurso}</strong></div>
    <div class="d-flex justify-content-between"><span>Hora</span><strong>${calHoraSeleccionadaCurso}</strong></div>
    <div class="d-flex justify-content-between"><span>Total</span><strong class="text-primary-pink">BOB ${precioTotal}</strong></div>
  `;

  document.getElementById('reserva-paso-1-cursos').classList.add('d-none');
  document.getElementById('reserva-paso-2-cursos').classList.remove('d-none');
  document.getElementById('btn-siguiente-reserva-cursos').textContent = 'Confirmar reserva ✓';
  document.getElementById('btn-volver-reserva-cursos').classList.remove('d-none');
}

async function confirmarReservaFinalCursos() {
  const nombre   = document.getElementById('inp-nombre-cliente-cursos').value.trim();
  const telefonoInput = document.getElementById('inp-telefono-cliente-cursos').value.trim();
  const errorDiv = document.getElementById('errores-reserva-cursos');

  const errores = [];
  if (nombre.length < 2) errores.push('Ingresá tu nombre completo.');
  if (telefonoInput.replace(/\D/g, '').length < 7) errores.push('Ingresá un teléfono válido.');

  if (errores.length > 0) {
    errorDiv.classList.remove('d-none');
    errorDiv.innerHTML = errores.map(e => `<div>• ${e}</div>`).join('');
    return;
  }

  errorDiv.classList.add('d-none');

  // Sanitizar teléfono: solo números
  const telefono = telefonoInput.replace(/\D/g, '');

  const numeroReserva = generarNumeroReservaCursos();
  const duracionTotal = carritoCursos.reduce((sum, s) => sum + s.duracion, 0);
  const precioTotal    = carritoCursos.reduce((sum, s) => sum + s.precio, 0);

  const datosReserva = {
    numeroReserva,
    nombre,
    telefono,
    servicios:    carritoCursos.map(c => c.nombre).join(', '),
    _cursosData:  carritoCursos, // guardamos los datos originales para el resumen
    duracionTotal,
    precioTotal,
    montoSena:    0,
    fecha:        calDiaSeleccionadoCurso,
    hora:         calHoraSeleccionadaCurso,
    tipo:         'curso',
  };

  const btnConfirmar = document.getElementById('btn-siguiente-reserva-cursos');
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Guardando...';

  try {
    await enviarReservaACursosSheets(datosReserva);
    mostrarPasoConfirmacionCursos(datosReserva);
  } catch (error) {
    alert('Hubo un problema al guardar tu reserva. Intentá de nuevo.');
    console.error(error);
  } finally {
    btnConfirmar.disabled = false;
  }
}

function generarNumeroReservaCursos() {
  const fecha  = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 900 + 100);
  return `MB-CUR-${fecha}-${random}`;
}

async function enviarReservaACursosSheets(datos) {
  const res = await fetch(CONFIG.scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(datos),
  });
  return res.json();
}

function mostrarPasoConfirmacionCursos(datos) {
  document.getElementById('reserva-paso-2-cursos').classList.add('d-none');
  document.getElementById('reserva-paso-3-cursos').classList.remove('d-none');

  document.getElementById('btn-volver-reserva-cursos').classList.add('d-none');
  document.getElementById('btn-siguiente-reserva-cursos').classList.add('d-none');

  const mensajeWhatsapp = construirMensajeWhatsappCursos(datos);
  const linkWhatsapp     = `https://wa.me/+59175936698?text=${encodeURIComponent(mensajeWhatsapp)}`;

  document.getElementById('confirmacion-contenido-cursos').innerHTML = `
    <div class="badge bg-success-subtle text-success rounded-pill px-3 py-2 mb-3">
      ✓ Reserva registrada
    </div>

    <p class="text-muted small mb-1">Código de reserva</p>
    <h4 class="fw-bold text-primary-pink mb-4">${datos.numeroReserva}</h4>

    <div class="bg-light rounded-4 p-3 mb-4 text-start">
      ${datos._cursosData.map(s => `
        <div class="d-flex justify-content-between"><span>${s.nombre}</span><span>BOB ${s.precio}</span></div>
      `).join('')}
      <hr>
      <div class="d-flex justify-content-between"><span>Fecha</span><strong>${datos.fecha}</strong></div>
      <div class="d-flex justify-content-between"><span>Hora</span><strong>${datos.hora}</strong></div>
      <div class="d-flex justify-content-between"><span>Total</span><strong class="text-primary-pink">BOB ${datos.precioTotal}</strong></div>
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

function construirMensajeWhatsappCursos(datos) {
  const listaCursos = datos._cursosData.map(s => `   • ${s.nombre} — BOB ${s.precio}`).join('\n');

  return (
    `Hola! 👋 Soy *${datos.nombre}* y acabo de reservar un curso:\n\n` +
    `📌 *Cursos:*\n${listaCursos}\n\n` +
    `📅 *Fecha:* ${datos.fecha}\n` +
    `🕐 *Hora:* ${datos.hora}\n` +
    `💰 *Total:* BOB ${datos.precioTotal}\n` +
    `📞 *Teléfono:* ${datos.telefono}\n` +
    `🔖 *N° Reserva:* ${datos.numeroReserva}\n\n` +
    `Adjunto comprobante de pago. ¡Gracias! 🌸`
  );
}
