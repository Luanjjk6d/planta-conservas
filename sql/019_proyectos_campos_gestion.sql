-- Migración aditiva para Gestión Conservas — no toca ni borra ninguna
-- columna existente de "proyectos", ni afecta los proyectos ya cargados.
-- Todas las columnas nuevas son opcionales (nullable o con default).
alter table proyectos add column categoria text;
alter table proyectos add column cliente text;
alter table proyectos add column prioridad text check (prioridad in ('baja','media','alta')) default 'media';
alter table proyectos add column fecha_inicio date;
alter table proyectos add column ultimo_avance text;
alter table proyectos add column proximo_paso text;
alter table proyectos add column bloqueo_principal text;
