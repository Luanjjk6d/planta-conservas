-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Migración 004: separa "empresa" (Esmeralda/Service) de "género"
-- (Hombre/Mujer) en el personal de cada actividad.
--
-- Antes, el costeo en Módulo 3 usaba personal_hombres/personal_mujeres
-- como si fueran Esmeralda/Service — eso mezclaba dos cosas distintas
-- (género no es lo mismo que empresa/contratista) y costeaba mal.
--
-- Ahora se agregan columnas nuevas para Esmeralda/Service; las de
-- género (personal_hombres/personal_mujeres) se mantienen tal cual
-- para el desglose del Dashboard.
-- No es destructiva — solo agrega columnas con default 0.
-- ═══════════════════════════════════════════════════════════

alter table actividades add column personal_esmeralda int not null default 0;
alter table actividades add column personal_service int not null default 0;

alter table actividad_personal_log add column personal_esmeralda int not null default 0;
alter table actividad_personal_log add column personal_service int not null default 0;
