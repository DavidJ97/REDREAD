// ============================================================
// REDREAD — Worker d'analyse (étape 3)
// Branche le moteur DK-IR sur le pipeline.
// 3a : chaque article non analysé -> article_analysis (mobile, non-dit, lecture)
// 3b : chaque event complet non analysé -> class_scores + dkir_analysis
// Tout passe par Qwen local (LM Studio, API compatible OpenAI /chat/completions).
// ============================================================
//
// Env : SUPABASE_URL, SUPABASE_SERVICE_KEY, QWEN_CHAT_URL, QWEN_CHAT_MODEL
// ============================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  ARTICLE_SYSTEM_PROMPT, buildArticlePayload, processArticleResult,
  EVENT_SYSTEM_PROMPT, buildEventPayload, processEventResult
} from '../engine/redread_engine.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CHAT_URL   = process.env.QWEN_CHAT_URL   || 'http://localhost:1234/v1/chat/completions';
const CHAT_MODEL = process.env.QWEN_CHAT_MODEL || 'qwen2.5-14b-instruct';

const ARTICLES_PER_RUN = 30;
const EVENTS_PER_RUN   = 15;
const EVENT_MIN_ARTICLES = 2;   // on n'analyse un cluster qu'à partir de 2 sources

// ---------- appel chat Qwen local ----------
function getMockArticleAnalysis(messages) {
  const userMessage = messages[0]?.content || "";
  const titleMatch = userMessage.match(/titre:\s*(.*)/m);
  const title = titleMatch ? titleMatch[1] : "Article d'actualité";
  const sourceMatch = userMessage.match(/nom:\s*(.*)/m);
  const sourceName = sourceMatch ? sourceMatch[1] : "Média";
  const ownerMatch = userMessage.match(/proprietaire:\s*(.*)/m);
  const owner = ownerMatch ? ownerMatch[1] : "un groupe financier privé";

  return JSON.stringify({
    mobile: `Valoriser le récit médiatique de ${sourceName} pour aligner l'opinion publique sur les intérêts de son propriétaire (${owner}).`,
    what_text_says: `L'article résume les développements récents concernant l'événement "${title}" en insistant sur les aspects administratifs ou sécuritaires décrits officiellement.`,
    non_dit: {
      absent: ["Les causes économiques structurelles sous-jacentes à cet événement."],
      cache: ["Les revendications matérielles réelles des acteurs du mouvement social."],
      demi_devoile: ["La responsabilité directe de l'État présentée sous forme passive (« des incidents se sont produits »)."]
    },
    ideological_func: "naturalisation",
    class_reading: `En cadrant la situation autour de la neutralité technique, le traitement par ${sourceName} occulte le rapport de force matériel entre le capital (représenté par les propriétaires) et le travail.`,
    factuality: "haute",
    sourcing_note: "Reprise des déclarations des agences de presse officielles.",
    raw_dkir: {
      pi: "π_bourgeois",
      alpha: "α_concession",
      delta: "δ_cadre",
      epsilon: "ε_diffusion",
      xi: "Ξ_naturalisation",
      chi: "χM",
      gamma: "γ_maintien"
    },
    confidence: "χM",
    is_partial: false
  });
}

function getMockEventAnalysis(messages) {
  const userMessage = messages[0]?.content || "";
  const titleMatch = userMessage.match(/<event>(.*)<\/event>/);
  const title = titleMatch ? titleMatch[1] : "Événement d'actualité";

  return JSON.stringify({
    class_scores: {
      pct_capital: 0.5,
      pct_pb: 0.3,
      pct_proletariat: 0.2,
      factuality_index: 0.85,
      factual_warnings: 0
    },
    dkir: {
      contradiction_principale: `Opposition entre la défense du statu quo économique par les médias dominants et l'expression des luttes populaires face aux mesures d'inflation.`,
      ideological_func: "mystification",
      class_pulse: `Les médias détenus par le grand capital insistent sur la désorganisation sociale engendrée par l'événement "${title}", tandis que les médias alternatifs mettent en avant la légitimité des revendications.`,
      is_class_silence: true,
      silence_description: `L'impact direct des hausses de profits sur l'inflation et la dégradation concrète des conditions de vie des travailleurs.`,
      confidence: "χM",
      is_partial: false,
      raw_dkir: {
        pi: "π_pole",
        alpha: "α_combat",
        delta: "δ_critique",
        epsilon: "ε_synthese",
        xi: "Ξ_mystification",
        chi: "χM",
        gamma: "γ_lutte"
      }
    }
  });
}

async function chat(systemPrompt, messages) {
  if (process.env.MOCK_AI === 'true') {
    if (systemPrompt.includes('UN article')) {
      return getMockArticleAnalysis(messages);
    } else {
      return getMockEventAnalysis(messages);
    }
  }
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.3,                 // analyse, pas créativité
      messages: [{ role: 'system', content: systemPrompt }, ...messages]
    })
  });
  if (!res.ok) throw new Error(`Qwen chat ${res.status}: ${(await res.text()).slice(0,150)}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ---------- 3a : analyse des articles ----------
async function analyzeArticles(supabase, stats) {
  // articles assignés à un event mais sans analyse
  const { data: arts, error } = await supabase
    .from('articles')
    .select('id, title, body, source_id, event_id')
    .not('event_id', 'is', null)
    .limit(ARTICLES_PER_RUN);
  if (error) throw new Error('lecture articles: ' + error.message);
  if (!arts?.length) return;

  // filtrer ceux déjà analysés
  const ids = arts.map(a => a.id);
  const { data: done } = await supabase
    .from('article_analysis').select('article_id').in('article_id', ids);
  const doneSet = new Set((done||[]).map(d => d.article_id));
  const todo = arts.filter(a => !doneSet.has(a.id));
  if (!todo.length) return;

  // précharger les sources
  const srcIds = [...new Set(todo.map(a => a.source_id))];
  const { data: sources } = await supabase
    .from('sources').select('*').in('id', srcIds);
  const srcMap = Object.fromEntries((sources||[]).map(s => [s.id, s]));

  for (const a of todo) {
    try {
      const source = srcMap[a.source_id];
      const messages = buildArticlePayload(a, source);
      const raw = await chat(ARTICLE_SYSTEM_PROMPT, messages);
      const r = processArticleResult(raw);
      if (!r.ok) { stats.article_errors.push(`${a.id}: ${r.error}`); continue; }
      const d = r.data;

      const { error: insErr } = await supabase.from('article_analysis').insert({
        article_id: a.id,
        mobile: d.mobile,
        what_text_says: d.what_text_says,
        non_dit: d.non_dit,
        ideological_func: d.ideological_func,
        class_reading: d.class_reading,
        factuality: d.factuality,
        sourcing_note: d.sourcing_note,
        raw_dkir: d.raw_dkir,             // stocké, JAMAIS servi au client
        confidence: d.confidence || 'χM',
        is_partial: d.is_partial || false,
        model_version: CHAT_MODEL
      });
      if (insErr) { stats.article_errors.push(`${a.id}: ${insErr.message}`); continue; }

      // propager la factualité raffinée sur l'article
      await supabase.from('articles').update({ factuality: d.factuality }).eq('id', a.id);
      stats.articles_done++;
    } catch (e) {
      stats.article_errors.push(`${a.id}: ${String(e).slice(0,80)}`);
    }
  }
}

// ---------- 3b : analyse des events (vecteur de classe + silence) ----------
async function analyzeEvents(supabase, stats) {
  // events à >= 2 articles, sans analyse dkir
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, article_count')
    .gte('article_count', EVENT_MIN_ARTICLES)
    .limit(EVENTS_PER_RUN);
  if (error) throw new Error('lecture events: ' + error.message);
  if (!events?.length) return;

  const evIds = events.map(e => e.id);
  const { data: done } = await supabase
    .from('dkir_analysis').select('event_id').in('event_id', evIds);
  const doneSet = new Set((done||[]).map(d => d.event_id));
  const todo = events.filter(e => !doneSet.has(e.id));
  if (!todo.length) return;

  for (const ev of todo) {
    try {
      // articles analysés de cet event (avec leur source pour la ligne de classe)
      const { data: arts } = await supabase
        .from('articles')
        .select('id, source_id, sources(name, class_default), article_analysis(mobile, ideological_func, factuality)')
        .eq('event_id', ev.id);

      const analyzed = (arts||[])
        .filter(a => a.article_analysis)
        .map(a => ({
          outlet: a.sources?.name,
          class_default: a.sources?.class_default,
          mobile: a.article_analysis?.mobile,
          ideological_func: a.article_analysis?.ideological_func,
          factuality: a.article_analysis?.factuality
        }));
      if (analyzed.length < EVENT_MIN_ARTICLES) continue;

      const messages = buildEventPayload(ev, analyzed);
      const raw = await chat(EVENT_SYSTEM_PROMPT, messages);
      const r = processEventResult(raw);
      if (!r.ok) { stats.event_errors.push(`${ev.id}: ${r.error}`); continue; }
      const { class_scores: cs, dkir } = r.data;

      // class_scores
      await supabase.from('class_scores').upsert({
        event_id: ev.id,
        pct_capital: cs.pct_capital, pct_pb: cs.pct_pb, pct_proletariat: cs.pct_proletariat,
        factuality_index: cs.factuality_index, factual_warnings: cs.factual_warnings || 0
      });

      // dkir_analysis (analyse en accès libre pour les militants)
      await supabase.from('dkir_analysis').upsert({
        event_id: ev.id,
        contradiction_principale: dkir.contradiction_principale,
        ideological_func: dkir.ideological_func,
        class_pulse: dkir.class_pulse,
        silence_description: dkir.silence_description,
        confidence: dkir.confidence || 'χM',
        atoms: dkir.raw_dkir,              // coulisse, jamais affichée
        model_version: CHAT_MODEL,
        is_partial: dkir.is_partial || false
      }, { onConflict: 'event_id' });

      // silence de classe
      if (dkir.is_class_silence) {
        await supabase.rpc('mark_class_silence', { ev: ev.id, val: true });
      }
      stats.events_done++;
    } catch (e) {
      stats.event_errors.push(`${ev.id}: ${String(e).slice(0,80)}`);
    }
  }
}

// ---------- run ----------
async function run() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Manque SUPABASE_URL/KEY'); process.exit(1); }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const stats = { articles_done:0, events_done:0, article_errors:[], event_errors:[] };

  await analyzeArticles(supabase, stats);
  await analyzeEvents(supabase, stats);

  console.log('=== ANALYSE REDREAD (étape 3) ===');
  console.log(`Articles analysés : ${stats.articles_done}`);
  console.log(`Events analysés : ${stats.events_done}`);
  if (stats.article_errors.length) {
    console.log(`\nErreurs articles (${stats.article_errors.length}) :`);
    stats.article_errors.slice(0,5).forEach(e => console.log('  ' + e));
  }
  if (stats.event_errors.length) {
    console.log(`\nErreurs events (${stats.event_errors.length}) :`);
    stats.event_errors.slice(0,5).forEach(e => console.log('  ' + e));
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
