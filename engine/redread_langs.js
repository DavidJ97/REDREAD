// ============================================================
// REDREAD — Configuration des langues (i18n)
// Socle calé sur les sections réelles du RCI : langues dans lesquelles
// l'International publie (manifeste fondateur + revue In Defence of Marxism).
// Le schéma jsonb {fr, en, es, ...} accepte ces clés sans modification.
// ============================================================

// Ordre = priorité militante (force des sections + portée).
// FR primaire (ta section), puis les langues de publication du RCI.
export const LANGS = [
  { code:'fr', name:'Français',          native:'Français',        dir:'ltr', rci:'Section Québec/France' },
  { code:'en', name:'Anglais',           native:'English',         dir:'ltr', rci:'GB, USA, Canada, Pakistan (cadres)' },
];

export const PRIMARY = 'fr';
export const LANG_CODES = LANGS.map(l => l.code);
export const RTL_LANGS = LANGS.filter(l => l.dir === 'rtl').map(l => l.code);  // ['ar','ur']

// repli en cascade : langue demandée -> FR -> EN -> première clé dispo
export function pickLang(field, lang = PRIMARY) {
  if (!field) return '';
  if (typeof field === 'string') return field;          // colonne texte simple
  return field[lang] || field[PRIMARY] || field.en || Object.values(field)[0] || '';
}

// direction d'écriture d'une langue (pour le style RTL arabe/ourdou)
export function dirOf(lang) {
  return RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

// langue valide ? (garde-fou avant écriture en base)
export function isValidLang(lang) {
  return LANG_CODES.includes(lang);
}
