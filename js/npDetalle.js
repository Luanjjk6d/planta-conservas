// Vista de detalle por Número de Parte — a diferencia del resto de la app
// (que filtra por día), esto junta TODA la producción de un NP sin
// importar cuántos días haya tardado. Todo se calcula en el cliente a
// partir de m1Data/actividadesDB/costosDB/numerosParteDB, que ya están
// completos en memoria (main.js los carga sin filtro de fecha) — no hace
// falta ninguna consulta nueva a Supabase.
import { m1Data, actividadesDB, costosDB, numerosParteDB } from './state.js';
import { esc, fmt, fF, mHM, localDateStr } from './utils.js';
import { stL } from './constants.js';

let currentNP = null;

export function abrirDetalleNP(nombre) {
  currentNP = nombre;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-np-detail').classList.add('active');
  renderDetalleNP();
}

export function volverAProduccion() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-m4').classList.add('active');
}

function renderDetalleNP() {
  const np = numerosParteDB.find(n => n.nombre === currentNP);
  const lotes = m1Data.filter(l => l.np === currentNP);
  const acts = actividadesDB.filter(a => a.np === currentNP)
    .slice().sort((a, b) => (a.fecha + a.ini).localeCompare(b.fecha + b.ini));

  const mp = lotes.reduce((s, l) => s + (l.peso || 0), 0);
  const merma = acts.reduce((s, a) => s + (a.merma || 0), 0);
  const cajas = acts.reduce((s, a) => s + (a.cajas || 0), 0);
  const costo = acts.reduce((s, a) => s + (costosDB[a.id]?.total || 0), 0);
  const hoy = localDateStr();
  const dias = np ? Math.round((new Date((np.fechaCierre || hoy) + 'T00:00:00') - new Date(np.fechaApertura + 'T00:00:00')) / 86400000) + 1 : 0;

  document.getElementById('npd-title').textContent = currentNP || '';
  document.getElementById('npd-cliente').textContent = np?.cliente || 'Sin cliente asignado';
  const badge = document.getElementById('npd-badge');
  badge.className = 'sbadge ' + (np?.estado === 'abierto' ? 'op' : 'fin');
  badge.textContent = np?.estado === 'abierto' ? 'En curso' : 'Cerrado';
  document.getElementById('npd-fechas').textContent = np
    ? `${fF(np.fechaApertura)} → ${np.fechaCierre ? fF(np.fechaCierre) : 'en curso'} · ${dias} día${dias !== 1 ? 's' : ''}`
    : '—';

  document.getElementById('npd-mp').textContent = mp.toFixed(1);
  document.getElementById('npd-merma').textContent = merma.toFixed(1);
  document.getElementById('npd-cajas').textContent = cajas;
  document.getElementById('npd-costo').textContent = fmt(costo);

  _renderRendimientoPorOperacion(acts);
  _renderCajasPorDia(acts);
  _renderTiempoPorProceso(acts);
  _renderTimeline(acts);
}

function _renderRendimientoPorOperacion(acts) {
  const el = document.getElementById('npd-operaciones');
  const conPeso = acts.filter(a => a.ping > 0);
  if (!conPeso.length) { el.innerHTML = '<div class="dc-empty">Sin datos de peso registrados.</div>'; return; }
  const porProc = {};
  conPeso.forEach(a => { (porProc[a.proc] ||= []).push(a); });
  el.innerHTML = Object.entries(porProc).map(([proc, list]) => `
    <div class="npd-op-group">
      <div class="npd-op-title">${esc(proc)}</div>
      ${list.map(a => {
        const pct = a.psal / a.ping * 100;
        return `<div class="merma-item">
          <div class="merma-hd"><span style="font-size:12px;color:var(--text)">${fF(a.fecha)}${a.batch ? ' · Batch ' + esc(a.batch) : ''}</span><span style="font-size:12px;font-weight:600;color:var(--green)">${pct.toFixed(1)}%</span></div>
          <div class="merma-bg"><div class="merma-fill" style="width:${Math.min(100, pct)}%;background:linear-gradient(90deg,#4ade80,#16a34a)"></div></div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${a.ping} kg → ${a.psal} kg</div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function _renderCajasPorDia(acts) {
  const el = document.getElementById('npd-cajas-dia');
  const conCajas = acts.filter(a => a.cajas != null);
  if (!conCajas.length) { el.innerHTML = '<div class="dc-empty">Sin cajas registradas.</div>'; return; }
  const porDia = {};
  conCajas.forEach(a => { porDia[a.fecha] = (porDia[a.fecha] || 0) + a.cajas; });
  const dias = Object.keys(porDia).sort();
  const max = Math.max(...Object.values(porDia));
  el.innerHTML = dias.map(d => `<div class="merma-item">
    <div class="merma-hd"><span style="font-size:12px;color:var(--text)">${fF(d)}</span><span style="font-size:12px;font-weight:600;color:var(--b600)">${porDia[d]} cajas</span></div>
    <div class="merma-bg"><div class="merma-fill" style="width:${Math.round(porDia[d] / max * 100)}%;background:linear-gradient(90deg,var(--b400),var(--b600))"></div></div>
  </div>`).join('');
}

function _renderTiempoPorProceso(acts) {
  const el = document.getElementById('npd-tiempos');
  const conDur = acts.filter(a => a.durMin > 0);
  if (!conDur.length) { el.innerHTML = '<div class="dc-empty">Sin duraciones registradas.</div>'; return; }
  const porProc = {};
  conDur.forEach(a => { porProc[a.proc] = (porProc[a.proc] || 0) + a.durMin; });
  el.innerHTML = Object.entries(porProc).sort((a, b) => b[1] - a[1]).map(([proc, min]) =>
    `<div class="di-row"><span class="di-l">${esc(proc)}</span><span class="di-v">${mHM(min)}</span></div>`).join('');
}

function _renderTimeline(acts) {
  const el = document.getElementById('npd-timeline');
  if (!acts.length) { el.innerHTML = '<div class="dc-empty">Sin actividades registradas.</div>'; return; }
  el.innerHTML = acts.map(a => `<div class="card">
    <div class="card-head">
      <div><div class="card-title">${esc(a.proc)}${a.batch ? ' · Batch ' + esc(a.batch) : ''}</div><div class="card-meta">${fF(a.fecha)} · ${a.ini} → ${a.fin} ${a.durMin ? '· ' + mHM(a.durMin) : ''} · Equipo: ${esc(a.equipo)}</div></div>
      <span class="sbadge ${a.estado}">${stL[a.estado]}</span>
    </div>
    ${a.ping || a.psal ? `<div class="pill"><strong>Ingreso:</strong> ${a.ping} kg → <strong>Salida:</strong> ${a.psal} kg${a.merma > 0 ? ' → <strong style="color:var(--orange)">Merma: ' + a.merma.toFixed(1) + ' kg</strong>' : ''}</div>` : ''}
    ${a.cajas != null ? `<div class="pill gr"><strong>Cajas:</strong> ${a.cajas}</div>` : ''}
    <div style="margin-top:6px">${costosDB[a.id] ? '<span class="as-costed">Costeado — ' + fmt(costosDB[a.id].total) + '</span>' : '<span class="as-uncosted">Sin costear</span>'}</div>
  </div>`).join('');
}
