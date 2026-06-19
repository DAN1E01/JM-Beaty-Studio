// ============================================================
//  M BEAUTY STUDIO — Capa de Datos Dinámicos (Google Sheets)
//  Centraliza toda la comunicación con el Apps Script.
//  Si Sheets falla, recurre a los datos de respaldo en config.js
// ============================================================

class DataStore {

  constructor() {
    this.servicios = [];
    this.config    = {};
    this.ocupados  = {};
    this.cargado   = false;
    this.usandoFallback = false;
  }

  // ----------------------------------------------------------
  // Cargar todo de una sola vez (servicios + config + ocupados)
  // ----------------------------------------------------------
  async cargarTodo() {
    if (!CONFIG.googleSheets.activo || !CONFIG.googleSheets.scriptUrl) {
      this._cargarFallback();
      return { ok: true, modo: 'fallback' };
    }

    try {
      const res = await fetch(`${CONFIG.googleSheets.scriptUrl}?action=getTodo`);

      if (!res.ok) throw new Error('Respuesta no válida del servidor');

      const data = await res.json();

      if (!data.ok) throw new Error(data.error || 'Error desconocido');

      this.servicios = data.servicios?.length ? data.servicios : CONFIG.serviciosFallback;
      this.config    = data.config || {};
      this.ocupados  = data.ocupados || {};
      this.cargado   = true;
      this.usandoFallback = !data.servicios?.length;

      return { ok: true, modo: 'sheets' };

    } catch (err) {
      console.warn('No se pudo conectar con Google Sheets, usando datos de respaldo:', err.message);
      this._cargarFallback();
      return { ok: false, modo: 'fallback', error: err.message };
    }
  }

  _cargarFallback() {
    this.servicios = CONFIG.serviciosFallback;
    this.config     = {};
    this.ocupados   = {};
    this.cargado    = true;
    this.usandoFallback = true;
  }

  // ----------------------------------------------------------
  // Getters con fallback inteligente a CONFIG si Sheets no trajo el dato
  // ----------------------------------------------------------
  getNombreNegocio()   { return this.config.negocio_nombre    || CONFIG.negocio.nombre; }
  getTelefono()        { return this.config.negocio_telefono  || CONFIG.negocio.telefono; }
  getWhatsapp()         { return this.config.negocio_whatsapp  || CONFIG.negocio.whatsapp; }
  getEmail()            { return this.config.negocio_email     || CONFIG.negocio.email; }
  getDireccion()        { return this.config.negocio_direccion || CONFIG.negocio.direccion; }
  getInstagram()        { return this.config.negocio_instagram || CONFIG.negocio.instagram; }
  getFacebook()         { return this.config.negocio_facebook  || CONFIG.negocio.facebook; }

  getBanco()             { return this.config.qr_banco          || CONFIG.pago.banco; }
  getTitular()            { return this.config.qr_titular        || CONFIG.pago.titular; }
  getCuenta()             { return this.config.qr_cuenta         || CONFIG.pago.cuenta; }
  getPorcentajeSena()     { return Number(this.config.qr_porcentaje_sena) || CONFIG.pago.porcentajeSena; }

  getHoraApertura()       { return Number(this.config.horario_apertura) || CONFIG.horarios.horaApertura; }
  getHoraCierre()         { return Number(this.config.horario_cierre)   || CONFIG.horarios.horaCierre; }
  getDiasHabiles() {
    if (this.config.horario_dias) {
      return this.config.horario_dias.toString().split(',').map(n => Number(n.trim()));
    }
    return CONFIG.horarios.diasHabiles;
  }

  // ----------------------------------------------------------
  // Servicios
  // ----------------------------------------------------------
  getServicios() {
    return this.servicios.filter(s => s.disponible !== false);
  }

  getServiciosDestacados() {
    return this.getServicios().filter(s => s.destacado === true);
  }

  getServicioPorId(id) {
    return this.servicios.find(s => s.id === id);
  }

  // ----------------------------------------------------------
  // Horarios ocupados por fecha
  // ----------------------------------------------------------
  getOcupadosPorFecha(fechaStr) {
    return this.ocupados[fechaStr] || [];
  }
}

// Instancia global única (singleton)
const dataStore = new DataStore();
