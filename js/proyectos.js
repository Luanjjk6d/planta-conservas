import { supabase } from './supabaseClient.js';
import { proyectosDB } from './state.js';
import { esc, fF, toast, localDateStr } from './utils.js';

const ESTADO_LABEL = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', completado: 'Completado' };
const ESTADO_COLOR = { planificado: '#8FA3BE', en_curso: '#378ADD', pausado: '#E65100', completado: '#16a34a' };
const ESTADO_RANK = { planificado: 0, en_curso: 0, pausado: 0, completado: 1 };

let filtroEstado = 'todos';
let editingProyId = null;

export function mapProyecto(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    responsable: row.responsable || '',
    estado: row.estado,
    avance: row.avance,
    fechaMeta: row.fecha_meta,
    fechaCierre: row.fecha_cierre,
    nota: row.nota || '',
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
    let meta;
    if (p.estado === 'completado') meta = 'Cerrado ' + fF(p.fechaCierre);
    else if (p.nota) meta = esc(p.nota);
    else if (p.fechaMeta) meta = 'Meta: ' + fF(p.fechaMeta);
    else meta = 'Sin fecha meta';

    return `<div class="proy-row ${p.estado}">
      <span class="pbadge ${p.estado}">${ESTADO_LABEL[p.estado]}</span>
      <div class="proy-main">
        <div class="proy-name">${esc(p.nombre)}</div>
        <div class="proy-meta">${p.responsable ? esc(p.responsable) + ' · ' : ''}${meta}</div>
      </div>
      <div class="proy-bar-wrap">
        <div class="proy-bar-bg"><div class="proy-bar-fill" style="width:${p.avance}%;background:${ESTADO_COLOR[p.estado]}"></div></div>
      </div>
      <div class="proy-pct">${p.avance}%</div>
      <div class="proy-actions">
        <a href="#" onclick="editProyecto(${p.id});return false;" style="font-size:12px;color:var(--b600);font-weight:500">Editar</a>
        <button class="link-del" onclick="eliminarProyecto(${p.id})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

export function openProyectoModal(id = null) {
  editingProyId = id;
  const p = id ? proyectosDB.find(x => x.id === id) : null;
  document.getElementById('proy-modal-title').textContent = id ? 'Editar proyecto' : 'Nuevo proyecto';
  document.getElementById('proy-nombre').value = p?.nombre || '';
  document.getElementById('proy-responsable').value = p?.responsable || '';
  document.getElementById('proy-estado').value = p?.estado || 'planificado';
  document.getElementById('proy-avance').value = p ? p.avance : 0;
  document.getElementById('proy-fecha-meta').value = p?.fechaMeta || '';
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
    responsable: document.getElementById('proy-responsable').value.trim() || null,
    estado,
    avance: Math.min(100, Math.max(0, parseInt(document.getElementById('proy-avance').value) || 0)),
    fecha_meta: document.getElementById('proy-fecha-meta').value || null,
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
}

export async function eliminarProyecto(id) {
  if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
  const { error } = await supabase.from('proyectos').delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }
  const idx = proyectosDB.findIndex(p => p.id === id);
  if (idx !== -1) proyectosDB.splice(idx, 1);
  renderProyectos();
  toast('Proyecto eliminado');
}
