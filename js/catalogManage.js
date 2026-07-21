import { supabase } from './supabaseClient.js';
import { TABLE_BY_SELECT } from './lookups.js';
import { esc, toast } from './utils.js';
import { equiposDB } from './state.js';

let manageSelId = null;

export async function openManageModal(selId, title) {
  manageSelId = selId;
  document.getElementById('manage-modal-title').textContent = title;
  document.getElementById('manage-modal-ov').classList.add('open');
  await _renderManageList();
}

export function closeManageModal() {
  document.getElementById('manage-modal-ov').classList.remove('open');
  manageSelId = null;
}

export async function refreshManageList() {
  if (manageSelId) await _renderManageList();
}

async function _renderManageList() {
  const el = document.getElementById('manage-modal-list');
  el.innerHTML = '<div class="empty" style="padding:1rem">Cargando...</div>';
  const table = TABLE_BY_SELECT[manageSelId];
  const esEquipo = table === 'equipos';
  const { data, error } = await supabase.from(table).select(esEquipo ? 'id, nombre, costo_hora' : 'id, nombre').order('nombre');
  if (error) { el.innerHTML = '<div class="empty" style="padding:1rem">Error al cargar.</div>'; return; }
  if (!data.length) { el.innerHTML = '<div class="empty" style="padding:1rem">Sin items.</div>'; return; }
  el.innerHTML = data.map(r => `
    <div class="lata-row">
      <div>
        <div class="lata-qty" style="font-size:13px">${esc(r.nombre)}</div>
        ${esEquipo ? `<div style="font-size:11px;color:var(--muted)">S/.${(parseFloat(r.costo_hora) || 0).toFixed(2)} / hora</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        ${esEquipo ? `<button class="btn-s" style="padding:6px 10px;font-size:12px" onclick="openCostoEquipoModal(${r.id},'${esc(r.nombre).replace(/'/g, "\\'")}',${parseFloat(r.costo_hora) || 0})">Editar costo</button>` : ''}
        <button class="btn-x" title="Eliminar" onclick="deleteManageItem(${r.id},'${esc(r.nombre).replace(/'/g, "\\'")}')">×</button>
      </div>
    </div>`).join('');
}

export async function deleteManageItem(id, nombre) {
  const table = TABLE_BY_SELECT[manageSelId];
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }

  if (table === 'equipos') {
    const idx = equiposDB.findIndex(e => e.id === id);
    if (idx !== -1) equiposDB.splice(idx, 1);
  }

  Object.entries(TABLE_BY_SELECT).forEach(([selId, t]) => {
    if (t !== table) return;
    const sel = document.getElementById(selId);
    if (!sel) return;
    const opt = Array.from(sel.options).find(o => o.value === nombre);
    if (opt) opt.remove();
  });

  await _renderManageList();
  toast(`"${nombre}" eliminado`);
}
