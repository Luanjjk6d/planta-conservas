// Calendario — no tiene tabla propia: lee fechas de tareas (fecha_limite),
// reuniones (fecha) y proyectos (fecha_meta) ya cargados. Al seleccionar
// un evento se abre su registro original (nunca una copia).
import { tareasDB, reunionesDB } from './gestionState.js';
import { proyectosDB } from './state.js';
import { esc, fF, localDateStr } from './utils.js';
import { fetchTareas } from './tareas.js';
import { fetchReuniones } from './reuniones.js';
import { fetchProyectos } from './proyectos.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const hoy = new Date();
let anioActual = hoy.getFullYear();
let mesActual = hoy.getMonth(); // 0-11
let diaSeleccionado = localDateStr();

export async function fetchCalendario() {
  await Promise.all([fetchTareas(), fetchReuniones(), fetchProyectos()]);
  renderCalendario();
}

function _eventosPorFecha() {
  const mapa = {}; // 'YYYY-MM-DD' -> [{tipo, id, titulo, proyecto}]
  const add = (fecha, ev) => { if (!fecha) return; (mapa[fecha] ||= []).push(ev); };

  tareasDB.forEach(t => {
    if (t.estado === 'completada' || t.estado === 'cancelada') return;
    add(t.fechaLimite, { tipo: 'tarea', id: t.id, titulo: t.nombre, proyectoId: t.proyectoId });
  });
  reunionesDB.forEach(r => {
    if (r.estado === 'cancelada') return;
    add(r.fecha, { tipo: 'reunion', id: r.id, titulo: r.asunto, proyectoId: r.proyectoId });
  });
  proyectosDB.forEach(p => {
    if (p.estado === 'completado') return;
    add(p.fechaMeta, { tipo: 'hito', id: p.id, titulo: 'Meta: ' + p.nombre, proyectoId: p.id });
  });
  return mapa;
}

const TIPO_LABEL = { tarea: 'Actividad', reunion: 'Reunión', hito: 'Hito de proyecto' };
const TIPO_DOT = { tarea: 'cal-dot-tarea', reunion: 'cal-dot-reunion', hito: 'cal-dot-hito' };

export function calMesAnterior() { mesActual--; if (mesActual < 0) { mesActual = 11; anioActual--; } renderCalendario(); }
export function calMesSiguiente() { mesActual++; if (mesActual > 11) { mesActual = 0; anioActual++; } renderCalendario(); }
export function calHoy() { anioActual = hoy.getFullYear(); mesActual = hoy.getMonth(); diaSeleccionado = localDateStr(); renderCalendario(); }

export function renderCalendario() {
  const elLabel = document.getElementById('cal-mes-label');
  if (!elLabel) return;
  elLabel.textContent = `${MESES[mesActual]} ${anioActual}`;

  const eventos = _eventosPorFecha();
  const primerDia = new Date(anioActual, mesActual, 1);
  const inicioGrid = new Date(primerDia);
  inicioGrid.setDate(inicioGrid.getDate() - primerDia.getDay());
  const totalCeldas = 42; // 6 semanas fijas, layout estable mes a mes

  let celdas = '';
  for (let i = 0; i < totalCeldas; i++) {
    const d = new Date(inicioGrid);
    d.setDate(d.getDate() + i);
    const fechaStr = localDateStr(d);
    const otroMes = d.getMonth() !== mesActual;
    const esHoy = fechaStr === localDateStr();
    const evs = eventos[fechaStr] || [];
    const tiposPresentes = [...new Set(evs.map(e => e.tipo))];
    celdas += `<div class="cal-day${otroMes ? ' otro-mes' : ''}${esHoy ? ' hoy' : ''}${fechaStr === diaSeleccionado ? ' selected' : ''}" onclick="seleccionarDiaCalendario('${fechaStr}')">
      <div class="cal-day-num">${d.getDate()}</div>
      ${tiposPresentes.length ? `<div class="cal-day-dots">${tiposPresentes.map(t => `<span class="cal-dot ${TIPO_DOT[t]}"></span>`).join('')}</div>` : ''}
    </div>`;
  }

  document.getElementById('cal-grid').innerHTML =
    DOW.map(d => `<div class="cal-dow">${d}</div>`).join('') + celdas;

  _renderPanelDia(eventos);
}

export function seleccionarDiaCalendario(fechaStr) {
  diaSeleccionado = fechaStr;
  renderCalendario();
}

function _renderPanelDia(eventos) {
  const body0 = document.getElementById('cal-panel-body');
  if (!body0) return;
  const [y, m, d] = diaSeleccionado.split('-');
  const dow = new Date(diaSeleccionado + 'T00:00:00').getDay();
  const titulo = `${DOW[dow]} ${parseInt(d)} de ${MESES[parseInt(m) - 1]}`;
  const evs = eventos[diaSeleccionado] || [];
  document.getElementById('cal-panel-titulo').textContent = titulo;
  const body = document.getElementById('cal-panel-body');
  if (!evs.length) { body.innerHTML = '<div class="empty" style="padding:1.5rem">Sin pendientes este día.</div>'; return; }
  body.innerHTML = evs.map(e => `
    <div class="cal-evento" onclick="abrirEventoCalendario('${e.tipo}',${e.id})">
      <span class="cal-dot ${TIPO_DOT[e.tipo]}"></span>
      <div class="cal-evento-main">
        <div class="cal-evento-titulo">${esc(e.titulo)}</div>
        <div class="cal-evento-tipo">${TIPO_LABEL[e.tipo]}</div>
      </div>
    </div>`).join('');
}

export function abrirEventoCalendario(tipo, id) {
  if (tipo === 'tarea') window.openTareaModal(id);
  else if (tipo === 'reunion') window.openReunionModal(id);
  else if (tipo === 'hito') window.abrirFichaProyecto(id);
}
