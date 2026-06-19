// ============================================================
//  M BEAUTY STUDIO — Manejo de Reservas + Google Sheets
// ============================================================

class GestorReservas {

  // ----------------------------------------------------------
  // Generar número de reserva único
  // ----------------------------------------------------------
  static generarNumero() {
    const ahora  = new Date();
    const fecha  = ahora.toISOString().slice(2,10).replace(/-/g,'');
    const random = Math.floor(Math.random() * 900 + 100);
    return `MB-${fecha}-${random}`;
  }

  // ----------------------------------------------------------
  // Guardar reserva en Google Sheets (soporta carrito de servicios)
  // ----------------------------------------------------------
  static async guardar(datos) {
    if (!CONFIG.googleSheets.activo || !CONFIG.googleSheets.scriptUrl) {
      console.info("Google Sheets no configurado — modo sin persistencia.");
      return { ok: true, modo: 'local' };
    }

    try {
      const payload = {
        action:        'nuevaReserva',
        numeroReserva: datos.numeroReserva,
        nombre:        datos.nombre,
        telefono:      datos.telefono,
        servicios:     datos.servicios,        // array de {id, nombre, precio, duracion}
        duracionTotal: datos.duracionTotal,
        precioTotal:   datos.precioTotal,
        montoSena:     datos.montoSena || 0,
        fecha:         datos.fecha,
        hora:          datos.hora,
      };

      const res = await fetch(CONFIG.googleSheets.scriptUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();
      return { ok: data.resultado === 'ok', data };
    } catch (err) {
      console.error("Error al guardar en Sheets:", err);
      return { ok: false, error: err.message };
    }
  }

  // ----------------------------------------------------------
  // Validar datos del formulario de reserva (con carrito)
  // ----------------------------------------------------------
  static validar(datos) {
    const errores = [];

    if (!datos.nombre || datos.nombre.trim().length < 2)
      errores.push("Por favor ingresá tu nombre completo.");

    if (!datos.telefono || datos.telefono.replace(/\D/g,'').length < 7)
      errores.push("Ingresá un número de teléfono válido.");

    if (!datos.fecha)
      errores.push("Seleccioná una fecha en el calendario.");

    if (!datos.hora)
      errores.push("Seleccioná un horario disponible.");

    if (!datos.servicios || datos.servicios.length === 0)
      errores.push("Agregá al menos un servicio al carrito.");

    return errores;
  }

  // ----------------------------------------------------------
  // Guardar en localStorage como respaldo local
  // ----------------------------------------------------------
  static guardarLocal(datos) {
    try {
      const reservas = JSON.parse(localStorage.getItem('mb_reservas') || '[]');
      reservas.push({ ...datos, timestamp: new Date().toISOString() });
      localStorage.setItem('mb_reservas', JSON.stringify(reservas));
    } catch(e) {
      // localStorage no disponible, ignorar
    }
  }

  // ----------------------------------------------------------
  // Obtener reservas locales (para referencia del usuario)
  // ----------------------------------------------------------
  static obtenerLocales() {
    try {
      return JSON.parse(localStorage.getItem('mb_reservas') || '[]');
    } catch {
      return [];
    }
  }
}

// ============================================================
//  GOOGLE APPS SCRIPT — Pegar en el editor de Apps Script
//  (Extensions → Apps Script en Google Sheets)
// ============================================================

/*
  INSTRUCCIONES:
  1. Abrir la hoja de Google Sheets donde se guardarán las reservas
  2. Ir a Extensiones → Apps Script
  3. Borrar el contenido existente y pegar el código de abajo
  4. Guardar (Ctrl+S)
  5. Clic en "Implementar" → "Nueva implementación"
  6. Tipo: Aplicación web
  7. Ejecutar como: Yo (tu cuenta)
  8. Quién tiene acceso: Cualquier usuario
  9. Clic en "Implementar" y copiar la URL generada
  10. Pegar la URL en config.js → googleSheets.scriptUrl
  11. Cambiar googleSheets.activo a true

------------------------------------------------------------
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservas') 
                || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Reservas');

  // Crear encabezados si la hoja está vacía
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['N° Reserva','Nombre','Teléfono','Servicio','Fecha','Hora','Precio','Estado','Timestamp']);
    sheet.getRange(1,1,1,9).setFontWeight('bold').setBackground('#7A5736').setFontColor('#FFFFFF');
  }

  const datos = JSON.parse(e.postData.contents);

  sheet.appendRow([
    datos.numeroReserva,
    datos.nombre,
    datos.telefono,
    datos.servicio,
    datos.fecha,
    datos.hora,
    datos.precio,
    datos.estado || 'Pendiente',
    datos.timestamp
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ resultado: 'ok' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (e.parameter.action === 'getOcupados') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservas');
    if (!sheet) return respuestaJson({ ocupados: {} });

    const data  = sheet.getDataRange().getValues();
    const ocupados = {};

    for (let i = 1; i < data.length; i++) {
      const estado = data[i][7];
      if (estado === 'Cancelado') continue;

      const fecha = data[i][4];
      const hora  = data[i][5];

      if (!ocupados[fecha]) ocupados[fecha] = [];
      ocupados[fecha].push(hora);
    }

    return respuestaJson({ ocupados });
  }

  return respuestaJson({ ok: true, msg: 'M Beauty Studio API' });
}

function respuestaJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
------------------------------------------------------------
*/
