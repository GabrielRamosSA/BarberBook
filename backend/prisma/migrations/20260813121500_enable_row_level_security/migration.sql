-- The application accesses these tables exclusively through the NestJS API and
-- Prisma. Enable RLS without public policies to block direct PostgREST access
-- by the anon and authenticated roles. Do not use FORCE ROW LEVEL SECURITY:
-- the database owner used by Prisma must continue to manage migrations.

ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."barbearias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."barbeiros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."horarios_disponiveis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."servicos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."agendamentos" ENABLE ROW LEVEL SECURITY;
