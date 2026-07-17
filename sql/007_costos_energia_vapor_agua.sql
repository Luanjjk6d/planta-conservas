-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Migración 007: separa "Agua, vapor y electricidad" (un solo costo
-- por hora) en 4 costos independientes, cada uno medido por su propia
-- unidad de consumo real (no por hora):
--   - Energía eléctrica: S/. por kWh consumido
--   - Vapor: S/. por m³ consumido
--   - Agua Osmotizada: S/. por m³ consumido
--   - Agua Salobre: S/. por m³ consumido (costo distinto al osmotizada)
--
-- ⚠️  Se elimina costo_ave/c_ave (y su valor actual, si lo hay en
-- registros de prueba) — se reemplaza por las 4 columnas nuevas.
-- ═══════════════════════════════════════════════════════════

alter table costos drop column if exists costo_ave;
alter table costos drop column if exists c_ave;

alter table costos add column consumo_energia_kwh numeric(10,2) not null default 0;
alter table costos add column costo_energia_kwh numeric(10,4) not null default 0;
alter table costos add column c_energia numeric(12,4) not null default 0;

alter table costos add column consumo_vapor_m3 numeric(10,2) not null default 0;
alter table costos add column costo_vapor_m3 numeric(10,4) not null default 0;
alter table costos add column c_vapor numeric(12,4) not null default 0;

alter table costos add column consumo_agua_osmo_m3 numeric(10,2) not null default 0;
alter table costos add column costo_agua_osmo_m3 numeric(10,4) not null default 0;
alter table costos add column c_agua_osmo numeric(12,4) not null default 0;

alter table costos add column consumo_agua_salobre_m3 numeric(10,2) not null default 0;
alter table costos add column costo_agua_salobre_m3 numeric(10,4) not null default 0;
alter table costos add column c_agua_salobre numeric(12,4) not null default 0;
