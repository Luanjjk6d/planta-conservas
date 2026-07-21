import { supabase } from './supabaseClient.js';
import { empleadosEsmeraldaDB, actividadEmpleadosDB } from './state.js';
import { esc, toast } from './utils.js';
import { rendM2 } from './m2.js';

export function mapEmpleado(row) {
  return { id: row.id, nombre: row.nombre, genero: row.genero, costoHora: parseFloat(row.costo_hora) || 0 };
}

export async function fetchEmpleados() {
  const { data, error } = await supabase.from('empleados_esmeralda').select('*').order('nombre');
  if (error) { toast('Error al cargar empleados: ' + error.message, true); return []; }
  return data.map(mapEmpleado);
}

export async function fetchActividadEmpleados() {
  const { data, error } = await supabase.from('actividad_esmeralda_empleados')
    .select('actividad_codigo, empleados_esmeralda(id, nombre, genero, costo_hora)');
  if (error) { toast('Error al cargar personal Esmeralda: ' + error.message, true); return; }
  data.forEach(row => {
    const emp = mapEmpleado(row.empleados_esmeralda);
    (actividadEmpleadosDB[row.actividad_codigo] ||= []).push(emp);
  });
}

export function renderEmpleadoChecklist(selectedIds = []) {
  const el = document.getElementById('m2-esm-employees');
  if (!empleadosEsmeraldaDB.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--muted)">Sin empleados registrados — agrega con el botón "+".</div>';
    return;
  }
  el.innerHTML = empleadosEsmeraldaDB.map(emp => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" class="m2-esm-emp-cb" value="${emp.id}" ${selectedIds.includes(emp.id) ? 'checked' : ''}>
        ${esc(emp.nombre)} <span style="color:var(--muted);font-size:11px">(${emp.genero})</span>
      </label>
      <button class="link-del" onclick="eliminarEmpleado(${emp.id})">Eliminar</button>
    </div>`).join('');
}

export async function eliminarEmpleado(id) {
  const emp = empleadosEsmeraldaDB.find(e => e.id === id);
  if (!confirm(`¿Eliminar a "${emp?.nombre}" del catálogo? Se quitará de las actividades donde participó (los costos ya guardados no cambian).`)) return;
  const { error } = await supabase.from('empleados_esmeralda').delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }
  const idx = empleadosEsmeraldaDB.findIndex(e => e.id === id);
  if (idx !== -1) empleadosEsmeraldaDB.splice(idx, 1);
  Object.keys(actividadEmpleadosDB).forEach(actId => {
    actividadEmpleadosDB[actId] = actividadEmpleadosDB[actId].filter(e => e.id !== id);
  });
  renderEmpleadoChecklist(getSelectedEmpleadoIds());
  rendM2();
  toast(`"${emp?.nombre}" eliminado`);
}

export function getSelectedEmpleadoIds() {
  return Array.from(document.querySelectorAll('.m2-esm-emp-cb:checked')).map(cb => parseInt(cb.value));
}

export function openEmpleadoModal() {
  document.getElementById('empleado-nombre').value = '';
  document.getElementById('empleado-genero').selectedIndex = 0;
  document.getElementById('empleado-costo').value = '';
  document.getElementById('empleado-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('empleado-nombre').focus(), 100);
}

export function closeEmpleadoModal() {
  document.getElementById('empleado-modal-ov').classList.remove('open');
}

export async function confirmEmpleadoModal() {
  const nombre = document.getElementById('empleado-nombre').value.trim().toUpperCase();
  const genero = document.getElementById('empleado-genero').value;
  const costoHora = parseFloat(document.getElementById('empleado-costo').value) || 0;
  if (!nombre) { toast('Escribe un nombre válido.'); return; }
  if (empleadosEsmeraldaDB.some(e => e.nombre === nombre)) { toast('Ya existe ese empleado.'); return; }

  const { data, error } = await supabase.from('empleados_esmeralda')
    .insert({ nombre, genero, costo_hora: costoHora }).select().single();
  if (error) { toast(error.code === '23505' ? 'Ya existe ese empleado.' : 'Error: ' + error.message, true); return; }

  empleadosEsmeraldaDB.push(mapEmpleado(data));
  renderEmpleadoChecklist(getSelectedEmpleadoIds());
  closeEmpleadoModal();
  toast('"' + nombre + '" agregado');
}
