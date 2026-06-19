// ============================================================
//  M BEAUTY STUDIO — Lógica del Calendario de Reservas
// ============================================================

class Calendario {
  constructor(containerId, onSeleccion) {
    this.container   = document.getElementById(containerId);
    this.onSeleccion = onSeleccion; // callback(fecha, hora)
    this.fechaActual = new Date();
    this.mesVista    = new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth(), 1);
    this.diaSeleccionado  = null;
    this.horaSeleccionada = null;
    this.horariosOcupados = {}; // { "2025-06-17": ["10:00", "14:30"] }
    this.duracionServicio = 60; // minutos, se actualiza según servicio
  }

  // ----------------------------------------------------------
  // (Deprecado) Los horarios ocupados ahora se cargan una sola vez
  // vía dataStore.cargarTodo() y se asignan directamente a
  // this.horariosOcupados desde la página que usa el calendario.
  // Se mantiene este método por compatibilidad.
  // ----------------------------------------------------------
  async cargarHorariosOcupados() {
    if (typeof dataStore !== 'undefined' && dataStore.cargado) {
      this.horariosOcupados = dataStore.ocupados;
      return;
    }

    if (!CONFIG.googleSheets.activo || !CONFIG.googleSheets.scriptUrl) return;

    try {
      const res  = await fetch(`${CONFIG.googleSheets.scriptUrl}?action=getOcupados`);
      const data = await res.json();
      this.horariosOcupados = data.ocupados || {};
    } catch (e) {
      console.warn("No se pudieron cargar horarios ocupados:", e);
    }
  }

  // ----------------------------------------------------------
  // Renderizar calendario del mes actual
  // ----------------------------------------------------------
  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="calendario-wrapper">
        <div class="calendario-header">
          <button onclick="window._cal.mesAnterior()" class="btn-nav-cal">&#8592;</button>
          <h3 id="cal-titulo" style="font-family: var(--fuente-principal); color: var(--color-botones);"></h3>
          <button onclick="window._cal.mesSiguiente()" class="btn-nav-cal">&#8594;</button>
        </div>
        <div class="calendario-grid" id="cal-dias-semana"></div>
        <div class="calendario-grid" id="cal-dias" style="margin-top:0.5rem;"></div>
        <div id="slots-container" style="margin-top:1.5rem;"></div>
      </div>
    `;

    this._agregarEstilosNav();
    this._renderMes();
  }

  _agregarEstilosNav() {
    if (document.getElementById('style-cal-nav')) return;
    const style = document.createElement('style');
    style.id = 'style-cal-nav';
    style.textContent = `
      .btn-nav-cal {
        background: none;
        border: 1px solid var(--color-primario);
        border-radius: 0.375rem;
        padding: 0.35rem 0.75rem;
        cursor: pointer;
        color: var(--color-botones);
        font-size: 1rem;
        transition: all 0.2s;
      }
      .btn-nav-cal:hover {
        background-color: var(--color-botones);
        color: white;
      }
    `;
    document.head.appendChild(style);
  }

  _renderMes() {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const dias  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    const titulo = document.getElementById('cal-titulo');
    if (titulo) titulo.textContent = `${meses[this.mesVista.getMonth()]} ${this.mesVista.getFullYear()}`;

    // Días de la semana
    const gridSemana = document.getElementById('cal-dias-semana');
    if (gridSemana) {
      gridSemana.innerHTML = dias.map(d =>
        `<div style="font-size:0.75rem;font-weight:600;color:var(--color-texto-sec);padding:0.25rem;text-align:center;text-transform:uppercase;">${d}</div>`
      ).join('');
    }

    // Días del mes
    const gridDias = document.getElementById('cal-dias');
    if (!gridDias) return;

    const diasHabiles = (typeof dataStore !== 'undefined' && dataStore.cargado)
      ? dataStore.getDiasHabiles()
      : CONFIG.horarios.diasHabiles;

    const primerDia  = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), 1).getDay();
    const totalDias  = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() + 1, 0).getDate();
    const hoy        = new Date();
    hoy.setHours(0,0,0,0);

    let html = '';

    // Celdas vacías antes del primer día
    for (let i = 0; i < primerDia; i++) {
      html += '<div></div>';
    }

    for (let d = 1; d <= totalDias; d++) {
      const fecha     = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), d);
      const fechaStr  = this._formatFecha(fecha);
      const esPasado  = fecha < hoy;
      const esBloq    = CONFIG.horarios.diasBloqueados.includes(fechaStr);
      const esHabil   = diasHabiles.includes(fecha.getDay());
      const esHoy     = fecha.getTime() === hoy.getTime();
      const esSel     = fechaStr === this.diaSeleccionado;

      let clases = 'cal-dia';
      if (esPasado || !esHabil || esBloq) clases += ' cal-dia--pasado';
      if (esHoy) clases += ' cal-dia--hoy';
      if (esSel) clases += ' cal-dia--seleccionado';

      const clickable = !esPasado && esHabil && !esBloq;

      html += `<div class="${clases}" 
                    ${clickable ? `onclick="window._cal.seleccionarDia('${fechaStr}')"` : ''}
                    title="${fechaStr}">${d}</div>`;
    }

    gridDias.innerHTML = html;

    // Si hay día seleccionado, mostrar slots
    if (this.diaSeleccionado) {
      this._renderSlots(this.diaSeleccionado);
    }
  }

  seleccionarDia(fechaStr) {
    this.diaSeleccionado  = fechaStr;
    this.horaSeleccionada = null;
    this._renderMes();
  }

  _renderSlots(fechaStr) {
    const container = document.getElementById('slots-container');
    if (!container) return;

    const ocupados   = this.horariosOcupados[fechaStr] || [];
    const slots      = this._generarSlots();

    if (slots.length === 0) {
      container.innerHTML = `<p style="color:var(--color-texto-sec);font-size:0.9rem;">Sin horarios disponibles para este día.</p>`;
      return;
    }

    let html = `
      <h4 style="font-family:var(--fuente-principal);color:var(--color-botones);margin-bottom:0.75rem;">
        Horarios disponibles — ${this._formatFechaLegible(fechaStr)}
      </h4>
      <div class="slots-grid">
    `;

    slots.forEach(slot => {
      const ocupado   = ocupados.includes(slot);
      const seleccion = slot === this.horaSeleccionada;
      let clases = 'slot';
      if (ocupado)   clases += ' slot--ocupado';
      if (seleccion) clases += ' slot--seleccionado';

      html += `<div class="${clases}" 
                    ${!ocupado ? `onclick="window._cal.seleccionarHora('${slot}')"` : ''}>${slot}</div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  seleccionarHora(hora) {
    this.horaSeleccionada = hora;
    this._renderSlots(this.diaSeleccionado);

    if (this.onSeleccion && this.diaSeleccionado) {
      this.onSeleccion(this.diaSeleccionado, hora);
    }
  }

  _generarSlots() {
    const slots   = [];
    const apertura = (typeof dataStore !== 'undefined' && dataStore.cargado)
      ? dataStore.getHoraApertura() : CONFIG.horarios.horaApertura;
    const cierre   = (typeof dataStore !== 'undefined' && dataStore.cargado)
      ? dataStore.getHoraCierre() : CONFIG.horarios.horaCierre;

    const inicio  = apertura * 60;
    const fin     = cierre   * 60;
    const dur     = CONFIG.horarios.duracionSlot;

    for (let m = inicio; m + this.duracionServicio <= fin; m += dur) {
      const h  = Math.floor(m / 60).toString().padStart(2, '0');
      const mn = (m % 60).toString().padStart(2, '0');
      slots.push(`${h}:${mn}`);
    }
    return slots;
  }

  mesAnterior() {
    this.mesVista = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() - 1, 1);
    this.diaSeleccionado  = null;
    this.horaSeleccionada = null;
    this._renderMes();
  }

  mesSiguiente() {
    this.mesVista = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() + 1, 1);
    this.diaSeleccionado  = null;
    this.horaSeleccionada = null;
    this._renderMes();
  }

  // ----------------------------------------------------------
  // Helpers de fecha
  // ----------------------------------------------------------
  _formatFecha(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _formatFechaLegible(fechaStr) {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  setDuracionServicio(minutos) {
    this.duracionServicio = minutos;
  }

  getSeleccion() {
    return {
      fecha: this.diaSeleccionado,
      hora:  this.horaSeleccionada,
      fechaLegible: this.diaSeleccionado ? this._formatFechaLegible(this.diaSeleccionado) : null,
    };
  }
}
