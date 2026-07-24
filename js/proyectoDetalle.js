// Ficha de proyecto — el punto de entrada único de información: desde
// aquí se registran las actividades y reuniones de un proyecto, en vez
// de crearlas sueltas y elegir el proyecto en un desplegable aparte.
import { proyectosDB } from './state.js';
import { esc, fF } from './utils.js';
import { fetchTareas, renderTareasEnFicha } from './tareas.js';
import { fetchReuniones, renderReunionesEnFicha } from './reuniones.js';

const ESTADO_LABEL = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', completado: 'Completado' };
const PRIORIDAD_LABEL = { baja: 'Baja', media: 'Media', alta: 'Alta' };

let fichaProyectoId = null;

export async function abrirFichaProyecto(id) {
  fichaProyectoId = id;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-ficha-proyecto').classList.add('active');
  _renderCabeceraFicha();
  await Promise.all([fetchTareas(), fetchReuniones()]);
  renderTareasEnFicha(id);
  renderReunionesEnFicha(id);
}

export function volverAProyectosDesdeFicha() {
  const b = Array.from(document.querySelectorAll('.nb')).find(x => x.textContent.includes('Proyectos'));
  window.showPage('proy', b);
  window.fetchProyectos().then(() => { window.fetchTareas(); });
}

function _renderCabeceraFicha() {
  const p = proyectosDB.find(x => x.id === fichaProyectoId);
  const el = document.getElementById('ficha-proyecto-header');
  if (!p) { el.innerHTML = '<div class="empty">Proyecto no encontrado.</div>'; return; }
  const metaLinea = [p.cliente, p.responsable, p.categoria].filter(Boolean).join(' · ');
  el.innerHTML = `
    <div class="ficha-top">
      <div>
        <span class="pbadge ${p.estado}">${ESTADO_LABEL[p.estado]}</span>
        <span class="pbadge-prioridad ${p.prioridad}">${PRIORIDAD_LABEL[p.prioridad] || 'Media'}</span>
        <h2 class="ficha-titulo">${esc(p.nombre)}</h2>
        ${metaLinea ? `<div class="proy-meta">${esc(metaLinea)}</div>` : ''}
      </div>
      <button class="btn-p" onclick="openProyectoModal(${p.id})">Editar proyecto</button>
    </div>
    <div class="ficha-grid">
      <div><div class="cd-item-l">Avance</div><div class="cd-item-v">${p.avance}%</div></div>
      <div><div class="cd-item-l">Fecha de inicio</div><div class="cd-item-v">${p.fechaInicio ? fF(p.fechaInicio) : '—'}</div></div>
      <div><div class="cd-item-l">Fecha objetivo</div><div class="cd-item-v">${p.fechaMeta ? fF(p.fechaMeta) : '—'}</div></div>
      <div><div class="cd-item-l">Último avance</div><div class="cd-item-v">${p.ultimoAvance ? esc(p.ultimoAvance) : '—'}</div></div>
      <div><div class="cd-item-l">Próximo paso</div><div class="cd-item-v">${p.proximoPaso ? esc(p.proximoPaso) : '—'}</div></div>
      <div><div class="cd-item-l">Bloqueo principal</div><div class="cd-item-v" style="color:var(--orange)">${p.bloqueoPrincipal ? esc(p.bloqueoPrincipal) : '—'}</div></div>
    </div>`;
}

export function abrirTareaEnFicha() {
  window.openTareaModal(null, fichaProyectoId);
}

export function abrirReunionEnFicha() {
  window.openReunionModal(null, fichaProyectoId);
}

// Se llama tras guardar/editar/eliminar una tarea o reunión desde CUALQUIER
// lugar de la app, para que la ficha (si está abierta) quede al día.
export function refrescarFicha() {
  if (fichaProyectoId == null) return;
  _renderCabeceraFicha();
  renderTareasEnFicha(fichaProyectoId);
  renderReunionesEnFicha(fichaProyectoId);
}
