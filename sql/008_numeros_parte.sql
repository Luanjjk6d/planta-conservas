-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Migración 008: número de parte (NP) pasa a ser un catálogo fijo
-- (como productos/procesos/equipos) en vez de texto libre — se
-- selecciona de un desplegable con botón "+" para agregar uno nuevo.
--
-- Además, Módulo 2 puede enlazar cada actividad a un NP, para que un
-- mismo NP agrupe actividades registradas en distintos días hasta que
-- se cierre (el cierre se implementa en un paso posterior).
-- ═══════════════════════════════════════════════════════════

create table numeros_parte (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  estado text not null default 'abierto' check (estado in ('abierto','cerrado')),
  fecha_apertura date not null default ((now() at time zone 'America/Lima')::date),
  fecha_cierre date,
  created_at timestamptz not null default now()
);

alter table numeros_parte enable row level security;
create policy "Open access (no auth) - select" on numeros_parte for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on numeros_parte for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on numeros_parte for update to anon, authenticated using (true) with check (true);

alter table actividades add column numero_parte text;

-- Trae los NP que ya se usaron en lotes/actividades para no perder el
-- historial existente (quedan como "abierto" por defecto; se pueden
-- cerrar manualmente después).
insert into numeros_parte (nombre)
select distinct numero_parte from lotes where numero_parte is not null and numero_parte <> ''
on conflict (nombre) do nothing;
