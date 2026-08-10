// Vista "Pendientes" — agrupa TODAS las tareas (tengan proyecto o no) por
// responsable, para ver de un vistazo qué le toca a cada quien sin entrar
// proyecto por proyecto. No agrega tabla nueva: reutiliza "tareas", solo
// que aquí también se pueden crear sin ligarlas a un proyecto ("General").
import { proyectosDB } from './state.js';
import { tareasDB } from './gestionState.js';
import { esc, fF } from './utils.js';
import { fetchProyectos } from './proyectos.js';
import { fetchTareas } from './tareas.js';

const ESTADO_LABEL = {
  pendiente: 'Pendiente', en_curso: 'En curso', esperando_terceros: 'Esperando a terceros',
  bloqueada: 'Bloqueada', completada: 'Completada', cancelada: 'Cancelada',
};
const ESTADO_RANK = { pendiente: 0, en_curso: 0, esperando_terceros: 0, bloqueada: 0, completada: 1, cancelada: 1 };

export async function fetchPendientes() {
  await Promise.all([fetchProyectos(), fetchTareas()]);
  renderPendientes();
}

function _personasDe(responsable) {
  return (responsable || '').split(',').map(s => s.trim()).filter(Boolean);
}

function _nombreProyecto(proyectoId) {
  return proyectosDB.find(p => p.id === proyectoId)?.nombre || '';
}

export function agregarPendienteParaPersona(btn) {
  window.openTareaModal(null, null, btn.dataset.persona);
}

export function renderPendientes() {
  const el = document.getElementById('pendientes-body');
  if (!el) return;

  // Agrupa sin distinguir mayúsculas/minúsculas (p.ej. "Luan" y "LUAN" son
  // la misma persona) — la etiqueta mostrada es la primera forma vista.
  const porPersona = new Map(); // clave normalizada -> { label, items }
  tareasDB.forEach(t => {
    _personasDe(t.responsable).forEach(persona => {
      const clave = persona.toLowerCase();
      if (!porPersona.has(clave)) porPersona.set(clave, { label: persona, items: [] });
      porPersona.get(clave).items.push(t);
    });
  });
  const sinResponsable = tareasDB.filter(t => !_personasDe(t.responsable).length);
  if (sinResponsable.length) porPersona.set('__sin_responsable__', { label: 'Sin responsable', items: sinResponsable });

  const claves = [...porPersona.keys()].sort((a, b) => porPersona.get(a).label.localeCompare(porPersona.get(b).label, 'es'));

  const toolbar = `<div class="pend-toolbar"><button class="btn-p" onclick="openTareaModal()">+ Nuevo pendiente</button></div>`;

  if (!claves.length) {
    el.innerHTML = toolbar + '<div class="empty" style="padding:2.5rem">Sin pendientes todavía. Usa "+ Nuevo pendiente" para agregar el primero.</div>';
    return;
  }

  const grupos = claves.map(clave => {
    const { label, items: itemsSinOrdenar } = porPersona.get(clave);
    const items = [...itemsSinOrdenar].sort((a, b) => ESTADO_RANK[a.estado] - ESTADO_RANK[b.estado]);
    const esSinResponsable = clave === '__sin_responsable__';
    return `
      <div class="pend-persona-card">
        <div class="pend-persona-hdr">
          ${esc(label)}<span class="pend-persona-count">${items.length}</span>
          ${esSinResponsable ? '' : `<button class="pend-persona-add" data-persona="${esc(label)}" onclick="agregarPendienteParaPersona(this)" title="Agregar pendiente para ${esc(label)}">+</button>`}
        </div>
        <div class="pend-persona-list">
          ${items.map(t => {
      const checked = t.estado === 'completada';
      const compartidoCon = _personasDe(t.responsable).filter(p => p.toLowerCase() !== clave);
      return `
            <div class="pend-item ${checked ? 'completada' : ''}">
              <button class="pend-check ${checked ? 'checked' : ''}" onclick="event.stopPropagation();togglePendienteCompletada(${t.id})" title="${checked ? 'Marcar como pendiente' : 'Marcar como hecho'}">✓</button>
              <span class="badge-estado ${t.estado}">${ESTADO_LABEL[t.estado]}</span>
              <span class="pend-item-texto" onclick="openTareaModal(${t.id})">${esc(t.nombre)}</span>
              ${compartidoCon.length ? `<span class="pend-item-compartida">Con: ${esc(compartidoCon.join(', '))}</span>` : ''}
              <span class="pend-item-proy">${t.proyectoId ? esc(_nombreProyecto(t.proyectoId)) : 'General'}</span>
              ${t.fechaLimite ? `<span class="pend-item-fecha">${fF(t.fechaLimite)}</span>` : ''}
              <button class="pend-item-edit" onclick="openTareaModal(${t.id})" title="Editar">✎</button>
            </div>`;
    }).join('')}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${toolbar}<div class="pend-grid">${grupos}</div>`;
}
