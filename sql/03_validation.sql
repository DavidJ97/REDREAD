-- ============================================================
-- REDREAD — Colonnes de validation (étape 4)
-- A executer apres redread_schema.sql.
-- L'app ne publie QUE les analyses validees par un militant.
-- ============================================================

-- Sur l'analyse d'article
alter table article_analysis
  add column if not exists validated_at  timestamptz,
  add column if not exists validated_by  uuid,           -- auth.uid() du militant
  add column if not exists needs_review  boolean default false,
  add column if not exists review_note   text;

-- Sur l'analyse d'event
alter table dkir_analysis
  add column if not exists validated_at  timestamptz,
  add column if not exists validated_by  uuid,
  add column if not exists needs_review  boolean default false;

-- Index : la file de validation = ce qui n'est ni validé ni rejeté
create index if not exists idx_article_to_validate
  on article_analysis(created_at)
  where validated_at is null and needs_review = false;

create index if not exists idx_event_to_validate
  on dkir_analysis(created_at)
  where validated_at is null and needs_review = false;

-- RLS : l'app cliente ne lit QUE le validé.
-- On remplace la policy "militant lit analyse article" par une version
-- qui distingue lecture de validation (tout) et lecture de publication (validé).
drop policy if exists "militant lit analyse article" on article_analysis;

-- lecture pour publication : seulement le validé
create policy "lecture analyse validee" on article_analysis
  for select using (auth.uid() is not null and validated_at is not null);

-- mise a jour (validation) reservee aux militants authentifies
create policy "militant valide analyse" on article_analysis
  for update using (auth.uid() is not null);

-- NB : l'interface de validation tourne avec la service_role (voit tout,
-- y compris le non-encore-valide). L'app publique cliente, elle, passe par
-- l'anon/auth key et ne voit que validated_at is not null.
