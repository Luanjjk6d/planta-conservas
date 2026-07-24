// Lógica de acceso compartida entre MES Planta y Gestión Conservas.
// Nivel de seguridad cosmético a propósito (ver comentario en accessConfig.js)
// — el objetivo es una puerta simple, no protección real de los datos.
// Aislado en este módulo para poder reemplazarlo más adelante por Supabase
// Auth sin tocar el resto de la app (index.html, mes.html, gestion.html
// solo llaman a tieneAcceso/verificarCodigo/cerrarSesion).
import { CODE_HASHES } from './accessConfig.js';

const STORAGE_PREFIX = 'acceso_';

async function sha256Hex(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function tieneAcceso(espacio) {
  return sessionStorage.getItem(STORAGE_PREFIX + espacio) === 'ok';
}

export async function verificarCodigo(espacio, codigo) {
  const hash = await sha256Hex((codigo || '').trim());
  const ok = hash === CODE_HASHES[espacio];
  if (ok) sessionStorage.setItem(STORAGE_PREFIX + espacio, 'ok');
  return ok;
}

export function cerrarSesion(espacio) {
  sessionStorage.removeItem(STORAGE_PREFIX + espacio);
}
