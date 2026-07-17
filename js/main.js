import { supabase } from './supabaseClient.js';
import { m1Data, actividadesDB, costosDB, personalLogDB, empleadosEsmeraldaDB } from './state.js';
import { hn, toast, showPage } from './utils.js';
import { fetchLookups, populateLookupSelect } from './lookups.js';
import { openModal, closeModal, confirmModal, initModal } from './modal.js';
import { guarM1, limpM1, rendM1, mapLote } from './m1.js';
import {
  guarM2, limpM2, rendM2, sugerirEquipo, calcTotalPersonal, editM2,
  regPersonalLog, rendPersonalLog, initM2Listeners, mapActividad, mapPersonalLog,
} from './m2.js';
import { renderM3, selectActividad, calcCostoDetalle, guardarCosto, mapCosto } from './m3.js';
import { renderDash, dashPrevDay, dashNextDay, dashGoToday, dashJumpDate } from './dashboard.js';
import { fetchEmpleados, fetchActividadEmpleados, renderEmpleadoChecklist, openEmpleadoModal, closeEmpleadoModal, confirmEmpleadoModal } from './empleados.js';

// Funciones referenciadas desde onclick="" en el HTML — deben vivir en window
// porque los módulos ES no las exponen globalmente por defecto.
Object.assign(window, {
  showPage, openModal, closeModal, confirmModal,
  guarM1, limpM1,
  guarM2, limpM2, sugerirEquipo, calcTotalPersonal, editM2,
  regPersonalLog, rendPersonalLog,
  openEmpleadoModal, closeEmpleadoModal, confirmEmpleadoModal,
  renderM3, selectActividad, calcCostoDetalle, guardarCosto,
  renderDash, dashPrevDay, dashNextDay, dashGoToday, dashJumpDate,
});

// Header date
(() => {
  const a = new Date(), ds = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], ms = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  document.getElementById('hdr-date').textContent = `${ds[a.getDay()]} ${a.getDate()} ${ms[a.getMonth()]} ${a.getFullYear()}`;
})();

// Valores por defecto de los formularios
document.getElementById('m1-fecha').value = new Date().toISOString().split('T')[0];
document.getElementById('m1-hora').value = hn();
document.getElementById('m2-ini').value = hn();

initModal();
initM2Listeners();

async function initApp() {
  const [lotesRes, actRes, costosRes, plogRes, lookups, empleados] = await Promise.all([
    supabase.from('lotes').select('*').order('created_at', { ascending: false }),
    supabase.from('actividades').select('*').order('created_at', { ascending: false }),
    supabase.from('costos').select('*'),
    supabase.from('actividad_personal_log').select('*').order('created_at', { ascending: true }),
    fetchLookups(),
    fetchEmpleados(),
    fetchActividadEmpleados(),
  ]);

  const firstError = [lotesRes, actRes, costosRes, plogRes].find(r => r.error);
  if (firstError) {
    toast('No se pudo conectar a la base de datos. Revisa js/config.js.', true);
    console.error('Error cargando datos iniciales:', firstError.error);
    return;
  }

  m1Data.push(...lotesRes.data.map(mapLote));
  actividadesDB.push(...actRes.data.map(mapActividad));
  Object.assign(costosDB, Object.fromEntries(costosRes.data.map(c => [c.actividad_codigo, mapCosto(c)])));
  plogRes.data.map(mapPersonalLog).forEach(p => { (personalLogDB[p.actId] ||= []).push(p); });
  empleadosEsmeraldaDB.push(...empleados);

  populateLookupSelect('m1-prod', lookups.productos);
  populateLookupSelect('m2-proc', lookups.procesos);
  populateLookupSelect('m2-equipo', lookups.equipos);

  renderEmpleadoChecklist([]);
  rendM1(); rendM2();
}

initApp();
