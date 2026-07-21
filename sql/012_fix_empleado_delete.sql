-- Permite eliminar un empleado Esmeralda del catálogo aunque ya haya
-- participado en actividades registradas. Se quita su vínculo con esas
-- actividades (actividad_esmeralda_empleados), pero los costos ya
-- guardados (costos.c_esm, actividades.personal_esmeralda_h/m) NO cambian
-- porque son columnas fijas, no se recalculan desde este vínculo.
alter table actividad_esmeralda_empleados drop constraint actividad_esmeralda_empleados_empleado_id_fkey;
alter table actividad_esmeralda_empleados add constraint actividad_esmeralda_empleados_empleado_id_fkey
  foreign key (empleado_id) references empleados_esmeralda(id) on delete cascade;
