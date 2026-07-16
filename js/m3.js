import { supabase } from './supabaseClient.js';
import { actividadesDB, costosDB } from './state.js';
import { esc, fmt, fmtN, mHM, toast } from './utils.js';
import { stL } from './constants.js';
import { rendM2 } from './m2.js';

let selectedActId = null;

export function mapCosto(row) {
  return {
    costoEsm: parseFloat(row.costo_esm) || 0,
    costoSvc: parseFloat(row.costo_svc) || 0,
    costoMaq: parseFloat(row.costo_maq) || 0,
    costoAVE: parseFloat(row.costo_ave) || 0,
    costoOtros: parseFloat(row.costo_otros) || 0,
    cEsm: parseFloat(row.c_esm) || 0,
    cSvc: parseFloat(row.c_svc) || 0,
    cMaq: parseFloat(row.c_maq) || 0,
    cAVE: parseFloat(row.c_ave) || 0,
    total: parseFloat(row.total) || 0,
    costoPorKgSal: parseFloat(row.costo_por_kg_sal) || 0,
    costoPorKgIng: parseFloat(row.costo_por_kg_ing) || 0,
  };
}

export function renderM3() {
  const listEl = document.getElementById('m3-actividades-list');
  if (!actividadesDB.length) {
    listEl.innerHTML = '<div class="empty-costo"><div class="empty-ico" style="margin:0 auto 12px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>No hay actividades aún.<br>Registra procesos en el <strong>Módulo 2</strong>.</div>';
    return;
  }
  listEl.innerHTML = actividadesDB.map(a => {
    const costed = costosDB[a.id];
    return `<div class="act-selector${selectedActId === a.id ? ' selected' : ''}" onclick="selectActividad('${a.id}')">
      <div class="as-head">
        <div>
          <div class="as-proc">${esc(a.proc)}</div>
          <div class="as-id">${a.id} · ${a.equipo}${a.batch ? ' · Batch: ' + esc(a.batch) : ''}</div>
        </div>
        ${costed ? '<span class="as-costed">Costeado</span>' : '<span class="as-uncosted">Pendiente</span>'}
      </div>
      <div class="as-body">
        <div><div class="as-item-v">${a.ini} → ${a.fin}</div><div class="as-item-l">Horario</div></div>
        <div><div class="as-item-v">${a.durMin ? mHM(a.durMin) : '—'}</div><div class="as-item-l">Duración</div></div>
        <div><div class="as-item-v">${a.totalPersonal} personas</div><div class="as-item-l">Personal</div></div>
      </div>
    </div>`;
  }).join('');
  updateCostosSummary();
}

export function selectActividad(id) {
  selectedActId = id;
  renderM3();
  const act = actividadesDB.find(a => a.id === id);
  if (!act) return;
  const prev = costosDB[id] || {};
  const panel = document.getElementById('m3-detail-panel');
  panel.innerHTML = `
    <div class="costo-detail">
      <div class="cd-title">
        <div><div style="font-size:12px;color:var(--muted);margin-bottom:2px">ID: ${act.id}</div>${esc(act.proc)} — ${esc(act.equipo)}</div>
        <span class="sbadge ${act.estado}">${stL[act.estado]}</span>
      </div>

      <!-- DATOS OPERATIVOS (solo lectura) -->
      <div class="cd-section">
        <div class="cd-section-title">Datos operativos — desde Módulo 2</div>
        <div class="cd-grid3">
          <div><div class="cd-item-l">Proceso</div><div class="cd-item-v">${esc(act.proc)}</div></div>
          <div><div class="cd-item-l">Equipo / Máquina</div><div class="cd-item-v">${esc(act.equipo)}</div></div>
          <div><div class="cd-item-l">Batch</div><div class="cd-item-v">${act.batch ? esc(act.batch) : '—'}</div></div>
          <div><div class="cd-item-l">Estado</div><div class="cd-item-v">${stL[act.estado]}</div></div>
          <div><div class="cd-item-l">Hora inicio</div><div class="cd-item-v mono">${act.ini}</div></div>
          <div><div class="cd-item-l">Hora fin</div><div class="cd-item-v mono">${act.fin}</div></div>
          <div><div class="cd-item-l">Duración</div><div class="cd-item-v mono">${act.durMin ? mHM(act.durMin) + ' (' + act.durHoras.toFixed(2) + ' h)' : '—'}</div></div>
          <div><div class="cd-item-l">Peso ingreso</div><div class="cd-item-v">${act.ping} kg</div></div>
          <div><div class="cd-item-l">Peso salida</div><div class="cd-item-v">${act.psal} kg</div></div>
          <div><div class="cd-item-l">Merma</div><div class="cd-item-v" style="color:var(--orange)">${act.merma.toFixed(1)} kg</div></div>
          <div><div class="cd-item-l">Personal H (Esmeralda)</div><div class="cd-item-v">${act.h}</div></div>
          <div><div class="cd-item-l">Personal M (Service)</div><div class="cd-item-v">${act.m}</div></div>
          <div><div class="cd-item-l">Total personal</div><div class="cd-item-v" style="font-weight:700;color:var(--b800)">${act.totalPersonal}</div></div>
        </div>
      </div>

      <!-- INPUTS ECONÓMICOS — 5 categorías -->
      <div class="cd-section">
        <div class="cd-section-title">Ingresar costos en soles (S/. por hora)</div>
        <div class="cd-grid" style="gap:10px">
          <div class="cd-input-row">
            <label>S/. Personal Esmeralda / hora</label>
            <input type="number" id="ci-esm" value="${prev.costoEsm || ''}" placeholder="0.00" min="0" step="0.01" oninput="calcCostoDetalle('${id}')">
            <span style="font-size:10px;color:var(--muted);margin-top:2px">${act.h} personas × ${act.durHoras.toFixed(2)} h</span>
          </div>
          <div class="cd-input-row">
            <label>S/. Personal Service / hora</label>
            <input type="number" id="ci-svc" value="${prev.costoSvc || ''}" placeholder="0.00" min="0" step="0.01" oninput="calcCostoDetalle('${id}')">
            <span style="font-size:10px;color:var(--muted);margin-top:2px">${act.m} personas × ${act.durHoras.toFixed(2)} h</span>
          </div>
          <div class="cd-input-row">
            <label>S/. Costo de máquina / hora</label>
            <input type="number" id="ci-maq" value="${prev.costoMaq || ''}" placeholder="0.00" min="0" step="0.01" oninput="calcCostoDetalle('${id}')">
            <span style="font-size:10px;color:var(--muted);margin-top:2px">Equipo: ${esc(act.equipo)} × ${act.durHoras.toFixed(2)} h</span>
          </div>
          <div class="cd-input-row">
            <label>S/. Agua, vapor y electricidad / hora</label>
            <input type="number" id="ci-ave" value="${prev.costoAVE || ''}" placeholder="0.00" min="0" step="0.01" oninput="calcCostoDetalle('${id}')">
            <span style="font-size:10px;color:var(--muted);margin-top:2px">${act.durHoras.toFixed(2)} h del proceso</span>
          </div>
          <div class="cd-input-row">
            <label>S/. Otros costos (monto fijo)</label>
            <input type="number" id="ci-otros" value="${prev.costoOtros || ''}" placeholder="0.00" min="0" step="0.01" oninput="calcCostoDetalle('${id}')">
            <span style="font-size:10px;color:var(--muted);margin-top:2px">Monto directo en soles</span>
          </div>
        </div>
      </div>

      <!-- CÁLCULOS AUTOMÁTICOS -->
      <div class="cd-section">
        <div class="cd-section-title">Desglose calculado automáticamente</div>
        <div style="display:flex;flex-direction:column;gap:6px" id="cr-breakdown">
          ${_renderBreakdownRows(prev, act)}
        </div>
      </div>

      <!-- RESULTADO FINAL -->
      <div class="result-box">
        <div class="rb-main">Costo total del proceso</div>
        <div class="rb-val" id="cr-total">${prev.total ? fmt(prev.total) : 'S/. —'}</div>
        <div class="rb-sub" id="cr-sub">${prev.total ? 'Calculado automáticamente' : 'Ingresa los costos para calcular'}</div>
        <div class="rb-grid">
          <div><div class="rb-item-l">S/. por kg de salida</div><div class="rb-item-v" id="cr-kgsal">${prev.costoPorKgSal ? 'S/.' + parseFloat(prev.costoPorKgSal).toFixed(4) : '—'}</div></div>
          <div><div class="rb-item-l">S/. por kg de ingreso</div><div class="rb-item-v" id="cr-kging">${prev.costoPorKgIng ? 'S/.' + parseFloat(prev.costoPorKgIng).toFixed(4) : '—'}</div></div>
        </div>
      </div>

      <div class="bgrp">
        <button class="btn-p" id="m3-save-btn" onclick="guardarCosto('${id}')">Guardar costos →</button>
      </div>
    </div>`;
  if (prev.costoEsm || prev.costoSvc || prev.costoMaq || prev.costoAVE) calcCostoDetalle(id);
}

function _renderBreakdownRows(c, act) {
  const rows = [
    { l: 'Personal Esmeralda', f: `${act.h}p × ${act.durHoras.toFixed(2)}h × S/.${(c.costoEsm || 0).toFixed(2)}/h`, v: c.cEsm },
    { l: 'Personal Service', f: `${act.m}p × ${act.durHoras.toFixed(2)}h × S/.${(c.costoSvc || 0).toFixed(2)}/h`, v: c.cSvc },
    { l: 'Máquina / Equipo', f: `${act.durHoras.toFixed(2)}h × S/.${(c.costoMaq || 0).toFixed(2)}/h`, v: c.cMaq },
    { l: 'Agua, vapor y elec.', f: `${act.durHoras.toFixed(2)}h × S/.${(c.costoAVE || 0).toFixed(2)}/h`, v: c.cAVE },
    { l: 'Otros costos', f: 'Monto fijo', v: c.costoOtros || 0 },
  ];
  return rows.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--white);border-radius:var(--rsm);border:1px solid var(--g200)">
      <div><div style="font-size:12px;font-weight:500;color:var(--text)">${r.l}</div><div style="font-size:10px;color:var(--muted);margin-top:1px">${r.f}</div></div>
      <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--b600)">${r.v != null ? fmt(r.v) : 'S/. —'}</div>
    </div>`).join('');
}

export function calcCostoDetalle(id) {
  const act = actividadesDB.find(a => a.id === id);
  if (!act) return;
  const costoEsm = parseFloat(document.getElementById('ci-esm').value) || 0;
  const costoSvc = parseFloat(document.getElementById('ci-svc').value) || 0;
  const costoMaq = parseFloat(document.getElementById('ci-maq').value) || 0;
  const costoAVE = parseFloat(document.getElementById('ci-ave').value) || 0;
  const costoOtros = parseFloat(document.getElementById('ci-otros').value) || 0;

  const h = act.durHoras;
  const cEsm = act.h * h * costoEsm;
  const cSvc = act.m * h * costoSvc;
  const cMaq = h * costoMaq;
  const cAVE = h * costoAVE;
  const total = cEsm + cSvc + cMaq + cAVE + costoOtros;
  const costoPorKgSal = act.psal > 0 ? total / act.psal : 0;
  const costoPorKgIng = act.ping > 0 ? total / act.ping : 0;

  document.getElementById('cr-breakdown').innerHTML = _renderBreakdownRows(
    { costoEsm, costoSvc, costoMaq, costoAVE, costoOtros, cEsm, cSvc, cMaq, cAVE }, act
  );
  document.getElementById('cr-total').textContent = fmt(total);
  document.getElementById('cr-sub').textContent = 'Calculado automáticamente';
  document.getElementById('cr-kgsal').textContent = act.psal > 0 ? 'S/.' + costoPorKgSal.toFixed(4) : '—';
  document.getElementById('cr-kging').textContent = act.ping > 0 ? 'S/.' + costoPorKgIng.toFixed(4) : '—';

  costosDB[id] = { costoEsm, costoSvc, costoMaq, costoAVE, costoOtros, cEsm, cSvc, cMaq, cAVE, total, costoPorKgSal, costoPorKgIng };
  updateCostosSummary();
}

export async function guardarCosto(id) {
  const act = actividadesDB.find(a => a.id === id);
  if (!act) return;
  calcCostoDetalle(id);
  const c = costosDB[id];

  const btn = document.getElementById('m3-save-btn');
  if (btn) btn.disabled = true;
  const { error } = await supabase.from('costos').upsert({
    actividad_codigo: id,
    costo_esm: c.costoEsm, costo_svc: c.costoSvc, costo_maq: c.costoMaq,
    costo_ave: c.costoAVE, costo_otros: c.costoOtros,
    c_esm: c.cEsm, c_svc: c.cSvc, c_maq: c.cMaq, c_ave: c.cAVE,
    total: c.total, costo_por_kg_sal: c.costoPorKgSal, costo_por_kg_ing: c.costoPorKgIng,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'actividad_codigo' });
  if (btn) btn.disabled = false;
  if (error) { toast('Error al guardar costos: ' + error.message, true); return; }

  rendM2(); renderM3(); toast(`Costos guardados — ${act.proc} (${id})`);
}

export function refreshIfSelected(id) {
  if (selectedActId === id) selectActividad(id);
}

export function updateCostosSummary() {
  const vals = Object.values(costosDB);
  const totEsm = vals.reduce((s, c) => s + (c.cEsm || 0), 0);
  const totSvc = vals.reduce((s, c) => s + (c.cSvc || 0), 0);
  const totMaq = vals.reduce((s, c) => s + (c.cMaq || 0), 0);
  const totAVE = vals.reduce((s, c) => s + (c.cAVE || 0), 0);
  const grand = vals.reduce((s, c) => s + (c.total || 0), 0);
  const el = document.getElementById('sum-mo');
  if (el) {
    el.textContent = fmtN(totEsm + totSvc);
    document.getElementById('sum-maq').textContent = fmtN(totMaq + totAVE);
    document.getElementById('sum-total').textContent = fmtN(grand);
  }
}
