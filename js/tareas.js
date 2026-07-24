// Módulo "Actividades" de Gestión Conservas — internamente "tareas" para
// no confundirse con la tabla "actividades" del MES (proceso de
// producción, concepto distinto). Vive solo en gestion.html.
import { supabase } from './supabaseClient.js';
import { tareasDB } from './gestionState.js';
import { proyectosDB } from './state.js';
import { esc, fF, toast, localDateStr } from './utils.js';

const ESTADO_LABEL = {
  pendiente: 'Pendiente', en_curso: 'En curso', esperando_terceros: 'Esperando a terceros',
  bloqueada: 'Bloqueada', completada: 'Completada', cancelada: 'Cancelada',
};
const PRIORIDAD_LABEL = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' };
const KANBAN_ESTADOS = ['pendiente', 'en_curso', 'esperando_terceros', 'bloqueada', 'completada'];

let vista = 'lista'; // lista | kanban | mias
let filtros = { proyecto: 'todos', responsable: 'todos', estado: 'todos', prioridad: 'todos' };
let editingTareaId = null;
let completingTareaId = null;
let miNombre = localStorage.getItem('gestion_mi_nombre') || '';

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
    updatedAt: row.updated_at,
  };
}

function nombreProyecto(proyectoId) {
  return proyectosDB.find(p => p.id === proyectoId)?.nombre || '';
}

function diasAtraso(t) {
  if (!t.fechaLimite || t.estado === 'completada' || t.estado === 'cancelada') return 0;
  const dias = Math.round((new Date(localDateStr() + 'T00:00:00') - new Date(t.fechaLimite + 'T00:00:00')) / 86400000);
  return dias > 0 ? dias : 0;
}

export async function fetchTareas() {
  const el = document.getElementById('tareas-body');
  if (el) el.innerHTML = '<div class="empty" style="padding:2.5rem">Cargando...</div>';
  const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
  if (error) {
    toast('Error al cargar actividades: ' + error.message, true);
    if (el) el.innerHTML = '<div class="empty" style="padding:2.5rem">No se pudo cargar. Revisa la conexión.</div>';
    return;
  }
  tareasDB.length = 0;
  tareasDB.push(...data.map(mapTarea));
  _poblarFiltros();
  renderTareas();
}

function _poblarFiltros() {
  const selProy = document.getElementById('tf-proyecto');
  if (selProy) {
    const actual = selProy.value;
    selProy.innerHTML = '<option value="todos">Todos los proyectos</option>' +
      proyectosDB.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
    selProy.value = actual || 'todos';
  }
  const selResp = document.getElementById('tf-responsable');
  if (selResp) {
    const actual = selResp.value;
    const responsables = [...new Set(tareasDB.map(t => t.responsable).filter(Boolean))].sort();
    selResp.innerHTML = '<option value="todos">Todos los responsables</option>' +
      responsables.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
    selResp.value = actual || 'todos';
  }
}

export function aplicarFiltrosTareas() {
  filtros = {
    proyecto: document.getElementById('tf-proyecto')?.value || 'todos',
    responsable: document.getElementById('tf-responsable')?.value || 'todos',
    estado: document.getElementById('tf-estado')?.value || 'todos',
    prioridad: document.getElementById('tf-prioridad')?.value || 'todos',
  };
  renderTareas();
}

// Filtra una actividad de un proyecto específico — se usa desde la
// tarjeta de Proyectos ("N tareas") para llegar directo a esa lista.
export function verTareasDeProyecto(proyectoId) {
  const selProy = document.getElementById('tf-proyecto');
  if (selProy) selProy.value = String(proyectoId);
  aplicarFiltrosTareas();
}

export function cambiarVistaTareas(v) {
  vista = v;
  document.querySelectorAll('.tv-btn').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  if (v === 'mias' && !miNombre) {
    const nombre = prompt('¿Cuál es tu nombre? Se usa para filtrar "Mis actividades" (se guarda solo en este navegador).');
    if (nombre) { miNombre = nombre.trim(); localStorage.setItem('gestion_mi_nombre', miNombre); }
  }
  renderTareas();
}

function _tareasFiltradas() {
  let data = [...tareasDB];
  if (vista === 'mias') {
    data = data.filter(t => miNombre && t.responsable.toLowerCase() === miNombre.toLowerCase());
  } else {
    if (filtros.proyecto !== 'todos') data = data.filter(t => String(t.proyectoId) === filtros.proyecto);
    if (filtros.responsable !== 'todos') data = data.filter(t => t.responsable === filtros.responsable);
    if (filtros.estado !== 'todos') data = data.filter(t => t.estado === filtros.estado);
    if (filtros.prioridad !== 'todos') data = data.filter(t => t.prioridad === filtros.prioridad);
  }
  return data;
}

export function renderTareas() {
  const el = document.getElementById('tareas-body');
  if (!el) return;
  const data = _tareasFiltradas();
  if (vista === 'kanban') { el.innerHTML = _renderKanban(data); return; }
  el.innerHTML = _renderLista(data, vista === 'mias');
}

function _rowMeta(t) {
  const atraso = diasAtraso(t);
  return { atraso };
}

function _renderLista(data, esMias) {
  if (!data.length) {
    return `<div class="empty" style="padding:2.5rem">${esMias ? 'No tienes actividades asignadas.' : 'Sin actividades con estos filtros.'}</div>`;
  }
  const rows = data.map(t => {
    const { atraso } = _rowMeta(t);
    return `<tr>
      <td><div class="tbl-main">${esc(t.nombre)}</div>${t.dependeDe ? `<div class="tbl-sub">Depende de: ${esc(t.dependeDe)}</div>` : ''}</td>
      <td>${t.proyectoId ? esc(nombreProyecto(t.proyectoId)) : '<span class="tbl-empty">—</span>'}</td>
      <td>${esc(t.responsable) || '<span class="tbl-empty">—</span>'}</td>
      <td><span class="badge-estado ${t.estado}">${ESTADO_LABEL[t.estado]}</span></td>
      <td><span class="pbadge-prioridad ${t.prioridad}">${PRIORIDAD_LABEL[t.prioridad]}</span></td>
      <td>${t.fechaLimite ? fF(t.fechaLimite) : '<span class="tbl-empty">—</span>'}</td>
      <td>${atraso > 0 ? `<span class="tbl-atraso">${atraso} día${atraso !== 1 ? 's' : ''}</span>` : '<span class="tbl-empty">—</span>'}</td>
      <td class="tbl-actions">
        <div class="tarea-menu">
          <button class="proy-menu-btn" onclick="toggleTareaMenu(${t.id})">⋯</button>
          ${menuAbiertoTareaId === t.id ? _renderMenu(t) : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Actividad</th><th>Proyecto</th><th>Responsable</th><th>Estado</th><th>Prioridad</th><th>Fecha límite</th><th>Atraso</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

let menuAbiertoTareaId = null;
export function toggleTareaMenu(id) {
  menuAbiertoTareaId = menuAbiertoTareaId === id ? null : id;
  renderTareas();
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

function _renderKanban(data) {
  const cols = KANBAN_ESTADOS.map(estado => {
    const items = data.filter(t => t.estado === estado);
    return `<div class="kanban-col">
      <div class="kanban-col-hdr"><span>${ESTADO_LABEL[estado]}</span><span class="kanban-count">${items.length}</span></div>
      <div class="kanban-col-body">
        ${items.length ? items.map(t => {
          const { atraso } = _rowMeta(t);
          return `<div class="kanban-card" onclick="openTareaModal(${t.id})">
            <div class="kanban-card-top"><span class="pbadge-prioridad ${t.prioridad}">${PRIORIDAD_LABEL[t.prioridad]}</span>${atraso > 0 ? `<span class="tbl-atraso">${atraso}d atraso</span>` : ''}</div>
            <div class="kanban-card-title">${esc(t.nombre)}</div>
            ${t.proyectoId ? `<div class="kanban-card-proy">${esc(nombreProyecto(t.proyectoId))}</div>` : ''}
            <div class="kanban-card-bottom"><span>${esc(t.responsable) || '—'}</span><span>${t.fechaLimite ? fF(t.fechaLimite) : '—'}</span></div>
          </div>`;
        }).join('') : '<div class="kanban-empty">Sin actividades</div>'}
      </div>
    </div>`;
  }).join('');
  return `<div class="kanban-board">${cols}</div>`;
}

// ───────── Modal crear/editar ─────────
export function openTareaModal(id = null) {
  editingTareaId = id;
  const t = id ? tareasDB.find(x => x.id === id) : null;
  document.getElementById('tarea-modal-title').textContent = id ? 'Editar actividad' : 'Nueva actividad';
  document.getElementById('ta-nombre').value = t?.nombre || '';
  document.getElementById('ta-descripcion').value = t?.descripcion || '';
  const selProy = document.getElementById('ta-proyecto');
  selProy.innerHTML = '<option value="">Sin proyecto</option>' + proyectosDB.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  selProy.value = t?.proyectoId || '';
  document.getElementById('ta-responsable').value = t?.responsable || '';
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
  _poblarFiltros();
  renderTareas();
}

// ───────── Acciones rápidas ─────────
export async function marcarTareaEnCurso(id) {
  menuAbiertoTareaId = null;
  const { data, error } = await supabase.from('tareas').update({ estado: 'en_curso', updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { toast('Error: ' + error.message, true); return; }
  const idx = tareasDB.findIndex(t => t.id === id);
  if (idx !== -1) tareasDB[idx] = mapTarea(data);
  renderTareas();
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
  renderTareas();
  toast('Actividad completada');
}

export function abrirProyectoDeTarea(id) {
  const t = tareasDB.find(x => x.id === id);
  if (!t?.proyectoId) return;
  menuAbiertoTareaId = null;
  const b = Array.from(document.querySelectorAll('.nb')).find(x => x.textContent.includes('Proyectos'));
  window.showPage('proy', b);
  window.fetchProyectos().then(() => window.editProyecto(t.proyectoId));
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
  renderTareas();
  toast('Actividad eliminada');
}

// Contador para la tarjeta de Proyectos (Etapa 2: conectar con Proyectos)
export function contarTareasDeProyecto(proyectoId) {
  return tareasDB.filter(t => t.proyectoId === proyectoId).length;
}

// Se llama desde la tarjeta de Proyectos ("N tareas") para saltar directo
// a Actividades ya filtrado por ese proyecto.
export function irATareasDeProyecto(proyectoId) {
  const b = Array.from(document.querySelectorAll('.nb')).find(x => x.textContent.includes('Actividades'));
  window.showPage('actividades', b);
  fetchTareas().then(() => verTareasDeProyecto(proyectoId));
}
