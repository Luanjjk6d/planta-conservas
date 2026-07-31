// Notas rápidas anidables del Mapa (subtareas simples) — solo texto, sin
// campos de seguimiento, para ir armando el árbol de un proyecto rápido.
// Cuelgan de un proyecto, de una tarea, o de otra nota (anidación libre).
import { supabase } from './supabaseClient.js';
import { mapaNodosDB } from './gestionState.js';
import { toast } from './utils.js';

export const COLORES = ['blue', 'green', 'orange', 'red', 'purple', 'gray'];

export function mapNodo(row) {
  return {
    id: row.id,
    texto: row.texto,
    proyectoId: row.proyecto_id,
    tareaPadreId: row.tarea_padre_id,
    nodoPadreId: row.nodo_padre_id,
    color: row.color || null,
  };
}

export async function fetchMapaNodos() {
  const { data, error } = await supabase.from('mapa_nodos').select('*').order('created_at', { ascending: true });
  if (error) {
    toast('Error al cargar notas del mapa: ' + error.message, true);
    return;
  }
  mapaNodosDB.length = 0;
  mapaNodosDB.push(...data.map(mapNodo));
}

export function nodosDeProyecto(proyectoId) {
  return mapaNodosDB.filter(n => n.proyectoId === proyectoId);
}
export function nodosDeTarea(tareaId) {
  return mapaNodosDB.filter(n => n.tareaPadreId === tareaId);
}
export function nodosDeNodo(nodoId) {
  return mapaNodosDB.filter(n => n.nodoPadreId === nodoId);
}

let agregandoEn = null; // { tipo: 'proyecto'|'tarea'|'nodo', id }
export function estaAgregandoEn(tipo, id) {
  return agregandoEn && agregandoEn.tipo === tipo && agregandoEn.id === id;
}
export function iniciarAgregarNodo(tipo, id) {
  agregandoEn = { tipo, id };
  window.renderMapa();
  setTimeout(() => document.getElementById('mapa-nuevo-input')?.focus(), 50);
}
export function cancelarAgregarNodo() {
  agregandoEn = null;
  window.renderMapa();
}
export async function confirmarAgregarNodo(tipo, id, texto) {
  const limpio = (texto || '').trim();
  if (!limpio) { cancelarAgregarNodo(); return; }
  const record = { texto: limpio };
  if (tipo === 'proyecto') record.proyecto_id = id;
  if (tipo === 'tarea') record.tarea_padre_id = id;
  if (tipo === 'nodo') record.nodo_padre_id = id;
  const { data, error } = await supabase.from('mapa_nodos').insert(record).select().single();
  if (error) { toast('Error al guardar: ' + error.message, true); return; }
  mapaNodosDB.push(mapNodo(data));
  agregandoEn = null;
  window.renderMapa();
}

let editandoNodoId = null;
export function estaEditandoNodo(id) {
  return editandoNodoId === id;
}
export function iniciarEditarNodo(id) {
  editandoNodoId = id;
  window.renderMapa();
  setTimeout(() => {
    const el = document.getElementById('mapa-editar-input');
    if (!el) return;
    el.value = mapaNodosDB.find(n => n.id === id)?.texto || '';
    el.focus();
    el.select();
  }, 50);
}
export function cancelarEditarNodo() {
  editandoNodoId = null;
  window.renderMapa();
}
export async function confirmarEditarNodo(id, texto) {
  const limpio = (texto || '').trim();
  if (!limpio) { cancelarEditarNodo(); return; }
  const { error } = await supabase.from('mapa_nodos').update({ texto: limpio }).eq('id', id);
  if (error) { toast('Error al guardar: ' + error.message, true); return; }
  const n = mapaNodosDB.find(x => x.id === id);
  if (n) n.texto = limpio;
  editandoNodoId = null;
  window.renderMapa();
}

let confirmandoEliminarId = null;
export function estaConfirmandoEliminarNodo(id) {
  return confirmandoEliminarId === id;
}
export function pedirEliminarNodo(id) {
  confirmandoEliminarId = id;
  window.renderMapa();
}
export function cancelarEliminarNodo() {
  confirmandoEliminarId = null;
  window.renderMapa();
}
export async function confirmarEliminarNodo(id) {
  const { error } = await supabase.from('mapa_nodos').delete().eq('id', id);
  if (error) { toast('Error al eliminar: ' + error.message, true); return; }
  confirmandoEliminarId = null;
  await fetchMapaNodos(); // el borrado en cascada puede llevarse notas hijas
  window.renderMapa();
  toast('Nota eliminada');
}

let eligiendoColorId = null;
export function estaEligiendoColor(id) {
  return eligiendoColorId === id;
}
export function iniciarElegirColor(id) {
  eligiendoColorId = id;
  window.renderMapa();
}
export function cancelarElegirColor() {
  eligiendoColorId = null;
  window.renderMapa();
}
export async function elegirColor(id, color) {
  const { error } = await supabase.from('mapa_nodos').update({ color }).eq('id', id);
  if (error) { toast('Error al guardar: ' + error.message, true); return; }
  const n = mapaNodosDB.find(x => x.id === id);
  if (n) n.color = color;
  eligiendoColorId = null;
  window.renderMapa();
}
