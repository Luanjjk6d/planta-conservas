import { supabase } from './supabaseClient.js';
import { proyectosDB } from './state.js';
import { esc, fF, toast, localDateStr } from './utils.js';
import { contarTareasDeProyecto } from './tareas.js';
import { contarReunionesDeProyecto } from './reuniones.js';
import { refrescarFicha } from './proyectoDetalle.js';

const ESTADO_LABEL = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', completado: 'Completado' };
const ESTADO_COLOR = { planificado: '#8FA3BE', en_curso: '#378ADD', pausado: '#E65100', completado: '#16a34a' };
const ESTADO_RANK = { planificado: 0, en_curso: 0, pausado: 0, completado: 1 };
const PRIORIDAD_LABEL = { baja: 'Baja', media: 'Media', alta: 'Alta' };

let filtroEstado = 'todos';
let editingProyId = null;
let deletingProy = null; // { id, nombre } — pendiente de confirmar
let menuAbiertoId = null;

export function mapProyecto(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria || '',
    cliente: row.cliente || '',
    responsable: row.responsable || '',
    estado: row.estado,
    prioridad: row.prioridad || 'media',
    avance: row.avance,
    fechaInicio: row.fecha_inicio,
    fechaMeta: row.fecha_meta,
    fechaCierre: row.fecha_cierre,
    ultimoAvance: row.ultimo_avance || '',
    proximoPaso: row.proximo_paso || '',
    bloqueoPrincipal: row.bloqueo_principal || '',
    nota: row.nota || '',
    updatedAt: row.updated_at,
  };
}

export async function fetchProyectos() {
  const el = document.getElementById('list-proy');
  if (el) el.innerHTML = '<div class="empty" style="padding:2.5rem">Cargando...</div>';
  const { data, error } = await supabase.from('proyectos').select('*').order('created_at', { ascending: false });
  if (error) {
    toast('Error al cargar proyectos: ' + error.message, true);
    if (el) el.innerHTML = '<div class="empty" style="padding:2.5rem">No se pudo cargar. Revisa la conexión.</div>';
    return;
  }
  proyectosDB.length = 0;
  proyectosDB.push(...data.map(mapProyecto));
  renderProyectos();
}

export function setProyectoFiltro(estado) {
  filtroEstado = estado;
  renderProyectos();
}

export function toggleProyMenu(id) {
  menuAbiertoId = menuAbiertoId === id ? null : id;
  renderProyectos();
}

export function renderProyectos() {
  document.querySelectorAll('.proy-filter').forEach(b => b.classList.toggle('active', b.dataset.estado === filtroEstado));
  const el = document.getElementById('list-proy');
  if (!el) return;

  let data = filtroEstado === 'todos' ? [...proyectosDB] : proyectosDB.filter(p => p.estado === filtroEstado);
  data.sort((a, b) => ESTADO_RANK[a.estado] - ESTADO_RANK[b.estado]);

  if (!data.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem">Sin proyectos${filtroEstado !== 'todos' ? ' en este estado' : ''}.</div>`;
    return;
  }

  el.innerHTML = data.map(p => {
    const metaLinea = [p.cliente, p.responsable, p.categoria].filter(Boolean).join(' · ');
    return `<div class="proy-row ${p.estado}">
      <div class="proy-row-top">
        <span class="pbadge ${p.estado}">${ESTADO_LABEL[p.estado]}</span>
        <span class="pbadge-prioridad ${p.prioridad}">${PRIORIDAD_LABEL[p.prioridad] || 'Media'}</span>
        <div class="proy-name proy-name-link" onclick="abrirFichaProyecto(${p.id})">${esc(p.nombre)}</div>
        <div class="proy-menu">
          <button class="proy-menu-btn" onclick="toggleProyMenu(${p.id})" title="Más acciones">⋯</button>
          ${menuAbiertoId === p.id ? `<div class="proy-menu-dd"><button onclick="abrirConfirmEliminarProyecto(${p.id})">Eliminar</button></div>` : ''}
        </div>
      </div>
      ${metaLinea ? `<div class="proy-meta">${esc(metaLinea)}</div>` : ''}
      <div class="proy-detail">
        ${p.ultimoAvance ? `<div><span class="proy-detail-l">Último avance:</span> ${esc(p.ultimoAvance)}</div>` : ''}
        ${p.proximoPaso ? `<div><span class="proy-detail-l">Próximo paso:</span> ${esc(p.proximoPaso)}</div>` : ''}
        ${p.bloqueoPrincipal ? `<div class="proy-bloqueo"><span class="proy-detail-l">Bloqueo:</span> ${esc(p.bloqueoPrincipal)}</div>` : ''}
        ${!p.ultimoAvance && !p.proximoPaso && !p.bloqueoPrincipal && p.nota ? `<div><span class="proy-detail-l">Nota:</span> ${esc(p.nota)}</div>` : ''}
      </div>
      <div class="proy-row-bottom">
        <div class="proy-bar-wrap">
          <div class="proy-bar-bg"><div class="proy-bar-fill" style="width:${p.avance}%;background:${ESTADO_COLOR[p.estado]}"></div></div>
        </div>
        <div class="proy-pct">${p.avance}%</div>
        <div class="proy-row-fecha">${p.fechaMeta ? 'Meta: ' + fF(p.fechaMeta) : 'Sin fecha meta'}</div>
        <div class="proy-actions">
          <a href="#" onclick="abrirFichaProyecto(${p.id});return false;">${contarTareasDeProyecto(p.id)} tarea${contarTareasDeProyecto(p.id) !== 1 ? 's' : ''} · ${contarReunionesDeProyecto(p.id)} reunión${contarReunionesDeProyecto(p.id) !== 1 ? 'es' : ''}</a>
          <a href="#" onclick="editProyecto(${p.id});return false;">Editar</a>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function openProyectoModal(id = null) {
  editingProyId = id;
  const p = id ? proyectosDB.find(x => x.id === id) : null;
  document.getElementById('proy-modal-title').textContent = id ? 'Editar proyecto' : 'Nuevo proyecto';
  document.getElementById('proy-nombre').value = p?.nombre || '';
  document.getElementById('proy-categoria').value = p?.categoria || '';
  document.getElementById('proy-cliente').value = p?.cliente || '';
  document.getElementById('proy-responsable').value = p?.responsable || '';
  document.getElementById('proy-estado').value = p?.estado || 'planificado';
  document.getElementById('proy-prioridad').value = p?.prioridad || 'media';
  document.getElementById('proy-avance').value = p ? p.avance : 0;
  document.getElementById('proy-fecha-inicio').value = p?.fechaInicio || '';
  document.getElementById('proy-fecha-meta').value = p?.fechaMeta || '';
  document.getElementById('proy-ultimo-avance').value = p?.ultimoAvance || '';
  document.getElementById('proy-proximo-paso').value = p?.proximoPaso || '';
  document.getElementById('proy-bloqueo').value = p?.bloqueoPrincipal || '';
  document.getElementById('proy-nota').value = p?.nota || '';
  document.getElementById('proyecto-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('proy-nombre').focus(), 100);
}

export function closeProyectoModal() {
  document.getElementById('proyecto-modal-ov').classList.remove('open');
  editingProyId = null;
}

export function editProyecto(id) { openProyectoModal(id); }

export async function confirmProyectoModal() {
  const nombre = document.getElementById('proy-nombre').value.trim();
  if (!nombre) { toast('Escribe un nombre de proyecto.'); return; }
  const estado = document.getElementById('proy-estado').value;
  const prev = editingProyId ? proyectosDB.find(p => p.id === editingProyId) : null;

  const record = {
    nombre,
    categoria: document.getElementById('proy-categoria').value.trim() || null,
    cliente: document.getElementById('proy-cliente').value.trim() || null,
    responsable: document.getElementById('proy-responsable').value.trim() || null,
    estado,
    prioridad: document.getElementById('proy-prioridad').value,
    avance: Math.min(100, Math.max(0, parseInt(document.getElementById('proy-avance').value) || 0)),
    fecha_inicio: document.getElementById('proy-fecha-inicio').value || null,
    fecha_meta: document.getElementById('proy-fecha-meta').value || null,
    ultimo_avance: document.getElementById('proy-ultimo-avance').value.trim() || null,
    proximo_paso: document.getElementById('proy-proximo-paso').value.trim() || null,
    bloqueo_principal: document.getElementById('proy-bloqueo').value.trim() || null,
    nota: document.getElementById('proy-nota').value.trim() || null,
    fecha_cierre: estado === 'completado' ? (prev?.fechaCierre || localDateStr()) : null,
    updated_at: new Date().toISOString(),
  };

  if (editingProyId) {
    const { data, error } = await supabase.from('proyectos').update(record).eq('id', editingProyId).select().single();
    if (error) { toast('Error al actualizar: ' + error.message, true); return; }
    const idx = proyectosDB.findIndex(p => p.id === editingProyId);
    if (idx !== -1) proyectosDB[idx] = mapProyecto(data);
    toast('Proyecto actualizado');
  } else {
    const { data, error } = await supabase.from('proyectos').insert(record).select().single();
    if (error) { toast('Error al guardar: ' + error.message, true); return; }
    proyectosDB.unshift(mapProyecto(data));
    toast('Proyecto creado');
  }
  closeProyectoModal();
  renderProyectos();
  refrescarFicha();
}

// Eliminar — requiere confirmación explícita en un modal propio (no
// window.confirm) que muestra el nombre del proyecto, para evitar borrados
// accidentales con un solo clic.
export function abrirConfirmEliminarProyecto(id) {
  menuAbiertoId = null;
  const p = proyectosDB.find(x => x.id === id);
  if (!p) return;
  deletingProy = { id: p.id, nombre: p.nombre };
  document.getElementById('confirm-delete-nombre').textContent = p.nombre;
  document.getElementById('confirm-delete-modal-ov').classList.add('open');
}

export function closeConfirmDeleteModal() {
  document.getElementById('confirm-delete-modal-ov').classList.remove('open');
  deletingProy = null;
}

export async function confirmarEliminarProyectoModal() {
  if (!deletingProy) return;
  const { id } = deletingProy;
  const { error } = await supabase.from('proyectos').delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }
  const idx = proyectosDB.findIndex(p => p.id === id);
  if (idx !== -1) proyectosDB.splice(idx, 1);
  closeConfirmDeleteModal();
  renderProyectos();
  toast('Proyecto eliminado');
}
