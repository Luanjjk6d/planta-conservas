import { supabase } from './supabaseClient.js';
import { equiposDB } from './state.js';
import { toast } from './utils.js';
import { refreshManageList } from './catalogManage.js';

let editingId = null;

export function mapEquipo(row) {
  return { id: row.id, nombre: row.nombre, costoHora: parseFloat(row.costo_hora) || 0 };
}

export async function fetchEquipos() {
  const { data, error } = await supabase.from('equipos').select('*').order('nombre');
  if (error) { toast('Error al cargar equipos: ' + error.message, true); return []; }
  return data.map(mapEquipo);
}

export function openCostoEquipoModal(id, nombre, costoActual) {
  editingId = id;
  document.getElementById('costo-equipo-nombre').textContent = nombre;
  document.getElementById('costo-equipo-input').value = costoActual || '';
  document.getElementById('costo-equipo-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('costo-equipo-input').focus(), 100);
}

export function closeCostoEquipoModal() {
  document.getElementById('costo-equipo-modal-ov').classList.remove('open');
  editingId = null;
}

export async function confirmCostoEquipoModal() {
  if (!editingId) return;
  const costo = parseFloat(document.getElementById('costo-equipo-input').value) || 0;
  const { error } = await supabase.from('equipos').update({ costo_hora: costo }).eq('id', editingId);
  if (error) { toast('Error al guardar: ' + error.message, true); return; }

  const eq = equiposDB.find(e => e.id === editingId);
  if (eq) eq.costoHora = costo;

  closeCostoEquipoModal();
  await refreshManageList();
  toast('Costo actualizado');
}
