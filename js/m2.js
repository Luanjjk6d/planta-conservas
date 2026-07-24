import { supabase } from './supabaseClient.js';
import { actividadesDB, costosDB, personalLogDB, empleadosEsmeraldaDB, actividadEmpleadosDB } from './state.js';
import { hn, tMin, mHM, esc, toast } from './utils.js';
import { stL, sugerencias } from './constants.js';
import { renderM3 } from './m3.js';
import { renderEmpleadoChecklist, getSelectedEmpleadoIds } from './empleados.js';
import { viewDate } from './viewDate.js';

let editingId = null;

// NP "pegajoso": una vez guardada una actividad con un NP, los siguientes
// registros nuevos en Módulo 2 lo mantienen preseleccionado hasta que el
// usuario lo cambie manualmente o el NP se cierre/elimine desde Módulo 1.
let stickyNp = null;

export function clearStickyNpIfMatches(nombre) {
  if (stickyNp === nombre) {
    stickyNp = null;
    const sel = document.getElementById('m2-np');
    if (sel) sel.value = '';
  }
}

function derivePersonal(esmH, esmM, svcH, svcM) {
  return {
    esmH, esmM, svcH, svcM,
    h: esmH + svcH,
    m: esmM + svcM,
    esm: esmH + esmM,
    svc: svcH + svcM,
    totalPersonal: esmH + esmM + svcH + svcM,
  };
}

export function mapActividad(row) {
  return {
    id: row.codigo,
    np: row.numero_parte || '',
    batch: row.numero_batch || '',
    fecha: row.fecha,
    proc: row.proceso,
    equipo: row.equipo,
    ini: (row.hora_inicio || '').slice(0, 5),
    fin: row.hora_fin ? row.hora_fin.slice(0, 5) : '—',
    durMin: row.duracion_min,
    durHoras: row.duracion_min / 60,
    ping: parseFloat(row.peso_ingreso),
    psal: parseFloat(row.peso_salida),
    merma: parseFloat(row.merma),
    cajas: row.cajas_producidas != null ? parseInt(row.cajas_producidas) : null,
    ...derivePersonal(row.personal_esmeralda_h, row.personal_esmeralda_m, row.personal_service_h, row.personal_service_m),
    estado: row.estado,
  };
}

// Autocompletado de batch: sugiere los batches ya usados en el NP
// seleccionado, para que el mismo lote físico use siempre el mismo
// número aunque pase por varios procesos y días distintos.
export function actualizarBatchDatalist() {
  const np = document.getElementById('m2-np').value;
  const dl = document.getElementById('m2-batch-list');
  if (!dl) return;
  const batches = [...new Set(actividadesDB.filter(a => a.np === np && a.batch).map(a => a.batch))];
  dl.innerHTML = batches.map(b => `<option value="${esc(b)}">`).join('');
}

export function mapPersonalLog(row) {
  return {
    actId: row.actividad_codigo,
    hora: (row.hora || '').slice(0, 5),
    ...derivePersonal(row.personal_esmeralda_h, row.personal_esmeralda_m, row.personal_service_h, row.personal_service_m),
  };
}

export function sugerirEquipo() {
  const proc = document.getElementById('m2-proc').value;
  const eq = sugerencias[proc];
  if (eq) { const sel = document.getElementById('m2-equipo'); sel.value = eq || ''; }
}

function calcDuracion() {
  const ini = document.getElementById('m2-ini').value;
  const fin = document.getElementById('m2-fin').value;
  if (ini && fin) { const d = Math.max(0, tMin(fin) - tMin(ini)); document.getElementById('m2-dur').value = d > 0 ? mHM(d) + ` (${(d / 60).toFixed(2)} h)` : ''; }
  else { document.getElementById('m2-dur').value = ''; }
}

function calcMerma() {
  const pi = parseFloat(document.getElementById('m2-ping').value) || 0;
  const ps = parseFloat(document.getElementById('m2-psal').value) || 0;
  document.getElementById('m2-merma').value = Math.max(0, pi - ps) || '';
}

export function calcTotalPersonal() {
  const esmCount = getSelectedEmpleadoIds().length;
  const svcH = parseInt(document.getElementById('m2-svc-h').value) || 0;
  const svcM = parseInt(document.getElementById('m2-svc-m').value) || 0;
  document.getElementById('m2-total-p').value = esmCount + svcH + svcM;
}

export function initM2Listeners() {
  ['m2-ini', 'm2-fin'].forEach(id => document.getElementById(id).addEventListener('change', calcDuracion));
  ['m2-ping', 'm2-psal'].forEach(id => document.getElementById(id).addEventListener('input', calcMerma));
  document.getElementById('m2-esm-employees').addEventListener('change', calcTotalPersonal);
  document.getElementById('m2-np').addEventListener('change', actualizarBatchDatalist);
}

export function editM2(id) {
  const act = actividadesDB.find(a => a.id === id);
  if (!act) return;
  editingId = id;
  document.getElementById('m2-np').value = act.np || '';
  actualizarBatchDatalist();
  document.getElementById('m2-batch').value = act.batch || '';
  document.getElementById('m2-cajas').value = act.cajas != null ? act.cajas : '';
  document.getElementById('m2-proc').value = act.proc;
  document.getElementById('m2-equipo').value = act.equipo;
  document.getElementById('m2-ini').value = act.ini;
  document.getElementById('m2-fin').value = act.fin === '—' ? '' : act.fin;
  calcDuracion();
  document.getElementById('m2-ping').value = act.ping || '';
  document.getElementById('m2-psal').value = act.psal || '';
  calcMerma();
  document.getElementById('m2-estado').value = act.estado;
  renderEmpleadoChecklist((actividadEmpleadosDB[id] || []).map(e => e.id));
  document.getElementById('m2-svc-h').value = act.svcH || '';
  document.getElementById('m2-svc-m').value = act.svcM || '';
  calcTotalPersonal();
  document.getElementById('m2-save-btn').textContent = 'Actualizar actividad →';
  document.getElementById('m2-edit-banner').style.display = 'flex';
  document.getElementById('m2-edit-banner-id').textContent = id;
}

export async function guarM2() {
  const np = document.getElementById('m2-np').value || null;
  const batch = document.getElementById('m2-batch').value.trim() || null;
  const proc = document.getElementById('m2-proc').value;
  const ini = document.getElementById('m2-ini').value;
  const estado = document.getElementById('m2-estado').value;
  if (!proc || !ini || !estado) { toast('Completa proceso, hora de inicio y estado.'); return; }
  const fin = document.getElementById('m2-fin').value;
  const durMin = fin ? Math.max(0, tMin(fin) - tMin(ini)) : 0;
  const ping = parseFloat(document.getElementById('m2-ping').value) || 0;
  const psal = parseFloat(document.getElementById('m2-psal').value) || 0;
  const svcH = parseInt(document.getElementById('m2-svc-h').value) || 0;
  const svcM = parseInt(document.getElementById('m2-svc-m').value) || 0;
  const cajasVal = document.getElementById('m2-cajas').value;
  const cajas = cajasVal !== '' ? parseInt(cajasVal) : null;
  const empleadoIds = getSelectedEmpleadoIds();
  const empleadosSeleccionados = empleadosEsmeraldaDB.filter(e => empleadoIds.includes(e.id));
  const esmH = empleadosSeleccionados.filter(e => e.genero === 'H').length;
  const esmM = empleadosSeleccionados.filter(e => e.genero === 'M').length;

  const btn = document.getElementById('m2-save-btn');
  btn.disabled = true;
  const record = {
    numero_parte: np,
    numero_batch: batch,
    proceso: proc,
    equipo: document.getElementById('m2-equipo').value || '—',
    hora_inicio: ini,
    hora_fin: fin || null,
    duracion_min: durMin,
    peso_ingreso: ping,
    peso_salida: psal,
    merma: Math.max(0, ping - psal),
    cajas_producidas: cajas,
    personal_esmeralda_h: esmH,
    personal_esmeralda_m: esmM,
    personal_service_h: svcH,
    personal_service_m: svcM,
    estado,
  };

  if (editingId) {
    const idBeingEdited = editingId;
    const { data, error } = await supabase.from('actividades').update(record).eq('codigo', idBeingEdited).select().single();
    if (error) { btn.disabled = false; toast('Error al actualizar: ' + error.message, true); return; }
    const empErr = await syncEmpleadosActividad(idBeingEdited, empleadoIds);
    btn.disabled = false;
    if (empErr) { toast('Actividad actualizada, pero hubo un error con el personal Esmeralda: ' + empErr, true); }
    const idx = actividadesDB.findIndex(a => a.id === idBeingEdited);
    if (idx !== -1) actividadesDB[idx] = mapActividad(data);
    actividadEmpleadosDB[idBeingEdited] = empleadosSeleccionados;
    stickyNp = np;
    rendM2(); limpM2(); toast(`Actividad actualizada — ID: ${data.codigo}`);
    if (document.getElementById('page-m3').classList.contains('active')) renderM3();
    return;
  }

  const { data, error } = await supabase.from('actividades').insert({ ...record, fecha: viewDate.current }).select().single();
  if (error) { btn.disabled = false; toast('Error al guardar: ' + error.message, true); return; }
  const empErr = await syncEmpleadosActividad(data.codigo, empleadoIds);
  btn.disabled = false;
  if (empErr) { toast('Actividad registrada, pero hubo un error con el personal Esmeralda: ' + empErr, true); }

  stickyNp = np;
  actividadesDB.unshift(mapActividad(data));
  actividadEmpleadosDB[data.codigo] = empleadosSeleccionados;
  rendM2(); limpM2(); toast(`Actividad registrada — ID: ${data.codigo}`);
  if (document.getElementById('page-m3').classList.contains('active')) renderM3();
}

async function syncEmpleadosActividad(actividadCodigo, empleadoIds) {
  const { error: delError } = await supabase.from('actividad_esmeralda_empleados').delete().eq('actividad_codigo', actividadCodigo);
  if (delError) return delError.message;
  if (!empleadoIds.length) return null;
  const { error: insError } = await supabase.from('actividad_esmeralda_empleados')
    .insert(empleadoIds.map(empleado_id => ({ actividad_codigo: actividadCodigo, empleado_id })));
  return insError ? insError.message : null;
}

export async function eliminarActividad(id) {
  if (!confirm(`¿Eliminar la actividad ${id}? Esto también borra sus costos y su historial de personal. Esta acción no se puede deshacer.`)) return;
  const { error } = await supabase.from('actividades').delete().eq('codigo', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }

  const idx = actividadesDB.findIndex(a => a.id === id);
  if (idx !== -1) actividadesDB.splice(idx, 1);
  delete costosDB[id];
  delete personalLogDB[id];
  delete actividadEmpleadosDB[id];
  if (editingId === id) limpM2(); else rendM2();
  if (document.getElementById('page-m3').classList.contains('active')) renderM3();
  toast('Actividad eliminada');
}

export function limpM2() {
  ['m2-batch', 'm2-ping', 'm2-psal', 'm2-merma', 'm2-fin', 'm2-dur', 'm2-total-p', 'm2-svc-h', 'm2-svc-m', 'm2-cajas'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m2-np').value = stickyNp || '';
  actualizarBatchDatalist();
  document.getElementById('m2-proc').selectedIndex = 0;
  document.getElementById('m2-equipo').selectedIndex = 0;
  document.getElementById('m2-estado').selectedIndex = 0;
  document.getElementById('m2-ini').value = hn();
  renderEmpleadoChecklist([]);
  editingId = null;
  document.getElementById('m2-save-btn').textContent = 'Registrar actividad →';
  document.getElementById('m2-edit-banner').style.display = 'none';
}

export function rendM2() {
  const el = document.getElementById('list-m2');
  const dayData = actividadesDB.filter(r => r.fecha === viewDate.current);
  if (!dayData.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>Sin actividades este día.<br><span style="font-size:12px">Cada registro genera un ID único disponible en el Módulo 3.</span></div>';
  } else {
    el.innerHTML = dayData.map(r => `<div class="card">
    <div class="card-head">
      <div><div class="card-title">${esc(r.proc)}${r.np ? ' · NP: ' + esc(r.np) : ''}</div><div class="card-meta">${r.ini} → ${r.fin} ${r.durMin ? '· ' + mHM(r.durMin) : ''} · Equipo: ${esc(r.equipo)}${r.batch ? ' · Batch: ' + esc(r.batch) : ''}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="card-num">${r.id}</span>
        <span class="sbadge ${r.estado}">${stL[r.estado]}</span>
        <div style="display:flex;gap:8px">
          <a href="#" onclick="editM2('${r.id}');return false;" style="font-size:11px;color:var(--b600);font-weight:500">Editar</a>
          <button class="link-del" onclick="eliminarActividad('${r.id}')">Eliminar</button>
        </div>
      </div>
    </div>
    ${r.ping || r.psal ? `<div class="pill"><strong>Ingreso:</strong> ${r.ping} kg → <strong>Salida:</strong> ${r.psal} kg${r.merma > 0 ? ' → <strong style="color:var(--orange)">Merma: ' + r.merma.toFixed(1) + ' kg</strong>' : ''}</div>` : ''}
    ${r.cajas != null ? `<div class="pill gr"><strong>Cajas producidas:</strong> ${r.cajas}</div>` : ''}
    <div style="margin-top:8px;font-size:12px;color:var(--muted)">
      Esmeralda${(actividadEmpleadosDB[r.id] || []).length ? ': ' + (actividadEmpleadosDB[r.id] || []).map(e => esc(e.nombre)).join(', ') : ' — sin seleccionar'} &nbsp;|&nbsp; Service — H: ${r.svcH} · M: ${r.svcM} &nbsp;|&nbsp; Total: <strong style="color:var(--text)">${r.totalPersonal}</strong>
    </div>
    <div style="margin-top:6px">
      ${costosDB[r.id] ? '<span class="as-costed">Costeado</span>' : '<span class="as-uncosted">Sin costear</span>'}
    </div>
  </div>`).join('');
  }
  initPersonalLogSelect();
}

// ═══════════════════════════════
// HISTORIAL DE PERSONAL
// ═══════════════════════════════
export function initPersonalLogSelect() {
  const sel = document.getElementById('m2-plog-act');
  const prev = sel.value;
  const dayData = actividadesDB.filter(a => a.fecha === viewDate.current);
  sel.innerHTML = '<option value="">Seleccionar actividad...</option>' +
    dayData.map(a => `<option value="${a.id}">${a.id} — ${esc(a.proc)}${a.batch ? ' (' + esc(a.batch) + ')' : ''}</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  rendPersonalLog();
}

export async function regPersonalLog() {
  const actId = document.getElementById('m2-plog-act').value;
  const hora = document.getElementById('m2-plog-hora').value;
  const esmH = parseInt(document.getElementById('m2-plog-esm-h').value) || 0;
  const esmM = parseInt(document.getElementById('m2-plog-esm-m').value) || 0;
  const svcH = parseInt(document.getElementById('m2-plog-svc-h').value) || 0;
  const svcM = parseInt(document.getElementById('m2-plog-svc-m').value) || 0;
  if (!actId || !hora || (esmH === 0 && esmM === 0 && svcH === 0 && svcM === 0)) { toast('Selecciona actividad, hora y al menos una persona.'); return; }

  const btn = document.getElementById('m2-plog-btn');
  btn.disabled = true;
  const { data, error } = await supabase.from('actividad_personal_log')
    .insert({ actividad_codigo: actId, hora, personal_esmeralda_h: esmH, personal_esmeralda_m: esmM, personal_service_h: svcH, personal_service_m: svcM }).select().single();
  if (error) { btn.disabled = false; toast('Error: ' + error.message, true); return; }

  const { error: updErr } = await supabase.from('actividades')
    .update({ personal_esmeralda_h: esmH, personal_esmeralda_m: esmM, personal_service_h: svcH, personal_service_m: svcM }).eq('codigo', actId);
  btn.disabled = false;
  if (updErr) { toast('Error al actualizar actividad: ' + updErr.message, true); return; }

  (personalLogDB[actId] ||= []).push(mapPersonalLog(data));
  const act = actividadesDB.find(a => a.id === actId);
  if (act) Object.assign(act, derivePersonal(esmH, esmM, svcH, svcM));

  document.getElementById('m2-plog-hora').value = '';
  document.getElementById('m2-plog-esm-h').value = '';
  document.getElementById('m2-plog-esm-m').value = '';
  document.getElementById('m2-plog-svc-h').value = '';
  document.getElementById('m2-plog-svc-m').value = '';
  rendPersonalLog(); rendM2(); toast('Registro de personal agregado');
  if (document.getElementById('page-m3').classList.contains('active')) renderM3();
}

export function rendPersonalLog() {
  const actId = document.getElementById('m2-plog-act').value;
  const logs = personalLogDB[actId] || [];
  document.getElementById('plog-count').textContent = logs.length;
  document.getElementById('plog-current').textContent = logs.length ? logs[logs.length - 1].totalPersonal : '0';
  const el = document.getElementById('list-plog');
  if (!actId) { el.innerHTML = '<div class="empty" style="padding:1.5rem">Selecciona una actividad.</div>'; return; }
  if (!logs.length) { el.innerHTML = '<div class="empty" style="padding:1.5rem">Sin registros de personal.</div>'; return; }
  el.innerHTML = [...logs].reverse().map((r, i) => `<div class="lata-row">
    <div><div style="font-size:11px;color:var(--muted)">Registro #${logs.length - i}</div><div class="lata-qty">${r.totalPersonal} <span>personas</span></div><div style="font-size:11px;color:var(--muted)">Esmeralda — H:${r.esmH} M:${r.esmM} &nbsp;|&nbsp; Service — H:${r.svcH} M:${r.svcM}</div></div>
    <div class="lata-hora">${r.hora}</div></div>`).join('');
}
