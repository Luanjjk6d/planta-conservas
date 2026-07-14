import { toast } from './utils.js';
import { TABLE_BY_SELECT, insertLookupValue } from './lookups.js';

let modalSelId = null;

export function openModal(selId, title, placeholder) {
  modalSelId = selId;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-input').placeholder = placeholder;
  document.getElementById('modal-input').value = '';
  document.getElementById('modal-ov').classList.add('open');
  setTimeout(() => document.getElementById('modal-input').focus(), 100);
}

export function closeModal() {
  document.getElementById('modal-ov').classList.remove('open');
  modalSelId = null;
}

export async function confirmModal() {
  const val = document.getElementById('modal-input').value.trim().toUpperCase();
  if (!val) { toast('Escribe un nombre válido.'); return; }
  const sel = document.getElementById(modalSelId);
  if (Array.from(sel.options).some(o => o.value === val)) { toast('Ya existe ese item.'); return; }

  const table = TABLE_BY_SELECT[modalSelId];
  const { error } = await insertLookupValue(table, val);
  if (error) {
    toast(error.code === '23505' ? 'Ya existe ese item.' : 'Error al agregar: ' + error.message, true);
    return;
  }

  const o = document.createElement('option');
  o.value = val; o.textContent = val;
  sel.appendChild(o); sel.value = val;
  closeModal();
  toast('"' + val + '" agregado');
}

export function initModal() {
  document.getElementById('modal-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmModal();
    if (e.key === 'Escape') closeModal();
  });
  document.getElementById('modal-ov').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-ov')) closeModal();
  });
}
