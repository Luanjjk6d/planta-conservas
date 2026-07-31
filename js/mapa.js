// Mapa de planta — vista tipo árbol de Proyectos → Actividades/Reuniones →
// notas, para ver de un vistazo en qué está cada proyecto. V1: acomodo
// automático (sin arrastrar nodos ni guardar posiciones) — Proyectos,
// Actividades y Reuniones no usan tablas nuevas (mismos datos que ya
// cargan Proyectos/Resumen); las notas sí usan una tabla nueva y liviana
// (mapa_nodos) pensada para anidar ideas rápido bajo un proyecto, una
// actividad, o otra nota.
import { proyectosDB } from './state.js';
import { tareasDB, reunionesDB } from './gestionState.js';
import { esc, fF } from './utils.js';
import { fetchProyectos } from './proyectos.js';
import { fetchTareas } from './tareas.js';
import { fetchReuniones } from './reuniones.js';
import {
  fetchMapaNodos, nodosDeProyecto, nodosDeTarea, nodosDeNodo,
  estaAgregandoEn, estaEditandoNodo, estaConfirmandoEliminarNodo,
  estaEligiendoColor, COLORES,
} from './mapaNodos.js';

const ESTADO_LABEL = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', completado: 'Completado' };
const TAREA_ESTADO_LABEL = {
  pendiente: 'Pendiente', en_curso: 'En curso', esperando_terceros: 'Esperando a terceros',
  bloqueada: 'Bloqueada', completada: 'Completada', cancelada: 'Cancelada',
};

const colapsados = new Set();

export async function fetchMapa() {
  await Promise.all([fetchProyectos(), fetchTareas(), fetchReuniones(), fetchMapaNodos()]);
  renderMapa();
}

export function toggleMapaProyecto(id) {
  if (colapsados.has(id)) colapsados.delete(id); else colapsados.add(id);
  renderMapa();
}

function _renderAgregarTrigger(tipo, id) {
  if (estaAgregandoEn(tipo, id)) {
    return `<div class="mapa-nota-add-row">
      <input id="mapa-nuevo-input" class="mapa-inline-input" placeholder="Escribe y presiona Enter..."
        onkeydown="if(event.key==='Enter')confirmarAgregarNodo('${tipo}',${id},this.value);if(event.key==='Escape')cancelarAgregarNodo();">
    </div>`;
  }
  return `<button class="mapa-add-nota-btn" onclick="iniciarAgregarNodo('${tipo}',${id})">+ nota</button>`;
}

function _renderColorSwatch(nodo) {
  const eligiendo = estaEligiendoColor(nodo.id);
  const dot = `<button class="mapa-color-dot ${nodo.color ? 'mapa-color-' + nodo.color : 'mapa-color-vacio'}"
    onclick="${eligiendo ? 'cancelarElegirColor()' : `iniciarElegirColor(${nodo.id})`}" title="Elegir color"></button>`;
  if (!eligiendo) return dot;
  const opciones = COLORES.map(c => `<button class="mapa-color-op mapa-color-${c}" onclick="elegirColor(${nodo.id},'${c}')" title="${c}"></button>`).join('');
  return `${dot}<span class="mapa-color-picker">${opciones}<button class="mapa-color-op mapa-color-vacio" onclick="elegirColor(${nodo.id},null)" title="Sin color"></button></span>`;
}

function _renderNodoBranch(nodo) {
  const hijos = nodosDeNodo(nodo.id);
  const editando = estaEditandoNodo(nodo.id);
  const confirmandoDel = estaConfirmandoEliminarNodo(nodo.id);
  return `
    <div class="mapa-nodo-branch">
      <div class="mapa-nodo ${nodo.color ? 'mapa-nodo-color-' + nodo.color : ''}">
        ${_renderColorSwatch(nodo)}
        ${editando
      ? `<input id="mapa-editar-input" class="mapa-inline-input" onkeydown="if(event.key==='Enter')confirmarEditarNodo(${nodo.id},this.value);if(event.key==='Escape')cancelarEditarNodo();">`
      : `<span class="mapa-nodo-texto" onclick="iniciarEditarNodo(${nodo.id})">${esc(nodo.texto)}</span>`}
        ${confirmandoDel
      ? `<span class="mapa-nodo-confirm">¿Eliminar? <button onclick="confirmarEliminarNodo(${nodo.id})">Sí</button><button onclick="cancelarEliminarNodo()">No</button></span>`
      : `<button class="mapa-nodo-del" onclick="pedirEliminarNodo(${nodo.id})" title="Eliminar nota">×</button>`}
      </div>
      <div class="mapa-nodo-children">
        ${hijos.map(_renderNodoBranch).join('')}
        ${_renderAgregarTrigger('nodo', nodo.id)}
      </div>
    </div>`;
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
    const notasProy = nodosDeProyecto(p.id);
    const colapsado = colapsados.has(p.id);
    const hijos = [
      ...tareas.map(t => `
        <div class="mapa-tarea-branch">
          <div class="mapa-leaf mapa-leaf-tarea" onclick="openTareaModal(${t.id})">
            <span class="badge-estado ${t.estado}">${TAREA_ESTADO_LABEL[t.estado]}</span>
            <span class="mapa-leaf-nombre">${esc(t.nombre)}</span>
          </div>
          <div class="mapa-nodo-children">
            ${nodosDeTarea(t.id).map(_renderNodoBranch).join('')}
            ${_renderAgregarTrigger('tarea', t.id)}
          </div>
        </div>`),
      ...reuniones.map(r => `
        <div class="mapa-leaf mapa-leaf-reunion" onclick="openReunionModal(${r.id})">
          <span class="mapa-leaf-ico">🗓</span>
          <span class="mapa-leaf-nombre">${esc(r.asunto)}</span>
          <span class="mapa-leaf-fecha">${fF(r.fecha)}</span>
        </div>`),
      ...notasProy.map(_renderNodoBranch),
    ].join('');

    return `
      <div class="mapa-proy-branch">
        <div class="mapa-proy-card ${p.estado}">
          <button class="mapa-toggle" onclick="toggleMapaProyecto(${p.id})" title="${colapsado ? 'Expandir' : 'Colapsar'}">${colapsado ? '▸' : '▾'}</button>
          <span class="mapa-proy-nombre" onclick="abrirFichaProyecto(${p.id})">${esc(p.nombre)}</span>
          <span class="pbadge ${p.estado}">${ESTADO_LABEL[p.estado]}</span>
          <span class="mapa-proy-count">${tareas.length + reuniones.length + notasProy.length}</span>
          <button class="mapa-add-btn" onclick="openTareaModal(null,${p.id})" title="Agregar actividad a este proyecto">+ actividad</button>
        </div>
        ${colapsado ? '' : `<div class="mapa-proy-children">
          ${hijos || '<div class="mapa-leaf-empty">Sin actividades, reuniones ni notas — agrega una actividad o una nota.</div>'}
          ${_renderAgregarTrigger('proyecto', p.id)}
        </div>`}
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
