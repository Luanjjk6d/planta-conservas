-- Solo úsalo si sql/001_init.sql falló a medias (ej. "relation already exists")
-- y quieres empezar limpio. Borra todo lo que el schema pudiera haber creado
-- parcialmente, sin importar qué tan lejos llegó la corrida anterior.
drop table if exists costos cascade;
drop table if exists actividades cascade;
drop table if exists latas cascade;
drop table if exists lotes cascade;
drop table if exists productos cascade;
drop table if exists procesos cascade;
drop table if exists equipos cascade;
drop sequence if exists actividades_codigo_seq;
