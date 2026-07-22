import { actividadesDB, costosDB, equiposDB } from './state.js';
import { esc, fmt, fmtN, mHM } from './utils.js';
import { stL } from './constants.js';
import { viewDate } from './viewDate.js';
import { cargarCostosDia, cargarPersonalDia, renderResumenCostosDia, costoMaquinaActividad } from './costeoDia.js';

let selectedActId = null;

export function toggleCostosDiaSection() {
  document.getElementById('m3-costos-dia-hdr').classList.toggle('collapsed');
  document.getElementById('m3-costos-dia-body').classList.toggle('collapsed');
}

export function mapCosto(row) {
  return {
    costoMaq: parseFloat(row.costo_maq) || 0,
    costoOtros: parseFloat(row.costo_otros) || 0,
    cMaq: parseFloat(row.c_maq) || 0,
    total: parseFloat(row.total) || 0,
    costoPorKgSal: parseFloat(row.costo_por_kg_sal) || 0,
    costoPorKgIng: parseFloat(row.costo_por_kg_ing) || 0,
  };
}

export function renderM3() {
  cargarCostosDia(viewDate.current);
  cargarPersonalDia(viewDate.current);
  renderResumenCostosDia(viewDate.current);
  const listEl = document.getElementById('m3-actividades-list');
  const dayData = actividadesDB.filter(a => a.fecha === viewDate.current);
  if (!dayData.length) {
    listEl.innerHTML = '<div class="empty-costo"><div class="empty-ico" style="margin:0 auto 12px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>No hay actividades este día.<br>Registra procesos en el <strong>Módulo 2</strong>.</div>';
    updateCostosSummary(dayData);
    return;
  }
  listEl.innerHTML = dayData.map(a => {
    const equipo = equiposDB.find(e => e.nombre === a.equipo);
    const tieneTarifa = equipo && equipo.costoHora > 0;
    const costoMaq = costoMaquinaActividad(a);
    return `<div class="act-selector${selectedActId === a.id ? ' selected' : ''}" onclick="selectActividad('${a.id}')">
      <div class="as-head">
        <div>
          <div class="as-proc">${esc(a.proc)}</div>
          <div class="as-id">${a.id} · ${a.equipo}${a.np ? ' · NP: ' + esc(a.np) : ''}${a.batch ? ' · Batch: ' + esc(a.batch) : ''}</div>
        </div>
        ${tieneTarifa ? `<span class="as-costed">${fmt(costoMaq)}</span>` : '<span class="as-uncosted">Sin tarifa de equipo</span>'}
      </div>
      <div class="as-body">
        <div><div class="as-item-v">${a.ini} → ${a.fin}</div><div class="as-item-l">Horario</div></div>
        <div><div class="as-item-v">${a.durMin ? mHM(a.durMin) : '—'}</div><div class="as-item-l">Duración</div></div>
        <div><div class="as-item-v">${a.totalPersonal} personas</div><div class="as-item-l">Personal</div></div>
      </div>
    </div>`;
  }).join('');
  updateCostosSummary(dayData);
}

export function selectActividad(id) {
  selectedActId = id;
  renderM3();
  const act = actividadesDB.find(a => a.id === id);
  if (!act) return;
  const equipo = equiposDB.find(e => e.nombre === act.equipo);
  const costoMaq = costoMaquinaActividad(act);
  const legacy = costosDB[id]; // costo cargado a mano antes de este cambio, si existe
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
          <div><div class="cd-item-l">NP</div><div class="cd-item-v">${act.np ? esc(act.np) : '—'}</div></div>
          <div><div class="cd-item-l">Batch</div><div class="cd-item-v">${act.batch ? esc(act.batch) : '—'}</div></div>
          <div><div class="cd-item-l">Estado</div><div class="cd-item-v">${stL[act.estado]}</div></div>
          <div><div class="cd-item-l">Hora inicio</div><div class="cd-item-v mono">${act.ini}</div></div>
          <div><div class="cd-item-l">Hora fin</div><div class="cd-item-v mono">${act.fin}</div></div>
          <div><div class="cd-item-l">Duración</div><div class="cd-item-v mono">${act.durMin ? mHM(act.durMin) + ' (' + act.durHoras.toFixed(2) + ' h)' : '—'}</div></div>
          <div><div class="cd-item-l">Peso ingreso</div><div class="cd-item-v">${act.ping} kg</div></div>
          <div><div class="cd-item-l">Peso salida</div><div class="cd-item-v">${act.psal} kg</div></div>
          <div><div class="cd-item-l">Merma</div><div class="cd-item-v" style="color:var(--orange)">${act.merma.toFixed(1)} kg</div></div>
          <div><div class="cd-item-l">Personal Hombre</div><div class="cd-item-v">${act.h}</div></div>
          <div><div class="cd-item-l">Personal Mujer</div><div class="cd-item-v">${act.m}</div></div>
          <div><div class="cd-item-l">Total personal</div><div class="cd-item-v" style="font-weight:700;color:var(--b800)">${act.totalPersonal}</div></div>
          <div><div class="cd-item-l">Personal Esmeralda</div><div class="cd-item-v">${act.esm}</div></div>
          <div><div class="cd-item-l">Personal Service</div><div class="cd-item-v">${act.svc}</div></div>
          <div><div class="cd-item-l">Total por empresa</div><div class="cd-item-v" style="font-weight:700;color:var(--b800)">${act.esm + act.svc}</div></div>
        </div>
      </div>

      <!-- COSTO DE MÁQUINA — automático, sin entrada manual. La tarifa se
           configura una vez por equipo (Módulo 2 → Equipos), no por actividad. -->
      <div class="cd-section">
        <div class="cd-section-title">Costo de máquina (calculado automático)</div>
        ${equipo && equipo.costoHora > 0 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--white);border-radius:var(--rsm);border:1px solid var(--g200)">
          <div><div style="font-size:12px;font-weight:500;color:var(--text)">${esc(act.equipo)}</div><div style="font-size:10px;color:var(--muted);margin-top:1px">${act.durHoras.toFixed(2)}h × S/.${equipo.costoHora.toFixed(2)}/h</div></div>
          <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--b600)">${fmt(costoMaq)}</div>
        </div>` : `
        <div style="padding:10px 12px;background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:var(--rmd);font-size:12px;color:#9A3412">
          El equipo "${esc(act.equipo)}" no tiene tarifa por hora configurada — el costo de máquina se calcula en S/.0.00 hasta que la configures.
          ${equipo ? `<button class="link-edit" style="display:block;margin-top:6px;color:#9A3412" onclick="openEquipoModal(${equipo.id})">Configurar tarifa →</button>` : ''}
        </div>`}
      </div>

      ${legacy ? `
      <div class="cd-section">
        <div class="cd-section-title">Otros costos de esta actividad (histórico)</div>
        <p style="font-size:11px;color:var(--muted);margin:-4px 0 8px">Cargado antes de este cambio — ya no se pueden agregar nuevos desde aquí; si necesitas corregirlo, avísame.</p>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--white);border-radius:var(--rsm);border:1px solid var(--g200)">
          <div style="font-size:12px;font-weight:500;color:var(--text)">Monto registrado</div>
          <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--b600)">${fmt(legacy.total)}</div>
        </div>
      </div>` : ''}

      <div class="result-box">
        <div class="rb-main">Costo total de la actividad</div>
        <div class="rb-val">${fmt(costoMaq + (legacy?.total || 0))}</div>
        <div class="rb-sub">Máquina automática${legacy ? ' + costo histórico' : ''}</div>
      </div>
    </div>`;
}

export function refreshIfSelected(id) {
  if (selectedActId === id) selectActividad(id);
}

// Refresca el panel de detalle abierto, sin importar cuál actividad sea —
// se usa tras configurar la tarifa de un equipo desde el propio panel.
export function refreshSelected() {
  if (selectedActId) selectActividad(selectedActId);
}

export function updateCostosSummary(dayData = actividadesDB.filter(a => a.fecha === viewDate.current)) {
  const grand = dayData.reduce((s, a) => s + costoMaquinaActividad(a) + (costosDB[a.id]?.total || 0), 0);
  const el = document.getElementById('sum-total');
  if (el) el.textContent = fmtN(grand);
}
