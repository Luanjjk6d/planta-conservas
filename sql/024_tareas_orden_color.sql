-- Orden manual y color opcional para las tareas, usados por la vista
-- Pendientes: arrastrar para reordenar dentro de la lista de una persona,
-- y pintar un ítem de color para marcarlo como prioridad.
alter table tareas add column orden integer not null default 0;
alter table tareas add column color text
  check (color is null or color in ('blue','green','orange','red','purple','gray'));
