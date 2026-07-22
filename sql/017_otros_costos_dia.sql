-- "Otros costos" deja de ser por actividad y pasa a declararse una vez por
-- día (junto a canastillas y combustible), como el resto de costos del día.
alter table costos_dia add column otros_costos numeric(10,2) not null default 0;
