-- Etapa 3 de Gestión Conservas — módulo "Reuniones" (simplificado: sin
-- tabla separada de acuerdos por ahora, los compromisos se registran como
-- texto libre dentro de la propia reunión). Tabla nueva, no toca nada
-- existente.
create table reuniones (
  id bigint generated always as identity primary key,
  asunto text not null,
  fecha date not null,
  hora time,
  modalidad text,
  proyecto_id bigint references proyectos(id) on delete set null,
  participantes text,
  objetivo text,
  resumen text,
  acuerdos text,
  responsable_seguimiento text,
  estado text not null default 'programada'
    check (estado in ('programada','realizada','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reuniones_proyecto on reuniones(proyecto_id);
create index if not exists idx_reuniones_fecha on reuniones(fecha);

alter table reuniones enable row level security;
create policy "Open access (no auth) - select" on reuniones for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on reuniones for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on reuniones for update to anon, authenticated using (true) with check (true);
create policy "Open access (no auth) - delete" on reuniones for delete to anon, authenticated using (true);
