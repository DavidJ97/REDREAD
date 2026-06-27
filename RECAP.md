# RedRead — Récapitulatif d'ensemble

Outil interne militant. Clone structurel de Ground News, avec une grille d'analyse de classe DK-IR à la place de l'axe gauche/droite bourgeois.

## Ce qu'est RedRead

Un agrégateur de presse qui aspire les flux de sources réelles, regroupe les articles par événement, et applique à chaque texte une analyse matérialiste : qui possède le journal, quel intérêt il protège en publiant, ce qu'il cache, et ce que sert objectivement le traitement. La sortie est en français clair, lisible par un sympathisant sans formation théorique. La notation DK-IR pense en coulisse, jamais à l'écran.

La différence avec Ground News n'est pas cosmétique. Là où Ground News range l'information sur un spectre électoral (gauche, centre, droite) qui naturalise le cadre bourgeois, RedRead expose le rapport de classe : la presse « de gauche » et « de droite » y apparaît souvent comme servant le même capital.

## Le pipeline, de bout en bout

1. **Ingestion** : aspiration des flux RSS des sources, dédoublonnage par URL normalisée.
2. **Clustering** : vectorisation par Qwen local (embeddings 1024 dims), regroupement des articles d'un même événement par similarité cosinus.
3. **Analyse** : le moteur DK-IR analyse chaque article (mobile, non-dit, lecture de classe) et chaque cluster (vecteur de classe, silence de classe).
4. **Validation humaine** : un militant relit et corrige chaque analyse avant publication. Rien n'atteint le lecteur sans cette relecture.
5. **Affichage** : l'app sert les analyses validées, en français clair, dans 19 langues, avec la barre de classe à la place de l'histogramme gauche/droite.
6. **Raffinage** : les corrections de validation deviennent des exemples qui améliorent le moteur.

## La grille d'analyse : 6 axes

Ground News note 2 choses (biais, factualité). RedRead en note 6.

- **Position de classe** : quel intérêt la source sert (capital financier, capital industriel, petite bourgeoisie, aristocratie ouvrière, prolétariat, masses populaires). Remplace l'axe gauche/droite.
- **Propriété / financement** : qui possède réellement, avec quel argent, exposé en clair.
- **Factualité matérielle** : adéquation au réel, INDÉPENDANTE de la classe. C'est le verrou anti-dogme : une source prolétarienne qui ment est notée comme telle.
- **Fonction idéologique** : ce que le texte fait objectivement (clarification, naturalisation, mystification, division des masses).
- **Mobile de publication** : quel intérêt précis l'outlet protège en publiant CE texte.
- **Le non-dit** : ce qui est absent, caché, ou à demi dévoilé (avec détection de l'agent effacé : « des heurts ont éclaté » au lieu de « la police a chargé »).

## Les décisions structurantes prises en cours de route

- **Cible** : après avoir exploré grand public puis abonnement, tranché en outil interne militant. Cela règle le problème d'extraction marchande et place la vérification humaine comme garde-fou du scoring LLM.
- **App autonome**, nommée RedRead, séparée de MELLTED.
- **Public hétérogène** : l'utilisateur n'est pas un cadre formé. L'app démontre le mécanisme au lieu d'asséner la conclusion. Elle forme, elle ne prêche pas.
- **DK-IR invisible** : personne n'apprend la notation. Elle structure la pensée du moteur, stockée pour audit, jamais affichée.
- **Couleurs** : rouge = prolétariat, vert = capital, jaune = petite bourgeoisie. L'axe factualité est neutralisé en blanc/gris pour ne pas voler le sens du rouge.
- **Financement** : aucun. Outil interne, pas de marché, pas de paywall.
- **19 langues** sans drapeau actif/latent : le repli en cascade (langue manquante → français) suffit, le jsonb est seul juge.

## Les 19 langues

Calées sur les sections et langues de publication du RCI, plus le terrain local.

Confirmées comme langues de publication RCI : français, anglais, espagnol, portugais, italien, allemand, russe, arabe, ourdou, indonésien, chinois simplifié, chinois traditionnel, turc, perse.

Extension stratégique (aires d'implantation visées, non encore attestées) : hindi, japonais, swahili, amharique.

Terrain local : créole haïtien.

Droite-à-gauche : arabe, ourdou, perse.

## Les fichiers livrés (21)

**Schémas SQL**
- `redread_schema.sql` — 6 tables, 4 enums, RLS, pgvector (1024 dims)
- `redread_seed.sql` — 30 sources calibrées (QC, Canada, FR, US/GB, HT, hispanophone)
- `redread_cluster_helpers.sql` — extension vector, index, fonctions RPC
- `redread_validation_schema.sql` — colonnes de validation + RLS « lecture du validé seulement »
- `redread_auth_schema.sql` — table militants, 3 rôles, recâblage RLS liste blanche
- `redread_i18n_schema.sql` — champs jsonb multilingues, file de traduction par langue
- `redread_refinement_schema.sql` — journal des corrections, exemples few-shot, trigger de capture

**Workers (backend)**
- `redread_ingest.js` + `redread_feeds.json` — ingestion RSS des 30 sources
- `redread_cluster.js` — vectorisation Qwen + clustering cosinus
- `redread_analyze.js` — moteur DK-IR branché sur le pipeline
- `redread_engine.js` — le moteur : prompts, contrats de sortie, parsing, séparation coulisse/surface
- `redread_refinement.js` — injection des corrections en few-shot

**Frontend**
- `RedReadApp.jsx` — app à 3 écrans (feed, événement, fiche article), barre de classe
- `RedReadSilence.jsx` — écran dédié silence de classe, bilingue
- `redread_validation.html` — interface de relecture militante
- `redread_auth.jsx` — connexion, garde d'accès, vérification de rôle
- `redread_langs.js` — configuration des 19 langues
- `redread_i18n_app.jsx` — provider de langue, sélecteur, RTL

**READMEs**
- `redread_ingestion_README.md`, `redread_analyze_README.md`

## Ce qui est testé

Logique validée de bout en bout sur données simulées : normalisation et dédoublonnage d'URL, clustering (groupe correctement grève / budget / sport), pipeline d'analyse complet, garde-fou de vecteur de classe non normalisé, séparation coulisse/surface (raw_dkir jamais servi au client), repli multilingue en cascade, direction RTL, séparation des couleurs de classe et de factualité.

## Ce qui reste à faire sur ton infra

Ce sont des tâches d'infrastructure réelle, pas de conception.

- Brancher les vraies clés Supabase et charger les schémas dans l'ordre : `vector` → `redread_schema` → `seed` → `validation_schema` → `auth_schema` → `i18n_schema` → `cluster_helpers` → `refinement_schema`.
- Monter Qwen local (LM Studio) et fixer le modèle de chat exact.
- Calibrer le seuil de clustering (0.82 par défaut) sur tes vrais articles.
- Transposer `RedReadApp.jsx` en Expo (div → View, styles → StyleSheet).
- Brancher l'app sur les fetchs Supabase réels (actuellement données d'échantillon).
- Traduire le chrome de l'interface au-delà de FR/EN, par des militants.
- Vérification humaine renforcée pour swahili, amharique, créole (faible support LLM, francisation rampante du créole à surveiller).

## L'état, en une phrase

RedRead est complet sur le plan logique, du flux RSS jusqu'à l'affichage multilingue avec validation humaine et auto-amélioration. Ce qui reste relève du déploiement sur ta machine, pas de la conception.
