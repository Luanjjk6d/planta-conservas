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
    return `
      <div class="pend-persona-card">
        <div class="pend-persona-hdr">${esc(label)}<span class="pend-persona-count">${items.length}</span></div>
        <div class="pend-persona-list">
          ${items.map(t => `
            <div class="pend-item" onclick="openTareaModal(${t.id})">
              <span class="badge-estado ${t.estado}">${ESTADO_LABEL[t.estado]}</span>
              <span class="pend-item-texto">${esc(t.nombre)}</span>
              <span class="pend-item-proy">${t.proyectoId ? esc(_nombreProyecto(t.proyectoId)) : 'General'}</span>
              ${t.fechaLimite ? `<span class="pend-item-fecha">${fF(t.fechaLimite)}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${toolbar}<div class="pend-grid">${grupos}</div>`;
}
