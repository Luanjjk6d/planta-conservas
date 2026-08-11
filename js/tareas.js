// Actividades (tareas) de un proyecto de Gestión Conservas — internamente
// "tareas" para no confundirse con la tabla "actividades" del MES (proceso
// de producción, concepto distinto). Vive solo en gestion.html, embebidas
// en la ficha de cada proyecto (no hay listado propio independiente).
import { supabase } from './supabaseClient.js';
import { tareasDB } from './gestionState.js';
import { proyectosDB } from './state.js';
import { esc, fF, toast, localDateStr } from './utils.js';

const ESTADO_LABEL = {
  pendiente: 'Pendiente', en_curso: 'En curso', esperando_terceros: 'Esperando a terceros',
  bloqueada: 'Bloqueada', completada: 'Completada', cancelada: 'Cancelada',
};
const PRIORIDAD_LABEL = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' };

let editingTareaId = null;
let completingTareaId = null;

export function mapTarea(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    proyectoId: row.proyecto_id,
    responsable: row.responsable || '',
    dependeDe: row.depende_de || '',
    estado: row.estado,
    prioridad: row.prioridad,
    fechaInicio: row.fecha_inicio,
    fechaLimite: row.fecha_limite,
    fechaCierre: row.fecha_cierre,
    comentarioCierre: row.comentario_cierre || '',
    evidencia: row.evidencia || '',
    observaciones: row.observaciones || '',
    reunionOrigenId: row.reunion_origen_id,
    acuerdoOrigenId: row.acuerdo_origen_id,
    orden: row.orden || 0,
    color: row.color || null,
    updatedAt: row.updated_at,
  };
}

function diasAtraso(t) {
  if (!t.fechaLimite || t.estado === 'completada' || t.estado === 'cancelada') return 0;
  const dias = Math.round((new Date(localDateStr() + 'T00:00:00') - new Date(t.fechaLimite + 'T00:00:00')) / 86400000);
  return dias > 0 ? dias : 0;
}

export async function fetchTareas() {
  const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
  if (error) {
    toast('Error al cargar actividades: ' + error.message, true);
    return;
  }
  tareasDB.length = 0;
  tareasDB.push(...data.map(mapTarea));
}

function _rowMeta(t) {
  const atraso = diasAtraso(t);
  return { atraso };
}

let menuAbiertoTareaId = null;
export function toggleTareaMenu(id) {
  menuAbiertoTareaId = menuAbiertoTareaId === id ? null : id;
  renderTareasEnFicha();
}

// Lista compacta embebida en la ficha de un proyecto.
let fichaProyectoIdActual = null;
export function renderTareasEnFicha(proyectoId = fichaProyectoIdActual) {
  fichaProyectoIdActual = proyectoId;
  const el = document.getElementById('ficha-tareas-body');
  if (!el || proyectoId == null) return;
  const data = tareasDB.filter(t => t.proyectoId === proyectoId);
  if (!data.length) { el.innerHTML = '<div class="empty" style="padding:1.5rem">Sin actividades para este proyecto.</div>'; return; }
  el.innerHTML = `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Actividad</th><th>Responsable</th><th>Estado</th><th>Prioridad</th><th>Fecha límite</th><th></th></tr></thead>
    <tbody>${data.map(t => {
      const { atraso } = _rowMeta(t);
      return `<tr>
        <td><div class="tbl-main">${esc(t.nombre)}</div></td>
        <td>${esc(t.responsable) || '<span class="tbl-empty">—</span>'}</td>
        <td><span class="badge-estado ${t.estado}">${ESTADO_LABEL[t.estado]}</span></td>
        <td><span class="pbadge-prioridad ${t.prioridad}">${PRIORIDAD_LABEL[t.prioridad]}</span></td>
        <td>${t.fechaLimite ? fF(t.fechaLimite) + (atraso > 0 ? ` <span class="tbl-atraso">(${atraso}d)</span>` : '') : '<span class="tbl-empty">—</span>'}</td>
        <td class="tbl-actions">
          <div class="tarea-menu">
            <button class="proy-menu-btn" onclick="toggleTareaMenu(${t.id})">⋯</button>
            ${menuAbiertoTareaId === t.id ? _renderMenu(t) : ''}
          </div>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function _renderMenu(t) {
  return `<div class="proy-menu-dd tarea-menu-dd">
    <button onclick="openTareaModal(${t.id})">Editar</button>
    ${t.estado !== 'en_curso' && t.estado !== 'completada' ? `<button onclick="marcarTareaEnCurso(${t.id})">Marcar en curso</button>` : ''}
    ${t.estado !== 'completada' ? `<button onclick="abrirCompletarTarea(${t.id})">Marcar completada</button>` : ''}
    ${t.proyectoId ? `<button onclick="abrirProyectoDeTarea(${t.id})">Abrir proyecto</button>` : ''}
    <button class="tarea-menu-del" onclick="eliminarTarea(${t.id})">Eliminar</button>
  </div>`;
}

// ───────── Modal crear/editar ─────────
export function openTareaModal(id = null, proyectoPreset = null, responsablePreset = null) {
  editingTareaId = id;
  const t = id ? tareasDB.find(x => x.id === id) : null;
  document.getElementById('tarea-modal-title').textContent = id ? 'Editar actividad' : 'Nueva actividad';
  document.getElementById('ta-nombre').value = t?.nombre || '';
  document.getElementById('ta-descripcion').value = t?.descripcion || '';
  const selProy = document.getElementById('ta-proyecto');
  selProy.innerHTML = '<option value="">Sin proyecto</option>' + proyectosDB.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  selProy.value = t?.proyectoId || proyectoPreset || '';
  document.getElementById('ta-responsable').value = t?.responsable || responsablePreset || '';
  document.getElementById('ta-depende').value = t?.dependeDe || '';
  document.getElementById('ta-estado').value = t?.estado || 'pendiente';
  document.getElementById('ta-prioridad').value = t?.prioridad || 'media';
  document.getElementById('ta-fecha-inicio').value = t?.fechaInicio || '';
  document.getElementById('ta-fecha-limite').value = t?.fechaLimite || '';
  document.getElementById('ta-observaciones').value = t?.observaciones || '';
  document.getElementById('tarea-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('ta-nombre').focus(), 100);
  menuAbiertoTareaId = null;
}

export function closeTareaModal() {
  document.getElementById('tarea-modal-ov').classList.remove('open');
  editingTareaId = null;
}

export async function confirmTareaModal() {
  const nombre = document.getElementById('ta-nombre').value.trim();
  if (!nombre) { toast('Escribe un nombre para la actividad.'); return; }

  const record = {
    nombre,
    descripcion: document.getElementById('ta-descripcion').value.trim() || null,
    proyecto_id: document.getElementById('ta-proyecto').value || null,
    responsable: document.getElementById('ta-responsable').value.trim() || null,
    depende_de: document.getElementById('ta-depende').value.trim() || null,
    estado: document.getElementById('ta-estado').value,
    prioridad: document.getElementById('ta-prioridad').value,
    fecha_inicio: document.getElementById('ta-fecha-inicio').value || null,
    fecha_limite: document.getElementById('ta-fecha-limite').value || null,
    observaciones: document.getElementById('ta-observaciones').value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (editingTareaId) {
    const { data, error } = await supabase.from('tareas').update(record).eq('id', editingTareaId).select().single();
    if (error) { toast('Error al actualizar: ' + error.message, true); return; }
    const idx = tareasDB.findIndex(t => t.id === editingTareaId);
    if (idx !== -1) tareasDB[idx] = mapTarea(data);
    toast('Actividad actualizada');
  } else {
    const { data, error } = await supabase.from('tareas').insert(record).select().single();
    if (error) { toast('Error al guardar: ' + error.message, true); return; }
    tareasDB.unshift(mapTarea(data));
    toast('Actividad creada');
  }
  closeTareaModal();
  renderTareasEnFicha();
}

// Check rápido para la vista Pendientes — marca/desmarca completada sin
// pedir comentario ni evidencia (eso sigue disponible vía "Editar" si se
// necesita). Reutiliza el mismo estado que ya usa toda la app.
export async function togglePendienteCompletada(id) {
  const t = tareasDB.find(x => x.id === id);
  if (!t) return;
  const nuevoEstado = t.estado === 'completada' ? 'pendiente' : 'completada';
  const record = {
    estado: nuevoEstado,
    fecha_cierre: nuevoEstado === 'completada' ? localDateStr() : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('tareas').update(record).eq('id', id).select().single();
  if (error) { toast('Error: ' + error.message, true); return; }
  const idx = tareasDB.findIndex(x => x.id === id);
  if (idx !== -1) tareasDB[idx] = mapTarea(data);
  renderTareasEnFicha();
  window.renderPendientes();
}

// ───────── Acciones rápidas ─────────
export async function marcarTareaEnCurso(id) {
  menuAbiertoTareaId = null;
  const { data, error } = await supabase.from('tareas').update({ estado: 'en_curso', updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { toast('Error: ' + error.message, true); return; }
  const idx = tareasDB.findIndex(t => t.id === id);
  if (idx !== -1) tareasDB[idx] = mapTarea(data);
  renderTareasEnFicha();
  toast('Actividad en curso');
}

export function abrirCompletarTarea(id) {
  menuAbiertoTareaId = null;
  completingTareaId = id;
  document.getElementById('tc-comentario').value = '';
  document.getElementById('tc-fecha').value = localDateStr();
  document.getElementById('tc-evidencia').value = '';
  document.getElementById('tarea-completar-modal-ov').classList.add('open');
}

export function closeCompletarTareaModal() {
  document.getElementById('tarea-completar-modal-ov').classList.remove('open');
  completingTareaId = null;
}

export async function confirmCompletarTarea() {
  if (!completingTareaId) return;
  const record = {
    estado: 'completada',
    fecha_cierre: document.getElementById('tc-fecha').value || localDateStr(),
    comentario_cierre: document.getElementById('tc-comentario').value.trim() || null,
    evidencia: document.getElementById('tc-evidencia').value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('tareas').update(record).eq('id', completingTareaId).select().single();
  if (error) { toast('Error: ' + error.message, true); return; }
  const idx = tareasDB.findIndex(t => t.id === completingTareaId);
  if (idx !== -1) tareasDB[idx] = mapTarea(data);
  closeCompletarTareaModal();
  renderTareasEnFicha();
  toast('Actividad completada');
}

export function abrirProyectoDeTarea(id) {
  const t = tareasDB.find(x => x.id === id);
  if (!t?.proyectoId) return;
  menuAbiertoTareaId = null;
  window.abrirFichaProyecto(t.proyectoId);
}

let deletingTareaId = null;
export function eliminarTarea(id) {
  menuAbiertoTareaId = null;
  const t = tareasDB.find(x => x.id === id);
  if (!t) return;
  deletingTareaId = id;
  document.getElementById('tarea-confirm-delete-nombre').textContent = t.nombre;
  document.getElementById('tarea-confirm-delete-modal-ov').classList.add('open');
}

export function closeTareaConfirmDeleteModal() {
  document.getElementById('tarea-confirm-delete-modal-ov').classList.remove('open');
  deletingTareaId = null;
}

export async function confirmarEliminarTarea() {
  if (!deletingTareaId) return;
  const { error } = await supabase.from('tareas').delete().eq('id', deletingTareaId);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }
  const idx = tareasDB.findIndex(t => t.id === deletingTareaId);
  if (idx !== -1) tareasDB.splice(idx, 1);
  closeTareaConfirmDeleteModal();
  renderTareasEnFicha();
  toast('Actividad eliminada');
}

export function contarTareasDeProyecto(proyectoId) {
  return tareasDB.filter(t => t.proyectoId === proyectoId).length;
}
