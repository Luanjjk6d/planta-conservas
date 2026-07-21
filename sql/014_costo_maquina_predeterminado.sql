-- Costo por hora predeterminado por equipo/máquina (ej. Cocinador = S/.150/h).
-- Módulo 3 lo usa para pre-llenar el costo de máquina automáticamente.
alter table equipos add column costo_hora numeric(10,2) not null default 0;
