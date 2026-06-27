-- ============================================================
-- REDREAD — Auth militante (étape 8)
-- Outil interne : accès réservé à une liste blanche de militants.
-- Supabase Auth gère les comptes ; cette table contrôle QUI est autorisé
-- et avec quel rôle (lecteur / validateur / admin).
-- À exécuter après redread_schema.sql et redread_validation_schema.sql.
-- ============================================================

create type militant_role as enum (
  'lecteur',      -- lit les analyses validées (sympathisant, nouveau membre)
  'validateur',  -- relit et valide les analyses (étape 4)
  'admin'        -- gère la liste blanche et les sources
);

-- ---------- table de la liste blanche ----------
-- Liée 1:1 à auth.users de Supabase via l'uid.
create table militants (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  display_name  text,
  role          militant_role not null default 'lecteur',
  cell          text,                       -- cellule / section d'appartenance (optionnel)
  active        boolean not null default true,
  added_by      uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index idx_militants_role on militants(role) where active = true;

-- ---------- helper : l'utilisateur courant est-il un militant actif ? ----------
create or replace function is_militant()
returns boolean as $$
  select exists (
    select 1 from militants
    where id = auth.uid() and active = true
  );
$$ language sql security definer stable;

-- ---------- helper : a-t-il le rôle validateur (ou admin) ? ----------
create or replace function can_validate()
returns boolean as $$
  select exists (
    select 1 from militants
    where id = auth.uid() and active = true and role in ('validateur','admin')
  );
$$ language sql security definer stable;

-- ---------- helper : est-il administrateur ? ----------
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from militants
    where id = auth.uid() and active = true and role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================================
-- RECABLAGE DES POLICIES : remplacer "auth.uid() is not null"
-- (tout compte connecté) par "is_militant()" (liste blanche active).
-- ============================================================

-- sources
drop policy if exists "militant lit sources" on sources;
create policy "militant lit sources" on sources
  for select using (is_militant());

-- articles
drop policy if exists "militant lit articles" on articles;
create policy "militant lit articles" on articles
  for select using (is_militant());

-- events
drop policy if exists "militant lit events" on events;
create policy "militant lit events" on events
  for select using (is_militant());

-- class_scores
drop policy if exists "militant lit scores" on class_scores;
create policy "militant lit scores" on class_scores
  for select using (is_militant());

-- dkir_analysis (analyse de cluster, libre pour militants)
drop policy if exists "militant lit dkir" on dkir_analysis;
create policy "militant lit dkir" on dkir_analysis
  for select using (is_militant());

-- article_analysis : LECTURE = militant + analyse validée seulement
drop policy if exists "lecture analyse validee" on article_analysis;
create policy "lecture analyse validee" on article_analysis
  for select using (is_militant() and validated_at is not null);

-- article_analysis : VALIDATION = rôle validateur/admin seulement
drop policy if exists "militant valide analyse" on article_analysis;
create policy "validateur valide analyse" on article_analysis
  for update using (can_validate());

-- ---------- RLS sur la table militants elle-même ----------
alter table militants enable row level security;

-- un militant voit sa propre fiche
create policy "militant voit sa fiche" on militants
  for select using (id = auth.uid());

-- un admin voit et gère toute la liste
create policy "admin gere liste" on militants
  for all using (is_admin());

-- ============================================================
-- NB déploiement :
-- 1. L'inscription se fait par invitation Supabase (pas d'open signup).
-- 2. Un premier admin est inséré à la main via service_role :
--    insert into militants(id, email, role) values ('<uid>', '<email>', 'admin');
-- 3. L'interface de validation (étape 4) exige le rôle validateur.
-- 4. L'app cliente (étape 5) exige seulement is_militant().
-- ============================================================
