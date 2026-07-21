// Costeo por día — reemplaza el costeo por proceso para Personal Esmeralda,
// Personal Service, canastillas y combustible. "Personal del día" vive en
// el Dashboard (declaración global, no por actividad). "Costos del día"
// (canastillas/combustible) vive en Módulo 3. El resumen final (costo
// total del día y costo por caja) se calcula en el Dashboard, juntando
// ambos más el costo de máquina de las actividades de ese día.
import { supabase } from './supabaseClient.js';
import { empleadosEsmeraldaDB } from './state.js';
import { esc, toast, fmt } from './utils.js';
import { COSTO_CANASTILLA, COSTO_COMBUSTIBLE_DIA } from './constants.js';

// ───────── PERSONAL DEL DÍA (Dashboard) ─────────
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
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" class="pd-esm-cb" value="${emp.id}" ${pdEmpleadoIds.includes(emp.id) ? 'checked' : ''} onchange="calcularPersonalDia()">
          ${esc(emp.nombre)} <span style="color:var(--muted);font-size:11px">(${emp.genero})</span>
        </label>`).join('');
  }
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
  return { fecha: row.fecha, canastillas: row.cantidad_canastillas, combustible: row.combustible };
}

export async function cargarCostosDia(fecha) {
  cdFecha = fecha;
  const { data } = await supabase.from('costos_dia').select('*').eq('fecha', fecha).maybeSingle();
  const cd = data ? mapCostosDia(data) : null;
  const inputCant = document.getElementById('cd-canastillas');
  if (!inputCant) return;
  inputCant.value = cd?.canastillas || '';
  document.getElementById('cd-combustible').checked = !!cd?.combustible;
  calcularCostosDia();
}

export function calcularCostosDia() {
  const cant = parseInt(document.getElementById('cd-canastillas').value) || 0;
  const combustible = document.getElementById('cd-combustible').checked;
  const montoCanastillas = cant * COSTO_CANASTILLA;
  const montoCombustible = combustible ? COSTO_COMBUSTIBLE_DIA : 0;
  const total = montoCanastillas + montoCombustible;
  const el = document.getElementById('cd-total');
  if (el) el.textContent = fmt(total);
  return { montoCanastillas, montoCombustible, total };
}

export async function guardarCostosDia() {
  if (!cdFecha) return;
  const cant = parseInt(document.getElementById('cd-canastillas').value) || 0;
  const combustible = document.getElementById('cd-combustible').checked;
  const btn = document.getElementById('cd-save-btn');
  if (btn) btn.disabled = true;
  const { error } = await supabase.from('costos_dia').upsert({
    fecha: cdFecha, cantidad_canastillas: cant, combustible, updated_at: new Date().toISOString(),
  }, { onConflict: 'fecha' });
  if (btn) btn.disabled = false;
  if (error) { toast('Error al guardar: ' + error.message, true); return; }
  toast('Costos del día guardados');
}

// ───────── RESUMEN DE COSTOS DEL DÍA (Dashboard) ─────────
export async function renderResumenCostosDia(fecha) {
  const el = document.getElementById('d-resumen-costos');
  if (!el) return;
  el.innerHTML = '<div class="dc-empty">Calculando...</div>';

  const [pdRes, peRes, cdRes, actRes] = await Promise.all([
    supabase.from('personal_dia').select('*').eq('fecha', fecha).maybeSingle(),
    supabase.from('personal_dia_empleados').select('empleado_id, empleados_esmeralda(costo_dia)').eq('fecha', fecha),
    supabase.from('costos_dia').select('*').eq('fecha', fecha).maybeSingle(),
    supabase.from('actividades').select('codigo, cajas_producidas').eq('fecha', fecha),
  ]);

  const pd = pdRes.data ? mapPersonalDia(pdRes.data) : null;
  const costoEsm = (peRes.data || []).reduce((s, r) => s + (parseFloat(r.empleados_esmeralda?.costo_dia) || 0), 0);
  const costoSvc = pd ? (pd.svcH + pd.svcM) * pd.costoSvcHora * pd.horasDia : 0;
  const cd = cdRes.data ? mapCostosDia(cdRes.data) : null;
  const montoCanastillas = (cd?.canastillas || 0) * COSTO_CANASTILLA;
  const montoCombustible = cd?.combustible ? COSTO_COMBUSTIBLE_DIA : 0;

  const codigos = (actRes.data || []).map(a => a.codigo);
  let costoMaquinaTotal = 0;
  if (codigos.length) {
    const { data: costosData } = await supabase.from('costos').select('actividad_codigo, c_maq').in('actividad_codigo', codigos);
    costoMaquinaTotal = (costosData || []).reduce((s, c) => s + (parseFloat(c.c_maq) || 0), 0);
  }
  const cajasTotal = (actRes.data || []).reduce((s, a) => s + (parseInt(a.cajas_producidas) || 0), 0);

  const total = costoEsm + costoSvc + montoCanastillas + montoCombustible + costoMaquinaTotal;
  const costoPorCaja = cajasTotal > 0 ? total / cajasTotal : 0;

  el.innerHTML = `
    <div class="di-row"><span class="di-l">Personal Esmeralda (día)</span><span class="di-v">${fmt(costoEsm)}</span></div>
    <div class="di-row"><span class="di-l">Personal Service (día)</span><span class="di-v">${fmt(costoSvc)}</span></div>
    <div class="di-row"><span class="di-l">Máquinas (incl. vapor/agua/luz)</span><span class="di-v">${fmt(costoMaquinaTotal)}</span></div>
    <div class="di-row"><span class="di-l">Limpieza de canastillas</span><span class="di-v">${fmt(montoCanastillas)}</span></div>
    <div class="di-row"><span class="di-l">Combustible</span><span class="di-v">${fmt(montoCombustible)}</span></div>
    <div class="di-row" style="border-top:2px solid var(--b100);margin-top:4px;padding-top:8px"><span class="di-l" style="font-weight:600;color:var(--b800)">TOTAL DEL DÍA</span><span class="di-v" style="font-size:16px;font-weight:700;color:var(--b600)">${fmt(total)}</span></div>
    <div class="di-row" style="margin-top:8px"><span class="di-l">Cajas producidas</span><span class="di-v">${cajasTotal}</span></div>
    <div class="di-row"><span class="di-l" style="font-weight:600;color:var(--b800)">Costo por caja</span><span class="di-v" style="font-weight:700;color:#7c3aed">${cajasTotal > 0 ? fmt(costoPorCaja) : '—'}</span></div>`;
}
