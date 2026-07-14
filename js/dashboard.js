import { m1Data, actividadesDB, costosDB, latasData } from './state.js';
import { esc, fmt, mHM } from './utils.js';
import { stL } from './constants.js';

let chartPie = null, chartBar = null;

export function renderDash() {
  const totMP = m1Data.reduce((s, r) => s + r.peso, 0);
  const totLatas = latasData.reduce((s, r) => s + r.latas, 0);
  const totMerma = actividadesDB.reduce((s, r) => s + (r.merma || 0), 0);
  const totCosto = Object.values(costosDB).reduce((s, c) => s + (c.total || 0), 0);

  document.getElementById('d-mp').textContent = totMP.toFixed(1);
  document.getElementById('d-latas').textContent = totLatas.toLocaleString();
  document.getElementById('d-merma').textContent = totMerma.toFixed(1);
  document.getElementById('d-costo').textContent = fmt(totCosto);

  // Último lote
  const lb = document.getElementById('d-lote-body'), lbadge = document.getElementById('d-lote-badge');
  if (!m1Data.length) { lb.innerHTML = '<div class="dc-empty">Sin datos</div>'; lbadge.textContent = '—'; }
  else {
    const r = m1Data[0]; lbadge.textContent = r.nl;
    lb.innerHTML = `<div class="di-row"><span class="di-l">N° parte</span><span class="di-v" style="font-family:'DM Mono',monospace">${esc(r.np)}</span></div>
    <div class="di-row"><span class="di-l">Producto</span><span class="di-v">${esc(r.prod)}</span></div>
    <div class="di-row"><span class="di-l">Especie</span><span class="di-v">${esc(r.especie) || '—'}</span></div>
    <div class="di-row"><span class="di-l">Peso MP</span><span class="di-v">${r.peso} kg</span></div>
    <div class="di-row"><span class="di-l">Supervisor</span><span class="di-v">${esc(r.sup)}</span></div>
    <div class="di-row"><span class="di-l">Turno</span><span class="di-v">${esc(r.turno) || '—'}</span></div>`;
  }

  // Personal
  const totH = actividadesDB.reduce((s, r) => s + r.h, 0);
  const totM = actividadesDB.reduce((s, r) => s + r.m, 0);
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
  const costeadas = Object.keys(costosDB).length;
  document.getElementById('d-cost-badge').textContent = `${costeadas}/${actividadesDB.length}`;
  const cb = document.getElementById('d-cost-body');
  if (!actividadesDB.length) { cb.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    const vals = Object.values(costosDB);
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
      ${actividadesDB.map(a => { const c = costosDB[a.id]; return `<div class="di-row"><span class="di-l" style="font-size:11px">${esc(a.proc)}</span><span class="di-v" style="font-size:11px">${c ? fmt(c.total) : '<span style="color:var(--orange)">Sin costear</span>'}</span></div>`; }).join('')}`;
  }

  // Actividad
  const ab = document.getElementById('d-act-body'); document.getElementById('d-act-badge').textContent = actividadesDB.length;
  if (!actividadesDB.length) { ab.innerHTML = '<div class="dc-empty">Sin procesos</div>'; }
  else { ab.innerHTML = [...actividadesDB].reverse().map(r => `<div class="dproc"><div><div class="dproc-name">${esc(r.proc)} <span style="font-size:10px;color:var(--muted)">· ${esc(r.equipo)}</span></div><div class="dproc-times">${r.ini} → ${r.fin}${r.durMin ? ' · ' + mHM(r.durMin) : ''}</div></div><span class="sbadge ${r.estado}" style="font-size:10px">${stL[r.estado]}</span></div>`).join(''); }

  // Latas timeline
  const lt = document.getElementById('d-lt-body'); document.getElementById('d-lt-badge').textContent = latasData.length;
  if (!latasData.length) { lt.innerHTML = '<div class="dc-empty">Sin registros</div>'; }
  else {
    const mx = Math.max(...latasData.map(r => r.latas));
    lt.innerHTML = latasData.map(r => `<div class="lt-row"><span class="lt-hora">${r.hora}</span><div class="lt-bw"><div class="lt-b" style="width:${Math.round(r.latas / mx * 100)}%"></div></div><span class="lt-qty">${r.latas.toLocaleString()}</span></div>`).join('');
  }

  // Pie chart
  const meta = parseInt(document.getElementById('meta-latas').value) || 0;
  const pend = meta > totLatas ? meta - totLatas : 0;
  const pct = meta > 0 ? Math.min(100, Math.round(totLatas / meta * 100)) : 0;
  document.getElementById('d-pie-pct').textContent = meta > 0 ? `${pct}%` : 'Sin meta';
  document.getElementById('pl-cerradas').textContent = totLatas.toLocaleString();
  document.getElementById('pl-pend').textContent = meta > 0 ? pend.toLocaleString() : '—';
  document.getElementById('pl-kg').textContent = (totLatas * .12).toFixed(1) + ' kg';
  if (chartPie) { chartPie.destroy(); chartPie = null; }
  const ctxP = document.getElementById('chart-pie').getContext('2d');
  chartPie = new Chart(ctxP, { type: 'doughnut', data: { labels: ['Cerradas', 'Pendientes'], datasets: [{ data: meta > 0 ? [totLatas, pend] : [totLatas || 1, 0], backgroundColor: ['#378ADD', '#D8E2EF'], borderWidth: 0, hoverOffset: 5 }] }, options: { cutout: '72%', animation: { duration: 600 }, plugins: { legend: { display: false } } }, plugins: [{ id: 'ct', afterDraw(ch) { const { ctx, chartArea: { width: w, height: h, left: l, top: t } } = ch; ctx.save(); const cx = l + w / 2, cy = t + h / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 20px DM Mono,monospace'; ctx.fillStyle = '#042C53'; ctx.fillText(meta > 0 ? `${pct}%` : totLatas.toLocaleString(), cx, cy - 7); ctx.font = '11px DM Sans,sans-serif'; ctx.fillStyle = '#5A7FA8'; ctx.fillText(meta > 0 ? 'avance' : 'latas', cx, cy + 11); ctx.restore(); } }] });

  // Bar chart
  document.getElementById('d-bar-total').textContent = totLatas.toLocaleString() + ' latas';
  if (chartBar) { chartBar.destroy(); chartBar = null; }
  const ctxB = document.getElementById('chart-bar').getContext('2d');
  if (latasData.length) {
    let acc = 0; const acum = latasData.map(r => { acc += r.latas; return acc; });
    chartBar = new Chart(ctxB, { type: 'bar', data: { labels: latasData.map(r => r.hora), datasets: [{ label: 'Latas', data: latasData.map(r => r.latas), backgroundColor: 'rgba(55,138,221,.7)', borderColor: '#185FA5', borderWidth: 1.5, borderRadius: 5, order: 2 }, { label: 'Acumulado', data: acum, type: 'line', borderColor: '#4ade80', borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#4ade80', fill: false, tension: .3, order: 1 }, ...(meta > 0 ? [{ label: 'Meta', data: latasData.map(() => meta), type: 'line', borderColor: '#a78bfa', borderDash: [6, 4], borderWidth: 2, pointRadius: 0, fill: false, order: 0 }] : [])], }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 11, padding: 10 } } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 11 }, color: '#5A7FA8' } }, y: { grid: { color: '#EEF2F7' }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#5A7FA8' }, beginAtZero: true } } } });
  }

  // Merma
  const mb2 = document.getElementById('d-merma-body');
  const cm = actividadesDB.filter(r => r.merma > 0);
  if (!cm.length) { mb2.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    const mx = Math.max(...cm.map(r => r.merma));
    mb2.innerHTML = cm.map(r => `<div class="merma-item"><div class="merma-hd"><span style="font-size:12px;font-weight:500;color:var(--text)">${esc(r.proc)}</span><span style="font-size:12px;font-weight:600;color:var(--orange)">${r.merma.toFixed(1)} kg</span></div><div class="merma-bg"><div class="merma-fill" style="width:${Math.round(r.merma / mx * 100)}%"></div></div></div>`).join('');
  }

  // Pesos
  const pb2 = document.getElementById('d-pesos-body');
  const ti = actividadesDB.reduce((s, r) => s + r.ping, 0), to = actividadesDB.reduce((s, r) => s + r.psal, 0);
  if (!ti) { pb2.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    const rend = ti > 0 ? (to / ti * 100).toFixed(1) : 0;
    pb2.innerHTML = `<div class="di-row"><span class="di-l">Peso ingreso total</span><span class="di-v">${ti.toFixed(1)} kg</span></div>
    <div class="di-row"><span class="di-l">Peso salida total</span><span class="di-v">${to.toFixed(1)} kg</span></div>
    <div class="di-row"><span class="di-l">Merma total</span><span class="di-v" style="color:var(--orange);font-weight:600">${(ti - to).toFixed(1)} kg</span></div>
    <div class="di-row"><span class="di-l">Rendimiento</span><span class="di-v" style="color:var(--green);font-weight:700;font-size:18px">${rend}%</span></div>
    <div style="margin-top:10px;background:var(--g100);border-radius:999px;height:9px;overflow:hidden"><div style="height:100%;width:${Math.min(100, parseFloat(rend))}%;background:linear-gradient(90deg,#4ade80,#16a34a);border-radius:999px"></div></div>`;
  }

  document.getElementById('d-updated').textContent = `Última actualización: ${new Date().toLocaleTimeString('es-PE')}`;
}
