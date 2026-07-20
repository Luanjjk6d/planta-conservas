-- Módulo de Seguimiento de Proyectos — carga perezosa, no afecta a M1/M2/M3.
create table proyectos (
  id bigint generated always as identity primary key,
  nombre text not null,
  responsable text,
  estado text not null default 'planificado' check (estado in ('planificado','en_curso','pausado','completado')),
  avance int not null default 0 check (avance between 0 and 100),
  fecha_meta date,
  fecha_cierre date,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table proyectos enable row level security;
create policy "Open access (no auth) - select" on proyectos for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on proyectos for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on proyectos for update to anon, authenticated using (true) with check (true);
create policy "Open access (no auth) - delete" on proyectos for delete to anon, authenticated using (true);
