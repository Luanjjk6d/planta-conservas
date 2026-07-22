-- equipos nunca tuvo política de UPDATE — "Editar equipo" (incl. cambiar la
-- tarifa por hora) parecía guardar (mostraba el toast de éxito) pero la fila
-- nunca cambiaba en la base de datos porque RLS bloqueaba el update en
-- silencio. Mismo problema que tuvo empleados_esmeralda (ver 016).
create policy "Open access (no auth) - update" on equipos for update to anon, authenticated using (true) with check (true);
