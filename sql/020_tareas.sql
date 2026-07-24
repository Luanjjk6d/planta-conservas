-- Etapa 2 de Gestión Conservas — módulo "Actividades" (nombre interno
-- "tareas" para no confundirse con la tabla "actividades" del MES, que es
-- un concepto totalmente distinto: proceso de producción, no tarea de
-- proyecto). Tabla nueva, no toca nada existente.
create table tareas (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text,
  proyecto_id bigint references proyectos(id) on delete set null,
  responsable text,
  depende_de text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','en_curso','esperando_terceros','bloqueada','completada','cancelada')),
  prioridad text not null default 'media'
    check (prioridad in ('baja','media','alta','critica')),
  fecha_inicio date,
  fecha_limite date,
  fecha_cierre date,
  comentario_cierre text,
  evidencia text,
  observaciones text,
  reunion_origen_id bigint,   -- FK a reuniones(id) se agrega en la migración 021
  acuerdo_origen_id bigint,   -- FK a acuerdos(id) se agrega en la migración 021
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tareas_proyecto on tareas(proyecto_id);
create index if not exists idx_tareas_estado on tareas(estado);

alter table tareas enable row level security;
create policy "Open access (no auth) - select" on tareas for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on tareas for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on tareas for update to anon, authenticated using (true) with check (true);
create policy "Open access (no auth) - delete" on tareas for delete to anon, authenticated using (true);
