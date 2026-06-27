-- ============================================================
-- REDREAD — Schéma Supabase (Postgres)
-- Outil interne militant. Clone Ground News, grille de classe.
-- Analyse au niveau ARTICLE (pas seulement cluster).
-- DK-IR pense en coulisse, l'utilisateur lit du francais clair.
-- ============================================================
-- Convention : 6 axes
--   Π (pi)    class_position    position de classe servie         [SOURCE]
--   Φ (phi)   ownership         propriété / financement réel      [SOURCE]
--   Θ (theta) factuality        adéquation au réel (INDÉPENDANT)  [ARTICLE]
--   Ξ (xi)    ideological_func  fonction idéologique objective    [ARTICLE]
--   Μ (mu)    mobile            intérêt protégé par CETTE publi   [ARTICLE]
--   Ø (non-dit) omissions       absent / caché / demi-dévoilé     [ARTICLE]
-- ============================================================

-- ---------- ENUMS ----------
create type class_position as enum (
  'capital_finance',      -- grand patronat, finance
  'capital_industriel',   -- bourgeoisie productive
  'petite_bourgeoisie',   -- commerçants, cadres, profession liberale
  'aristocratie_ouvriere',-- couches ouvrieres integrees
  'proletariat',          -- travailleurs salaries
  'masses_populaires',    -- chomeurs, precaires, paysannerie, lumpen
  'indetermine'
);

create type ownership_type as enum (
  'conglomerat',          -- groupe multimedia
  'milliardaire',         -- proprietaire individuel fortune
  'etat_bourgeois',       -- presse d'Etat capitaliste
  'fondation',            -- ONG, fondation, think tank
  'capital_risque',       -- VC-backed (cas Ground News lui-meme)
  'cooperative',          -- propriete collective
  'militant_syndical',    -- presse de parti / syndicat
  'independant_precaire', -- journaliste isole
  'inconnu'
);

create type factuality_grade as enum (
  'haute',                -- sourcing primaire, verifiable, donnees dures
  'mixte',                -- reprise, sourcing partiel, langage charge
  'basse',                -- non source, rumeur, pre-print non relu
  'fausse'                -- contredit par le reel materiel etabli
);

create type ideological_function as enum (
  'clarification',        -- expose la contradiction reelle
  'neutre_descriptif',    -- rapporte sans mystifier
  'naturalisation',       -- presente le capitalisme comme nature
  'mystification',        -- inverse ou cache le rapport reel
  'division_masses'       -- oppose les fractions exploitees entre elles
);

-- ---------- 1. SOURCES (outlets, hand-coded comme Ground News) ----------
create table sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  domain          text unique not null,
  country         text,
  lang            text not null default 'en',          -- en/fr/es/ht
  ownership       ownership_type not null default 'inconnu',
  owner_entity    text,                                 -- nom du proprietaire reel
  class_default   class_position not null default 'indetermine', -- ligne editoriale dominante
  factuality_base factuality_grade,                     -- note de fond, calibree a la main
  funding_note    text,                                 -- d'ou vient l'argent, en clair
  hand_coded_by   text,                                 -- tracabilite (anti-boite-noire)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_sources_class on sources(class_default);
create index idx_sources_owner on sources(ownership);

-- ---------- 1b. EVENTS (clusters = le "produit" affiche) ----------
create table events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,                        -- titre synthetique
  slug            text unique,
  summary         text,                                 -- resume neutre des faits
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  article_count   int not null default 0,
  is_class_silence boolean default false,               -- "Blindspot" marxiste : occulte par TOUTE la presse bourgeoise
  region          text
);
create index idx_events_silence on events(is_class_silence) where is_class_silence = true;
create index idx_events_updated on events(updated_at desc);

-- ---------- 2. ARTICLES (unite ingeree) ----------
create table articles (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references sources(id) on delete cascade,
  url           text unique not null,
  title         text not null,
  body          text,
  published_at  timestamptz,
  ingested_at   timestamptz not null default now(),
  embedding     vector(1024),                           -- pgvector. Qwen3-Embedding-0.6B = 1024 dims
  event_id      uuid references events(id) on delete set null,
  -- scores HERITES + RAFFINES au niveau article
  factuality    factuality_grade,                       -- Θ, peut differer du base de la source
  primary_source boolean default false                  -- reportage primaire vs reprise ?
);
create index idx_articles_event on articles(event_id);
create index idx_articles_pub on articles(published_at desc);
-- index vectoriel cree apres extension pgvector (voir bas du fichier)

-- ---------- 2b. ARTICLE_ANALYSIS (decorticage de CHAQUE texte) ----------
-- Le coeur des ajouts : RedRead LIT le texte, contrairement a Ground News.
-- DK-IR pense en coulisse (champ raw_dkir), l'utilisateur lit le francais clair.
create table article_analysis (
  article_id        uuid primary key references articles(id) on delete cascade,
  -- ===== SORTIE FRANCAIS CLAIR (ce que l'utilisateur voit) =====
  -- Axe Μ : mobile de publication, l'interet protege par CE texte precis
  mobile            text not null,    -- ex: «journal d'un groupe immobilier, titre securitaire = pression fonciere»
  -- Ce que le texte affirme (resume neutre du contenu)
  what_text_says    text,
  -- Axe Ø : le non-dit, en 3 registres distincts (jsonb francais clair)
  --   { "absent": [...], "cache": [...], "demi_devoile": [...] }
  --   demi_devoile inclut l'agent efface : «des heurts ont eclate» vs «la police a charge»
  non_dit           jsonb not null default '{}'::jsonb,
  -- Axe Ξ au niveau texte : ce que CE texte fait objectivement
  ideological_func  ideological_function not null,
  -- Lecture de classe DEMONTREE (chemin de raisonnement, pas verdict assene)
  class_reading     text,
  -- Axe Θ : exposition des elements de jugement, PAS un sceau d'autorite
  factuality        factuality_grade,
  sourcing_note     text,             -- «source primaire / reprise / non source», en clair
  -- ===== COULISSE DK-IR (jamais affiche a l'utilisateur) =====
  raw_dkir          jsonb,            -- atomes π/α/δ/ε/Ξ/χ/γ, brouillon de pensee du moteur
  confidence        char(2) not null default 'χM',
  is_partial        boolean default false,
  model_version     text,
  created_at        timestamptz not null default now()
);
create index idx_article_analysis_func on article_analysis(ideological_func);



-- ---------- 4. CLASS_SCORES (vecteur de classe agrege par event) ----------
-- L'inversion ideologique centrale : remplace le % gauche/centre/droite
create table class_scores (
  event_id          uuid primary key references events(id) on delete cascade,
  -- repartition de la COUVERTURE par interet de classe servi (somme ~ 1.0)
  pct_capital       numeric(4,3) not null default 0,    -- capital_finance + industriel
  pct_pb            numeric(4,3) not null default 0,    -- petite bourgeoisie
  pct_proletariat   numeric(4,3) not null default 0,    -- proletariat + masses
  -- axe Θ : qualite factuelle moyenne ponderee (INDEPENDANTE de la classe)
  factuality_index  numeric(4,3),                        -- 0=fausse .. 1=haute
  -- garde-fou anti-fausse-balance de gauche : signale si une source pro-masses ment
  factual_warnings  int default 0,
  computed_at       timestamptz not null default now()
);

-- ---------- 5. DKIR_ANALYSIS (sortie du moteur, en acces LIBRE) ----------
-- Anti-paywall sur la verite : l'atome de contradiction est toujours gratuit
create table dkir_analysis (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references events(id) on delete cascade,
  -- pipeline DK-Stack : ⟦ΦTR⟧ → π/α/δ/ε/Ξ/χ/γ
  contradiction_principale text not null,                -- CP, formulee crument
  ideological_func  ideological_function not null,        -- Ξ dominant du traitement mediatique
  class_pulse       text,                                 -- γ : le pouls des masses sur l'event
  confidence        char(2) not null default 'χM',        -- χH / χM / χL
  atoms             jsonb,                                -- atomes durs (π α δ ε Ξ χ γ)
  model_version     text,                                 -- tracabilite du moteur
  is_partial        boolean default false,                -- ⊢ vs ⊢P
  created_at        timestamptz not null default now(),
  unique(event_id)
);
create index idx_dkir_event on dkir_analysis(event_id);

-- ---------- TRIGGERS : maj compteurs + updated_at ----------
create or replace function bump_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_sources_updated before update on sources
  for each row execute function bump_updated_at();
create trigger trg_events_updated before update on events
  for each row execute function bump_updated_at();

-- ---------- RLS (lecture militant authentifie, ecriture service) ----------
-- Outil interne : acces reserve aux comptes militants connectes (auth.uid()).
-- Pas de paywall sur l'analyse (l'analyse est libre POUR LES MILITANTS).
alter table sources           enable row level security;
alter table articles          enable row level security;
alter table article_analysis  enable row level security;
alter table events            enable row level security;
alter table class_scores      enable row level security;
alter table dkir_analysis     enable row level security;

create policy "militant lit sources" on sources
  for select using (auth.uid() is not null);
create policy "militant lit articles" on articles
  for select using (auth.uid() is not null);
create policy "militant lit analyse article" on article_analysis
  for select using (auth.uid() is not null);
create policy "militant lit events" on events
  for select using (auth.uid() is not null);
create policy "militant lit scores" on class_scores
  for select using (auth.uid() is not null);
create policy "militant lit dkir" on dkir_analysis
  for select using (auth.uid() is not null);
-- l'ingestion/scoring passe par la service_role key (bypass RLS)
-- NB : raw_dkir est dans article_analysis mais le CLIENT ne le SELECT jamais
-- (filtrage applicatif cote requete : on ne demande pas la colonne raw_dkir)

-- ---------- pgvector (clustering semantique) ----------
-- a executer en premier dans Supabase : create extension if not exists vector;
-- puis : create index on articles using ivfflat (embedding vector_cosine_ops) with (lists=100);
