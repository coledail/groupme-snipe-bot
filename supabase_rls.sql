-- The application accesses these tables through the backend's privileged
-- DATABASE_URL connection. The public frontend talks to the backend API,
-- not directly to Supabase, so anon/authenticated receive no table access.

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snipes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.players, public.games, public.snipes
  FROM anon, authenticated;

-- Remove any previously-created policies so this file is safe to re-run.
DROP POLICY IF EXISTS "deny direct players access" ON public.players;
DROP POLICY IF EXISTS "deny direct games access" ON public.games;
DROP POLICY IF EXISTS "deny direct snipes access" ON public.snipes;

-- A table with RLS enabled and no matching policy denies anon/authenticated.
-- Keep these explicit policies as documentation and as a guard if broad
-- grants are added later.
CREATE POLICY "deny direct players access"
  ON public.players
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny direct games access"
  ON public.games
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny direct snipes access"
  ON public.snipes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Optional hardening: prevent the table owner from bypassing RLS.
-- Do not enable FORCE unless DATABASE_URL uses a role with explicit
-- policies for the backend, because the table owner normally bypasses RLS.
-- ALTER TABLE public.players FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.games FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.snipes FORCE ROW LEVEL SECURITY;
