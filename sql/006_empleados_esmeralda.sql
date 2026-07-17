-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Migración 006: catálogo de empleados Esmeralda con costo fijo por
-- hora, y su relación con cada actividad (quién participó).
--
-- El personal Esmeralda es fijo (mismas personas, mismo costo/hora
-- predeterminado), a diferencia de Service que varía y sigue
-- ingresándose manualmente como hasta ahora.
-- ═══════════════════════════════════════════════════════════

create table empleados_esmeralda (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  genero text not null check (genero in ('H','M')),
  costo_hora numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table actividad_esmeralda_empleados (
  id bigint generated always as identity primary key,
  actividad_codigo text not null references actividades(codigo) on delete cascade,
  empleado_id bigint not null references empleados_esmeralda(id),
  created_at timestamptz not null default now(),
  unique (actividad_codigo, empleado_id)
);
create index if not exists idx_aee_actividad_codigo on actividad_esmeralda_empleados(actividad_codigo);

alter table empleados_esmeralda enable row level security;
create policy "Open access (no auth) - select" on empleados_esmeralda for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on empleados_esmeralda for insert to anon, authenticated with check (true);

alter table actividad_esmeralda_empleados enable row level security;
create policy "Open access (no auth) - select" on actividad_esmeralda_empleados for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on actividad_esmeralda_empleados for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - delete" on actividad_esmeralda_empleados for delete to anon, authenticated using (true);
