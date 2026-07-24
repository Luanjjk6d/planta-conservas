// Módulo "Reuniones" de Gestión Conservas — simple a propósito: lista +
// crear/editar/eliminar. Los compromisos se anotan como texto libre
// dentro de la reunión (campo "acuerdos"), sin tabla aparte por ahora.
import { supabase } from './supabaseClient.js';
import { reunionesDB } from './gestionState.js';
import { proyectosDB } from './state.js';
import { esc, fF, toast } from './utils.js';

const ESTADO_LABEL = { programada: 'Programada', realizada: 'Realizada', cancelada: 'Cancelada' };

let editingReunionId = null;
let deletingReunionId = null;
let proyectoPresetActual = null;

export function mapReunion(row) {
  return {
    id: row.id,
    asunto: row.asunto,
    fecha: row.fecha,
    hora: row.hora ? row.hora.slice(0, 5) : '',
    modalidad: row.modalidad || '',
    proyectoId: row.proyecto_id,
    participantes: row.participantes || '',
    objetivo: row.objetivo || '',
    resumen: row.resumen || '',
    acuerdos: row.acuerdos || '',
    responsableSeguimiento: row.responsable_seguimiento || '',
    estado: row.estado,
    updatedAt: row.updated_at,
  };
}

function nombreProyecto(proyectoId) {
  return proyectosDB.find(p => p.id === proyectoId)?.nombre || '';
}

export async function fetchReuniones() {
  const el = document.getElementById('reuniones-body');
  if (el) el.innerHTML = '<div class="empty" style="padding:2.5rem">Cargando...</div>';
  const { data, error } = await supabase.from('reuniones').select('*').order('fecha', { ascending: false });
  if (error) {
    toast('Error al cargar reuniones: ' + error.message, true);
    if (el) el.innerHTML = '<div class="empty" style="padding:2.5rem">No se pudo cargar. Revisa la conexión.</div>';
    return;
  }
  reunionesDB.length = 0;
  reunionesDB.push(...data.map(mapReunion));
  renderReuniones();
}

function _card(r, compacta = false) {
  return `<div class="reu-row">
    <div class="reu-row-top">
      <span class="badge-estado-reu ${r.estado}">${ESTADO_LABEL[r.estado]}</span>
      <div class="reu-asunto">${esc(r.asunto)}</div>
      <div class="proy-menu">
        <button class="proy-menu-btn" onclick="toggleReunionMenu(${r.id})">⋯</button>
        ${menuAbiertoReunionId === r.id ? `<div class="proy-menu-dd tarea-menu-dd">
          <button onclick="openReunionModal(${r.id})">Editar</button>
          <button class="tarea-menu-del" onclick="eliminarReunion(${r.id})">Eliminar</button>
        </div>` : ''}
      </div>
    </div>
    <div class="reu-meta">${fF(r.fecha)}${r.hora ? ' · ' + r.hora : ''}${r.modalidad ? ' · ' + esc(r.modalidad) : ''}${!compacta && r.proyectoId ? ' · ' + esc(nombreProyecto(r.proyectoId)) : ''}</div>
    ${r.objetivo ? `<div class="reu-detail"><span class="proy-detail-l">Objetivo:</span> ${esc(r.objetivo)}</div>` : ''}
    ${r.resumen ? `<div class="reu-detail"><span class="proy-detail-l">Resumen:</span> ${esc(r.resumen)}</div>` : ''}
    ${r.acuerdos ? `<div class="reu-detail"><span class="proy-detail-l">Acuerdos:</span> ${esc(r.acuerdos)}</div>` : ''}
  </div>`;
}

let menuAbiertoReunionId = null;
export function toggleReunionMenu(id) {
  menuAbiertoReunionId = menuAbiertoReunionId === id ? null : id;
  renderReuniones();
  renderReunionesEnFicha();
}

export function renderReuniones() {
  const el = document.getElementById('reuniones-body');
  if (!el) return;
  if (!reunionesDB.length) { el.innerHTML = '<div class="empty" style="padding:2.5rem">Sin reuniones registradas.</div>'; return; }
  el.innerHTML = reunionesDB.map(r => _card(r)).join('');
}

// Lista compacta embebida en la ficha de un proyecto.
let fichaProyectoIdActual = null;
export function renderReunionesEnFicha(proyectoId = fichaProyectoIdActual) {
  fichaProyectoIdActual = proyectoId;
  const el = document.getElementById('ficha-reuniones-body');
  if (!el || proyectoId == null) return;
  const data = reunionesDB.filter(r => r.proyectoId === proyectoId);
  if (!data.length) { el.innerHTML = '<div class="empty" style="padding:1.5rem">Sin reuniones para este proyecto.</div>'; return; }
  el.innerHTML = data.map(r => _card(r, true)).join('');
}

export function contarReunionesDeProyecto(proyectoId) {
  return reunionesDB.filter(r => r.proyectoId === proyectoId).length;
}

// ───────── Modal crear/editar ─────────
export function openReunionModal(id = null, proyectoPreset = null) {
  editingReunionId = id;
  proyectoPresetActual = proyectoPreset;
  const r = id ? reunionesDB.find(x => x.id === id) : null;
  document.getElementById('reunion-modal-title').textContent = id ? 'Editar reunión' : 'Nueva reunión';
  document.getElementById('re-asunto').value = r?.asunto || '';
  document.getElementById('re-fecha').value = r?.fecha || '';
  document.getElementById('re-hora').value = r?.hora || '';
  document.getElementById('re-modalidad').value = r?.modalidad || '';
  const selProy = document.getElementById('re-proyecto');
  selProy.innerHTML = '<option value="">Sin proyecto</option>' + proyectosDB.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  selProy.value = r?.proyectoId || proyectoPreset || '';
  document.getElementById('re-participantes').value = r?.participantes || '';
  document.getElementById('re-objetivo').value = r?.objetivo || '';
  document.getElementById('re-estado').value = r?.estado || 'programada';
  document.getElementById('re-resumen').value = r?.resumen || '';
  document.getElementById('re-acuerdos').value = r?.acuerdos || '';
  document.getElementById('re-responsable-seg').value = r?.responsableSeguimiento || '';
  document.getElementById('reunion-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('re-asunto').focus(), 100);
  menuAbiertoReunionId = null;
}

export function closeReunionModal() {
  document.getElementById('reunion-modal-ov').classList.remove('open');
  editingReunionId = null;
}

export async function confirmReunionModal() {
  const asunto = document.getElementById('re-asunto').value.trim();
  const fecha = document.getElementById('re-fecha').value;
  if (!asunto) { toast('Escribe el asunto de la reunión.'); return; }
  if (!fecha) { toast('Elige la fecha de la reunión.'); return; }

  const record = {
    asunto, fecha,
    hora: document.getElementById('re-hora').value || null,
    modalidad: document.getElementById('re-modalidad').value.trim() || null,
    proyecto_id: document.getElementById('re-proyecto').value || null,
    participantes: document.getElementById('re-participantes').value.trim() || null,
    objetivo: document.getElementById('re-objetivo').value.trim() || null,
    estado: document.getElementById('re-estado').value,
    resumen: document.getElementById('re-resumen').value.trim() || null,
    acuerdos: document.getElementById('re-acuerdos').value.trim() || null,
    responsable_seguimiento: document.getElementById('re-responsable-seg').value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (editingReunionId) {
    const { data, error } = await supabase.from('reuniones').update(record).eq('id', editingReunionId).select().single();
    if (error) { toast('Error al actualizar: ' + error.message, true); return; }
    const idx = reunionesDB.findIndex(r => r.id === editingReunionId);
    if (idx !== -1) reunionesDB[idx] = mapReunion(data);
    toast('Reunión actualizada');
  } else {
    const { data, error } = await supabase.from('reuniones').insert(record).select().single();
    if (error) { toast('Error al guardar: ' + error.message, true); return; }
    reunionesDB.unshift(mapReunion(data));
    toast('Reunión creada');
  }
  closeReunionModal();
  renderReuniones();
  renderReunionesEnFicha();
}

export function eliminarReunion(id) {
  menuAbiertoReunionId = null;
  const r = reunionesDB.find(x => x.id === id);
  if (!r) return;
  deletingReunionId = id;
  document.getElementById('reunion-confirm-delete-nombre').textContent = r.asunto;
  document.getElementById('reunion-confirm-delete-modal-ov').classList.add('open');
}

export function closeReunionConfirmDeleteModal() {
  document.getElementById('reunion-confirm-delete-modal-ov').classList.remove('open');
  deletingReunionId = null;
}

export async function confirmarEliminarReunion() {
  if (!deletingReunionId) return;
  const { error } = await supabase.from('reuniones').delete().eq('id', deletingReunionId);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }
  const idx = reunionesDB.findIndex(r => r.id === deletingReunionId);
  if (idx !== -1) reunionesDB.splice(idx, 1);
  closeReunionConfirmDeleteModal();
  renderReuniones();
  renderReunionesEnFicha();
  toast('Reunión eliminada');
}
