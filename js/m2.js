import { supabase } from './supabaseClient.js';
import { actividadesDB, costosDB, latasData } from './state.js';
import { hn, tMin, mHM, esc, toast } from './utils.js';
import { stL, sugerencias } from './constants.js';
import { renderM3 } from './m3.js';

export function mapActividad(row) {
  return {
    id: row.codigo,
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
    estado: row.estado,
  };
}

export function mapLata(row) {
  return { hora: (row.hora || '').slice(0, 5), latas: row.cantidad };
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
}

export function calcTotalPersonal() {
  const h = parseInt(document.getElementById('m2-h').value) || 0;
  const m = parseInt(document.getElementById('m2-m').value) || 0;
  document.getElementById('m2-total-p').value = h + m;
}

export function initM2Listeners() {
  ['m2-ini', 'm2-fin'].forEach(id => document.getElementById(id).addEventListener('change', calcDuracion));
  ['m2-ping', 'm2-psal'].forEach(id => document.getElementById(id).addEventListener('input', () => {
    const pi = parseFloat(document.getElementById('m2-ping').value) || 0;
    const ps = parseFloat(document.getElementById('m2-psal').value) || 0;
    document.getElementById('m2-merma').value = Math.max(0, pi - ps) || '';
  }));
}

export async function guarM2() {
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

  const btn = document.getElementById('m2-save-btn');
  btn.disabled = true;
  const record = {
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
    estado,
  };
  const { data, error } = await supabase.from('actividades').insert(record).select().single();
  btn.disabled = false;
  if (error) { toast('Error al guardar: ' + error.message, true); return; }

  actividadesDB.unshift(mapActividad(data));
  rendM2(); limpM2(); toast(`Actividad registrada — ID: ${data.codigo}`);
  if (document.getElementById('page-m3').classList.contains('active')) renderM3();
}

export function limpM2() {
  ['m2-ping', 'm2-psal', 'm2-merma', 'm2-fin', 'm2-h', 'm2-m', 'm2-dur', 'm2-total-p'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m2-proc').selectedIndex = 0;
  document.getElementById('m2-equipo').selectedIndex = 0;
  document.getElementById('m2-estado').selectedIndex = 0;
  document.getElementById('m2-ini').value = hn();
}

export function rendM2() {
  const el = document.getElementById('list-m2');
  if (!actividadesDB.length) { el.innerHTML = '<div class="empty"><div class="empty-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>Sin actividades registradas.<br><span style="font-size:12px">Cada registro genera un ID único disponible en el Módulo 3.</span></div>'; return; }
  el.innerHTML = actividadesDB.map(r => `<div class="card">
    <div class="card-head">
      <div><div class="card-title">${esc(r.proc)}</div><div class="card-meta">${r.ini} → ${r.fin} ${r.durMin ? '· ' + mHM(r.durMin) : ''} · Equipo: ${esc(r.equipo)}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="card-num">${r.id}</span>
        <span class="sbadge ${r.estado}">${stL[r.estado]}</span>
      </div>
    </div>
    ${r.ping || r.psal ? `<div class="pill"><strong>Ingreso:</strong> ${r.ping} kg → <strong>Salida:</strong> ${r.psal} kg${r.merma > 0 ? ' → <strong style="color:var(--orange)">Merma: ' + r.merma.toFixed(1) + ' kg</strong>' : ''}</div>` : ''}
    <div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--muted)">
      <span>👷 ${r.h} H &nbsp; 👩 ${r.m} M &nbsp; Total: <strong style="color:var(--text)">${r.totalPersonal}</strong></span>
      ${costosDB[r.id] ? '<span style="color:var(--green);font-weight:500">✓ Costeado</span>' : '<span style="color:var(--orange)">⏳ Sin costear</span>'}
    </div>
  </div>`).join('');
}

export async function regLatas() {
  const hora = document.getElementById('m2-lhora').value;
  const latas = document.getElementById('m2-latas').value;
  if (!hora || !latas || parseInt(latas) <= 0) { toast('Ingresa hora y cantidad de latas.'); return; }

  const btn = document.getElementById('m2-latas-btn');
  btn.disabled = true;
  const { data, error } = await supabase.from('latas').insert({ hora, cantidad: parseInt(latas) }).select().single();
  btn.disabled = false;
  if (error) { toast('Error al guardar: ' + error.message, true); return; }

  latasData.push(mapLata(data));
  document.getElementById('m2-latas').value = ''; document.getElementById('m2-lhora').value = hn();
  rendLatas(); toast('Registro de latas agregado');
}

export function rendLatas() {
  const total = latasData.reduce((s, r) => s + r.latas, 0);
  document.getElementById('latas-total').textContent = total.toLocaleString();
  document.getElementById('latas-count').textContent = latasData.length;
  const el = document.getElementById('list-latas');
  if (!latasData.length) { el.innerHTML = '<div class="empty" style="padding:1.5rem"><div class="empty-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>Sin registros.</div>'; return; }
  el.innerHTML = [...latasData].reverse().map((r, i) => `<div class="lata-row"><div><div style="font-size:11px;color:var(--muted)">Registro #${latasData.length - i}</div><div class="lata-qty">${r.latas.toLocaleString()} <span>latas</span></div></div><div class="lata-hora">${r.hora}</div></div>`).join('');
}
