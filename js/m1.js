import { supabase } from './supabaseClient.js';
import { m1Data, numerosParteDB } from './state.js';
import { hn, fF, esc, toast, localDateStr } from './utils.js';
import { viewDate } from './viewDate.js';
import { clearStickyNpIfMatches } from './m2.js';

export function mapLote(row) {
  return {
    id: row.id,
    np: row.numero_parte,
    fecha: row.fecha,
    hora: (row.hora || '').slice(0, 5),
    prod: row.producto,
    especie: row.especie || '',
    peso: parseFloat(row.peso_kg),
    sup: row.supervisor,
    turno: row.turno || '',
  };
}

export async function guarM1() {
  const np = document.getElementById('m1-np').value.trim();
  const fecha = document.getElementById('m1-fecha').value;
  const prod = document.getElementById('m1-prod').value;
  const sup = document.getElementById('m1-sup').value.trim();
  const peso = document.getElementById('m1-peso').value;
  if (!np || !fecha || !prod || !sup || !peso) { toast('Completa los campos obligatorios.'); return; }

  const btn = document.getElementById('m1-save-btn');
  btn.disabled = true;
  const record = {
    numero_parte: np,
    fecha,
    hora: document.getElementById('m1-hora').value,
    producto: prod,
    especie: document.getElementById('m1-especie').value.trim() || null,
    peso_kg: parseFloat(peso),
    supervisor: sup,
    turno: document.getElementById('m1-turno').value || null,
  };
  const { data, error } = await supabase.from('lotes').insert(record).select().single();
  btn.disabled = false;
  if (error) { toast('Error al guardar: ' + error.message, true); return; }

  m1Data.unshift(mapLote(data));
  rendM1(); limpM1(); toast('Registro guardado');
}

export async function eliminarLote(id) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const { error } = await supabase.from('lotes').delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }
  const idx = m1Data.findIndex(r => r.id === id);
  if (idx !== -1) m1Data.splice(idx, 1);
  rendM1();
  toast('Registro eliminado');
}

export function limpM1() {
  ['m1-np', 'm1-especie', 'm1-peso', 'm1-sup'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m1-prod').selectedIndex = 0;
  document.getElementById('m1-turno').selectedIndex = 0;
  document.getElementById('m1-fecha').value = viewDate.current;
  document.getElementById('m1-hora').value = hn();
}

export function rendM1() {
  const el = document.getElementById('list-m1');
  // Un registro se ve el día que se cargó, pero también en los días
  // siguientes mientras su NP siga abierto — así la info de materia
  // prima queda visible durante toda la producción, no solo el día 1.
  const dayData = m1Data.filter(r => {
    if (r.fecha === viewDate.current) return true;
    if (r.fecha > viewDate.current) return false;
    const np = numerosParteDB.find(n => n.nombre === r.np);
    return !!(np && np.estado === 'abierto');
  });
  if (!dayData.length) { el.innerHTML = '<div class="empty"><div class="empty-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12h6M12 9v6"/></svg></div>Sin registros este día.</div>'; return; }
  el.innerHTML = dayData.map((r, i) => `<div class="card">
    <div class="card-head">
      <div><div class="card-title">${esc(r.sup)}</div><div class="card-meta">${fF(r.fecha)} · ${r.hora}${r.turno ? ' · ' + r.turno.split(' ')[0] : ''}${r.fecha !== viewDate.current ? ' · <span style="color:var(--b600);font-weight:600">NP abierto</span>' : ''}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="card-num">#${dayData.length - i}</span>
        <button class="link-del" onclick="eliminarLote(${r.id})">Eliminar</button>
      </div>
    </div>
    <div class="pill"><strong>NP:</strong> ${esc(r.np)}</div>
    <div class="pill" style="margin-top:4px"><strong>Producto:</strong> ${esc(r.prod)}${r.especie ? ' · <strong>Especie:</strong> ' + esc(r.especie) : ''}</div>
    <div class="cstats" style="grid-template-columns:1fr 1fr 1fr"><div><div class="cs-v">${r.peso} kg</div><div class="cs-l">Mat. prima</div></div><div><div class="cs-v">${esc(r.sup)}</div><div class="cs-l">Supervisor</div></div><div><div class="cs-v">${r.turno ? r.turno.split(' ')[0] : '—'}</div><div class="cs-l">Turno</div></div></div>
  </div>`).join('');
}

// ═══════════════════════════════
// NÚMEROS DE PARTE (NP)
// ═══════════════════════════════
export function mapNumeroParte(row) {
  return { id: row.id, nombre: row.nombre, estado: row.estado, fechaApertura: row.fecha_apertura, fechaCierre: row.fecha_cierre, cliente: row.cliente || '' };
}

export function openNpModal() {
  document.getElementById('np-nombre').value = '';
  document.getElementById('np-cliente').selectedIndex = 0;
  document.getElementById('np-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('np-nombre').focus(), 100);
}

export function closeNpModal() {
  document.getElementById('np-modal-ov').classList.remove('open');
}

export async function confirmNpModal() {
  const nombre = document.getElementById('np-nombre').value.trim().toUpperCase();
  const cliente = document.getElementById('np-cliente').value || null;
  if (!nombre) { toast('Escribe un número de parte válido.'); return; }
  if (numerosParteDB.some(n => n.nombre === nombre)) { toast('Ya existe ese número de parte.'); return; }

  const { data, error } = await supabase.from('numeros_parte').insert({ nombre, cliente }).select().single();
  if (error) { toast(error.code === '23505' ? 'Ya existe ese número de parte.' : 'Error al agregar: ' + error.message, true); return; }

  const np = mapNumeroParte(data);
  numerosParteDB.push(np);
  ['m1-np', 'm2-np'].forEach(selId => {
    const sel = document.getElementById(selId);
    const o = document.createElement('option');
    o.value = np.nombre; o.textContent = np.nombre;
    sel.appendChild(o);
  });
  rendNumerosParte();
  closeNpModal();
  toast('"' + nombre + '" agregado');
}

export async function fetchNumerosParte() {
  const { data, error } = await supabase.from('numeros_parte').select('*').order('nombre');
  if (error) { toast('Error al cargar números de parte: ' + error.message, true); return []; }
  return data.map(mapNumeroParte);
}

export function rendNumerosParte() {
  const el = document.getElementById('list-np');
  if (!numerosParteDB.length) { el.innerHTML = '<div class="empty" style="padding:1.5rem">Sin números de parte.</div>'; return; }
  const abiertos = numerosParteDB.filter(n => n.estado === 'abierto');
  const cerrados = numerosParteDB.filter(n => n.estado === 'cerrado');
  el.innerHTML = [...abiertos, ...cerrados].map(n => `
    <div class="lata-row">
      <div>
        <div class="lata-qty" style="font-size:14px">${esc(n.nombre)}</div>
        <div style="font-size:11px;color:var(--muted)">${n.cliente ? esc(n.cliente) + ' · ' : ''}${n.estado === 'abierto' ? 'Abierto desde ' + fF(n.fechaApertura) : 'Cerrado ' + fF(n.fechaCierre)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        ${n.estado === 'abierto'
          ? `<button class="btn-s" style="padding:6px 12px;font-size:12px" onclick="cerrarNumeroParte(${n.id})">Cerrar</button>`
          : '<span class="sbadge fin">Cerrado</span>'}
        <button class="btn-x" title="Eliminar" onclick="eliminarNumeroParte(${n.id})">×</button>
      </div>
    </div>`).join('');
}

export async function cerrarNumeroParte(id) {
  const fechaCierre = localDateStr();
  const { error } = await supabase.from('numeros_parte').update({ estado: 'cerrado', fecha_cierre: fechaCierre }).eq('id', id);
  if (error) { toast('Error al cerrar: ' + error.message, true); return; }

  const np = numerosParteDB.find(n => n.id === id);
  if (np) { np.estado = 'cerrado'; np.fechaCierre = fechaCierre; }
  ['m1-np', 'm2-np'].forEach(selId => {
    const sel = document.getElementById(selId);
    const opt = Array.from(sel.options).find(o => o.value === np?.nombre);
    if (opt) opt.remove();
  });
  if (np) clearStickyNpIfMatches(np.nombre);
  rendNumerosParte();
  toast(`"${np?.nombre}" cerrado`);
}

export async function eliminarNumeroParte(id) {
  const np = numerosParteDB.find(n => n.id === id);
  if (!confirm(`¿Eliminar "${np?.nombre}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await supabase.from('numeros_parte').delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }

  const idx = numerosParteDB.findIndex(n => n.id === id);
  if (idx !== -1) numerosParteDB.splice(idx, 1);
  ['m1-np', 'm2-np'].forEach(selId => {
    const sel = document.getElementById(selId);
    const opt = Array.from(sel.options).find(o => o.value === np?.nombre);
    if (opt) opt.remove();
  });
  if (np) clearStickyNpIfMatches(np.nombre);
  rendNumerosParte();
  toast(`"${np?.nombre}" eliminado`);
}
