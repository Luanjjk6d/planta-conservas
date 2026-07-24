import { actividadesDB } from './state.js';
import { esc, mHM } from './utils.js';
import { cargarCostosDia, cargarPersonalDia, renderResumenCostosDia } from './costeoDia.js';
import { viewDate } from './viewDate.js';

export function toggleCostosDiaSection() {
  document.getElementById('m3-costos-dia-hdr').classList.toggle('collapsed');
  document.getElementById('m3-costos-dia-body').classList.toggle('collapsed');
}

// Los costos ya no se cargan por actividad — esta tabla se mantiene solo
// para lectura histórica (ver costeoDia.js) y para initApp() en main.js.
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

// "Actividades disponibles" es solo de referencia — qué procesos hubo ese
// día. El costeo vive por completo en el día (ver "Resumen del costo del
// día" y "Costos del día"), no aquí.
export function renderM3() {
  cargarCostosDia(viewDate.current);
  cargarPersonalDia(viewDate.current);
  renderResumenCostosDia(viewDate.current);
  const listEl = document.getElementById('m3-actividades-list');
  const dayData = actividadesDB.filter(a => a.fecha === viewDate.current);
  if (!dayData.length) {
    listEl.innerHTML = '<div class="empty-costo"><div class="empty-ico" style="margin:0 auto 12px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>No hay actividades este día.<br>Registra procesos en el <strong>Módulo 2</strong>.</div>';
    return;
  }
  listEl.innerHTML = dayData.map(a => `<div class="act-ref">
      <div class="as-head">
        <div>
          <div class="as-proc">${esc(a.proc)}</div>
          <div class="as-id">${a.id} · ${esc(a.equipo)}${a.np ? ' · NP: ' + esc(a.np) : ''}${a.batch ? ' · Batch: ' + esc(a.batch) : ''}</div>
        </div>
      </div>
      <div class="as-body">
        <div><div class="as-item-v">${a.ini} → ${a.fin}</div><div class="as-item-l">Horario</div></div>
        <div><div class="as-item-v">${a.durMin ? mHM(a.durMin) : '—'}</div><div class="as-item-l">Duración</div></div>
        <div><div class="as-item-v">${a.totalPersonal} personas</div><div class="as-item-l">Personal</div></div>
      </div>
    </div>`).join('');
}
