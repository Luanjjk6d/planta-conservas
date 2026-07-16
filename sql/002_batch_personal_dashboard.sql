-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Migración 002:
--   1) Elimina "número de lote" de Módulo 1.
--   2) Agrega "número de batch" y "fecha" a actividades (Módulo 2 / Dashboard).
--   3) Agrega historial de personal por actividad.
--   4) Elimina la tabla "latas" (latas cerradas) por completo.
-- Ejecutar completo en Supabase → SQL Editor → Run.
--
-- ⚠️  DESTRUCTIVO — datos que se pierden al ejecutar esto:
--   - La columna lotes.numero_lote y su contenido actual.
--   - La tabla "latas" completa y todos sus registros.
-- ═══════════════════════════════════════════════════════════

-- ── 1) Módulo 1: eliminar número de lote ──
alter table lotes drop column numero_lote;

-- ── 2) Módulo 2: número de batch (reemplaza al de Módulo 1) ──
alter table actividades add column numero_batch text;

-- ── 3) Módulo 4: columna "fecha" explícita en actividades ──
-- Se agrega en vez de filtrar por created_at (que está en UTC) para evitar
-- que actividades cercanas a medianoche en hora de Perú (UTC-5) queden
-- bucketeadas en el día equivocado del dashboard.
alter table actividades add column fecha date;
update actividades set fecha = (created_at at time zone 'America/Lima')::date where fecha is null;
alter table actividades alter column fecha set default ((now() at time zone 'America/Lima')::date);
alter table actividades alter column fecha set not null;
create index if not exists idx_actividades_fecha on actividades(fecha);
create index if not exists idx_lotes_fecha on lotes(fecha);

-- ── 4) Módulo 2: historial de personal por actividad ──
create table actividad_personal_log (
  id bigint generated always as identity primary key,
  actividad_codigo text not null references actividades(codigo) on delete cascade,
  hora time not null,
  personal_hombres int not null default 0,
  personal_mujeres int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_apl_actividad_codigo on actividad_personal_log(actividad_codigo);

alter table actividad_personal_log enable row level security;
create policy "Open access (no auth) - select" on actividad_personal_log for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on actividad_personal_log for insert to anon, authenticated with check (true);

-- ── 5) Eliminar "latas cerradas" por completo ──
drop table if exists latas cascade;
