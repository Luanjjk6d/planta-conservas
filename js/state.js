// Estado compartido en memoria, poblado desde Supabase al cargar (ver main.js).
// Se mutan in-place (push/unshift/Object.assign) — nunca se reasignan — para
// que todos los módulos que las importan vean siempre los mismos datos.
export const m1Data = [];        // registros Módulo 1 (tabla: lotes)
export const actividadesDB = []; // registros Módulo 2 (tabla: actividades)
export const costosDB = {};      // { codigo_actividad: {...} } (tabla: costos)
export const personalLogDB = {}; // { codigo_actividad: [{hora,h,m}, ...] } (tabla: actividad_personal_log)
export const empleadosEsmeraldaDB = [];  // catálogo: [{id,nombre,genero,costoHora}, ...] (tabla: empleados_esmeralda)
export const actividadEmpleadosDB = {};  // { codigo_actividad: [{id,nombre,genero,costoHora}, ...] } (tabla: actividad_esmeralda_empleados)
