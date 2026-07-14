-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Schema inicial: catálogos, lotes, actividades, costos, latas
-- Acceso: ABIERTO (sin autenticación) — ver políticas RLS al final.
-- Ejecutar completo en Supabase → SQL Editor → Run.
-- ═══════════════════════════════════════════════════════════

-- ── CATÁLOGOS (opciones dinámicas agregadas con el botón "+") ──
create table productos (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

create table procesos (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

create table equipos (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

insert into productos (nombre) values ('BONITO'), ('POTA CON PIEL'), ('TRUCHA'), ('PETS');

insert into procesos (nombre) values
  ('FILETEO'), ('COCCION'), ('EXHAUSTING'), ('ENVASADO'),
  ('CERRADO'), ('ENCAJADO'), ('CORTADO DE POTA'), ('LIMPIEZA');

insert into equipos (nombre) values
  ('COCINADOR'), ('EXHAUST BOX'), ('CERRADORA'),
  ('MESA DE FILETEO'), ('MANUAL'), ('BANDA TRANSPORTADORA');

-- ── MÓDULO 1: lotes ──
create table lotes (
  id bigint generated always as identity primary key,
  numero_parte text not null,
  numero_lote text not null,
  fecha date not null,
  hora time not null,
  producto text not null,
  especie text,
  peso_kg numeric(10,2) not null,
  supervisor text not null,
  turno text,
  created_at timestamptz not null default now()
);

-- ── MÓDULO 2: actividades ──
-- "codigo" es la primary key legible (ACT-0001, ACT-0002, ...), generada por
-- una secuencia del servidor para que sea correcta con múltiples usuarios/pestañas
-- a la vez (reemplaza el contador en memoria del prototipo original).
create sequence actividades_codigo_seq;

create table actividades (
  codigo text primary key default ('ACT-' || lpad(nextval('actividades_codigo_seq')::text, 4, '0')),
  proceso text not null,
  equipo text not null,
  hora_inicio time not null,
  hora_fin time,
  duracion_min int not null default 0,
  peso_ingreso numeric(10,2) not null default 0,
  peso_salida numeric(10,2) not null default 0,
  merma numeric(10,2) not null default 0,
  personal_hombres int not null default 0,
  personal_mujeres int not null default 0,
  total_personal int not null default 0,
  estado text not null check (estado in ('op','det','fin')),
  created_at timestamptz not null default now()
);

-- ── MÓDULO 3: costos (1:1 con actividades) ──
create table costos (
  actividad_codigo text primary key references actividades(codigo) on delete cascade,
  costo_esm numeric(10,2) default 0,
  costo_svc numeric(10,2) default 0,
  costo_maq numeric(10,2) default 0,
  costo_ave numeric(10,2) default 0,
  costo_otros numeric(10,2) default 0,
  c_esm numeric(12,4),
  c_svc numeric(12,4),
  c_maq numeric(12,4),
  c_ave numeric(12,4),
  total numeric(12,4),
  costo_por_kg_sal numeric(12,6),
  costo_por_kg_ing numeric(12,6),
  updated_at timestamptz not null default now()
);

-- ── Registro de latas cerradas ──
create table latas (
  id bigint generated always as identity primary key,
  hora time not null,
  cantidad int not null check (cantidad > 0),
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════
-- RLS — Acceso abierto (sin autenticación)
-- Cualquiera con la URL y la anon key puede leer y escribir todas las
-- filas. No hay políticas de "delete" (la app no tiene UI de borrado).
-- Esta es una decisión explícita para una herramienta interna de planta
-- sin datos sensibles ni login.
-- ═══════════════════════════════════════════════════════════

alter table productos enable row level security;
alter table procesos enable row level security;
alter table equipos enable row level security;
alter table lotes enable row level security;
alter table actividades enable row level security;
alter table costos enable row level security;
alter table latas enable row level security;

create policy "Open access (no auth) - select" on productos for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on productos for insert to anon, authenticated with check (true);

create policy "Open access (no auth) - select" on procesos for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on procesos for insert to anon, authenticated with check (true);

create policy "Open access (no auth) - select" on equipos for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on equipos for insert to anon, authenticated with check (true);

create policy "Open access (no auth) - select" on lotes for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on lotes for insert to anon, authenticated with check (true);

create policy "Open access (no auth) - select" on actividades for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on actividades for insert to anon, authenticated with check (true);

create policy "Open access (no auth) - select" on costos for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on costos for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on costos for update to anon, authenticated using (true) with check (true);

create policy "Open access (no auth) - select" on latas for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on latas for insert to anon, authenticated with check (true);
