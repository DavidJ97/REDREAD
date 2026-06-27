#!/usr/bin/env node
// ============================================================
// REDREAD — Vérificateur de flux RSS (à lancer AVANT Supabase)
// Teste chaque flux de feeds.json un par un et dit lesquels répondent,
// combien d'articles, et lesquels sont morts ou ont changé d'URL.
// ============================================================
//
// Usage :
//   npm install rss-parser
//   node check_feeds.js                 # teste feeds.json du dossier courant
//   node check_feeds.js ./mon_feeds.json
//
// Aucune clé, aucune base. Juste du réseau sortant vers les sources.
// ============================================================

import Parser from 'rss-parser';
import { readFileSync } from 'node:fs';

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RedRead/0.1; revue de presse militante)' }
});

const FEEDS_PATH = process.argv[2] || './feeds.json';
const CONCURRENCY = 4;          // tester 4 flux à la fois (poli pour les serveurs)
const FRESH_DAYS = 7;           // un flux est "frais" si son dernier article date de < 7j

// couleurs terminal
const c = {
  g:s=>`\x1b[32m${s}\x1b[0m`, r:s=>`\x1b[31m${s}\x1b[0m`,
  y:s=>`\x1b[33m${s}\x1b[0m`, dim:s=>`\x1b[2m${s}\x1b[0m`, b:s=>`\x1b[1m${s}\x1b[0m`
};

function daysSince(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr);
  if(isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

async function testFeed(domain, url){
  if(!url || url.trim()===''){
    return { domain, url, status:'skip', reason:'pas de flux déclaré' };
  }
  const t0 = Date.now();
  try{
    const feed = await parser.parseURL(url);
    const ms = Date.now() - t0;
    const items = feed.items || [];
    const n = items.length;
    if(n === 0){
      return { domain, url, status:'empty', ms, reason:'flux valide mais 0 article' };
    }
    // fraîcheur : date du plus récent article
    const dates = items.map(i => i.isoDate || i.pubDate).filter(Boolean);
    const freshest = dates.length ? Math.min(...dates.map(daysSince).filter(x=>x!==null)) : null;
    const stale = freshest !== null && freshest > FRESH_DAYS;
    // intégrité : a-t-on titre + lien sur le premier item ?
    const sample = items[0];
    const hasFields = !!(sample.title && sample.link);
    return {
      domain, url, status:'ok', ms, n, freshest, stale, hasFields,
      sampleTitle: (sample.title||'').slice(0,55)
    };
  }catch(e){
    const ms = Date.now() - t0;
    let reason = String(e.message || e).slice(0,90);
    // diagnostics courants
    if(/404/.test(reason)) reason = '404 — URL changée ou flux supprimé';
    else if(/403/.test(reason)) reason = '403 — bloqué (User-Agent ou anti-bot)';
    else if(/certificate|SSL|TLS/i.test(reason)) reason = 'erreur SSL/certificat';
    else if(/timeout|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(reason)) reason = `timeout (>${20}s)`;
    else if(/ENOTFOUND|EAI_AGAIN/.test(reason)) reason = 'domaine introuvable (DNS)';
    else if(/Invalid character|Unexpected|Non-whitespace|status code/i.test(reason)) reason = 'réponse non-RSS (page HTML ?)';
    return { domain, url, status:'fail', ms, reason };
  }
}

// pool de concurrence simple
async function runPool(entries, worker, size){
  const results = [];
  let i = 0;
  async function next(){
    if(i >= entries.length) return;
    const idx = i++;
    const [domain, url] = entries[idx];
    process.stdout.write(c.dim(`  … ${domain}\n`));
    results[idx] = await worker(domain, url);
    await next();
  }
  await Promise.all(Array.from({length:Math.min(size, entries.length)}, next));
  return results;
}

async function main(){
  let feeds;
  try{
    feeds = JSON.parse(readFileSync(FEEDS_PATH, 'utf8'));
  }catch(e){
    console.error(c.r(`Impossible de lire ${FEEDS_PATH} : ${e.message}`));
    process.exit(1);
  }
  const entries = Object.entries(feeds);
  console.log(c.b(`\n=== RedRead — Test de ${entries.length} flux RSS ===`));
  console.log(c.dim(`Concurrence ${CONCURRENCY}, timeout 20s, seuil fraîcheur ${FRESH_DAYS}j\n`));

  const results = await runPool(entries, testFeed, CONCURRENCY);

  // tri : ok d'abord, puis warnings, puis échecs
  const ok    = results.filter(r => r.status==='ok' && !r.stale && r.hasFields);
  const warn  = results.filter(r => (r.status==='ok' && (r.stale || !r.hasFields)) || r.status==='empty');
  const fail  = results.filter(r => r.status==='fail');
  const skip  = results.filter(r => r.status==='skip');

  console.log(c.b('\n──────── FLUX OK ────────'));
  ok.forEach(r => console.log(
    `  ${c.g('✓')} ${r.domain.padEnd(26)} ${String(r.n).padStart(3)} art · ${r.ms}ms` +
    (r.freshest!==null ? c.dim(` · dernier il y a ${r.freshest}j`) : '')
  ));

  if(warn.length){
    console.log(c.b('\n──────── À VÉRIFIER ────────'));
    warn.forEach(r => {
      let why = r.status==='empty' ? '0 article'
        : r.stale ? `périmé (dernier il y a ${r.freshest}j)`
        : 'champs titre/lien manquants';
      console.log(`  ${c.y('!')} ${r.domain.padEnd(26)} ${c.y(why)}`);
    });
  }

  if(fail.length){
    console.log(c.b('\n──────── EN ÉCHEC (à corriger dans feeds.json) ────────'));
    fail.forEach(r => console.log(`  ${c.r('✗')} ${r.domain.padEnd(26)} ${c.r(r.reason)}`));
  }

  if(skip.length){
    console.log(c.b('\n──────── IGNORÉS (pas de flux déclaré) ────────'));
    skip.forEach(r => console.log(`  ${c.dim('·')} ${c.dim(r.domain)}`));
  }

  // synthèse
  console.log(c.b('\n──────── BILAN ────────'));
  console.log(`  ${c.g('OK')}        : ${ok.length}`);
  console.log(`  ${c.y('À vérifier')}: ${warn.length}`);
  console.log(`  ${c.r('Échec')}     : ${fail.length}`);
  console.log(`  ${c.dim('Ignorés')}   : ${skip.length}`);
  const total = ok.length + warn.length;
  console.log(c.dim(`\n  ${total}/${entries.length} flux exploitables. ` +
    (fail.length ? `Corrige les ${fail.length} URL en échec avant de lancer l'ingestion.` : `Prêt pour l'ingestion.`)));

  // code de sortie : 0 si au moins la moitié des flux marchent
  process.exit(ok.length >= entries.length/2 ? 0 : 1);
}

main().catch(e => { console.error(c.r(e)); process.exit(1); });
