// ============================================================
// REDREAD — Worker d'ingestion (étape 1)
// Aspire les flux RSS des sources, dédoublonne, insère dans `articles`.
// Ne dépend PAS du choix d'embeddings : embedding reste null ici,
// rempli plus tard par l'étape 2 (clustering).
// ============================================================
//
// Usage : node ingest.js
// Env requis : SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role, bypass RLS)
//
// Les flux RSS par source sont déclarés dans feeds.json (domaine -> url RSS).
// Une source sans flux RSS connu est ignorée proprement (à scraper plus tard).
// ============================================================

import 'dotenv/config';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'RedRead/0.1 (revue de presse militante)' }
});

// ---------- normalisation d'URL (dédoublonnage) ----------
// Retire les paramètres de tracking, force https, retire le slash final.
function normalizeUrl(raw) {
  try {
    const u = new URL(raw.trim());
    u.protocol = 'https:';
    // retirer les params de tracking habituels
    const junk = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','ref'];
    junk.forEach(p => u.searchParams.delete(p));
    u.hash = '';
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

// ---------- extraction du corps depuis un item RSS ----------
function extractBody(item) {
  // priorité au contenu complet, sinon résumé
  const raw = item['content:encoded'] || item.content || item.contentSnippet || item.summary || '';
  // nettoyage HTML grossier (le moteur n'a pas besoin du markup)
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
}

// ---------- extraction de l'image depuis un item RSS ----------
function extractImage(item) {
  if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
    return item.enclosure.url;
  }
  const mediaContent = item['media:content'];
  if (mediaContent) {
    if (Array.isArray(mediaContent) && mediaContent.length > 0 && mediaContent[0].$) {
      return mediaContent[0].$.url;
    } else if (mediaContent.$ && mediaContent.$.url) {
      return mediaContent.$.url;
    }
  }
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail && mediaThumbnail.$ && mediaThumbnail.$.url) {
    return mediaThumbnail.$.url;
  }
  const content = item['content:encoded'] || item.content || '';
  const match = content.match(/<img[^>]+src="([^">]+)"/i);
  if (match) {
    return match[1];
  }
  return null;
}

// ---------- Ingestion d'un flux ----------
async function ingestFeed(supabase, source, feedUrl, stats) {
  let feed;
  try {
    feed = await parser.parseURL(feedUrl);
  } catch (e) {
    stats.failed_feeds.push({ source: source.name, url: feedUrl, error: String(e).slice(0, 120) });
    return;
  }

  const rows = [];
  for (const item of feed.items || []) {
    if (!item.link || !item.title) continue;
    const url = normalizeUrl(item.link);
    rows.push({
      source_id: source.id,
      url,
      title: item.title.trim().slice(0, 500),
      body: extractBody(item),
      image_url: extractImage(item),
      published_at: item.isoDate || item.pubDate || null,
      embedding: null,        // rempli par l'étape 2
      event_id: null,         // assigné par le clustering
      factuality: null,       // raffiné par le moteur
      primary_source: false
    });
  }

  if (rows.length === 0) return;

  // upsert sur url (unique) : ON CONFLICT DO NOTHING via upsert ignoreDuplicates
  const { data, error } = await supabase
    .from('articles')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
    .select('id');

  if (error) {
    stats.failed_feeds.push({ source: source.name, url: feedUrl, error: error.message });
    return;
  }
  const inserted = data ? data.length : 0;
  stats.inserted += inserted;
  stats.per_source.push({ source: source.name, found: rows.length, new: inserted });
}

// ---------- run principal ----------
async function run() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Manque SUPABASE_URL ou SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // map domaine -> url RSS
  const feeds = JSON.parse(readFileSync(new URL('./feeds.json', import.meta.url)));

  // charger les sources de la base
  const { data: sources, error } = await supabase
    .from('sources')
    .select('id, name, domain');
  if (error) { console.error('Lecture sources échouée:', error.message); process.exit(1); }

  const stats = { inserted: 0, per_source: [], failed_feeds: [], no_feed: [] };

  for (const source of sources) {
    const feedUrl = feeds[source.domain];
    if (!feedUrl) { stats.no_feed.push(source.name); continue; }
    await ingestFeed(supabase, source, feedUrl, stats);
  }

  // rapport
  console.log('=== INGESTION REDREAD ===');
  console.log('Nouveaux articles : ' + stats.inserted);
  console.log('\nPar source :');
  stats.per_source.forEach(s => console.log(`  ${s.source}: ${s.new} nouveaux / ${s.found} trouvés`));
  if (stats.no_feed.length) console.log('\nSans flux RSS déclaré (à scraper) : ' + stats.no_feed.join(', '));
  if (stats.failed_feeds.length) {
    console.log('\nFlux en échec :');
    stats.failed_feeds.forEach(f => console.log(`  ${f.source} (${f.url}): ${f.error}`));
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
