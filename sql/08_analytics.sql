-- ============================================================
-- REDREAD — Analyses de lecture & Tableau de bord (étape 8b)
-- À exécuter après redread_auth_schema.sql.
-- ============================================================

-- ---------- 1. Table de suivi des lectures ----------
create table if not exists militant_reads (
  id          uuid primary key default gen_random_uuid(),
  militant_id uuid not null references militants(id) on delete cascade,
  article_id  uuid not null references articles(id) on delete cascade,
  read_at     timestamptz not null default now(),
  -- Évite de biaiser les statistiques en relisant le même article
  unique(militant_id, article_id)
);

-- Colonne pour rendre le fil vivant avec les images des articles
alter table articles add column if not exists image_url text;

-- Index pour accélérer les jointures lors des calculs
create index if not exists idx_militant_reads_user on militant_reads(militant_id);
create index if not exists idx_militant_reads_art on militant_reads(article_id);

-- ---------- RLS sur militant_reads ----------
alter table militant_reads enable row level security;

-- Un militant peut voir uniquement son propre historique de lecture
create policy "militant voit ses lectures" on militant_reads
  for select using (militant_id = auth.uid());

-- Un militant peut enregistrer uniquement ses propres lectures
create policy "militant enregistre sa lecture" on militant_reads
  for insert with check (militant_id = auth.uid());


-- ---------- 2. Fonction de calcul du profil de lecture ----------
-- Calcule les scores de classe moyens et la factualité des articles lus par le militant
create or replace function get_militant_class_bias(militant_uuid uuid)
returns table (
  pct_capital      numeric,
  pct_pb           numeric,
  pct_proletariat  numeric,
  avg_factuality   numeric,
  total_reads      bigint
) as $$
begin
  return query
  select
    coalesce(avg(cs.pct_capital), 0)::numeric as pct_capital,
    coalesce(avg(cs.pct_pb), 0)::numeric as pct_pb,
    coalesce(avg(cs.pct_proletariat), 0)::numeric as pct_proletariat,
    coalesce(avg(cs.factuality_index), 0.5)::numeric as avg_factuality,
    count(mr.article_id) as total_reads
  from militant_reads mr
  join articles a on a.id = mr.article_id
  join class_scores cs on cs.event_id = a.event_id
  where mr.militant_id = militant_uuid;
end;
$$ language plpgsql security definer stable;
