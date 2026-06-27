-- ============================================================
-- REDREAD — i18n multilingue (étape 9)
-- Langues calées sur les sections du RCI : fr, en, es, pt, it, de,
-- ru, ar, ur, id, zh-Hans, zh-Hant. Le jsonb {code: texte} accepte toute
-- langue sans changement de schéma. Arabe et ourdou = RTL (géré client).
-- ============================================================

-- Langue d'interface préférée du militant (défaut FR)
alter table militants
  add column if not exists lang text not null default 'fr';

-- ------------------------------------------------------------
-- Colonnes *_i18n jsonb à côté des colonnes texte existantes.
-- Le moteur écrit le FR dans la colonne texte (compat) ET sous "fr".
-- Les traductions sont ajoutées après validation, langue par langue.
-- ------------------------------------------------------------

-- article_analysis : champs visibles traduisibles
alter table article_analysis
  add column if not exists mobile_i18n         jsonb,
  add column if not exists what_text_says_i18n jsonb,
  add column if not exists non_dit_i18n        jsonb,
  add column if not exists class_reading_i18n  jsonb,
  add column if not exists sourcing_note_i18n  jsonb,
  -- suivi des traductions faites, par code langue : {"en":true,"es":true,...}
  add column if not exists translated          jsonb default '{}'::jsonb;

-- events
alter table events
  add column if not exists title_i18n        jsonb,
  add column if not exists summary_i18n       jsonb,
  add column if not exists silence_desc_i18n  jsonb;

-- dkir_analysis
alter table dkir_analysis
  add column if not exists contradiction_i18n jsonb,
  add column if not exists class_pulse_i18n   jsonb;

-- ------------------------------------------------------------
-- Helper SQL : extraire un champ dans la langue voulue, repli FR puis EN.
-- ------------------------------------------------------------
create or replace function i18n(field jsonb, lang text default 'fr')
returns text as $$
  select coalesce(field ->> lang, field ->> 'fr', field ->> 'en', '');
$$ language sql immutable;

-- ------------------------------------------------------------
-- File de traduction par langue : analyses validées en FR dont la
-- traduction dans une langue cible manque encore.
-- Une analyse est "à traduire en X" si translated->>'X' est absent/false.
-- ------------------------------------------------------------
create or replace view to_translate as
select
  aa.article_id,
  aa.validated_at,
  l.code as target_lang
from article_analysis aa
cross join (values ('en'),('es'),('pt'),('it'),('de'),('ru'),('ar'),('ur'),('id'),('zh-Hans'),('zh-Hant'),('tr'),('fa'),('hi'),('ja'),('sw'),('am'),('ht')) as l(code)
where aa.validated_at is not null
  and coalesce((aa.translated ->> l.code)::boolean, false) = false;

-- index pour repérer vite ce qui reste à traduire
create index if not exists idx_aa_translated on article_analysis using gin (translated);

-- ============================================================
-- NB : l'ordre de priorité des langues (force des sections RCI) est géré
-- côté applicatif dans redread_langs.js. Le schéma, lui, est agnostique :
-- ajouter une langue = ajouter une clé jsonb, zéro migration structurelle.
-- RTL (ar, ur) : aucune incidence en base, géré par dir="rtl" au rendu.
-- ============================================================
