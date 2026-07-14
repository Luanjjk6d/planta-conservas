export const hn = () => new Date().toTimeString().slice(0, 5);
export const fF = s => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
export const tMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const mHM = n => `${Math.floor(n / 60)}h ${n % 60}m`;
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const fmt = n => `S/. ${parseFloat(n || 0).toFixed(2)}`;
export const fmtN = n => parseFloat(n || 0).toFixed(2);

export function toast(msg, isError = false) {
  document.getElementById('toast-msg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

export function showPage(n, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + n).classList.add('active');
  btn.classList.add('active');
}
