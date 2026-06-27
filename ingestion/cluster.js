// ============================================================
// REDREAD — Worker de clustering (étape 2)
// Vectorise les articles non encore traités via Qwen local (LM Studio),
// puis les groupe en `events` par similarité cosinus fenêtrée dans le temps.
// ============================================================
//
// Usage : node cluster.js
// Env : SUPABASE_URL, SUPABASE_SERVICE_KEY, QWEN_URL (defaut LM Studio local)
//
// Pré-requis pgvector côté Supabase :
//   create extension if not exists vector;
//   create index on articles using ivfflat (embedding vector_cosine_ops) with (lists=100);
// ============================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
// LM Studio expose une API compatible OpenAI en local
const QWEN_URL   = process.env.QWEN_URL   || 'http://localhost:1234/v1/embeddings';
const QWEN_MODEL = process.env.QWEN_MODEL || 'text-embedding-qwen3-embedding-0.6b';

// ---------- paramètres de clustering (à calibrer) ----------
const SIM_THRESHOLD = 0.82;   // seuil cosinus : au-dessus = même événement
const TIME_WINDOW_H = 72;     // on ne groupe que des articles à < 72h d'écart
const BATCH = 50;             // articles vectorisés par passe

// ---------- embedding via Qwen local ----------
function getMockEmbedding(text) {
  const vec = new Array(1024).fill(0);
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) & 0xffffffff;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  // Add random background noise
  for (let i = 0; i < 1024; i++) {
    vec[i] = rand() * 0.1;
  }

  // Inject strong topic components based on keywords
  const lower = text.toLowerCase();
  if (lower.includes('grève') || lower.includes('manifestation') || lower.includes('syndicat') || lower.includes('strike') || lower.includes('travail') || lower.includes('salari')) {
    for (let i = 0; i < 100; i++) vec[i] += 0.8;
  } else if (lower.includes('budget') || lower.includes('taxe') || lower.includes('économie') || lower.includes('finance') || lower.includes('inflation') || lower.includes('taux')) {
    for (let i = 100; i < 200; i++) vec[i] += 0.8;
  } else if (lower.includes('climat') || lower.includes('environnement') || lower.includes('carbone') || lower.includes('chaleur') || lower.includes('climate') || lower.includes('écolog')) {
    for (let i = 200; i < 300; i++) vec[i] += 0.8;
  } else if (lower.includes('élection') || lower.includes('vote') || lower.includes('campagne') || lower.includes('politique') || lower.includes('gouvernement') || lower.includes('macron')) {
    for (let i = 300; i < 400; i++) vec[i] += 0.8;
  }

  // Normalize the vector (so that cosine similarity is well behaved)
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(v => v / (norm + 1e-9));
}

async function embed(text) {
  if (process.env.MOCK_AI === 'true') {
    return getMockEmbedding(text);
  }
  const res = await fetch(QWEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: QWEN_MODEL, input: text.slice(0, 4000) })
  });
  if (!res.ok) throw new Error(`Qwen ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;   // tableau de 1024 floats
}

// ---------- similarité cosinus (vecteurs normalisés ou non) ----------
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0, 60);
}

// ---------- ÉTAPE 2a : vectoriser les articles sans embedding ----------
async function vectorizeNew(supabase, stats) {
  const { data: pending, error } = await supabase
    .from('articles')
    .select('id, title, body')
    .is('embedding', null)
    .limit(BATCH);
  if (error) throw new Error('lecture pending: ' + error.message);
  if (!pending || pending.length === 0) return 0;

  for (const a of pending) {
    try {
      const vec = await embed(`${a.title}\n\n${a.body || ''}`);
      const { error: upErr } = await supabase
        .from('articles').update({ embedding: vec }).eq('id', a.id);
      if (upErr) { stats.embed_errors.push(a.id); continue; }
      stats.vectorized++;
    } catch (e) {
      console.error(`Erreur critique lors de la vectorisation de l'article ${a.id} :`, e);
      throw e; // Lancer l'erreur pour arrêter la boucle infinie si le serveur est inaccessible
    }
  }
  return pending.length;
}

// ---------- ÉTAPE 2b : grouper les articles vectorisés non assignés ----------
async function clusterUnassigned(supabase, stats) {
  // articles avec embedding mais sans event, dans la fenêtre temporelle
  const since = new Date(Date.now() - TIME_WINDOW_H*3600*1000).toISOString();
  const { data: arts, error } = await supabase
    .from('articles')
    .select('id, title, embedding, published_at, ingested_at')
    .is('event_id', null)
    .not('embedding', 'is', null)
    .gte('ingested_at', since)
    .order('published_at', { ascending: true });
  if (error) throw new Error('lecture unassigned: ' + error.message);
  if (!arts || arts.length === 0) return;

  // embeddings arrivent en string pgvector "[..]" ou en array selon le client : normaliser
  const parseVec = v => Array.isArray(v) ? v : JSON.parse(v);

  // events récents déjà ouverts dans la fenêtre, comme centroïdes candidats
  const { data: recentEvents } = await supabase
    .from('events')
    .select('id, title, centroid:articles(embedding)')
    .gte('updated_at', since)
    .limit(200);

  // construit la liste des centroïdes existants (moyenne des embeddings de l'event)
  const centroids = [];
  for (const ev of (recentEvents || [])) {
    const vecs = (ev.centroid || []).map(c => parseVec(c.embedding)).filter(Boolean);
    if (!vecs.length) continue;
    const mean = vecs[0].map((_, i) => vecs.reduce((s,v)=>s+v[i],0)/vecs.length);
    centroids.push({ event_id: ev.id, vec: mean });
  }

  // assignation gloutonne : chaque article rejoint le meilleur centroïde > seuil,
  // sinon il ouvre un nouvel event et devient un centroïde.
  for (const a of arts) {
    const av = parseVec(a.embedding);
    let best = null, bestSim = SIM_THRESHOLD;
    for (const c of centroids) {
      const sim = cosine(av, c.vec);
      if (sim > bestSim) { bestSim = sim; best = c; }
    }

    if (best) {
      await supabase.from('articles').update({ event_id: best.event_id }).eq('id', a.id);
      await supabase.rpc('increment_event_count', { ev: best.event_id });
      stats.assigned++;
    } else {
      // nouvel événement
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .insert({ title: a.title.slice(0,200), slug: slugify(a.title)+'-'+a.id.slice(0,6), article_count: 1 })
        .select('id').single();
      if (evErr) { stats.cluster_errors.push(a.id); continue; }
      await supabase.from('articles').update({ event_id: ev.id }).eq('id', a.id);
      centroids.push({ event_id: ev.id, vec: av });
      stats.new_events++;
    }
  }
}

// ---------- run ----------
async function run() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Manque SUPABASE_URL/KEY'); process.exit(1); }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const stats = { vectorized:0, assigned:0, new_events:0, embed_errors:[], cluster_errors:[] };

  // vectoriser par lots jusqu'à épuisement
  let processed;
  do { processed = await vectorizeNew(supabase, stats); } while (processed === BATCH);

  // grouper
  await clusterUnassigned(supabase, stats);

  console.log('=== CLUSTERING REDREAD ===');
  console.log(`Vectorisés : ${stats.vectorized}`);
  console.log(`Assignés à un event existant : ${stats.assigned}`);
  console.log(`Nouveaux events créés : ${stats.new_events}`);
  console.log(`Seuil cosinus : ${SIM_THRESHOLD} | Fenêtre : ${TIME_WINDOW_H}h`);
  if (stats.embed_errors.length) console.log(`Erreurs embedding : ${stats.embed_errors.length}`);
  if (stats.cluster_errors.length) console.log(`Erreurs clustering : ${stats.cluster_errors.length}`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
