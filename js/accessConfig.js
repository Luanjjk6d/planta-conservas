// Códigos de acceso provisionales — nivel de seguridad cosmético (ver
// README, sección "Acceso por código"), no reemplaza autenticación real.
// Se guarda el hash SHA-256 de cada código, no el texto plano.
//
// Códigos actuales (provisionales, cámbialos cuando quieras):
//   MES Planta:        123
//   Gestión Conservas:  321
//
// Para cambiar un código:
//   1. Abre la consola del navegador (F12) en cualquier página de esta app.
//   2. Ejecuta:
//        await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tu-codigo-nuevo'))
//          .then(buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''))
//   3. Copia el resultado (64 caracteres) y reemplaza el hash correspondiente abajo.
export const CODE_HASHES = {
  mes: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  gestion: '8d23cf6c86e834a7aa6eded54c26ce2bb2e74903538c61bdd5d2197997ab2f72',
};
