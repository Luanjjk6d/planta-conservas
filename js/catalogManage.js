import { supabase } from './supabaseClient.js';
import { TABLE_BY_SELECT } from './lookups.js';
import { esc, toast } from './utils.js';

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

async function _renderManageList() {
  const el = document.getElementById('manage-modal-list');
  el.innerHTML = '<div class="empty" style="padding:1rem">Cargando...</div>';
  const table = TABLE_BY_SELECT[manageSelId];
  const { data, error } = await supabase.from(table).select('id, nombre').order('nombre');
  if (error) { el.innerHTML = '<div class="empty" style="padding:1rem">Error al cargar.</div>'; return; }
  if (!data.length) { el.innerHTML = '<div class="empty" style="padding:1rem">Sin items.</div>'; return; }
  el.innerHTML = data.map(r => `
    <div class="lata-row">
      <div class="lata-qty" style="font-size:13px">${esc(r.nombre)}</div>
      <button class="btn-x" title="Eliminar" onclick="deleteManageItem(${r.id},'${esc(r.nombre).replace(/'/g, "\\'")}')">×</button>
    </div>`).join('');
}

export async function deleteManageItem(id, nombre) {
  const table = TABLE_BY_SELECT[manageSelId];
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }

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
