// ============================================================
// REDREAD — Moteur d'analyse (article + cluster)
// DK-IR pense en coulisse. Sortie utilisateur = francais clair.
// Personne n'apprend la notation DK-IR.
// ============================================================

// ============================================================
// PARTIE A — ANALYSE D'UN ARTICLE (le coeur des ajouts)
// ============================================================

// ---------- FORMAT DE SORTIE STRICT (article) ----------
export const ARTICLE_OUTPUT_SHAPE = {
  // ===== VISIBLE PAR L'UTILISATEUR (francais clair, zero jargon) =====
  mobile: "",              // Μ : interet protege par CETTE publication
  what_text_says: "",      // resume neutre de ce que le texte affirme
  non_dit: {               // Ø : le non-dit en 3 registres
    absent: [],            //   fait qui devrait etre la et n'y est pas
    cache: [],             //   present dans le reel, evacue du texte
    demi_devoile: []       //   mentionne puis noye / agent efface (passif)
  },
  ideological_func: "naturalisation", // Ξ : clarification|neutre_descriptif|naturalisation|mystification|division_masses
  class_reading: "",       // lecture de classe DEMONTREE, pas assenee
  factuality: "mixte",     // Θ : haute|mixte|basse|fausse
  sourcing_note: "",       // «source primaire» / «reprise AFP» / «non source», en clair
  // ===== COULISSE (stocke dans raw_dkir, JAMAIS affiche) =====
  raw_dkir: {              // brouillon de pensee du moteur
    pi: "", alpha: "", delta: "", epsilon: "", xi: "", chi: "", gamma: ""
  },
  confidence: "χM",
  is_partial: false
};

// ---------- PROMPT SYSTÈME (article) ----------
export const ARTICLE_SYSTEM_PROMPT = `
<role>
Moteur RedRead. Tu analyses UN article de presse comme un contre-rendu
materialiste : tu lis le texte, tu exposes l'interet qu'il protege, ce qu'il
cache, et tu proposes une lecture de classe demontree.
Pipeline de pensee : ⟦ΦTR⟧ → π/α/δ/ε/Ξ/χ/γ.
</role>

<methode>
Dialectique objective (Woods/Grant). Centrer le pouls des masses, jamais
reduire l'evenement aux decisions d'en haut. Lire le texte par ses extrema :
ce qu'il dit le plus fort ET ce qu'il tait.
</methode>

<axe_mobile>
Relie le CONTENU du texte a l'interet MATERIEL du proprietaire de l'outlet
(fourni en entree). Demande : a qui profite que ce texte existe, maintenant,
formule ainsi. Concret, pas abstrait.
</axe_mobile>

<axe_non_dit>
Trois registres distincts, ne pas confondre :
- absent : le fait qui devrait figurer et manque totalement.
- cache : un element du reel evacue alors qu'il est pertinent.
- demi_devoile : mentionne puis noye, enterre en fin, OU agent efface par le
  passif. Exemple type : «des heurts ont eclate» efface qui a frappe.
  Traque systematiquement le passif sans agent et les nominalisations.
</axe_non_dit>

<garde_fou_factualite>
L'axe factualite (Θ) est INDEPENDANT de la classe. Un texte servant les masses
qui ment factuellement = factuality basse/fausse. La verite est l'adequation
au reel materiel, jamais la conformite a une ligne. N'invente jamais une
omission qui n'existe pas pour servir la these.
</garde_fou_factualite>

<regle_langue_absolue>
Les champs VISIBLES (mobile, what_text_says, non_dit, class_reading,
sourcing_note) sont en FRANCAIS CLAIR, lisibles par quelqu'un sans aucune
formation marxiste. ZERO symbole DK-IR, zero «CP», zero «Ξ», zero «χH»,
zero jargon. La profondeur est dans l'analyse, pas dans le vocabulaire.
Le champ raw_dkir SEUL contient la notation, et il ne sera jamais montre.
class_reading DEMONTRE le raisonnement (le lecteur doit pouvoir suivre),
il n'assene pas une conclusion.
</regle_langue_absolue>

<contraintes_format>
0 phrase introductive. 0 reformulation. 0 hedging. 0 politesse.
JAMAIS de cadratin. Guillemets francais « ».
Reponse = UNIQUEMENT un JSON valide conforme au shape. Aucun backtick.
</contraintes_format>
`.trim();

// ---------- CONSTRUCTION DE L'APPEL (article, data-first) ----------
export function buildArticlePayload(article, source) {
  // DONNEES D'ABORD, instruction a la fin
  return [
    { role: "user", content:
`<source>
nom: ${source?.name}
proprietaire: ${source?.owner_entity ?? "inconnu"}
type_propriete: ${source?.ownership}
financement: ${source?.funding_note ?? "non documente"}
position_classe_ligne: ${source?.class_default}
</source>

<article>
titre: ${article.title}
texte: ${article.body ?? "(corps non disponible, analyser le titre seul, is_partial=true)"}
</article>

<tache>
Deroule mentalement π→α→δ→ε→Ξ→χ→γ (dans raw_dkir).
Puis produis les champs visibles en francais clair :
1. mobile : a qui profite cette publication, lie au proprietaire ci-dessus.
2. what_text_says : ce que le texte affirme, neutre.
3. non_dit : absent / cache / demi_devoile (traque le passif sans agent).
4. ideological_func : ce que CE texte fait objectivement.
5. class_reading : lecture de classe DEMONTREE, suivable par un debutant.
6. factuality + sourcing_note : expose les elements de jugement, n'assene pas.
Renvoie le JSON strict, rien d'autre.
</tache>` }
  ];
}

// ============================================================
// PARTIE B — AGREGATION D'UN CLUSTER (vecteur de classe + silence)
// ============================================================

export const EVENT_OUTPUT_SHAPE = {
  class_scores: {
    pct_capital: 0.0, pct_pb: 0.0, pct_proletariat: 0.0,
    factuality_index: 0.0, factual_warnings: 0
  },
  dkir: {
    contradiction_principale: "", // formulee en francais clair cote affichage
    ideological_func: "naturalisation",
    class_pulse: "",
    is_class_silence: false,       // ce que TOUTES les sources occultent
    silence_description: "",       // en clair : quel fait de classe est tu partout
    confidence: "χM",
    is_partial: false,
    raw_dkir: { pi:"", alpha:"", delta:"", epsilon:"", xi:"", chi:"", gamma:"" }
  }
};

export const EVENT_SYSTEM_PROMPT = `
<role>
Moteur RedRead, niveau cluster. Tu recois plusieurs articles couvrant le meme
evenement, chacun deja analyse. Tu agreges en vecteur de classe et tu detectes
le silence de classe (ce que TOUTE la couverture occulte).
</role>
<garde_fou>
Factualite INDEPENDANTE de la classe. Le vecteur de classe doit sommer a ~1.0.
</garde_fou>
<regle_langue>
contradiction_principale, class_pulse, silence_description : FRANCAIS CLAIR,
zero jargon DK-IR. raw_dkir seul porte la notation, jamais affiche.
</regle_langue>
<format>
JSON strict conforme au shape. Aucun backtick. Pas de cadratin. Guillemets « ».
</format>
`.trim();

export function buildEventPayload(event, analyzedArticles) {
  const compact = analyzedArticles.map(a => ({
    outlet: a.outlet, class_ligne: a.class_default,
    mobile: a.mobile, ideological_func: a.ideological_func,
    factuality: a.factuality
  }));
  return [
    { role: "user", content:
`<event>${event.title}</event>
<articles_analyses>${JSON.stringify(compact, null, 1)}</articles_analyses>

<tache>
Calcule le vecteur de classe (part de la couverture servant capital / petite
bourgeoisie / proletariat+masses, somme ~1.0). Calcule l'index de factualite
pondere, independant de la classe. Detecte le silence de classe : un fait
touchant les masses que AUCUN article ne couvre. Decris-le en francais clair.
Formule la contradiction principale du traitement mediatique, en clair.
Renvoie le JSON strict.
</tache>` }
  ];
}

// ============================================================
// PARTIE C — PARSING SECURISE + SEPARATION COULISSE/VISIBLE
// ============================================================

export function parseJson(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return { ok: true, data: JSON.parse(clean) }; }
  catch (e) { return { ok: false, error: String(e), raw: clean }; }
}

// Validation article + separation stricte coulisse/visible
export function processArticleResult(raw) {
  const p = parseJson(raw);
  if (!p.ok) return p;
  const d = p.data;
  if (!d.mobile || !d.non_dit || !d.ideological_func) {
    return { ok: false, error: "shape article invalide", raw };
  }
  // ce qui part en base : tout. ce que le client SELECT : tout sauf raw_dkir.
  return { ok: true, data: d };
}

// Filtre applicatif : ce que le CLIENT recoit (jamais raw_dkir)
export function toClientView(analysisRow) {
  const { raw_dkir, model_version, confidence, is_partial, ...visible } = analysisRow;
  return visible; // l'utilisateur ne voit jamais la notation DK-IR
}

// Validation event + normalisation du vecteur de classe
export function processEventResult(raw) {
  const p = parseJson(raw);
  if (!p.ok) return p;
  const s = p.data?.class_scores;
  if (!s) return { ok: false, error: "class_scores manquant", raw };
  const total = (s.pct_capital||0)+(s.pct_pb||0)+(s.pct_proletariat||0);
  if (Math.abs(total - 1) > 0.05) {
    return { ok: false, error: "vecteur classe non normalise", raw };
  }
  return { ok: true, data: p.data };
}
