-- Permite borrar registros y catálogos (pruebas, errores de captura, limpieza).
-- Sin esto, cualquier intento de DELETE desde la app falla silenciosamente por RLS.
create policy "Open access (no auth) - delete" on lotes for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on actividades for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on costos for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on actividad_personal_log for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on productos for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on procesos for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on equipos for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on empleados_esmeralda for delete to anon, authenticated using (true);
create policy "Open access (no auth) - delete" on numeros_parte for delete to anon, authenticated using (true);
