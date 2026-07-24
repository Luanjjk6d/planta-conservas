// Resumen — centro ejecutivo de Gestión Conservas. Sin tabla propia: lee
// proyectos/tareas/reuniones ya cargados y arma tarjetas + próximos hitos.
import { tareasDB, reunionesDB } from './gestionState.js';
import { proyectosDB } from './state.js';
import { esc, fF, localDateStr, shiftDate } from './utils.js';
import { fetchTareas } from './tareas.js';
import { fetchReuniones } from './reuniones.js';
import { fetchProyectos } from './proyectos.js';

export async function fetchResumen() {
  await Promise.all([fetchProyectos(), fetchTareas(), fetchReuniones()]);
  renderResumen();
}

export function resumenIrA(idModulo) {
  const nombres = { proy: 'Proyectos', actividades: 'Actividades', reuniones: 'Reuniones y acuerdos' };
  const b = Array.from(document.querySelectorAll('.nb')).find(x => x.textContent.includes(nombres[idModulo]));
  window.showPage(idModulo, b);
  if (idModulo === 'proy') window.renderProyectos();
  if (idModulo === 'actividades') window.renderTareas();
  if (idModulo === 'reuniones') window.renderReuniones();
}

export function renderResumen() {
  const el = document.getElementById('resumen-body');
  if (!el) return;
  const hoy = localDateStr();
  const en7dias = shiftDate(hoy, 7);

  const proyectosActivos = proyectosDB.filter(p => p.estado === 'planificado' || p.estado === 'en_curso');
  const proyectosAtrasados = proyectosDB.filter(p => p.fechaMeta && p.fechaMeta < hoy && p.estado !== 'completado');
  const proyectosBloqueados = proyectosDB.filter(p => p.bloqueoPrincipal && p.estado !== 'completado');
  const tareasPendientes = tareasDB.filter(t => !['completada', 'cancelada'].includes(t.estado));
  const tareasVencidas = tareasDB.filter(t => t.fechaLimite && t.fechaLimite < hoy && !['completada', 'cancelada'].includes(t.estado));
  const reunionesSemana = reunionesDB.filter(r => r.estado === 'programada' && r.fecha >= hoy && r.fecha <= en7dias);
  const proximosHitos = proyectosDB.filter(p => p.fechaMeta && p.fechaMeta >= hoy && p.estado !== 'completado')
    .sort((a, b) => a.fechaMeta.localeCompare(b.fechaMeta)).slice(0, 6);

  el.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi blue kpi-click" onclick="resumenIrA('proy')">
        <div class="kpi-l">Proyectos activos</div>
        <div class="kpi-v">${proyectosActivos.length}</div>
        <div class="kpi-s">de ${proyectosDB.length} en total</div>
      </div>
      <div class="kpi red kpi-click" onclick="resumenIrA('proy')">
        <div class="kpi-l">Proyectos atrasados</div>
        <div class="kpi-v">${proyectosAtrasados.length}</div>
        <div class="kpi-s">fecha objetivo vencida</div>
      </div>
      <div class="kpi orange kpi-click" onclick="resumenIrA('proy')">
        <div class="kpi-l">Proyectos bloqueados</div>
        <div class="kpi-v">${proyectosBloqueados.length}</div>
        <div class="kpi-s">con bloqueo principal activo</div>
      </div>
      <div class="kpi purple kpi-click" onclick="resumenIrA('reuniones')">
        <div class="kpi-l">Reuniones esta semana</div>
        <div class="kpi-v">${reunionesSemana.length}</div>
        <div class="kpi-s">próximos 7 días</div>
      </div>
      <div class="kpi blue kpi-click" onclick="resumenIrA('actividades')">
        <div class="kpi-l">Actividades pendientes</div>
        <div class="kpi-v">${tareasPendientes.length}</div>
        <div class="kpi-s">de ${tareasDB.length} en total</div>
      </div>
      <div class="kpi red kpi-click" onclick="resumenIrA('actividades')">
        <div class="kpi-l">Actividades vencidas</div>
        <div class="kpi-v">${tareasVencidas.length}</div>
        <div class="kpi-s">fecha límite vencida</div>
      </div>
    </div>

    <div class="dg">
      <div class="dc">
        <div class="dc-hdr"><span class="dc-title">Próximos hitos</span><span class="dc-badge">${proximosHitos.length}</span></div>
        <div class="dc-body">
          ${proximosHitos.length ? proximosHitos.map(p => `
            <div class="di-row" style="cursor:pointer" onclick="abrirFichaProyecto(${p.id})">
              <span class="di-l">${esc(p.nombre)}</span>
              <span class="di-v">${fF(p.fechaMeta)}</span>
            </div>`).join('') : '<div class="dc-empty">Sin hitos próximos.</div>'}
        </div>
      </div>
      <div class="dc">
        <div class="dc-hdr"><span class="dc-title">Reuniones de la semana</span><span class="dc-badge">${reunionesSemana.length}</span></div>
        <div class="dc-body">
          ${reunionesSemana.length ? reunionesSemana.map(r => `
            <div class="di-row" style="cursor:pointer" onclick="openReunionModal(${r.id})">
              <span class="di-l">${esc(r.asunto)}</span>
              <span class="di-v">${fF(r.fecha)}${r.hora ? ' · ' + r.hora : ''}</span>
            </div>`).join('') : '<div class="dc-empty">Sin reuniones esta semana.</div>'}
        </div>
      </div>
    </div>`;
}
