-- ═══════════════════════════════════════════════════════════
-- Planta de Conservas — MES
-- Migración 003: agrega la política de UPDATE que faltaba en
-- "actividades" (necesaria para editar actividades y para que el
-- historial de personal actualice el personal "actual" de la actividad).
-- No es destructiva — solo agrega un permiso.
-- ═══════════════════════════════════════════════════════════

create policy "Open access (no auth) - update" on actividades for update to anon, authenticated using (true) with check (true);
