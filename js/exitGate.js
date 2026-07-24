// Botón "Salir" del header — compartido entre mes.html y gestion.html.
// Lee el espacio actual de <body data-espacio="..."> para no duplicar este
// archivo por espacio.
import { cerrarSesion } from './accessGate.js';

window.salirEspacio = () => {
  cerrarSesion(document.body.dataset.espacio);
  location.href = 'index.html';
};
