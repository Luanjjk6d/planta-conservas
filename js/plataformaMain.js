import { tieneAcceso, verificarCodigo } from './accessGate.js';

const NOMBRE_ESPACIO = { mes: 'MES Planta', gestion: 'Gestión Conservas' };
const DESTINO = { mes: 'mes.html', gestion: 'gestion.html' };
let espacioActual = null;

// Si ya se ingresó el código en esta sesión, entrar directo sin volver a pedirlo.
window.abrirCodigoModal = (espacio) => {
  if (tieneAcceso(espacio)) { location.href = DESTINO[espacio]; return; }
  espacioActual = espacio;
  document.getElementById('codigo-modal-espacio').textContent = NOMBRE_ESPACIO[espacio];
  document.getElementById('codigo-input').value = '';
  document.getElementById('codigo-error').classList.remove('show');
  document.getElementById('codigo-modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('codigo-input').focus(), 100);
};

window.cerrarCodigoModal = () => {
  document.getElementById('codigo-modal-ov').classList.remove('open');
  espacioActual = null;
};

window.confirmarCodigoModal = async () => {
  const codigo = document.getElementById('codigo-input').value;
  const ok = await verificarCodigo(espacioActual, codigo);
  if (!ok) { document.getElementById('codigo-error').classList.add('show'); return; }
  location.href = DESTINO[espacioActual];
};

document.getElementById('codigo-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') window.confirmarCodigoModal();
});
