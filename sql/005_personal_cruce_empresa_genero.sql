-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Migración 005: cruce completo de personal por empresa Y género.
--
-- La migración 004 agregó Esmeralda/Service como totales independientes
-- de Hombre/Mujer, pero eso no permite saber cuántos hombres y mujeres
-- hay DENTRO de cada empresa. Ahora se reemplazan esas columnas por
-- 4 campos cruzados: Esmeralda-Hombre, Esmeralda-Mujer, Service-Hombre,
-- Service-Mujer. Los totales por género (Dashboard) y por empresa
-- (costeo en Módulo 3) se calculan sumando estos 4 campos.
--
-- ⚠️  DESTRUCTIVO — se pierden los valores actuales de
--   personal_hombres, personal_mujeres, personal_esmeralda,
--   personal_service y total_personal (son datos de prueba).
-- ═══════════════════════════════════════════════════════════

alter table actividades
  drop column personal_hombres,
  drop column personal_mujeres,
  drop column personal_esmeralda,
  drop column personal_service,
  drop column total_personal;

alter table actividades add column personal_esmeralda_h int not null default 0;
alter table actividades add column personal_esmeralda_m int not null default 0;
alter table actividades add column personal_service_h int not null default 0;
alter table actividades add column personal_service_m int not null default 0;

alter table actividad_personal_log
  drop column personal_hombres,
  drop column personal_mujeres,
  drop column personal_esmeralda,
  drop column personal_service;

alter table actividad_personal_log add column personal_esmeralda_h int not null default 0;
alter table actividad_personal_log add column personal_esmeralda_m int not null default 0;
alter table actividad_personal_log add column personal_service_h int not null default 0;
alter table actividad_personal_log add column personal_service_m int not null default 0;
