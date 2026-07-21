-- Reestructuración del costeo: de por-proceso a por-día (excepto máquina,
-- que ya incluye vapor/agua/electricidad en su costo/hora predeterminado).

-- Empleados Esmeralda: tarifa fija diaria en vez de por hora.
-- OJO: los montos existentes quedan con el número viejo (una tarifa por
-- hora) — hay que revisarlos y poner el monto diario real de cada persona.
alter table empleados_esmeralda rename column costo_hora to costo_dia;

-- Personal Service del día — un registro por fecha.
create table personal_dia (
  fecha date primary key,
  personal_service_h int not null default 0,
  personal_service_m int not null default 0,
  costo_service_hora numeric(10,2) not null default 0,
  horas_dia numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);
alter table personal_dia enable row level security;
create policy "Open access (no auth) - select" on personal_dia for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on personal_dia for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on personal_dia for update to anon, authenticated using (true) with check (true);
create policy "Open access (no auth) - delete" on personal_dia for delete to anon, authenticated using (true);

-- Qué empleados Esmeralda participaron cada día.
create table personal_dia_empleados (
  id bigint generated always as identity primary key,
  fecha date not null references personal_dia(fecha) on delete cascade,
  empleado_id bigint not null references empleados_esmeralda(id) on delete cascade,
  unique (fecha, empleado_id)
);
alter table personal_dia_empleados enable row level security;
create policy "Open access (no auth) - select" on personal_dia_empleados for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on personal_dia_empleados for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - delete" on personal_dia_empleados for delete to anon, authenticated using (true);

-- Costos fijos del día: canastillas (S/.1.30 c/u) y combustible (S/.500 si aplica).
create table costos_dia (
  fecha date primary key,
  cantidad_canastillas int not null default 0,
  combustible boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table costos_dia enable row level security;
create policy "Open access (no auth) - select" on costos_dia for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on costos_dia for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on costos_dia for update to anon, authenticated using (true) with check (true);
create policy "Open access (no auth) - delete" on costos_dia for delete to anon, authenticated using (true);
