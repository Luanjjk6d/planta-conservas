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

// Un solo modal sirve para agregar (id=null) y editar (id dado) — así el
// costo por hora se puede fijar apenas se crea el equipo, no solo después.
export function openEquipoModal(id = null) {
  editingId = id;
  const eq = id ? equiposDB.find(e => e.id === id) : null;
  document.getElementById('equipo-modal-title').textContent = id ? 'Editar equipo' : 'Agregar equipo';
  document.getElementById('equipo-nombre-input').value = eq?.nombre || '';
  document.getElementById('equipo-costo-input').value = eq ? eq.costoHora : '';
  document.getElementById('equipo-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('equipo-nombre-input').focus(), 100);
}

export function closeEquipoModal() {
  document.getElementById('equipo-modal-ov').classList.remove('open');
  editingId = null;
}

export async function confirmEquipoModal() {
  const nombre = document.getElementById('equipo-nombre-input').value.trim().toUpperCase();
  const costoHora = parseFloat(document.getElementById('equipo-costo-input').value) || 0;
  if (!nombre) { toast('Escribe un nombre válido.'); return; }

  if (editingId) {
    const { data, error } = await supabase.from('equipos').update({ nombre, costo_hora: costoHora }).eq('id', editingId).select().single();
    if (error) { toast(error.code === '23505' ? 'Ya existe ese equipo.' : 'Error: ' + error.message, true); return; }
    const idx = equiposDB.findIndex(e => e.id === editingId);
    const nombreAnterior = equiposDB[idx].nombre;
    equiposDB[idx] = mapEquipo(data);
    const sel = document.getElementById('m2-equipo');
    const opt = Array.from(sel.options).find(o => o.value === nombreAnterior);
    if (opt) { opt.value = nombre; opt.textContent = nombre; if (sel.value === nombreAnterior) sel.value = nombre; }
    toast('Equipo actualizado');
  } else {
    if (equiposDB.some(e => e.nombre === nombre)) { toast('Ya existe ese equipo.'); return; }
    const { data, error } = await supabase.from('equipos').insert({ nombre, costo_hora: costoHora }).select().single();
    if (error) { toast(error.code === '23505' ? 'Ya existe ese equipo.' : 'Error: ' + error.message, true); return; }
    equiposDB.push(mapEquipo(data));
    const sel = document.getElementById('m2-equipo');
    const o = document.createElement('option');
    o.value = nombre; o.textContent = nombre;
    sel.appendChild(o);
    sel.value = nombre;
    toast('"' + nombre + '" agregado');
  }
  closeEquipoModal();
  await refreshManageList();
}
