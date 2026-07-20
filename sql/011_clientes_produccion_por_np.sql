-- Catálogo de clientes (maquila: cada NP pertenece a un cliente).
create table clientes (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

alter table clientes enable row level security;
create policy "Open access (no auth) - select" on clientes for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on clientes for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - delete" on clientes for delete to anon, authenticated using (true);

-- Cada número de parte queda ligado a un cliente (texto, no FK — mismo
-- patrón que producto/proceso/equipo: si el catálogo cambia, el histórico
-- de producción no se altera).
alter table numeros_parte add column cliente text;
