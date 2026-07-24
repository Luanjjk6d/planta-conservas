// Costeo por día — reemplaza el costeo por proceso para Personal Esmeralda,
// Personal Service, canastillas y combustible. Toda la carga vive en
// Módulo 3 (declaración global por fecha, no por actividad) — el Dashboard
// es solo lectura: muestra el resumen final (costo total del día y costo
// por caja), juntando personal + canastillas + combustible + el costo de
// máquina de las actividades de ese día.
import { supabase } from './supabaseClient.js';
import { empleadosEsmeraldaDB, actividadesDB, equiposDB, costosDB } from './state.js';
import { esc, toast, fmt } from './utils.js';
import { COSTO_CANASTILLA, COSTO_COMBUSTIBLE_DIA } from './constants.js';

// Costo de máquina de una actividad = horas trabajadas × tarifa del equipo
// (configurada una vez por equipo en Módulo 2). Se calcula solo, sin que el
// usuario tenga que "costear" cada actividad a mano.
export function costoMaquinaActividad(act) {
  const eq = equiposDB.find(e => e.nombre === act.equipo);
  return eq ? eq.costoHora * act.durHoras : 0;
}

// ───────── PERSONAL DEL DÍA (Módulo 3) ─────────
let pdFecha = null;
let pdData = null;
let pdEmpleadoIds = [];

function mapPersonalDia(row) {
  return {
    fecha: row.fecha,
    svcH: row.personal_service_h,
    svcM: row.personal_service_m,
    costoSvcHora: parseFloat(row.costo_service_hora) || 0,
    horasDia: parseFloat(row.horas_dia) || 0,
  };
}

export async function cargarPersonalDia(fecha) {
  pdFecha = fecha;
  const [pdRes, peRes] = await Promise.all([
    supabase.from('personal_dia').select('*').eq('fecha', fecha).maybeSingle(),
    supabase.from('personal_dia_empleados').select('empleado_id').eq('fecha', fecha),
  ]);
  pdData = pdRes.data ? mapPersonalDia(pdRes.data) : null;
  pdEmpleadoIds = (peRes.data || []).map(r => r.empleado_id);
  _renderPersonalDiaForm();
}

function _renderPersonalDiaForm() {
  const el = document.getElementById('pd-esm-list');
  if (el) {
    el.innerHTML = !empleadosEsmeraldaDB.length
      ? '<div style="font-size:12px;color:var(--muted)">Sin empleados registrados.</div>'
      : empleadosEsmeraldaDB.map(emp => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" class="pd-esm-cb" value="${emp.id}" ${pdEmpleadoIds.includes(emp.id) ? 'checked' : ''} onchange="calcularPersonalDia()">
            ${esc(emp.nombre)} <span style="color:var(--muted);font-size:11px">(${emp.genero})</span>
          </label>
          <button class="link-edit" onclick="openCostoEmpleadoModal(${emp.id})">Editar</button>
        </div>`).join('');
  }
  const allCb = document.getElementById('pd-esm-all');
  if (allCb) allCb.checked = empleadosEsmeraldaDB.length > 0 && pdEmpleadoIds.length === empleadosEsmeraldaDB.length;
  const svcH = document.getElementById('pd-svc-h');
  if (!svcH) return;
  svcH.value = pdData?.svcH || '';
  document.getElementById('pd-svc-m').value = pdData?.svcM || '';
  document.getElementById('pd-svc-costo').value = pdData?.costoSvcHora || '';
  document.getElementById('pd-horas').value = pdData?.horasDia || '';
  calcularPersonalDia();
}

function _getSelectedEsmIds() {
  return Array.from(document.querySelectorAll('.pd-esm-cb:checked')).map(cb => parseInt(cb.value));
}

export function toggleTodosPersonalDia(checked) {
  document.querySelectorAll('.pd-esm-cb').forEach(cb => { cb.checked = checked; });
  calcularPersonalDia();
}

export function calcularPersonalDia() {
  const ids = _getSelectedEsmIds();
  const seleccionados = empleadosEsmeraldaDB.filter(e => ids.includes(e.id));
  const costoEsm = seleccionados.reduce((s, e) => s + e.costoDia, 0);
  const svcH = parseInt(document.getElementById('pd-svc-h').value) || 0;
  const svcM = parseInt(document.getElementById('pd-svc-m').value) || 0;
  const costoSvcHora = parseFloat(document.getElementById('pd-svc-costo').value) || 0;
  const horas = parseFloat(document.getElementById('pd-horas').value) || 0;
  const costoSvc = (svcH + svcM) * costoSvcHora * horas;
  const total = costoEsm + costoSvc;
  const totalEl = document.getElementById('pd-total');
  if (totalEl) totalEl.textContent = fmt(total);
  return { costoEsm, costoSvc, total };
}

export async function guardarPersonalDia() {
  if (!pdFecha) return;
  const svcH = parseInt(document.getElementById('pd-svc-h').value) || 0;
  const svcM = parseInt(document.getElementById('pd-svc-m').value) || 0;
  const costoSvcHora = parseFloat(document.getElementById('pd-svc-costo').value) || 0;
  const horas = parseFloat(document.getElementById('pd-horas').value) || 0;
  const ids = _getSelectedEsmIds();

  const btn = document.getElementById('pd-save-btn');
  if (btn) btn.disabled = true;
  const { error: err1 } = await supabase.from('personal_dia').upsert({
    fecha: pdFecha, personal_service_h: svcH, personal_service_m: svcM,
    costo_service_hora: costoSvcHora, horas_dia: horas, updated_at: new Date().toISOString(),
  }, { onConflict: 'fecha' });
  if (err1) { if (btn) btn.disabled = false; toast('Error al guardar: ' + err1.message, true); return; }

  const { error: err2 } = await supabase.from('personal_dia_empleados').delete().eq('fecha', pdFecha);
  if (!err2 && ids.length) {
    await supabase.from('personal_dia_empleados').insert(ids.map(empleado_id => ({ fecha: pdFecha, empleado_id })));
  }
  if (btn) btn.disabled = false;
  pdData = { fecha: pdFecha, svcH, svcM, costoSvcHora, horasDia: horas };
  pdEmpleadoIds = ids;
  toast('Personal del día guardado');
  await renderResumenCostosDia(pdFecha);
}

// Re-dibuja solo el checklist (sin refetch) — se usa después de editar el
// costo/día de un empleado desde este mismo panel.
export function refrescarChecklistPersonalDia() {
  _renderPersonalDiaForm();
}

// ───────── COSTOS DEL DÍA — canastillas/combustible (Módulo 3) ─────────
let cdFecha = null;

function mapCostosDia(row) {
  return { fecha: row.fecha, canastillas: row.cantidad_canastillas, combustible: row.combustible, otrosCostos: parseFloat(row.otros_costos) || 0 };
}

export async function cargarCostosDia(fecha) {
  cdFecha = fecha;
  const { data } = await supabase.from('costos_dia').select('*').eq('fecha', fecha).maybeSingle();
  const cd = data ? mapCostosDia(data) : null;
  const inputCant = document.getElementById('cd-canastillas');
  if (!inputCant) return;
  inputCant.value = cd?.canastillas || '';
  document.getElementById('cd-combustible').checked = !!cd?.combustible;
  document.getElementById('cd-otros').value = cd?.otrosCostos || '';
  calcularCostosDia();
}

export function calcularCostosDia() {
  const cant = parseInt(document.getElementById('cd-canastillas').value) || 0;
  const combustible = document.getElementById('cd-combustible').checked;
  const otros = parseFloat(document.getElementById('cd-otros').value) || 0;
  const montoCanastillas = cant * COSTO_CANASTILLA;
  const montoCombustible = combustible ? COSTO_COMBUSTIBLE_DIA : 0;
  const total = montoCanastillas + montoCombustible + otros;
  const el = document.getElementById('cd-total');
  if (el) el.textContent = fmt(total);
  return { montoCanastillas, montoCombustible, otros, total };
}

export async function guardarCostosDia() {
  if (!cdFecha) return;
  const cant = parseInt(document.getElementById('cd-canastillas').value) || 0;
  const combustible = document.getElementById('cd-combustible').checked;
  const otros = parseFloat(document.getElementById('cd-otros').value) || 0;
  const btn = document.getElementById('cd-save-btn');
  if (btn) btn.disabled = true;
  const { error } = await supabase.from('costos_dia').upsert({
    fecha: cdFecha, cantidad_canastillas: cant, combustible, otros_costos: otros, updated_at: new Date().toISOString(),
  }, { onConflict: 'fecha' });
  if (btn) btn.disabled = false;
  if (error) { toast('Error al guardar: ' + error.message, true); return; }
  toast('Costos del día guardados');
  await renderResumenCostosDia(cdFecha);
}

// ───────── RESUMEN DE COSTOS DEL DÍA — múltiples ubicaciones (Módulo 3 + Dashboard) ─────────
// Devuelve {total, costoPorCaja, cajasTotal} además de pintar el resumen, así
// el Dashboard puede reusar el mismo número real del día para su KPI en vez
// de recalcular (o desalinearse) por su cuenta.
export async function renderResumenCostosDia(fecha) {
  const targets = document.querySelectorAll('.resumen-costos-dia');
  if (!targets.length) return null;
  targets.forEach(el => { el.innerHTML = '<div class="dc-empty">Calculando...</div>'; });

  const [pdRes, peRes, cdRes] = await Promise.all([
    supabase.from('personal_dia').select('*').eq('fecha', fecha).maybeSingle(),
    supabase.from('personal_dia_empleados').select('empleado_id, empleados_esmeralda(costo_dia)').eq('fecha', fecha),
    supabase.from('costos_dia').select('*').eq('fecha', fecha).maybeSingle(),
  ]);

  const pd = pdRes.data ? mapPersonalDia(pdRes.data) : null;
  const costoEsm = (peRes.data || []).reduce((s, r) => s + (parseFloat(r.empleados_esmeralda?.costo_dia) || 0), 0);
  const costoSvc = pd ? (pd.svcH + pd.svcM) * pd.costoSvcHora * pd.horasDia : 0;
  const cd = cdRes.data ? mapCostosDia(cdRes.data) : null;
  const montoCanastillas = (cd?.canastillas || 0) * COSTO_CANASTILLA;
  const montoCombustible = cd?.combustible ? COSTO_COMBUSTIBLE_DIA : 0;
  const otrosCostosDia = cd?.otrosCostos || 0;

  const dayActs = actividadesDB.filter(a => a.fecha === fecha);
  const costoMaquinaTotal = dayActs.reduce((s, a) => s + costoMaquinaActividad(a), 0);
  // Costos manuales cargados por actividad antes de este cambio (el flujo de
  // "costear una actividad a mano" ya no existe) — se conservan en el total
  // para no perder datos históricos, pero solo aparecen si hay algo cargado.
  const costoLegacyActividades = dayActs.reduce((s, a) => s + (costosDB[a.id]?.total || 0), 0);
  const cajasTotal = dayActs.reduce((s, a) => s + (a.cajas || 0), 0);

  const total = costoEsm + costoSvc + costoMaquinaTotal + costoLegacyActividades + otrosCostosDia + montoCanastillas + montoCombustible;
  const costoPorCaja = cajasTotal > 0 ? total / cajasTotal : 0;

  const html = `
    <div class="di-row"><span class="di-l">Personal Esmeralda (día)</span><span class="di-v">${fmt(costoEsm)}</span></div>
    <div class="di-row"><span class="di-l">Personal Service (día)</span><span class="di-v">${fmt(costoSvc)}</span></div>
    <div class="di-row"><span class="di-l">Máquinas (horas × tarifa de equipo)</span><span class="di-v">${fmt(costoMaquinaTotal)}</span></div>
    ${costoLegacyActividades ? `<div class="di-row"><span class="di-l">Costos de actividad (histórico) <button class="link-edit" style="margin-left:6px" onclick="abrirEditarCostoLegacy('${fecha}')">Editar</button></span><span class="di-v">${fmt(costoLegacyActividades)}</span></div>` : ''}
    <div class="di-row"><span class="di-l">Otros costos del día</span><span class="di-v">${fmt(otrosCostosDia)}</span></div>
    <div class="di-row"><span class="di-l">Limpieza de canastillas</span><span class="di-v">${fmt(montoCanastillas)}</span></div>
    <div class="di-row"><span class="di-l">Combustible</span><span class="di-v">${fmt(montoCombustible)}</span></div>
    <div class="di-row" style="border-top:2px solid var(--b100);margin-top:4px;padding-top:8px"><span class="di-l" style="font-weight:600;color:var(--b800)">TOTAL DEL DÍA</span><span class="di-v" style="font-size:16px;font-weight:700;color:var(--b600)">${fmt(total)}</span></div>
    <div class="di-row" style="margin-top:8px"><span class="di-l">Cajas producidas</span><span class="di-v">${cajasTotal}</span></div>
    <div class="di-row"><span class="di-l" style="font-weight:600;color:var(--b800)">Costo por caja</span><span class="di-v" style="font-weight:700;color:#7c3aed">${cajasTotal > 0 ? fmt(costoPorCaja) : '—'}</span></div>`;
  targets.forEach(el => { el.innerHTML = html; });
  return { total, costoPorCaja, cajasTotal };
}

// ───────── EDITAR COSTOS DE ACTIVIDAD (HISTÓRICO) ─────────
// Único remanente del costeo por actividad (de antes de que todo pasara a
// costearse por día): montos ya guardados en la tabla "costos" que siguen
// sumando al total del día. Se editan aquí, no por actividad.
let legacyFechaActual = null;

export function abrirEditarCostoLegacy(fecha) {
  legacyFechaActual = fecha;
  const dayActs = actividadesDB.filter(a => a.fecha === fecha && costosDB[a.id]?.total);
  const el = document.getElementById('costo-legacy-list');
  el.innerHTML = dayActs.map(a => `
    <div class="field">
      <label>${esc(a.id)} — ${esc(a.proc)}</label>
      <input type="number" class="costo-legacy-input" data-codigo="${a.id}" value="${costosDB[a.id].total}" min="0" step="0.01">
    </div>`).join('');
  document.getElementById('costo-legacy-modal-ov').classList.add('open');
}

export function closeCostoLegacyModal() {
  document.getElementById('costo-legacy-modal-ov').classList.remove('open');
  legacyFechaActual = null;
}

export async function confirmCostoLegacyModal() {
  const inputs = document.querySelectorAll('.costo-legacy-input');
  for (const input of inputs) {
    const codigo = input.dataset.codigo;
    const nuevoMonto = parseFloat(input.value) || 0;
    if (nuevoMonto === costosDB[codigo]?.total) continue;
    const { error } = await supabase.from('costos').update({
      costo_otros: nuevoMonto, total: nuevoMonto, updated_at: new Date().toISOString(),
    }).eq('actividad_codigo', codigo);
    if (error) { toast('Error al guardar ' + codigo + ': ' + error.message, true); return; }
    costosDB[codigo] = { ...costosDB[codigo], costoOtros: nuevoMonto, total: nuevoMonto };
  }
  const fecha = legacyFechaActual;
  closeCostoLegacyModal();
  toast('Costos actualizados');
  await renderResumenCostosDia(fecha);
}
