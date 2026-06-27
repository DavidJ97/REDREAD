-- ============================================================
-- REDREAD — Helpers SQL pour le clustering (étape 2)
-- À exécuter dans Supabase après le schéma.
-- ============================================================

-- Extension vectorielle (si pas déjà fait)
create extension if not exists vector;

-- Index de similarité cosinus sur les embeddings
create index if not exists idx_articles_embedding
  on articles using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Incrément atomique du compteur d'articles d'un event
create or replace function increment_event_count(ev uuid)
returns void as $$
  update events set article_count = article_count + 1, updated_at = now()
  where id = ev;
$$ language sql;

-- Marquer un event comme silence de classe (appelé par le moteur, étape 3)
create or replace function mark_class_silence(ev uuid, val boolean)
returns void as $$
  update events set is_class_silence = val, updated_at = now() where id = ev;
$$ language sql;
