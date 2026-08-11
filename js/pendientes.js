// Vista "Pendientes" — agrupa TODAS las tareas (tengan proyecto o no) por
// responsable, para ver de un vistazo qué le toca a cada quien sin entrar
// proyecto por proyecto. No agrega tabla nueva: reutiliza "tareas", solo
// que aquí también se pueden crear sin ligarlas a un proyecto ("General").
import { supabase } from './supabaseClient.js';
import { proyectosDB } from './state.js';
import { tareasDB } from './gestionState.js';
import { esc, fF, toast } from './utils.js';
import { fetchProyectos } from './proyectos.js';
import { fetchTareas } from './tareas.js';

const ESTADO_LABEL = {
  pendiente: 'Pendiente', en_curso: 'En curso', esperando_terceros: 'Esperando a terceros',
  bloqueada: 'Bloqueada', completada: 'Completada', cancelada: 'Cancelada',
};
const ESTADO_RANK = { pendiente: 0, en_curso: 0, esperando_terceros: 0, bloqueada: 0, completada: 1, cancelada: 1 };
const COLORES = ['blue', 'green', 'orange', 'red', 'purple', 'gray'];

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

function _ordenarItems(items) {
  return [...items].sort((a, b) => ESTADO_RANK[a.estado] - ESTADO_RANK[b.estado] || (a.orden - b.orden));
}

function _itemsDePersona(clave) {
  if (clave === '__sin_responsable__') return tareasDB.filter(t => !_personasDe(t.responsable).length);
  return tareasDB.filter(t => _personasDe(t.responsable).some(p => p.toLowerCase() === clave));
}

// ───────── Arrastrar y soltar para reordenar ─────────
// El orden se guarda en la propia tarea (columna "orden"), así que si un
// pendiente es compartido, reordenarlo en la lista de una persona también
// cambia su posición en la lista de la otra — igual que ya pasa con la
// prioridad, que es del pendiente, no de la persona.
let draggedTareaId = null;
export function pendDragStart(id) {
  draggedTareaId = id;
}
export async function pendDrop(event, targetId) {
  event.preventDefault();
  const clave = event.currentTarget.dataset.clave;
  if (draggedTareaId == null || draggedTareaId === targetId) return;
  const items = _ordenarItems(_itemsDePersona(clave));
  const fromIdx = items.findIndex(t => t.id === draggedTareaId);
  const toIdx = items.findIndex(t => t.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return;
  const [movido] = items.splice(fromIdx, 1);
  items.splice(toIdx, 0, movido);
  draggedTareaId = null;

  await Promise.all(items.map(async (t, i) => {
    const nuevoOrden = (i + 1) * 10;
    if (t.orden === nuevoOrden) return;
    const { error } = await supabase.from('tareas').update({ orden: nuevoOrden }).eq('id', t.id);
    if (error) { toast('Error al reordenar: ' + error.message, true); return; }
    t.orden = nuevoOrden;
  }));
  renderPendientes();
}

// ───────── Color de prioridad ─────────
let eligiendoColorId = null;
export function estaEligiendoColorPendiente(id) {
  return eligiendoColorId === id;
}
export function iniciarElegirColorPendiente(id) {
  eligiendoColorId = id;
  renderPendientes();
}
export function cancelarElegirColorPendiente() {
  eligiendoColorId = null;
  renderPendientes();
}
export async function elegirColorPendiente(id, color) {
  const { error } = await supabase.from('tareas').update({ color }).eq('id', id);
  if (error) { toast('Error: ' + error.message, true); return; }
  const t = tareasDB.find(x => x.id === id);
  if (t) t.color = color;
  eligiendoColorId = null;
  renderPendientes();
}

function _renderColorSwatch(t) {
  const eligiendo = estaEligiendoColorPendiente(t.id);
  const dot = `<button class="mapa-color-dot ${t.color ? 'mapa-color-' + t.color : 'mapa-color-vacio'}"
    onclick="event.stopPropagation();${eligiendo ? 'cancelarElegirColorPendiente()' : `iniciarElegirColorPendiente(${t.id})`}" title="Color de prioridad"></button>`;
  if (!eligiendo) return dot;
  const opciones = COLORES.map(c => `<button class="mapa-color-op mapa-color-${c}" onclick="event.stopPropagation();elegirColorPendiente(${t.id},'${c}')" title="${c}"></button>`).join('');
  return `${dot}<span class="mapa-color-picker">${opciones}<button class="mapa-color-op mapa-color-vacio" onclick="event.stopPropagation();elegirColorPendiente(${t.id},null)" title="Sin color"></button></span>`;
}

export function agregarPendienteParaPersona(btn) {
  window.openTareaModal(null, null, btn.dataset.persona);
}

// "Limpiar completadas" — borra de una sola vez todos los pendientes ya
// hechos de una persona (si alguno es compartido, desaparece también de
// la tarjeta de la otra persona, igual que cualquier otro borrado).
let confirmandoLimpiarClave = null;
export function pedirLimpiarCompletadasBtn(btn) {
  confirmandoLimpiarClave = btn.dataset.clave;
  renderPendientes();
}
export function cancelarLimpiarCompletadas() {
  confirmandoLimpiarClave = null;
  renderPendientes();
}
export async function confirmarLimpiarCompletadas() {
  if (!confirmandoLimpiarClave) return;
  const completadas = _itemsDePersona(confirmandoLimpiarClave).filter(t => t.estado === 'completada');
  await Promise.all(completadas.map(async t => {
    const { error } = await supabase.from('tareas').delete().eq('id', t.id);
    if (error) { toast('Error al eliminar "' + t.nombre + '": ' + error.message, true); return; }
    const idx = tareasDB.findIndex(x => x.id === t.id);
    if (idx !== -1) tareasDB.splice(idx, 1);
  }));
  confirmandoLimpiarClave = null;
  toast(completadas.length + ' pendiente' + (completadas.length !== 1 ? 's' : '') + ' eliminada' + (completadas.length !== 1 ? 's' : ''));
  renderPendientes();
}

// Renombrar una persona corrige su nombre en TODAS sus tareas de una vez
// (incluidas las que comparte con alguien más), sin tocar a los demás
// responsables de esas tareas.
let editandoPersona = null; // { clave, label }
export function estaEditandoPersona(clave) {
  return editandoPersona?.clave === clave;
}
export function iniciarEditarPersonaBtn(btn) {
  editandoPersona = { clave: btn.dataset.clave, label: btn.dataset.label };
  renderPendientes();
  setTimeout(() => {
    const el = document.getElementById('pend-persona-input');
    if (!el) return;
    el.value = editandoPersona.label;
    el.focus();
    el.select();
  }, 50);
}
export function cancelarEditarPersona() {
  editandoPersona = null;
  renderPendientes();
}
export async function confirmarEditarPersona(nuevoNombre) {
  if (!editandoPersona) return;
  const { clave } = editandoPersona;
  const limpio = (nuevoNombre || '').trim();
  if (!limpio) { cancelarEditarPersona(); return; }

  const afectadas = tareasDB.filter(t => _personasDe(t.responsable).some(p => p.toLowerCase() === clave));
  for (const t of afectadas) {
    const nuevoResponsable = _personasDe(t.responsable).map(p => p.toLowerCase() === clave ? limpio : p).join(', ');
    const { error } = await supabase.from('tareas').update({ responsable: nuevoResponsable, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast('Error al renombrar "' + t.nombre + '": ' + error.message, true); continue; }
    t.responsable = nuevoResponsable;
  }
  editandoPersona = null;
  toast('Nombre actualizado en ' + afectadas.length + ' pendiente' + (afectadas.length !== 1 ? 's' : ''));
  renderPendientes();
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
    const items = _ordenarItems(itemsSinOrdenar);
    const esSinResponsable = clave === '__sin_responsable__';
    const editandoNombre = estaEditandoPersona(clave);
    const completadasCount = items.filter(t => t.estado === 'completada').length;
    return `
      <div class="pend-persona-card">
        <div class="pend-persona-hdr">
          ${editandoNombre
        ? `<input id="pend-persona-input" class="mapa-inline-input" style="width:140px" onkeydown="if(event.key==='Enter')confirmarEditarPersona(this.value);if(event.key==='Escape')cancelarEditarPersona();">`
        : `${esc(label)}${esSinResponsable ? '' : `<button class="pend-persona-edit" data-clave="${esc(clave)}" data-label="${esc(label)}" onclick="iniciarEditarPersonaBtn(this)" title="Editar nombre">✎</button>`}`}
          <span class="pend-persona-count">${items.length}</span>
          ${completadasCount > 0
        ? (confirmandoLimpiarClave === clave
          ? `<span class="mapa-nodo-confirm">¿Eliminar ${completadasCount} hecha${completadasCount !== 1 ? 's' : ''}? <button onclick="confirmarLimpiarCompletadas()">Sí</button><button onclick="cancelarLimpiarCompletadas()">No</button></span>`
          : `<button class="pend-clear-btn" data-clave="${esc(clave)}" onclick="pedirLimpiarCompletadasBtn(this)" title="Eliminar las ${completadasCount} completadas">🗑 ${completadasCount}</button>`)
        : ''}
          ${esSinResponsable ? '' : `<button class="pend-persona-add" data-persona="${esc(label)}" onclick="agregarPendienteParaPersona(this)" title="Agregar pendiente para ${esc(label)}">+</button>`}
        </div>
        <div class="pend-persona-list">
          ${items.map(t => {
      const checked = t.estado === 'completada';
      const compartidoCon = _personasDe(t.responsable).filter(p => p.toLowerCase() !== clave);
      return `
            <div class="pend-item ${checked ? 'completada' : ''} ${t.color ? 'color-' + t.color : ''}"
              draggable="true" data-clave="${esc(clave)}"
              ondragstart="pendDragStart(${t.id});this.classList.add('dragging')"
              ondragend="this.classList.remove('dragging')"
              ondragover="event.preventDefault()"
              ondrop="pendDrop(event,${t.id})">
              <button class="pend-check ${checked ? 'checked' : ''}" onclick="event.stopPropagation();togglePendienteCompletada(${t.id})" title="${checked ? 'Marcar como pendiente' : 'Marcar como hecho'}">✓</button>
              ${_renderColorSwatch(t)}
              <span class="badge-estado ${t.estado}">${ESTADO_LABEL[t.estado]}</span>
              <span class="pend-item-texto" onclick="openTareaModal(${t.id})">${esc(t.nombre)}</span>
              ${compartidoCon.length ? `<span class="pend-item-compartida">Con: ${esc(compartidoCon.join(', '))}</span>` : ''}
              <span class="pend-item-proy">${t.proyectoId ? esc(_nombreProyecto(t.proyectoId)) : 'General'}</span>
              ${t.fechaLimite ? `<span class="pend-item-fecha">${fF(t.fechaLimite)}</span>` : ''}
              <button class="pend-item-edit" onclick="openTareaModal(${t.id})" title="Editar">✎</button>
              <button class="pend-item-del" onclick="eliminarTarea(${t.id})" title="Eliminar">🗑</button>
            </div>`;
    }).join('')}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${toolbar}<div class="pend-grid">${grupos}</div>`;
}
