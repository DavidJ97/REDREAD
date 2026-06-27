-- ============================================================
-- REDREAD — Boucle de raffinage (étape 10)
-- La correction humaine devient une donnée. Chaque validation qui
-- modifie l'analyse du moteur est conservée comme paire avant/après,
-- pour mesurer les dérapages et nourrir des exemples few-shot.
-- ============================================================

-- ---------- journal des corrections ----------
create table refinement_log (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid references articles(id) on delete set null,
  field         text not null,          -- 'mobile' | 'class_reading' | 'factuality' | 'non_dit' ...
  before_val    text,                   -- ce que le moteur avait produit
  after_val     text,                   -- ce que le militant a corrigé
  source_class  class_position,         -- classe de la source (pour repérer les biais par classe)
  ideological_func ideological_function,-- fonction au moment de la correction
  model_version text,                   -- quel modèle a produit l'erreur
  corrected_by  uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index idx_refine_field on refinement_log(field);
create index idx_refine_class on refinement_log(source_class);

-- ---------- exemples few-shot retenus ----------
-- Un validateur (ou admin) promeut une correction exemplaire en exemple
-- d'entraînement injecté dans le prompt du moteur.
create table few_shot_examples (
  id            uuid primary key default gen_random_uuid(),
  field         text not null,          -- le champ que l'exemple corrige
  context       text not null,          -- extrait d'article + classe source (l'Input)
  bad_output    text,                   -- la sortie erronée typique (le contre-exemple)
  good_output   text not null,          -- la sortie corrigée (l'Output visé)
  rationale     text,                   -- pourquoi (le Reasoning)
  active        boolean not null default true,
  promoted_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index idx_fewshot_active on few_shot_examples(field) where active = true;

-- ---------- vue : taux de correction par champ (où le moteur dérape) ----------
create or replace view refinement_stats as
select
  field,
  source_class,
  count(*) as corrections,
  count(distinct article_id) as articles_touched
from refinement_log
group by field, source_class
order by corrections desc;

-- ---------- trigger : capter automatiquement les diffs à la validation ----------
-- Quand article_analysis passe à validated_at non-null, comparer l'ancienne
-- et la nouvelle valeur des champs clés et journaliser les différences.
create or replace function capture_refinement()
returns trigger as $$
begin
  -- ne journaliser qu'au moment de la validation
  if new.validated_at is not null and old.validated_at is null then
    if new.mobile is distinct from old.mobile then
      insert into refinement_log(article_id, field, before_val, after_val, ideological_func, model_version, corrected_by)
      values (new.article_id, 'mobile', old.mobile, new.mobile, old.ideological_func, old.model_version, new.validated_by);
    end if;
    if new.class_reading is distinct from old.class_reading then
      insert into refinement_log(article_id, field, before_val, after_val, ideological_func, model_version, corrected_by)
      values (new.article_id, 'class_reading', old.class_reading, new.class_reading, old.ideological_func, old.model_version, new.validated_by);
    end if;
    if new.factuality is distinct from old.factuality then
      insert into refinement_log(article_id, field, before_val, after_val, ideological_func, model_version, corrected_by)
      values (new.article_id, 'factuality', old.factuality::text, new.factuality::text, old.ideological_func, old.model_version, new.validated_by);
    end if;
    if new.sourcing_note is distinct from old.sourcing_note then
      insert into refinement_log(article_id, field, before_val, after_val, ideological_func, model_version, corrected_by)
      values (new.article_id, 'sourcing_note', old.sourcing_note, new.sourcing_note, old.ideological_func, old.model_version, new.validated_by);
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_capture_refinement
  before update on article_analysis
  for each row execute function capture_refinement();

-- ---------- RLS ----------
alter table refinement_log enable row level security;
alter table few_shot_examples enable row level security;

-- validateurs/admins lisent le journal et gèrent les exemples
create policy "validateur lit refinement" on refinement_log
  for select using (can_validate());
create policy "validateur lit fewshot" on few_shot_examples
  for select using (can_validate());
create policy "validateur gere fewshot" on few_shot_examples
  for all using (can_validate());

-- l'écriture du journal se fait par le trigger (definer) ; le moteur
-- d'analyse lit few_shot_examples via service_role pour construire ses prompts.
