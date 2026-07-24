import { showPage } from './utils.js';
import {
  fetchProyectos, setProyectoFiltro, openProyectoModal, closeProyectoModal, confirmProyectoModal, editProyecto,
  toggleProyMenu, abrirConfirmEliminarProyecto, closeConfirmDeleteModal, confirmarEliminarProyectoModal,
  renderProyectos,
} from './proyectos.js';
import {
  fetchTareas, aplicarFiltrosTareas, cambiarVistaTareas, verTareasDeProyecto, irATareasDeProyecto,
  openTareaModal, closeTareaModal, confirmTareaModal, toggleTareaMenu,
  marcarTareaEnCurso, abrirCompletarTarea, closeCompletarTareaModal, confirmCompletarTarea,
  abrirProyectoDeTarea, eliminarTarea, closeTareaConfirmDeleteModal, confirmarEliminarTarea,
} from './tareas.js';
import {
  fetchReuniones, toggleReunionMenu, openReunionModal, closeReunionModal, confirmReunionModal,
  eliminarReunion, closeReunionConfirmDeleteModal, confirmarEliminarReunion,
} from './reuniones.js';
import { abrirFichaProyecto, volverAProyectosDesdeFicha, abrirTareaEnFicha, abrirReunionEnFicha } from './proyectoDetalle.js';

// Funciones referenciadas desde onclick="" en el HTML — deben vivir en window
// porque los módulos ES no las exponen globalmente por defecto.
Object.assign(window, {
  showPage,
  fetchProyectos, setProyectoFiltro, openProyectoModal, closeProyectoModal, confirmProyectoModal, editProyecto,
  toggleProyMenu, abrirConfirmEliminarProyecto, closeConfirmDeleteModal, confirmarEliminarProyectoModal,
  renderProyectos,
  fetchTareas, aplicarFiltrosTareas, cambiarVistaTareas, verTareasDeProyecto, irATareasDeProyecto,
  openTareaModal, closeTareaModal, confirmTareaModal, toggleTareaMenu,
  marcarTareaEnCurso, abrirCompletarTarea, closeCompletarTareaModal, confirmCompletarTarea,
  abrirProyectoDeTarea, eliminarTarea, closeTareaConfirmDeleteModal, confirmarEliminarTarea,
  fetchReuniones, toggleReunionMenu, openReunionModal, closeReunionModal, confirmReunionModal,
  eliminarReunion, closeReunionConfirmDeleteModal, confirmarEliminarReunion,
  abrirFichaProyecto, volverAProyectosDesdeFicha, abrirTareaEnFicha, abrirReunionEnFicha,
});

// Header date
(() => {
  const a = new Date(), ds = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], ms = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  document.getElementById('hdr-date').textContent = `${ds[a.getDay()]} ${a.getDate()} ${ms[a.getMonth()]} ${a.getFullYear()}`;
})();
