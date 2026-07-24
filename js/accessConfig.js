// Códigos de acceso provisionales — nivel de seguridad cosmético (ver
// README, sección "Acceso por código"), no reemplaza autenticación real.
// Se guarda el hash SHA-256 de cada código, no el texto plano.
//
// Códigos actuales (provisionales, cámbialos cuando quieras):
//   MES Planta:        planta2026
//   Gestión Conservas:  gestion2026
//
// Para cambiar un código:
//   1. Abre la consola del navegador (F12) en cualquier página de esta app.
//   2. Ejecuta:
//        await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tu-codigo-nuevo'))
//          .then(buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''))
//   3. Copia el resultado (64 caracteres) y reemplaza el hash correspondiente abajo.
export const CODE_HASHES = {
  mes: '8dc176752a0f46d28bf34797f2434e92ef6b0fe77b4a95922f412af662db5ff6',
  gestion: '7eff5c2aa0b7e9ed246b0ce56533502bed8c68150680fec1594498996d36a255',
};
