// Mapa de planta — vista tipo árbol de Proyectos → Actividades/Reuniones,
// para ver de un vistazo en qué está cada proyecto. V1: acomodo automático
// (sin arrastrar nodos ni guardar posiciones) — no usa tablas nuevas, lee
// los mismos datos ya cargados por Proyectos/Resumen.
import { proyectosDB } from './state.js';
import { tareasDB, reunionesDB } from './gestionState.js';
import { esc, fF } from './utils.js';
import { fetchProyectos } from './proyectos.js';
import { fetchTareas } from './tareas.js';
import { fetchReuniones } from './reuniones.js';

const ESTADO_LABEL = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', completado: 'Completado' };
const TAREA_ESTADO_LABEL = {
  pendiente: 'Pendiente', en_curso: 'En curso', esperando_terceros: 'Esperando a terceros',
  bloqueada: 'Bloqueada', completada: 'Completada', cancelada: 'Cancelada',
};

const colapsados = new Set();

export async function fetchMapa() {
  await Promise.all([fetchProyectos(), fetchTareas(), fetchReuniones()]);
  renderMapa();
}

export function toggleMapaProyecto(id) {
  if (colapsados.has(id)) colapsados.delete(id); else colapsados.add(id);
  renderMapa();
}

export function renderMapa() {
  const el = document.getElementById('mapa-body');
  if (!el) return;

  if (!proyectosDB.length) {
    el.innerHTML = '<div class="empty" style="padding:2.5rem">Sin proyectos todavía. Crea uno en la pestaña Proyectos para verlo aquí.</div>';
    return;
  }

  const ramas = proyectosDB.map(p => {
    const tareas = tareasDB.filter(t => t.proyectoId === p.id);
    const reuniones = reunionesDB.filter(r => r.proyectoId === p.id);
    const colapsado = colapsados.has(p.id);
    const hijos = [
      ...tareas.map(t => `
        <div class="mapa-leaf mapa-leaf-tarea" onclick="openTareaModal(${t.id})">
          <span class="badge-estado ${t.estado}">${TAREA_ESTADO_LABEL[t.estado]}</span>
          <span class="mapa-leaf-nombre">${esc(t.nombre)}</span>
        </div>`),
      ...reuniones.map(r => `
        <div class="mapa-leaf mapa-leaf-reunion" onclick="openReunionModal(${r.id})">
          <span class="mapa-leaf-ico">🗓</span>
          <span class="mapa-leaf-nombre">${esc(r.asunto)}</span>
          <span class="mapa-leaf-fecha">${fF(r.fecha)}</span>
        </div>`),
    ].join('');

    return `
      <div class="mapa-proy-branch">
        <div class="mapa-proy-card ${p.estado}">
          <button class="mapa-toggle" onclick="toggleMapaProyecto(${p.id})" title="${colapsado ? 'Expandir' : 'Colapsar'}">${colapsado ? '▸' : '▾'}</button>
          <span class="mapa-proy-nombre" onclick="abrirFichaProyecto(${p.id})">${esc(p.nombre)}</span>
          <span class="pbadge ${p.estado}">${ESTADO_LABEL[p.estado]}</span>
          <span class="mapa-proy-count">${tareas.length + reuniones.length}</span>
          <button class="mapa-add-btn" onclick="openTareaModal(null,${p.id})" title="Agregar actividad a este proyecto">+</button>
        </div>
        ${colapsado ? '' : `<div class="mapa-proy-children">${hijos || '<div class="mapa-leaf-empty">Sin actividades ni reuniones — usa el botón + para agregar.</div>'}</div>`}
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="mapa-wrap">
      <div class="mapa-root-card">
        <div class="mapa-root-ico">🏭</div>
        <div>
          <div class="mapa-root-title">Gestión Conservas</div>
          <div class="mapa-root-sub">${proyectosDB.length} proyecto${proyectosDB.length !== 1 ? 's' : ''} · ${tareasDB.length} actividad${tareasDB.length !== 1 ? 'es' : ''} · ${reunionesDB.length} reunión${reunionesDB.length !== 1 ? 'es' : ''}</div>
        </div>
      </div>
      <div class="mapa-branches">${ramas}</div>
    </div>`;
}
