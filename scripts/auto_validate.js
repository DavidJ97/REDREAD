// ============================================================
// REDREAD — Auto-validation des analyses (appelé par GitHub Actions)
// Valide automatiquement les analyses DK-IR non encore validées,
// et s'assure que les colonnes i18n de base sont peuplées en FR.
// ============================================================
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_UID    = process.env.ADMIN_UID || '7d6e418b-dfeb-4f0f-80ce-7329dc0aa939';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function autoValidate() {
  // 1. Trouver toutes les analyses non encore validées
  const { data: pending, error } = await supabase
    .from('dkir_analysis')
    .select('id, event_id, contradiction_principale, class_pulse, silence_description')
    .is('validated_at', null);

  if (error) { console.error('Erreur lecture:', error.message); process.exit(1); }
  if (!pending?.length) { console.log('Aucune analyse en attente de validation.'); return; }

  console.log(`${pending.length} analyse(s) à valider automatiquement...`);
  let validated = 0;

  for (const analysis of pending) {
    // Construire les champs i18n FR en fallback si absents
    const contradictionI18n = {
      fr: analysis.contradiction_principale || '',
      en: analysis.contradiction_principale || '',
    };
    const classPulseI18n = {
      fr: analysis.class_pulse || '',
      en: analysis.class_pulse || '',
    };

    const { error: updateErr } = await supabase
      .from('dkir_analysis')
      .update({
        validated_at: new Date().toISOString(),
        validated_by: ADMIN_UID,
        contradiction_i18n: contradictionI18n,
        class_pulse_i18n: classPulseI18n,
      })
      .eq('id', analysis.id);

    if (updateErr) {
      console.error(`Erreur validation ${analysis.id}:`, updateErr.message);
    } else {
      validated++;
    }
  }

  // 2. Aussi peupler title_i18n sur les events sans titre traduit
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('id, title')
    .is('title_i18n', null);

  if (!evErr && events?.length) {
    console.log(`${events.length} event(s) sans title_i18n — peuplement FR...`);
    for (const ev of events) {
      await supabase
        .from('events')
        .update({ title_i18n: { fr: ev.title, en: ev.title } })
        .eq('id', ev.id);
    }
  }

  console.log(`=== AUTO-VALIDATE REDREAD ===`);
  console.log(`Analyses validées : ${validated}/${pending.length}`);
}

autoValidate()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
