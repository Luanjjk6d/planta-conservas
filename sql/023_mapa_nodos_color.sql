-- Color opcional para las notas del Mapa, para poder etiquetarlas visualmente
-- (ej. separar "pendiente de revisar" de "urgente") sin agregar otro campo
-- de estado. Solo aplica a mapa_nodos — los Proyectos y Actividades ya
-- tienen su propio color por estado, que no se debe pisar con uno manual.
alter table mapa_nodos add column color text
  check (color is null or color in ('blue','green','orange','red','purple','gray'));
