// ============================================================
//  M BEAUTY STUDIO — GOOGLE APPS SCRIPT (Backend completo)
// ============================================================
//
//  INSTRUCCIONES DE INSTALACIÓN:
//
//  1. Crear un Google Sheets nuevo, llamado "M Beauty Studio - Datos"
//
//  2. Crear 3 hojas (tabs) con estos nombres EXACTOS:
//     - "Servicios"
//     - "Reservas"
//     - "Config"
//
//  3. En la hoja "Servicios" poner en la fila 1 estos encabezados:
//     id | nombre | descripcion | precio | duracion | categoria | destacado | disponible | imagen
//
//     Ejemplo de fila 2:
//     srv-001 | Corte de Cabello | Corte personalizado... | 80 | 60 | cabello | TRUE | TRUE | corte.jpg
//
//  4. En la hoja "Config" poner en la fila 1:
//     clave | valor
//
//     Y luego estas filas (una por fila):
//     negocio_nombre      | M Beauty Studio
//     negocio_telefono    | +59177777777
//     negocio_whatsapp    | 59177777777
//     negocio_email       | contacto@mbeautystudio.com
//     negocio_direccion   | La Paz, Bolivia
//     negocio_instagram   | https://instagram.com/mbeautystudio
//     negocio_facebook    | https://facebook.com/mbeautystudio
//     qr_banco            | Banco Unión
//     qr_titular          | María González
//     qr_cuenta           | 1234567890
//     qr_porcentaje_sena  | 30
//     horario_apertura    | 9
//     horario_cierre      | 19
//     horario_dias        | 1,2,3,4,5,6
//
//  5. La hoja "Reservas" se llena SOLA, no hace falta poner nada
//     (el script crea los encabezados automáticamente)
//
//  6. Ir a Extensiones → Apps Script
//
//  7. Borrar todo el contenido del editor y pegar ESTE script completo
//
//  8. Guardar (ícono de disco o Ctrl+S)
//
//  9. Clic en "Implementar" (Deploy) → "Nueva implementación"
//     - Tipo: Aplicación web
//     - Descripción: M Beauty Studio API v1
//     - Ejecutar como: Yo (tu cuenta)
//     - Quién tiene acceso: Cualquier usuario
//
//  10. Clic en "Implementar" → copiar la URL que termina en /exec
//
//  11. Pegar esa URL en js/config.js → CONFIG.googleSheets.scriptUrl
//
//  12. Cambiar CONFIG.googleSheets.activo a true
//
//  IMPORTANTE: Cada vez que modifiques este script, hay que crear
//  una "Nueva implementación" de nuevo (o editar la existente) para
//  que los cambios tomen efecto en la URL pública.
//
// ============================================================


// ----------------------------------------------------------
// CONFIGURACIÓN — Nombres de las hojas
// ----------------------------------------------------------
const HOJA_SERVICIOS = 'Servicios';
const HOJA_RESERVAS  = 'Reservas';
const HOJA_CONFIG    = 'Config';

// ----------------------------------------------------------
// PUNTO DE ENTRADA — Peticiones GET
// (obtener servicios, config, horarios ocupados)
// ----------------------------------------------------------
function doGet(e) {
  const accion = e.parameter.action;

  try {
    switch (accion) {
      case 'getServicios':
        return respuestaJson({ ok: true, servicios: obtenerServicios() });

      case 'getConfig':
        return respuestaJson({ ok: true, config: obtenerConfig() });

      case 'getOcupados':
        return respuestaJson({ ok: true, ocupados: obtenerHorariosOcupados() });

      case 'getTodo':
        // Una sola llamada que trae todo (más eficiente para el frontend)
        return respuestaJson({
          ok: true,
          servicios: obtenerServicios(),
          config:    obtenerConfig(),
          ocupados:  obtenerHorariosOcupados(),
        });

      default:
        return respuestaJson({ ok: true, msg: 'M Beauty Studio API activa ✓' });
    }
  } catch (err) {
    return respuestaJson({ ok: false, error: err.message });
  }
}

// ----------------------------------------------------------
// PUNTO DE ENTRADA — Peticiones POST
// (crear nueva reserva)
// ----------------------------------------------------------
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);

    if (datos.action === 'nuevaReserva') {
      const resultado = crearReserva(datos);
      return respuestaJson(resultado);
    }

    return respuestaJson({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return respuestaJson({ ok: false, error: err.message });
  }
}

// ============================================================
// SERVICIOS — Leer catálogo dinámico
// ============================================================
function obtenerServicios() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SERVICIOS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const servicios = [];

  for (let i = 1; i < data.length; i++) {
    const fila = data[i];
    if (!fila[0]) continue; // saltar filas vacías

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = fila[idx];
    });

    // Normalizar booleanos (Sheets puede devolver string "TRUE"/"FALSE")
    obj.destacado   = normalizarBool(obj.destacado);
    obj.disponible  = normalizarBool(obj.disponible);
    obj.precio      = Number(obj.precio)   || 0;
    obj.duracion    = Number(obj.duracion) || 30;

    // Solo devolver servicios marcados como disponibles
    if (obj.disponible) {
      servicios.push(obj);
    }
  }

  return servicios;
}

function normalizarBool(valor) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'string')  return valor.toUpperCase() === 'TRUE';
  return false;
}

// ============================================================
// CONFIG — Leer configuración general del negocio
// ============================================================
function obtenerConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CONFIG);
  if (!sheet) return {};

  const data = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    const clave = data[i][0];
    const valor = data[i][1];
    if (clave) config[clave] = valor;
  }

  return config;
}

// ============================================================
// RESERVAS — Crear nueva reserva (soporta carrito de servicios)
// ============================================================
function crearReserva(datos) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_RESERVAS)
             || SpreadsheetApp.getActiveSpreadsheet().insertSheet(HOJA_RESERVAS);

  // Crear encabezados si la hoja está vacía
  if (sheet.getLastRow() === 0) {
    const headers = [
      'N° Reserva', 'Nombre', 'Teléfono', 'Servicios', 'Duración Total (min)',
      'Precio Total', 'Monto Seña', 'Fecha', 'Hora Inicio', 'Hora Fin',
      'Estado', 'Estado Pago', 'Timestamp'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#7A5736')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  // Calcular hora fin según duración total
  const horaFin = calcularHoraFin(datos.hora, datos.duracionTotal);

  // Nombres de servicios separados por coma (para lectura humana en Sheets)
  const nombresServicios = Array.isArray(datos.servicios)
    ? datos.servicios.map(s => s.nombre).join(', ')
    : datos.servicios;

  sheet.appendRow([
    datos.numeroReserva,
    datos.nombre,
    datos.telefono,
    nombresServicios,
    datos.duracionTotal,
    datos.precioTotal,
    datos.montoSena || 0,
    datos.fecha,
    datos.hora,
    horaFin,
    'Pendiente',
    datos.montoSena > 0 ? 'Pendiente verificación' : 'No requiere',
    new Date().toISOString(),
  ]);

  // Crear evento en Google Calendar
  let calendarOk = false;
  try {
    crearEventoCalendar(datos, horaFin);
    calendarOk = true;
  } catch (err) {
    console.error('Error creando evento en Calendar:', err);
  }

  return { ok: true, resultado: 'ok', calendarCreado: calendarOk };
}

// ----------------------------------------------------------
// Calcular hora de fin sumando duración en minutos
// ----------------------------------------------------------
function calcularHoraFin(horaInicio, duracionMin) {
  const [h, m] = horaInicio.split(':').map(Number);
  const totalMin = h * 60 + m + Number(duracionMin);
  const hFin = Math.floor(totalMin / 60) % 24;
  const mFin = totalMin % 60;
  return `${String(hFin).padStart(2,'0')}:${String(mFin).padStart(2,'0')}`;
}

// ============================================================
// HORARIOS OCUPADOS — Para bloquear slots ya reservados
// Devuelve TODOS los slots de 30 min que caen dentro del rango
// ocupado por cada reserva (no solo la hora de inicio)
// ============================================================
function obtenerHorariosOcupados() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_RESERVAS);
  if (!sheet || sheet.getLastRow() < 2) return {};

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idxFecha  = headers.indexOf('Fecha');
  const idxInicio = headers.indexOf('Hora Inicio');
  const idxFin    = headers.indexOf('Hora Fin');
  const idxEstado = headers.indexOf('Estado');

  const ocupados = {};

  for (let i = 1; i < data.length; i++) {
    const fila   = data[i];
    const estado = fila[idxEstado];

    if (estado === 'Cancelado') continue;

    const fecha  = formatearFecha(fila[idxFecha]);
    const inicio = fila[idxInicio];
    const fin    = fila[idxFin];

    if (!fecha || !inicio || !fin) continue;

    if (!ocupados[fecha]) ocupados[fecha] = [];

    // Generar todos los slots de 30 min entre inicio y fin
    const slots = generarSlotsEntre(inicio, fin);
    ocupados[fecha].push(...slots);
  }

  return ocupados;
}

function generarSlotsEntre(inicio, fin) {
  const slots = [];
  let [h, m] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const finMin = hf * 60 + mf;

  let actualMin = h * 60 + m;

  while (actualMin < finMin) {
    const hh = Math.floor(actualMin / 60);
    const mm = actualMin % 60;
    slots.push(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
    actualMin += 30;
  }

  return slots;
}

function formatearFecha(valor) {
  if (valor instanceof Date) {
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, '0');
    const d = String(valor.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return valor; // ya viene como string "YYYY-MM-DD"
}

// ============================================================
// GOOGLE CALENDAR — Crear evento automático
// ============================================================
function crearEventoCalendar(datos, horaFin) {
  const calendar = CalendarApp.getDefaultCalendar();

  const [y, m, d]   = datos.fecha.split('-').map(Number);
  const [hIni, mIni] = datos.hora.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);

  const fechaInicio = new Date(y, m - 1, d, hIni, mIni);
  const fechaFin     = new Date(y, m - 1, d, hFin, mFin);

  const nombresServicios = Array.isArray(datos.servicios)
    ? datos.servicios.map(s => s.nombre).join(' + ')
    : datos.servicios;

  const titulo = `💅 ${nombresServicios} — ${datos.nombre}`;

  const descripcion =
    `📞 Teléfono: ${datos.telefono}\n` +
    `💰 Precio total: Bs. ${datos.precioTotal}\n` +
    (datos.montoSena > 0 ? `💳 Seña: Bs. ${datos.montoSena} (verificar comprobante)\n` : '') +
    `🔖 N° Reserva: ${datos.numeroReserva}`;

  calendar.createEvent(titulo, fechaInicio, fechaFin, {
    description: descripcion,
  });
}
