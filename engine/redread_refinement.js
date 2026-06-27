// ============================================================
// REDREAD — Boucle de raffinage (étape 10, côté moteur)
// Ferme la boucle : les corrections validées par les militants
// deviennent des exemples few-shot injectés dans le prompt du moteur.
// Les analyses de demain apprennent des corrections d'hier.
// ============================================================
//
// Méthode de prompting respectée : few-shot = Input -> Reasoning -> Output,
// contraintes négatives (montrer le mauvais ET le bon), data-first.
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ---------- charger les exemples few-shot actifs pour un champ ----------
// Appelé par le worker d'analyse avant de construire le prompt.
export async function loadFewShot(supabase, field, limit = 4) {
  const { data, error } = await supabase
    .from('few_shot_examples')
    .select('context, bad_output, good_output, rationale')
    .eq('field', field)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data;
}

// ---------- formater les exemples en bloc de prompt ----------
// Format Input -> Reasoning -> Output, avec contre-exemple négatif.
export function formatFewShot(examples, fieldLabel) {
  if (!examples.length) return '';
  const blocks = examples.map((ex, i) => `
<exemple_${i + 1}>
<contexte>${ex.context}</contexte>
<erreur_a_eviter>${ex.bad_output || '(aucune)'}</erreur_a_eviter>
<raisonnement>${ex.rationale || ''}</raisonnement>
<sortie_juste>${ex.good_output}</sortie_juste>
</exemple_${i + 1}>`).join('\n');

  return `
<exemples_corriges champ="${fieldLabel}">
Des militants ont corrigé le moteur sur ce champ. Étudie ces corrections :
évite l'erreur montrée, vise la sortie juste, applique le même raisonnement.
${blocks}
</exemples_corriges>`.trim();
}

// ---------- enrichir le system prompt d'article avec le raffinage ----------
// Combine le prompt de base + les exemples pertinents.
export async function buildRefinedSystemPrompt(supabase, baseSystemPrompt) {
  // les champs les plus sujets à correction, priorisés par les stats
  const fields = ['mobile', 'class_reading', 'factuality', 'sourcing_note'];
  const blocks = [];
  for (const f of fields) {
    const ex = await loadFewShot(supabase, f, 3);
    if (ex.length) blocks.push(formatFewShot(ex, f));
  }
  if (!blocks.length) return baseSystemPrompt;
  // exemples AVANT la tâche, après les règles : data/exemples first
  return baseSystemPrompt + '\n\n' + blocks.join('\n\n');
}

// ---------- promouvoir une correction en exemple few-shot ----------
// Appelé depuis l'interface de validation quand un militant juge une
// correction exemplaire et veut qu'elle entraîne le moteur.
export async function promoteToFewShot(supabase, { field, context, bad, good, rationale, uid }) {
  const { error } = await supabase.from('few_shot_examples').insert({
    field,
    context,
    bad_output: bad,
    good_output: good,
    rationale,
    promoted_by: uid,
    active: true,
  });
  return { ok: !error, error: error?.message };
}

// ---------- rapport : où le moteur dérape le plus ----------
// Lit la vue refinement_stats pour orienter le travail de raffinage.
export async function refinementReport(supabase) {
  const { data, error } = await supabase
    .from('refinement_stats')
    .select('*')
    .limit(20);
  if (error) return { ok: false, error: error.message };

  // synthèse lisible : quels champs, quelles classes de sources posent problème
  const byField = {};
  for (const row of data || []) {
    byField[row.field] = (byField[row.field] || 0) + row.corrections;
  }
  const ranked = Object.entries(byField).sort((a, b) => b[1] - a[1]);
  return {
    ok: true,
    summary: ranked.map(([field, n]) => `${field}: ${n} corrections`),
    detail: data,
    // signal d'alerte : si un champ dépasse un seuil, le moteur a un biais systématique
    alerts: ranked.filter(([, n]) => n >= 10).map(([f]) =>
      `Le champ « ${f} » est corrigé souvent. Promouvoir des exemples few-shot ou ajuster le prompt.`),
  };
}
