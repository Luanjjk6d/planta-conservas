import { supabase } from './supabaseClient.js';
import { actividadesDB, costosDB, personalLogDB } from './state.js';
import { hn, tMin, mHM, esc, toast } from './utils.js';
import { stL, sugerencias } from './constants.js';
import { renderM3, refreshIfSelected } from './m3.js';

let editingId = null;

export function mapActividad(row) {
  return {
    id: row.codigo,
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
    h: row.personal_hombres,
    m: row.personal_mujeres,
    totalPersonal: row.total_personal,
    esm: row.personal_esmeralda,
    svc: row.personal_service,
    estado: row.estado,
  };
}

export function mapPersonalLog(row) {
  return {
    actId: row.actividad_codigo,
    hora: (row.hora || '').slice(0, 5),
    h: row.personal_hombres,
    m: row.personal_mujeres,
    esm: row.personal_esmeralda,
    svc: row.personal_service,
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
  const h = parseInt(document.getElementById('m2-h').value) || 0;
  const m = parseInt(document.getElementById('m2-m').value) || 0;
  document.getElementById('m2-total-p').value = h + m;
  const esm = parseInt(document.getElementById('m2-esm').value) || 0;
  const svc = parseInt(document.getElementById('m2-svc').value) || 0;
  document.getElementById('m2-total-emp').value = esm + svc;
}

export function initM2Listeners() {
  ['m2-ini', 'm2-fin'].forEach(id => document.getElementById(id).addEventListener('change', calcDuracion));
  ['m2-ping', 'm2-psal'].forEach(id => document.getElementById(id).addEventListener('input', calcMerma));
}

export function editM2(id) {
  const act = actividadesDB.find(a => a.id === id);
  if (!act) return;
  editingId = id;
  document.getElementById('m2-batch').value = act.batch || '';
  document.getElementById('m2-proc').value = act.proc;
  document.getElementById('m2-equipo').value = act.equipo;
  document.getElementById('m2-ini').value = act.ini;
  document.getElementById('m2-fin').value = act.fin === '—' ? '' : act.fin;
  calcDuracion();
  document.getElementById('m2-ping').value = act.ping || '';
  document.getElementById('m2-psal').value = act.psal || '';
  calcMerma();
  document.getElementById('m2-estado').value = act.estado;
  document.getElementById('m2-h').value = act.h || '';
  document.getElementById('m2-m').value = act.m || '';
  document.getElementById('m2-esm').value = act.esm || '';
  document.getElementById('m2-svc').value = act.svc || '';
  calcTotalPersonal();
  document.getElementById('m2-save-btn').textContent = 'Actualizar actividad →';
  document.getElementById('m2-edit-banner').style.display = 'flex';
  document.getElementById('m2-edit-banner-id').textContent = id;
}

export async function guarM2() {
  const batch = document.getElementById('m2-batch').value.trim() || null;
  const proc = document.getElementById('m2-proc').value;
  const ini = document.getElementById('m2-ini').value;
  const estado = document.getElementById('m2-estado').value;
  if (!proc || !ini || !estado) { toast('Completa proceso, hora de inicio y estado.'); return; }
  const fin = document.getElementById('m2-fin').value;
  const durMin = fin ? Math.max(0, tMin(fin) - tMin(ini)) : 0;
  const ping = parseFloat(document.getElementById('m2-ping').value) || 0;
  const psal = parseFloat(document.getElementById('m2-psal').value) || 0;
  const h = parseInt(document.getElementById('m2-h').value) || 0;
  const m = parseInt(document.getElementById('m2-m').value) || 0;
  const esm = parseInt(document.getElementById('m2-esm').value) || 0;
  const svc = parseInt(document.getElementById('m2-svc').value) || 0;

  const btn = document.getElementById('m2-save-btn');
  btn.disabled = true;
  const record = {
    numero_batch: batch,
    proceso: proc,
    equipo: document.getElementById('m2-equipo').value || '—',
    hora_inicio: ini,
    hora_fin: fin || null,
    duracion_min: durMin,
    peso_ingreso: ping,
    peso_salida: psal,
    merma: Math.max(0, ping - psal),
    personal_hombres: h,
    personal_mujeres: m,
    total_personal: h + m,
    personal_esmeralda: esm,
    personal_service: svc,
    estado,
  };

  if (editingId) {
    const idBeingEdited = editingId;
    const { data, error } = await supabase.from('actividades').update(record).eq('codigo', idBeingEdited).select().single();
    btn.disabled = false;
    if (error) { toast('Error al actualizar: ' + error.message, true); return; }
    const idx = actividadesDB.findIndex(a => a.id === idBeingEdited);
    if (idx !== -1) actividadesDB[idx] = mapActividad(data);
    rendM2(); limpM2(); toast(`Actividad actualizada — ID: ${data.codigo}`);
    if (document.getElementById('page-m3').classList.contains('active')) { renderM3(); refreshIfSelected(idBeingEdited); }
    return;
  }

  const { data, error } = await supabase.from('actividades').insert(record).select().single();
  btn.disabled = false;
  if (error) { toast('Error al guardar: ' + error.message, true); return; }

  actividadesDB.unshift(mapActividad(data));
  rendM2(); limpM2(); toast(`Actividad registrada — ID: ${data.codigo}`);
  if (document.getElementById('page-m3').classList.contains('active')) renderM3();
}

export function limpM2() {
  ['m2-batch', 'm2-ping', 'm2-psal', 'm2-merma', 'm2-fin', 'm2-h', 'm2-m', 'm2-dur', 'm2-total-p', 'm2-esm', 'm2-svc', 'm2-total-emp'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m2-proc').selectedIndex = 0;
  document.getElementById('m2-equipo').selectedIndex = 0;
  document.getElementById('m2-estado').selectedIndex = 0;
  document.getElementById('m2-ini').value = hn();
  editingId = null;
  document.getElementById('m2-save-btn').textContent = 'Registrar actividad →';
  document.getElementById('m2-edit-banner').style.display = 'none';
}

export function rendM2() {
  const el = document.getElementById('list-m2');
  if (!actividadesDB.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>Sin actividades registradas.<br><span style="font-size:12px">Cada registro genera un ID único disponible en el Módulo 3.</span></div>';
  } else {
    el.innerHTML = actividadesDB.map(r => `<div class="card">
    <div class="card-head">
      <div><div class="card-title">${esc(r.proc)}</div><div class="card-meta">${r.ini} → ${r.fin} ${r.durMin ? '· ' + mHM(r.durMin) : ''} · Equipo: ${esc(r.equipo)}${r.batch ? ' · Batch: ' + esc(r.batch) : ''}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="card-num">${r.id}</span>
        <span class="sbadge ${r.estado}">${stL[r.estado]}</span>
        <a href="#" onclick="editM2('${r.id}');return false;" style="font-size:11px;color:var(--b600);font-weight:500">Editar</a>
      </div>
    </div>
    ${r.ping || r.psal ? `<div class="pill"><strong>Ingreso:</strong> ${r.ping} kg → <strong>Salida:</strong> ${r.psal} kg${r.merma > 0 ? ' → <strong style="color:var(--orange)">Merma: ' + r.merma.toFixed(1) + ' kg</strong>' : ''}</div>` : ''}
    <div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--muted);align-items:center;flex-wrap:wrap">
      <span>H: ${r.h} · M: ${r.m} · Total: <strong style="color:var(--text)">${r.totalPersonal}</strong></span>
      <span>Esmeralda: ${r.esm} · Service: ${r.svc}</span>
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
  sel.innerHTML = '<option value="">Seleccionar actividad...</option>' +
    actividadesDB.map(a => `<option value="${a.id}">${a.id} — ${esc(a.proc)}${a.batch ? ' (' + esc(a.batch) + ')' : ''}</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  rendPersonalLog();
}

export async function regPersonalLog() {
  const actId = document.getElementById('m2-plog-act').value;
  const hora = document.getElementById('m2-plog-hora').value;
  const h = parseInt(document.getElementById('m2-plog-h').value) || 0;
  const m = parseInt(document.getElementById('m2-plog-m').value) || 0;
  const esm = parseInt(document.getElementById('m2-plog-esm').value) || 0;
  const svc = parseInt(document.getElementById('m2-plog-svc').value) || 0;
  if (!actId || !hora || (h === 0 && m === 0 && esm === 0 && svc === 0)) { toast('Selecciona actividad, hora y al menos una persona.'); return; }

  const btn = document.getElementById('m2-plog-btn');
  btn.disabled = true;
  const { data, error } = await supabase.from('actividad_personal_log')
    .insert({ actividad_codigo: actId, hora, personal_hombres: h, personal_mujeres: m, personal_esmeralda: esm, personal_service: svc }).select().single();
  if (error) { btn.disabled = false; toast('Error: ' + error.message, true); return; }

  const { error: updErr } = await supabase.from('actividades')
    .update({ personal_hombres: h, personal_mujeres: m, total_personal: h + m, personal_esmeralda: esm, personal_service: svc }).eq('codigo', actId);
  btn.disabled = false;
  if (updErr) { toast('Error al actualizar actividad: ' + updErr.message, true); return; }

  (personalLogDB[actId] ||= []).push(mapPersonalLog(data));
  const act = actividadesDB.find(a => a.id === actId);
  if (act) { act.h = h; act.m = m; act.totalPersonal = h + m; act.esm = esm; act.svc = svc; }

  document.getElementById('m2-plog-hora').value = '';
  document.getElementById('m2-plog-h').value = '';
  document.getElementById('m2-plog-m').value = '';
  document.getElementById('m2-plog-esm').value = '';
  document.getElementById('m2-plog-svc').value = '';
  rendPersonalLog(); rendM2(); toast('Registro de personal agregado');
  if (document.getElementById('page-m3').classList.contains('active')) { renderM3(); refreshIfSelected(actId); }
}

export function rendPersonalLog() {
  const actId = document.getElementById('m2-plog-act').value;
  const logs = personalLogDB[actId] || [];
  document.getElementById('plog-count').textContent = logs.length;
  document.getElementById('plog-current').textContent = logs.length ? (logs[logs.length - 1].h + logs[logs.length - 1].m) : '0';
  const el = document.getElementById('list-plog');
  if (!actId) { el.innerHTML = '<div class="empty" style="padding:1.5rem">Selecciona una actividad.</div>'; return; }
  if (!logs.length) { el.innerHTML = '<div class="empty" style="padding:1.5rem">Sin registros de personal.</div>'; return; }
  el.innerHTML = [...logs].reverse().map((r, i) => `<div class="lata-row">
    <div><div style="font-size:11px;color:var(--muted)">Registro #${logs.length - i}</div><div class="lata-qty">${r.h + r.m} <span>personas</span></div><div style="font-size:11px;color:var(--muted)">H: ${r.h} · M: ${r.m} · Esmeralda: ${r.esm} · Service: ${r.svc}</div></div>
    <div class="lata-hora">${r.hora}</div></div>`).join('');
}
