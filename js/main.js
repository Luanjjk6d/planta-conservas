import { supabase } from './supabaseClient.js';
import { m1Data, actividadesDB, costosDB, personalLogDB, empleadosEsmeraldaDB, numerosParteDB } from './state.js';
import { hn, toast, showPage } from './utils.js';
import { fetchLookups, populateLookupSelect } from './lookups.js';
import { openModal, closeModal, confirmModal, initModal } from './modal.js';
import { openManageModal, closeManageModal, deleteManageItem } from './catalogManage.js';
import { guarM1, limpM1, rendM1, mapLote, fetchNumerosParte, rendNumerosParte, cerrarNumeroParte, eliminarNumeroParte, eliminarLote, openNpModal, closeNpModal, confirmNpModal } from './m1.js';
import {
  guarM2, limpM2, rendM2, sugerirEquipo, calcTotalPersonal, editM2, eliminarActividad,
  regPersonalLog, rendPersonalLog, initM2Listeners, mapActividad, mapPersonalLog,
} from './m2.js';
import { renderM3, selectActividad, calcCostoDetalle, guardarCosto, mapCosto } from './m3.js';
import { renderDash, dashPrevDay, dashNextDay, dashGoToday, dashJumpDate, renderProduccionPorNP } from './dashboard.js';
import { fetchEmpleados, fetchActividadEmpleados, renderEmpleadoChecklist, openEmpleadoModal, closeEmpleadoModal, confirmEmpleadoModal, eliminarEmpleado } from './empleados.js';
import { viewPrevDay, viewNextDay, viewToday, viewJumpDate, onViewDateChanged, initViewDateNav } from './viewDate.js';
import { fetchProyectos, setProyectoFiltro, openProyectoModal, closeProyectoModal, confirmProyectoModal, editProyecto, eliminarProyecto } from './proyectos.js';
import { abrirDetalleNP, volverAProduccion } from './npDetalle.js';

// Funciones referenciadas desde onclick="" en el HTML — deben vivir en window
// porque los módulos ES no las exponen globalmente por defecto.
Object.assign(window, {
  showPage, openModal, closeModal, confirmModal,
  openManageModal, closeManageModal, deleteManageItem,
  guarM1, limpM1, cerrarNumeroParte, eliminarNumeroParte, eliminarLote, openNpModal, closeNpModal, confirmNpModal,
  guarM2, limpM2, sugerirEquipo, calcTotalPersonal, editM2, eliminarActividad,
  regPersonalLog, rendPersonalLog,
  openEmpleadoModal, closeEmpleadoModal, confirmEmpleadoModal, eliminarEmpleado,
  renderM3, selectActividad, calcCostoDetalle, guardarCosto,
  renderDash, dashPrevDay, dashNextDay, dashGoToday, dashJumpDate, renderProduccionPorNP,
  abrirDetalleNP, volverAProduccion,
  viewPrevDay, viewNextDay, viewToday, viewJumpDate,
  fetchProyectos, setProyectoFiltro, openProyectoModal, closeProyectoModal, confirmProyectoModal, editProyecto, eliminarProyecto,
});

// El día seleccionado (Módulo 1/2/3) es compartido — cada cambio vuelve a
// renderizar las listas de los tres módulos (es barato: son solo arrays ya
// cargados en memoria, sin nuevas consultas a Supabase).
onViewDateChanged(() => { rendM1(); rendM2(); renderM3(); });

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
  const [lotesRes, actRes, costosRes, plogRes, lookups, empleados, , numerosParte] = await Promise.all([
    supabase.from('lotes').select('*').order('created_at', { ascending: false }),
    supabase.from('actividades').select('*').order('created_at', { ascending: false }),
    supabase.from('costos').select('*'),
    supabase.from('actividad_personal_log').select('*').order('created_at', { ascending: true }),
    fetchLookups(),
    fetchEmpleados(),
    fetchActividadEmpleados(),
    fetchNumerosParte(),
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
  numerosParteDB.push(...numerosParte);

  populateLookupSelect('m1-prod', lookups.productos);
  populateLookupSelect('m2-proc', lookups.procesos);
  populateLookupSelect('m2-equipo', lookups.equipos);
  populateLookupSelect('m1-np', lookups.numerosParte);
  populateLookupSelect('m2-np', lookups.numerosParte);
  populateLookupSelect('np-cliente', lookups.clientes);

  renderEmpleadoChecklist([]);
  rendNumerosParte();
  initViewDateNav();
  rendM1(); rendM2();
}

initApp();
