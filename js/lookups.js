import { supabase } from './supabaseClient.js';

// Mapea el id de cada <select> a la tabla de catálogo que lo respalda.
export const TABLE_BY_SELECT = {
  'm1-prod': 'productos',
  'm2-proc': 'procesos',
  'm2-equipo': 'equipos',
};

export async function fetchLookups() {
  const [prodRes, procRes, eqRes] = await Promise.all([
    supabase.from('productos').select('nombre').order('nombre'),
    supabase.from('procesos').select('nombre').order('nombre'),
    supabase.from('equipos').select('nombre').order('nombre'),
  ]);
  return { productos: prodRes.data || [], procesos: procRes.data || [], equipos: eqRes.data || [] };
}

export function populateLookupSelect(selectId, rows) {
  const sel = document.getElementById(selectId);
  rows.forEach(r => {
    const o = document.createElement('option');
    o.value = r.nombre;
    o.textContent = r.nombre;
    sel.appendChild(o);
  });
}

export async function insertLookupValue(table, nombre) {
  return supabase.from(table).insert({ nombre });
}
