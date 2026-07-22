-- empleados_esmeralda nunca tuvo política de UPDATE — "Editar costo" en la
-- app parecía guardar (mostraba el toast de éxito) pero la fila nunca
-- cambiaba en la base de datos porque RLS bloqueaba el update en silencio.
create policy "Open access (no auth) - update" on empleados_esmeralda for update to anon, authenticated using (true) with check (true);
