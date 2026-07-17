// Día seleccionado compartido entre Módulo 1, 2 y 3 — filtra qué
// registros se muestran sin volver a consultar Supabase (los datos ya
// están cargados en memoria; esto solo cambia qué parte se renderiza).
import { localDateStr, shiftDate, fDateLong } from './utils.js';

export const viewDate = { current: localDateStr() };

const listeners = [];
export function onViewDateChanged(fn) { listeners.push(fn); }

function notify() {
  document.querySelectorAll('.view-date-label').forEach(el => { el.textContent = fDateLong(viewDate.current); });
  document.querySelectorAll('.view-date-input').forEach(el => { el.value = viewDate.current; });
  document.querySelectorAll('.view-date-next-btn').forEach(el => { el.disabled = viewDate.current >= localDateStr(); });
  const m1Fecha = document.getElementById('m1-fecha');
  if (m1Fecha) m1Fecha.value = viewDate.current;
  listeners.forEach(fn => fn(viewDate.current));
}

export function viewPrevDay() { viewDate.current = shiftDate(viewDate.current, -1); notify(); }
export function viewNextDay() { const n = shiftDate(viewDate.current, 1); if (n <= localDateStr()) { viewDate.current = n; notify(); } }
export function viewToday() { viewDate.current = localDateStr(); notify(); }
export function viewJumpDate(v) { if (v) { viewDate.current = v; notify(); } }

export function initViewDateNav() { notify(); }
