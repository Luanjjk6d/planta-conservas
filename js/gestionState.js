// Estado en memoria propio de Gestión Conservas — separado de state.js
// (que es compartido con el MES) para que quede clarísimo qué pertenece
// a cada espacio. Cada .html es un documento distinto con su propio
// árbol de módulos, así que no hay riesgo de colisión con el MES.
export const tareasDB = [];               // tabla: tareas — "Actividades" de Gestión (no confundir con actividades del MES)
export const reunionesDB = [];            // tabla: reuniones
export const acuerdosDB = [];             // tabla: acuerdos
export const mapaNodosDB = [];            // tabla: mapa_nodos — notas rápidas anidables del Mapa
