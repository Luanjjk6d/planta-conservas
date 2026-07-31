-- Módulo Mapa (V1.1) — notas rápidas anidables ("subtareas simples") que
-- cuelgan de un proyecto, de una tarea, o de otra nota — para ir armando
-- el árbol mental de un proyecto sin llenar el formulario completo de una
-- tarea. No reemplaza a "tareas": es un anotador liviano complementario.
--
-- A diferencia de tareas/reuniones (que usan "on delete set null" para no
-- perder el registro si se borra el proyecto), estas notas solo tienen
-- sentido colgadas de su padre — por eso usan "on delete cascade": si se
-- borra el proyecto, la tarea o la nota padre, sus notas hijas se borran
-- con ella.
create table mapa_nodos (
  id bigint generated always as identity primary key,
  texto text not null,
  proyecto_id bigint references proyectos(id) on delete cascade,
  tarea_padre_id bigint references tareas(id) on delete cascade,
  nodo_padre_id bigint references mapa_nodos(id) on delete cascade,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  constraint mapa_nodos_un_solo_padre check (
    (case when proyecto_id is not null then 1 else 0 end)
  + (case when tarea_padre_id is not null then 1 else 0 end)
  + (case when nodo_padre_id is not null then 1 else 0 end) = 1
  )
);

create index if not exists idx_mapa_nodos_proyecto on mapa_nodos(proyecto_id);
create index if not exists idx_mapa_nodos_tarea_padre on mapa_nodos(tarea_padre_id);
create index if not exists idx_mapa_nodos_nodo_padre on mapa_nodos(nodo_padre_id);

alter table mapa_nodos enable row level security;
create policy "Open access (no auth) - select" on mapa_nodos for select to anon, authenticated using (true);
create policy "Open access (no auth) - insert" on mapa_nodos for insert to anon, authenticated with check (true);
create policy "Open access (no auth) - update" on mapa_nodos for update to anon, authenticated using (true) with check (true);
create policy "Open access (no auth) - delete" on mapa_nodos for delete to anon, authenticated using (true);
