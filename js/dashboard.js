import { supabase } from './supabaseClient.js';
import { esc, fmt, fF, mHM, tMin, toast, localDateStr, shiftDate, fDateLong } from './utils.js';
import { stL } from './constants.js';
import { mapLote } from './m1.js';
import { mapActividad } from './m2.js';
import { mapCosto } from './m3.js';

let chartTrend = null;
let currentDashDate = localDateStr();
let dashLotes = [], dashAct = [], dashCostos = {};
let produccionNP = [];
let expandedNP = null;

async function fetchDashboardData(dateStr) {
  const [lotesRes, actRes] = await Promise.all([
    supabase.from('lotes').select('*').eq('fecha', dateStr).order('created_at', { ascending: false }),
    supabase.from('actividades').select('*').eq('fecha', dateStr).order('hora_inicio', { ascending: true }),
  ]);
  if (lotesRes.error || actRes.error) { toast('Error al cargar el dashboard.', true); return null; }
  const lotes = lotesRes.data.map(mapLote);
  const act = actRes.data.map(mapActividad);
  let costos = {};
  if (act.length) {
    const { data, error } = await supabase.from('costos').select('*').in('actividad_codigo', act.map(a => a.id));
    if (!error) costos = Object.fromEntries(data.map(c => [c.actividad_codigo, mapCosto(c)]));
  }
  return { lotes, act, costos };
}

function updateDateNav() {
  document.getElementById('dash-date-label').textContent = fDateLong(currentDashDate);
  document.getElementById('dash-date-input').value = currentDashDate;
  document.getElementById('dash-next-btn').disabled = currentDashDate >= localDateStr();
}

export function dashPrevDay() { renderDash(shiftDate(currentDashDate, -1)); }
export function dashNextDay() { const n = shiftDate(currentDashDate, 1); if (n <= localDateStr()) renderDash(n); }
export function dashGoToday() { renderDash(localDateStr()); }
export function dashJumpDate(v) { if (v) renderDash(v); }

export async function renderDash(dateStr = currentDashDate) {
  const result = await fetchDashboardData(dateStr);
  if (!result) return;
  currentDashDate = dateStr;
  dashLotes = result.lotes; dashAct = result.act; dashCostos = result.costos;
  updateDateNav();

  const totMP = dashLotes.reduce((s, r) => s + r.peso, 0);
  const totMerma = dashAct.reduce((s, r) => s + (r.merma || 0), 0);
  const totCosto = Object.values(dashCostos).reduce((s, c) => s + (c.total || 0), 0);
  document.getElementById('d-mp').textContent = totMP.toFixed(1);
  document.getElementById('d-merma').textContent = totMerma.toFixed(1);
  document.getElementById('d-costo').textContent = fmt(totCosto);

  // Último lote del día
  const lb = document.getElementById('d-lote-body'), lbadge = document.getElementById('d-lote-badge');
  if (!dashLotes.length) { lb.innerHTML = '<div class="dc-empty">Sin datos</div>'; lbadge.textContent = '—'; }
  else {
    const r = dashLotes[0]; lbadge.textContent = r.np;
    lb.innerHTML = `<div class="di-row"><span class="di-l">N° parte</span><span class="di-v" style="font-family:'DM Mono',monospace">${esc(r.np)}</span></div>
    <div class="di-row"><span class="di-l">Producto</span><span class="di-v">${esc(r.prod)}</span></div>
    <div class="di-row"><span class="di-l">Especie</span><span class="di-v">${esc(r.especie) || '—'}</span></div>
    <div class="di-row"><span class="di-l">Peso MP</span><span class="di-v">${r.peso} kg</span></div>
    <div class="di-row"><span class="di-l">Supervisor</span><span class="di-v">${esc(r.sup)}</span></div>
    <div class="di-row"><span class="di-l">Turno</span><span class="di-v">${esc(r.turno) || '—'}</span></div>`;
  }

  // Personal del turno
  const totH = dashAct.reduce((s, r) => s + r.h, 0);
  const totM = dashAct.reduce((s, r) => s + r.m, 0);
  const totP = totH + totM;
  const pb = document.getElementById('d-pers-body'); document.getElementById('d-pers-badge').textContent = totP;
  if (!totP) { pb.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    const p = totP > 0 ? Math.round(totH / totP * 100) : 0;
    pb.innerHTML = `<div class="di-row"><span class="di-l">Total</span><span class="di-v" style="font-size:20px;font-weight:700;color:var(--b800)">${totP}</span></div>
    <div class="di-row"><span class="di-l">Hombres</span><span class="di-v">${totH} (${p}%)</span></div>
    <div class="di-row"><span class="di-l">Mujeres</span><span class="di-v">${totM} (${100 - p}%)</span></div>
    <div style="margin-top:10px;background:var(--g100);border-radius:999px;height:9px;overflow:hidden"><div style="height:100%;width:${p}%;background:linear-gradient(90deg,var(--b400),var(--b600));border-radius:999px"></div></div>`;
  }

  // Actividades costeadas
  const costeadas = Object.keys(dashCostos).length;
  document.getElementById('d-cost-badge').textContent = `${costeadas}/${dashAct.length}`;
  const cb = document.getElementById('d-cost-body');
  if (!dashAct.length) { cb.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    const vals = Object.values(dashCostos);
    const totEsm = vals.reduce((s, c) => s + (c.cEsm || 0), 0);
    const totSvc = vals.reduce((s, c) => s + (c.cSvc || 0), 0);
    const totMaq = vals.reduce((s, c) => s + (c.cMaq || 0), 0);
    const totAVE = vals.reduce((s, c) => s + (c.cAVE || 0), 0);
    const totOtros = vals.reduce((s, c) => s + (c.costoOtros || 0), 0);
    const grand = vals.reduce((s, c) => s + (c.total || 0), 0);
    cb.innerHTML = `
      <div class="di-row"><span class="di-l">Personal Esmeralda</span><span class="di-v">${fmt(totEsm)}</span></div>
      <div class="di-row"><span class="di-l">Personal Service</span><span class="di-v">${fmt(totSvc)}</span></div>
      <div class="di-row"><span class="di-l">Máquinas / Equipos</span><span class="di-v">${fmt(totMaq)}</span></div>
      <div class="di-row"><span class="di-l">Agua, vapor y elect.</span><span class="di-v">${fmt(totAVE)}</span></div>
      <div class="di-row"><span class="di-l">Otros costos</span><span class="di-v">${fmt(totOtros)}</span></div>
      <div class="di-row" style="border-top:2px solid var(--b100);margin-top:4px;padding-top:8px"><span class="di-l" style="font-weight:600;color:var(--b800)">TOTAL</span><span class="di-v" style="font-size:16px;font-weight:700;color:var(--b600)">${fmt(grand)}</span></div>
      ${dashAct.map(a => { const c = dashCostos[a.id]; return `<div class="di-row"><span class="di-l" style="font-size:11px">${esc(a.proc)}</span><span class="di-v" style="font-size:11px">${c ? fmt(c.total) : '<span style="color:var(--orange)">Sin costear</span>'}</span></div>`; }).join('')}`;
  }

  // Resumen del día
  const porEstado = { op: 0, det: 0, fin: 0 };
  dashAct.forEach(a => { porEstado[a.estado] = (porEstado[a.estado] || 0) + (a.durMin || 0); });
  document.getElementById('d-resumen-badge').textContent = dashAct.length;
  const rb = document.getElementById('d-resumen-body');
  if (!dashAct.length) { rb.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    rb.innerHTML = `<div class="di-row"><span class="di-l">N° de procesos</span><span class="di-v" style="font-size:16px;font-weight:700;color:var(--b800)">${dashAct.length}</span></div>
    <div class="di-row"><span class="di-l">Tiempo en operación</span><span class="di-v" style="color:var(--green)">${mHM(porEstado.op)}</span></div>
    <div class="di-row"><span class="di-l">Tiempo detenido</span><span class="di-v" style="color:var(--orange)">${mHM(porEstado.det)}</span></div>
    <div class="di-row"><span class="di-l">Tiempo finalizado</span><span class="di-v">${mHM(porEstado.fin)}</span></div>`;
  }

  renderTimeline();

  // Merma por proceso
  const mb2 = document.getElementById('d-merma-body');
  const cm = dashAct.filter(r => r.merma > 0);
  if (!cm.length) { mb2.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    const mx = Math.max(...cm.map(r => r.merma));
    mb2.innerHTML = cm.map(r => `<div class="merma-item"><div class="merma-hd"><span style="font-size:12px;font-weight:500;color:var(--text)">${esc(r.proc)}</span><span style="font-size:12px;font-weight:600;color:var(--orange)">${r.merma.toFixed(1)} kg</span></div><div class="merma-bg"><div class="merma-fill" style="width:${Math.round(r.merma / mx * 100)}%"></div></div></div>`).join('');
  }

  // Rendimiento por proceso — cada actividad por separado (sumar todo el día
  // mezclaría pasos sin merma, ej. Descarga 20→20, con pasos que sí pierden
  // peso, e infla el % global de forma engañosa).
  const pb2 = document.getElementById('d-pesos-body');
  const rendActs = dashAct.filter(r => r.ping > 0);
  if (!rendActs.length) { pb2.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    pb2.innerHTML = rendActs.map(r => {
      const pct = r.psal / r.ping * 100;
      return `<div class="merma-item">
      <div class="merma-hd"><span style="font-size:12px;font-weight:500;color:var(--text)">${esc(r.proc)}${r.batch ? ' · ' + esc(r.batch) : ''}</span><span style="font-size:12px;font-weight:600;color:var(--green)">${pct.toFixed(1)}%</span></div>
      <div class="merma-bg"><div class="merma-fill" style="width:${Math.min(100, Math.round(pct))}%;background:linear-gradient(90deg,#4ade80,#16a34a)"></div></div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">${r.ping} kg → ${r.psal} kg</div>
    </div>`;
    }).join('');
  }

  document.getElementById('d-updated').textContent = `Última actualización: ${new Date().toLocaleTimeString('es-PE')}`;

  await renderTrendChart();
}

function renderTimeline() {
  const el = document.getElementById('d-tl-body');
  document.getElementById('d-tl-badge').textContent = dashAct.length;
  if (!dashAct.length) { el.innerHTML = '<div class="dc-empty">Sin actividades este día</div>'; return; }
  el.innerHTML = dashAct.map(a => {
    const start = tMin(a.ini);
    const end = a.fin !== '—' ? tMin(a.fin) : Math.min(1439, start + (a.durMin || 15));
    const left = (start / 1440 * 100).toFixed(2), width = Math.max(0.3, (end - start) / 1440 * 100).toFixed(2);
    return `<div class="tl-row">
      <div class="tl-label"><strong>${esc(a.proc)}</strong> · ${esc(a.equipo)}${a.batch ? ' · ' + esc(a.batch) : ''}<br>${a.ini} → ${a.fin}</div>
      <div class="tl-track"><div class="tl-bar ${a.estado}" style="left:${left}%;width:${width}%"></div></div>
    </div>`;
  }).join('') + `<div class="tl-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>`;
}

async function renderTrendChart() {
  const start = shiftDate(currentDashDate, -6);
  const { data: actRows, error } = await supabase.from('actividades')
    .select('codigo, fecha, peso_ingreso, peso_salida').gte('fecha', start).lte('fecha', currentDashDate);
  if (error) return;
  const codigos = actRows.map(r => r.codigo);
  const costRows = codigos.length
    ? (await supabase.from('costos').select('actividad_codigo, total').in('actividad_codigo', codigos)).data || []
    : [];
  const costByCod = Object.fromEntries(costRows.map(c => [c.actividad_codigo, parseFloat(c.total) || 0]));
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
  const rendArr = [], costoArr = [];
  days.forEach(d => {
    const rows = actRows.filter(r => r.fecha === d);
    const ing = rows.reduce((s, r) => s + (parseFloat(r.peso_ingreso) || 0), 0);
    const sal = rows.reduce((s, r) => s + (parseFloat(r.peso_salida) || 0), 0);
    rendArr.push(ing > 0 ? +(sal / ing * 100).toFixed(1) : null);
    costoArr.push(rows.reduce((s, r) => s + (costByCod[r.codigo] || 0), 0));
  });

  if (chartTrend) { chartTrend.destroy(); chartTrend = null; }
  const ctx = document.getElementById('chart-trend').getContext('2d');
  chartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => d.slice(5)),
      datasets: [
        { label: 'Rendimiento %', data: rendArr, borderColor: '#16a34a', backgroundColor: '#16a34a', yAxisID: 'y', tension: .3, spanGaps: true },
        { label: 'Costo total (S/.)', data: costoArr, borderColor: '#7c3aed', backgroundColor: '#7c3aed', yAxisID: 'y1', tension: .3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 11, padding: 10 } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#5A7FA8' } },
        y: { position: 'left', title: { display: true, text: '%' }, ticks: { font: { size: 10 } } },
        y1: { position: 'right', title: { display: true, text: 'S/.' }, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } },
      },
    },
  });
}

// ═══════════════════════════════
// PRODUCCIÓN POR NÚMERO DE PARTE — vista de maquila: un NP puede tardar
// varios días en cerrarse, así que esto NO se filtra por día como el
// resto del dashboard. Junta M1 (materia prima) + M2 (actividades) + M3
// (costos) de todos los días bajo un mismo NP.
// ═══════════════════════════════
async function fetchProduccionPorNP() {
  const cutoff = shiftDate(localDateStr(), -30);
  const { data: nps, error: npErr } = await supabase.from('numeros_parte').select('*')
    .or(`estado.eq.abierto,fecha_cierre.gte.${cutoff}`)
    .order('fecha_apertura', { ascending: false });
  if (npErr || !nps.length) return [];

  const nombres = nps.map(n => n.nombre);
  const [lotesRes, actRes] = await Promise.all([
    supabase.from('lotes').select('numero_parte, peso_kg').in('numero_parte', nombres),
    supabase.from('actividades').select('codigo, numero_parte, fecha, proceso, peso_ingreso, peso_salida, merma').in('numero_parte', nombres),
  ]);
  const codigos = (actRes.data || []).map(a => a.codigo);
  const costRes = codigos.length
    ? await supabase.from('costos').select('actividad_codigo, total').in('actividad_codigo', codigos)
    : { data: [] };
  const costByCod = Object.fromEntries((costRes.data || []).map(c => [c.actividad_codigo, parseFloat(c.total) || 0]));

  const abiertos = nps.filter(n => n.estado === 'abierto');
  const cerrados = nps.filter(n => n.estado === 'cerrado');
  return [...abiertos, ...cerrados].map(n => {
    const lotesN = (lotesRes.data || []).filter(l => l.numero_parte === n.nombre);
    const actN = (actRes.data || []).filter(a => a.numero_parte === n.nombre);
    const mp = lotesN.reduce((s, l) => s + (parseFloat(l.peso_kg) || 0), 0);
    const merma = actN.reduce((s, a) => s + (parseFloat(a.merma) || 0), 0);
    const costo = actN.reduce((s, a) => s + (costByCod[a.codigo] || 0), 0);
    return {
      nombre: n.nombre, cliente: n.cliente || '', estado: n.estado,
      fechaApertura: n.fecha_apertura, fechaCierre: n.fecha_cierre,
      mp, merma, costo, nActividades: actN.length,
      actividades: actN.map(a => ({
        codigo: a.codigo, fecha: a.fecha, proc: a.proceso,
        ping: parseFloat(a.peso_ingreso) || 0, psal: parseFloat(a.peso_salida) || 0,
        costo: costByCod[a.codigo] || 0,
      })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    };
  });
}

export async function renderProduccionPorNP() {
  const el = document.getElementById('d-np-body');
  if (el) el.innerHTML = '<div class="dc-empty">Cargando...</div>';
  produccionNP = await fetchProduccionPorNP();
  _renderProduccionPorNPList();
}

function _renderProduccionPorNPList() {
  const el = document.getElementById('d-np-body');
  if (!el) return;
  document.getElementById('d-np-badge').textContent = produccionNP.length;
  if (!produccionNP.length) { el.innerHTML = '<div class="dc-empty">Sin producción abierta, ni cerrada en los últimos 30 días.</div>'; return; }

  el.innerHTML = produccionNP.map(n => {
    const hoy = localDateStr();
    const dias = Math.round((new Date((n.fechaCierre || hoy) + 'T00:00:00') - new Date(n.fechaApertura + 'T00:00:00')) / 86400000) + 1;
    const expanded = expandedNP === n.nombre;
    return `<div class="np-prod-row">
      <div class="np-prod-hd" onclick="toggleProduccionNP('${n.nombre}')">
        <span class="sbadge ${n.estado === 'abierto' ? 'op' : 'fin'}">${n.estado === 'abierto' ? 'En curso' : 'Cerrado'}</span>
        <div class="np-prod-main">
          <div class="np-prod-name">${esc(n.nombre)}${n.cliente ? ' · ' + esc(n.cliente) : ''}</div>
          <div class="np-prod-meta">${fF(n.fechaApertura)} → ${n.fechaCierre ? fF(n.fechaCierre) : 'en curso'} · ${dias} día${dias !== 1 ? 's' : ''} · ${n.nActividades} proceso${n.nActividades !== 1 ? 's' : ''}</div>
        </div>
        <div class="np-prod-stat"><div class="np-prod-stat-v">${n.mp.toFixed(0)} kg</div><div class="np-prod-stat-l">Mat. prima</div></div>
        <div class="np-prod-stat"><div class="np-prod-stat-v" style="color:var(--orange)">${n.merma.toFixed(0)} kg</div><div class="np-prod-stat-l">Merma</div></div>
        <div class="np-prod-stat"><div class="np-prod-stat-v" style="color:var(--b600)">${fmt(n.costo)}</div><div class="np-prod-stat-l">Costo total</div></div>
        <span class="np-prod-chev">${expanded ? '▲' : '▼'}</span>
      </div>
      ${expanded ? `<div class="np-prod-detail">${_renderNpActivities(n.actividades)}</div>` : ''}
    </div>`;
  }).join('');
}

function _renderNpActivities(acts) {
  if (!acts.length) return '<div class="dc-empty" style="padding:1rem">Sin actividades registradas.</div>';
  return acts.map(a => {
    const pct = a.ping > 0 ? (a.psal / a.ping * 100) : null;
    return `<div class="di-row">
      <span class="di-l">${fF(a.fecha)} · ${esc(a.proc)}</span>
      <span class="di-v">${a.ping} kg → ${a.psal} kg${pct != null ? ' (' + pct.toFixed(1) + '%)' : ''} · ${fmt(a.costo)}</span>
    </div>`;
  }).join('');
}

export function toggleProduccionNP(nombre) {
  expandedNP = expandedNP === nombre ? null : nombre;
  _renderProduccionPorNPList();
}
