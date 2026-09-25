import { supabase } from './supabaseClient.js';
import { esc, fF, mHM, tMin, toast, localDateStr, shiftDate, fDateLong } from './utils.js';
import { stL } from './constants.js';
import { mapLote } from './m1.js';
import { mapActividad } from './m2.js';
import { m1Data, actividadesDB, numerosParteDB } from './state.js';

let chartTrend = null;
let currentDashDate = localDateStr();
let dashLotes = [], dashAct = []; // sin filtrar (todo el día)
let filtroNp = '', filtroProd = '', filtroTurno = '';
let produccionNP = [];

async function fetchDashboardData(dateStr) {
  const [lotesRes, actRes] = await Promise.all([
    supabase.from('lotes').select('*').eq('fecha', dateStr).order('created_at', { ascending: false }),
    supabase.from('actividades').select('*').eq('fecha', dateStr).order('hora_inicio', { ascending: true }),
  ]);
  if (lotesRes.error || actRes.error) { toast('Error al cargar el dashboard.', true); return null; }
  const lotes = lotesRes.data.map(mapLote);
  const act = actRes.data.map(mapActividad);
  return { lotes, act };
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
  dashLotes = result.lotes; dashAct = result.act;
  updateDateNav();
  filtroNp = ''; filtroProd = ''; filtroTurno = '';
  _poblarFiltros();
  _renderTodo();
}

// ───────── Filtros (NP / Producto / Turno) ─────────
// Se recalculan sobre lo ya cargado para ese día — sin consultas nuevas.
function _poblarFiltros() {
  const selNp = document.getElementById('dash-f-np');
  const selProd = document.getElementById('dash-f-prod');
  const selTurno = document.getElementById('dash-f-turno');
  if (!selNp) return;
  const nps = [...new Set(dashAct.map(a => a.np).filter(Boolean))].sort();
  const prods = [...new Set(dashLotes.map(l => l.prod).filter(Boolean))].sort();
  const turnos = [...new Set(dashLotes.map(l => l.turno).filter(Boolean))].sort();
  selNp.innerHTML = '<option value="">Todos los NP</option>' + nps.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  selProd.innerHTML = '<option value="">Todos los productos</option>' + prods.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  selTurno.innerHTML = '<option value="">Todos los turnos</option>' + turnos.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
}

function _datosFiltrados() {
  let act = dashAct, lotes = dashLotes;
  if (filtroNp) {
    act = act.filter(a => a.np === filtroNp);
    lotes = lotes.filter(l => l.np === filtroNp);
  }
  if (filtroProd) {
    const nps = new Set(dashLotes.filter(l => l.prod === filtroProd).map(l => l.np));
    act = act.filter(a => nps.has(a.np));
    lotes = lotes.filter(l => l.prod === filtroProd);
  }
  if (filtroTurno) {
    const nps = new Set(dashLotes.filter(l => l.turno === filtroTurno).map(l => l.np));
    act = act.filter(a => nps.has(a.np));
    lotes = lotes.filter(l => l.turno === filtroTurno);
  }
  return { act, lotes };
}

export function dashAplicarFiltros() {
  filtroNp = document.getElementById('dash-f-np').value;
  filtroProd = document.getElementById('dash-f-prod').value;
  filtroTurno = document.getElementById('dash-f-turno').value;
  _renderTodo();
}

// Última salida registrada — por NP, la salida de la actividad con la hora
// más tardía (fin si existe, si no inicio). No asume que sea producto
// terminado, solo la última etapa que se alcanzó a registrar ese NP ese día.
function _ultimaSalidaRegistrada(act) {
  const porNp = new Map();
  act.forEach(a => {
    const t = a.fin !== '—' ? tMin(a.fin) : tMin(a.ini);
    const prev = porNp.get(a.np || '');
    if (!prev || t >= prev.t) porNp.set(a.np || '', { t, psal: a.psal || 0 });
  });
  return [...porNp.values()].reduce((s, v) => s + v.psal, 0);
}

// Flujo de producción — agrupado por proceso (todas las actividades de ese
// proceso ese día/filtro, sumadas). Rendimiento y velocidad se calculan
// sobre los totales agrupados, no promediando porcentajes.
function _flujoProduccion(act) {
  const porProceso = new Map();
  act.forEach(a => {
    if (!porProceso.has(a.proc)) porProceso.set(a.proc, { ing: 0, sal: 0, durMin: 0, n: 0 });
    const g = porProceso.get(a.proc);
    g.ing += a.ping || 0; g.sal += a.psal || 0; g.durMin += a.durMin || 0; g.n++;
  });
  return [...porProceso.entries()].map(([proc, g]) => {
    const merma = Math.max(0, g.ing - g.sal);
    const rendimiento = g.ing > 0 ? (g.sal / g.ing * 100) : null;
    const horas = g.durMin / 60;
    const velocidad = horas > 0 ? (g.sal / horas) : null;
    return { proc, ...g, merma, rendimiento, horas, velocidad };
  });
}

function _renderFlujoProduccion(flujo) {
  const el = document.getElementById('d-flujo-body');
  document.getElementById('d-flujo-badge').textContent = flujo.length;
  if (!flujo.length) { el.innerHTML = '<div class="dc-empty">Sin datos</div>'; return; }
  el.innerHTML = `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Proceso</th><th>Ingreso kg</th><th>Salida kg</th><th>Merma kg</th><th>Rendimiento</th><th>Duración</th><th>Velocidad</th></tr></thead>
    <tbody>${flujo.map(f => `<tr>
      <td class="tbl-main">${esc(f.proc)}</td>
      <td>${f.ing.toFixed(1)}</td>
      <td>${f.sal.toFixed(1)}</td>
      <td>${f.merma.toFixed(1)}</td>
      <td>${f.rendimiento != null ? f.rendimiento.toFixed(1) + '%' : '<span class="tbl-empty">—</span>'}</td>
      <td>${f.durMin ? mHM(f.durMin) : '<span class="tbl-empty">—</span>'}</td>
      <td>${f.velocidad != null ? f.velocidad.toFixed(0) + ' kg/h' : '<span class="tbl-empty">—</span>'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// Productividad por proceso — usa el mismo agrupado que Flujo de
// producción, sumando además horas-hombre (personal × horas de CADA
// actividad, no personal-total × horas-total, para no inflar el HH
// cuando el personal varió entre actividades del mismo proceso).
function _productividad(flujo, act) {
  return flujo.map(f => {
    const actsProc = act.filter(a => a.proc === f.proc);
    const personal = actsProc.reduce((s, a) => s + (a.totalPersonal || 0), 0);
    const hh = actsProc.reduce((s, a) => s + (a.totalPersonal || 0) * (a.durHoras || 0), 0);
    return { proc: f.proc, kgH: f.velocidad, personal, hh, kgHH: hh > 0 ? f.sal / hh : null };
  });
}

function _renderProductividad(flujo, act) {
  const el = document.getElementById('d-prod-body');
  const prod = _productividad(flujo, act);
  document.getElementById('d-prod-badge').textContent = prod.length;
  if (!prod.length) { el.innerHTML = '<div class="dc-empty">Sin datos</div>'; return; }
  el.innerHTML = `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Proceso</th><th>kg/h</th><th>N° trabajadores</th><th>Horas-hombre</th><th>kg/HH</th></tr></thead>
    <tbody>${prod.map(p => `<tr>
      <td class="tbl-main">${esc(p.proc)}</td>
      <td>${p.kgH != null ? p.kgH.toFixed(0) + ' kg/h' : '<span class="tbl-empty">—</span>'}</td>
      <td>${p.personal || '<span class="tbl-empty">—</span>'}</td>
      <td>${p.hh > 0 ? p.hh.toFixed(1) : '<span class="tbl-empty">—</span>'}</td>
      <td>${p.kgHH != null ? p.kgHH.toFixed(1) + ' kg/HH' : '<span class="tbl-empty">Sin datos</span>'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ───────── Real vs Histórico ─────────
// "Producción comparable" = un NP distinto (con el mismo producto/especie
// y el mismo proceso). Se agrupan sus actividades para calcular sus
// propios rendimiento/kg-h/kg-HH, y se promedian las últimas 5.
function _productoDeNp(np) {
  return m1Data.find(l => l.np === np)?.prod || null;
}

function _historicoComparable(producto, proceso, npExcluir) {
  const porNp = new Map();
  actividadesDB.forEach(a => {
    if (a.proc !== proceso || a.np === npExcluir) return;
    if (_productoDeNp(a.np) !== producto) return;
    if (!porNp.has(a.np)) porNp.set(a.np, { ing: 0, sal: 0, durMin: 0, hh: 0, fechaMax: a.fecha });
    const g = porNp.get(a.np);
    g.ing += a.ping || 0; g.sal += a.psal || 0; g.durMin += a.durMin || 0;
    g.hh += (a.totalPersonal || 0) * (a.durHoras || 0);
    if (a.fecha > g.fechaMax) g.fechaMax = a.fecha;
  });
  return [...porNp.values()]
    .map(g => {
      const horas = g.durMin / 60;
      return {
        fecha: g.fechaMax,
        rendimiento: g.ing > 0 ? g.sal / g.ing * 100 : null,
        kgH: horas > 0 ? g.sal / horas : null,
        kgHH: g.hh > 0 ? g.sal / g.hh : null,
      };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 5);
}

function _promedio(arr, key) {
  const v = arr.map(x => x[key]).filter(x => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

function _realVsHistorico(act) {
  const porNpProc = new Map();
  act.forEach(a => {
    if (!(a.ping > 0 || a.psal > 0)) return;
    const key = (a.np || '—') + '|' + a.proc;
    if (!porNpProc.has(key)) porNpProc.set(key, { np: a.np, proc: a.proc, ing: 0, sal: 0, durMin: 0, hh: 0 });
    const g = porNpProc.get(key);
    g.ing += a.ping || 0; g.sal += a.psal || 0; g.durMin += a.durMin || 0;
    g.hh += (a.totalPersonal || 0) * (a.durHoras || 0);
  });
  return [...porNpProc.values()].map(g => {
    const horas = g.durMin / 60;
    const hoy = {
      rendimiento: g.ing > 0 ? g.sal / g.ing * 100 : null,
      kgH: horas > 0 ? g.sal / horas : null,
      kgHH: g.hh > 0 ? g.sal / g.hh : null,
    };
    const producto = _productoDeNp(g.np);
    const historico = producto ? _historicoComparable(producto, g.proc, g.np) : [];
    const suficiente = historico.length >= 3;
    return {
      np: g.np, proc: g.proc, producto, hoy, nHistorico: historico.length, suficiente,
      histProm: suficiente ? { rendimiento: _promedio(historico, 'rendimiento'), kgH: _promedio(historico, 'kgH'), kgHH: _promedio(historico, 'kgHH') } : null,
    };
  });
}

function _flechaVariacion(delta) {
  if (delta == null) return '';
  if (delta > 0) return '<span style="color:var(--green)">↑</span>';
  if (delta < 0) return '<span style="color:var(--red)">↓</span>';
  return '<span style="color:var(--muted)">→</span>';
}

function _rvhFila(label, hoyVal, histVal, unidad, esPuntos) {
  if (hoyVal == null) return '';
  if (histVal == null) return `<div class="di-row"><span class="di-l">${label}</span><span class="di-v">${hoyVal.toFixed(1)}${unidad}</span></div>`;
  const delta = hoyVal - histVal;
  const deltaTxt = esPuntos
    ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts`
    : `${delta >= 0 ? '+' : ''}${(delta / histVal * 100).toFixed(1)}%`;
  return `<div class="di-row"><span class="di-l">${label}</span><span class="di-v">${hoyVal.toFixed(1)}${unidad} <span style="color:var(--muted);font-weight:400">(hist. ${histVal.toFixed(1)}${unidad})</span> ${_flechaVariacion(delta)} ${deltaTxt}</span></div>`;
}

function _renderRealVsHistorico(act) {
  const el = document.getElementById('d-rvh-body');
  const grupos = _realVsHistorico(act);
  document.getElementById('d-rvh-badge').textContent = grupos.length;
  if (!grupos.length) { el.innerHTML = '<div class="dc-empty">Sin datos</div>'; return; }
  el.innerHTML = `<div class="dg">${grupos.map(g => `
    <div class="rvh-card">
      <div class="rvh-hdr">${esc(g.proc)}${g.producto ? ' — ' + esc(g.producto) : ''}<span class="rvh-np">NP ${esc(g.np || '—')}</span></div>
      ${!g.suficiente
      ? '<div class="dc-empty">Histórico insuficiente</div>'
      : `${_rvhFila('Rendimiento', g.hoy.rendimiento, g.histProm.rendimiento, '%', true)}
         ${_rvhFila('kg/h', g.hoy.kgH, g.histProm.kgH, '', false)}
         ${_rvhFila('kg/HH', g.hoy.kgHH, g.histProm.kgHH, '', false)}
         <div class="rvh-nota">vs. promedio de ${g.nHistorico} ${g.nHistorico !== 1 ? 'producciones anteriores' : 'producción anterior'} de ${esc(g.producto)} en ${esc(g.proc)}</div>`}
    </div>`).join('')}</div>`;
}

function _renderTodo() {
  const { act, lotes } = _datosFiltrados();

  _renderLineaProduccionDia(act);

  // Resumen del día — 4 indicadores, sin costos.
  const totMP = lotes.reduce((s, r) => s + r.peso, 0);
  document.getElementById('d-mp').textContent = totMP.toFixed(1);
  document.getElementById('d-ultima-salida').textContent = _ultimaSalidaRegistrada(act).toFixed(1);
  document.getElementById('d-n-procesos').textContent = act.length;
  const tiempoTotal = act.reduce((s, a) => s + (a.durMin || 0), 0);
  document.getElementById('d-tiempo-reg').textContent = tiempoTotal ? mHM(tiempoTotal) : '0h';

  // Último lote — sigue al NP que se trabaja ese día, sin exigir que el lote
  // se haya registrado ese mismo día: un NP puede tardar varios días en
  // cerrarse y seguir usando el lote con el que abrió.
  const lb = document.getElementById('d-lote-body'), lbadge = document.getElementById('d-lote-badge');
  const npDelDia = act[0]?.np;
  const r = (npDelDia && m1Data.find(l => l.np === npDelDia)) || lotes[0];
  if (!r) { lb.innerHTML = '<div class="dc-empty">Sin datos</div>'; lbadge.textContent = '—'; }
  else {
    lbadge.textContent = r.np;
    lb.innerHTML = `<div class="di-row"><span class="di-l">N° parte</span><span class="di-v" style="font-family:'DM Mono',monospace">${esc(r.np)}</span></div>
    <div class="di-row"><span class="di-l">Producto</span><span class="di-v">${esc(r.prod)}</span></div>
    <div class="di-row"><span class="di-l">Especie</span><span class="di-v">${esc(r.especie) || '—'}</span></div>
    <div class="di-row"><span class="di-l">Peso MP</span><span class="di-v">${r.peso} kg</span></div>
    <div class="di-row"><span class="di-l">Supervisor</span><span class="di-v">${esc(r.sup)}</span></div>
    <div class="di-row"><span class="di-l">Turno</span><span class="di-v">${esc(r.turno) || '—'}</span></div>`;
  }

  // Personal del turno
  const totH = act.reduce((s, r) => s + r.h, 0);
  const totM = act.reduce((s, r) => s + r.m, 0);
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

  // Resumen del día — n° de procesos + tiempo por estado
  const porEstado = { op: 0, det: 0, fin: 0 };
  act.forEach(a => { porEstado[a.estado] = (porEstado[a.estado] || 0) + (a.durMin || 0); });
  document.getElementById('d-resumen-badge').textContent = act.length;
  const rb = document.getElementById('d-resumen-body');
  if (!act.length) { rb.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    rb.innerHTML = `<div class="di-row"><span class="di-l">N° de procesos</span><span class="di-v" style="font-size:16px;font-weight:700;color:var(--b800)">${act.length}</span></div>
    <div class="di-row"><span class="di-l">Tiempo en operación</span><span class="di-v" style="color:var(--green)">${mHM(porEstado.op)}</span></div>
    <div class="di-row"><span class="di-l">Tiempo detenido</span><span class="di-v" style="color:var(--orange)">${mHM(porEstado.det)}</span></div>
    <div class="di-row"><span class="di-l">Tiempo finalizado</span><span class="di-v">${mHM(porEstado.fin)}</span></div>`;
  }

  const flujo = _flujoProduccion(act);
  _renderFlujoProduccion(flujo);
  _renderProductividad(flujo, act);
  _renderRealVsHistorico(act);
  renderTimeline(act);

  // Merma por proceso
  const mb2 = document.getElementById('d-merma-body');
  const cm = act.filter(r => r.merma > 0);
  if (!cm.length) { mb2.innerHTML = '<div class="dc-empty">Sin datos</div>'; }
  else {
    const mx = Math.max(...cm.map(r => r.merma));
    mb2.innerHTML = cm.map(r => `<div class="merma-item"><div class="merma-hd"><span style="font-size:12px;font-weight:500;color:var(--text)">${esc(r.proc)}</span><span style="font-size:12px;font-weight:600;color:var(--orange)">${r.merma.toFixed(1)} kg</span></div><div class="merma-bg"><div class="merma-fill" style="width:${Math.round(r.merma / mx * 100)}%"></div></div></div>`).join('');
  }

  // Rendimiento por proceso — cada actividad por separado (sumar todo el día
  // mezclaría pasos sin merma, ej. Descarga 20→20, con pasos que sí pierden
  // peso, e infla el % global de forma engañosa).
  const pb2 = document.getElementById('d-pesos-body');
  const rendActs = act.filter(r => r.ping > 0);
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

  renderTrendChart();
}

// Línea de producción del día — una estación por CADA actividad del día
// (no agrupada por proceso, a diferencia de otras vistas) para que se vea
// todo lo que pasó, en orden. Puede haber actividades de más de un NP el
// mismo día — por eso cada estación aclara a cuál pertenece.
function _renderLineaProduccionDia(act) {
  const el = document.getElementById('d-linea');
  if (!el) return;
  if (!act.length) { el.innerHTML = '<div class="dc-empty">Sin actividades este día.</div>'; return; }
  const ordenado = act.slice().sort((a, b) => tMin(a.ini) - tMin(b.ini));
  el.innerHTML = ordenado.map((a, i) => `
    ${i > 0 ? '<div class="npd-linea-arrow">→</div>' : ''}
    <div class="npd-station npd-station-${a.estado}">
      <div class="npd-station-badge">${stL[a.estado]}</div>
      <div class="npd-station-proc">${esc(a.proc)}</div>
      <div class="npd-station-meta">${a.np ? 'NP ' + esc(a.np) : 'Sin NP'}${a.batch ? ' · Batch ' + esc(a.batch) : ''}</div>
      <div class="npd-station-meta">${a.ini}${a.fin !== '—' ? ' → ' + a.fin : ''}</div>
      <div class="npd-station-personal">${a.totalPersonal} persona${a.totalPersonal !== 1 ? 's' : ''}</div>
      <div class="npd-station-count">${a.ping || a.psal ? a.ping + ' kg → ' + a.psal + ' kg' : 'Sin peso registrado'}</div>
    </div>`).join('');
}

function renderTimeline(act) {
  const el = document.getElementById('d-tl-body');
  document.getElementById('d-tl-badge').textContent = act.length;
  if (!act.length) { el.innerHTML = '<div class="dc-empty">Sin actividades este día</div>'; return; }
  el.innerHTML = act.map(a => {
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
    .select('fecha, peso_ingreso, peso_salida').gte('fecha', start).lte('fecha', currentDashDate);
  if (error) return;
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
  const rendArr = [];
  days.forEach(d => {
    const rows = actRows.filter(r => r.fecha === d);
    const ing = rows.reduce((s, r) => s + (parseFloat(r.peso_ingreso) || 0), 0);
    const sal = rows.reduce((s, r) => s + (parseFloat(r.peso_salida) || 0), 0);
    rendArr.push(ing > 0 ? +(sal / ing * 100).toFixed(1) : null);
  });

  if (chartTrend) { chartTrend.destroy(); chartTrend = null; }
  const ctx = document.getElementById('chart-trend').getContext('2d');
  chartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => d.slice(5)),
      datasets: [
        { label: 'Rendimiento %', data: rendArr, borderColor: '#16a34a', backgroundColor: '#16a34a', tension: .3, spanGaps: true },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 11, padding: 10 } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#5A7FA8' } },
        y: { title: { display: true, text: '%' }, ticks: { font: { size: 10 } } },
      },
    },
  });
}

// ═══════════════════════════════
// PRODUCCIÓN POR NÚMERO DE PARTE — vista de maquila: un NP puede tardar
// varios días en cerrarse, así que esto NO se filtra por día como el
// resto del dashboard. Se calcula en el cliente a partir de los datos
// que ya están completos en memoria (m1Data/actividadesDB/numerosParteDB
// no tienen filtro de fecha) — sin consultas nuevas.
// Hacer clic en un NP abre su detalle completo (ver npDetalle.js).
// ═══════════════════════════════
function _calcularProduccionPorNP() {
  const cutoff = shiftDate(localDateStr(), -30);
  const nps = numerosParteDB.filter(n => n.estado === 'abierto' || (n.fechaCierre && n.fechaCierre >= cutoff));
  const abiertos = nps.filter(n => n.estado === 'abierto');
  const cerrados = nps.filter(n => n.estado === 'cerrado');
  return [...abiertos, ...cerrados].map(n => {
    const lotesN = m1Data.filter(l => l.np === n.nombre);
    const actN = actividadesDB.filter(a => a.np === n.nombre);
    const mp = lotesN.reduce((s, l) => s + (l.peso || 0), 0);
    const merma = actN.reduce((s, a) => s + (a.merma || 0), 0);
    return {
      nombre: n.nombre, cliente: n.cliente || '', estado: n.estado,
      fechaApertura: n.fechaApertura, fechaCierre: n.fechaCierre,
      mp, merma, nActividades: actN.length,
    };
  });
}

export function renderProduccionPorNP() {
  produccionNP = _calcularProduccionPorNP();
  const el = document.getElementById('d-np-body');
  if (!el) return;
  document.getElementById('d-np-badge').textContent = produccionNP.length;
  if (!produccionNP.length) { el.innerHTML = '<div class="dc-empty">Sin producción abierta, ni cerrada en los últimos 30 días.</div>'; return; }

  el.innerHTML = produccionNP.map(n => {
    const hoy = localDateStr();
    const dias = Math.round((new Date((n.fechaCierre || hoy) + 'T00:00:00') - new Date(n.fechaApertura + 'T00:00:00')) / 86400000) + 1;
    return `<div class="np-prod-row">
      <div class="np-prod-hd" onclick="abrirDetalleNP('${n.nombre}')">
        <span class="sbadge ${n.estado === 'abierto' ? 'op' : 'fin'}">${n.estado === 'abierto' ? 'En curso' : 'Cerrado'}</span>
        <div class="np-prod-main">
          <div class="np-prod-name">${esc(n.nombre)}${n.cliente ? ' · ' + esc(n.cliente) : ''}</div>
          <div class="np-prod-meta">${fF(n.fechaApertura)} → ${n.fechaCierre ? fF(n.fechaCierre) : 'en curso'} · ${dias} día${dias !== 1 ? 's' : ''} · ${n.nActividades} proceso${n.nActividades !== 1 ? 's' : ''}</div>
        </div>
        <div class="np-prod-stat"><div class="np-prod-stat-v">${n.mp.toFixed(0)} kg</div><div class="np-prod-stat-l">Mat. prima</div></div>
        <div class="np-prod-stat"><div class="np-prod-stat-v" style="color:var(--orange)">${n.merma.toFixed(0)} kg</div><div class="np-prod-stat-l">Merma</div></div>
        <span class="np-prod-chev">→</span>
      </div>
    </div>`;
  }).join('');
}
