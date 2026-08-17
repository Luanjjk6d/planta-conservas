-- Etiqueta de semana para Pendientes, independiente de fecha_inicio/
-- fecha_limite (esas son la fecha real del pendiente y cualquiera las
-- puede editar por tarea). "Semana" es solo una etiqueta de texto libre
-- (ej. "10-15 ago") para diferenciar de qué tanda semanal viene un
-- pendiente, sin que se mezcle si luego alguien le cambia la fecha.
alter table tareas add column semana text;
