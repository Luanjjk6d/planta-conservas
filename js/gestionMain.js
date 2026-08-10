import { showPage } from './utils.js';
import {
  fetchProyectos, setProyectoFiltro, openProyectoModal, closeProyectoModal, confirmProyectoModal, editProyecto,
  toggleProyMenu, abrirConfirmEliminarProyecto, closeConfirmDeleteModal, confirmarEliminarProyectoModal,
  renderProyectos,
} from './proyectos.js';
import {
  fetchTareas, openTareaModal, closeTareaModal, confirmTareaModal, toggleTareaMenu,
  marcarTareaEnCurso, abrirCompletarTarea, closeCompletarTareaModal, confirmCompletarTarea,
  abrirProyectoDeTarea, eliminarTarea, closeTareaConfirmDeleteModal, confirmarEliminarTarea,
  togglePendienteCompletada,
} from './tareas.js';
import {
  fetchReuniones, toggleReunionMenu, openReunionModal, closeReunionModal, confirmReunionModal,
  eliminarReunion, closeReunionConfirmDeleteModal, confirmarEliminarReunion,
} from './reuniones.js';
import { abrirFichaProyecto, volverAProyectosDesdeFicha, abrirTareaEnFicha, abrirReunionEnFicha } from './proyectoDetalle.js';
import { fetchCalendario, calMesAnterior, calMesSiguiente, calHoy, seleccionarDiaCalendario, abrirEventoCalendario } from './calendario.js';
import { fetchResumen, resumenIrA } from './resumen.js';
import { fetchMapa, renderMapa, toggleMapaProyecto } from './mapa.js';
import {
  iniciarAgregarNodo, cancelarAgregarNodo, confirmarAgregarNodo,
  iniciarEditarNodo, cancelarEditarNodo, confirmarEditarNodo,
  pedirEliminarNodo, cancelarEliminarNodo, confirmarEliminarNodo,
  iniciarElegirColor, cancelarElegirColor, elegirColor,
} from './mapaNodos.js';
import {
  fetchPendientes, renderPendientes, agregarPendienteParaPersona,
  iniciarEditarPersonaBtn, cancelarEditarPersona, confirmarEditarPersona,
} from './pendientes.js';

// Funciones referenciadas desde onclick="" en el HTML — deben vivir en window
// porque los módulos ES no las exponen globalmente por defecto.
Object.assign(window, {
  showPage,
  fetchProyectos, setProyectoFiltro, openProyectoModal, closeProyectoModal, confirmProyectoModal, editProyecto,
  toggleProyMenu, abrirConfirmEliminarProyecto, closeConfirmDeleteModal, confirmarEliminarProyectoModal,
  renderProyectos,
  fetchTareas, openTareaModal, closeTareaModal, confirmTareaModal, toggleTareaMenu,
  marcarTareaEnCurso, abrirCompletarTarea, closeCompletarTareaModal, confirmCompletarTarea,
  abrirProyectoDeTarea, eliminarTarea, closeTareaConfirmDeleteModal, confirmarEliminarTarea,
  togglePendienteCompletada,
  fetchReuniones, toggleReunionMenu, openReunionModal, closeReunionModal, confirmReunionModal,
  eliminarReunion, closeReunionConfirmDeleteModal, confirmarEliminarReunion,
  abrirFichaProyecto, volverAProyectosDesdeFicha, abrirTareaEnFicha, abrirReunionEnFicha,
  fetchCalendario, calMesAnterior, calMesSiguiente, calHoy, seleccionarDiaCalendario, abrirEventoCalendario,
  fetchResumen, resumenIrA,
  fetchMapa, renderMapa, toggleMapaProyecto,
  iniciarAgregarNodo, cancelarAgregarNodo, confirmarAgregarNodo,
  iniciarEditarNodo, cancelarEditarNodo, confirmarEditarNodo,
  pedirEliminarNodo, cancelarEliminarNodo, confirmarEliminarNodo,
  iniciarElegirColor, cancelarElegirColor, elegirColor,
  fetchPendientes, renderPendientes, agregarPendienteParaPersona,
  iniciarEditarPersonaBtn, cancelarEditarPersona, confirmarEditarPersona,
});

// Header date
(() => {
  const a = new Date(), ds = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], ms = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  document.getElementById('hdr-date').textContent = `${ds[a.getDay()]} ${a.getDate()} ${ms[a.getMonth()]} ${a.getFullYear()}`;
})();

// Resumen es la pestaña activa por defecto — la cargamos al abrir la app,
// no solo al hacer clic en su pestaña (que es como funcionan las demás).
fetchResumen();
