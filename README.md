# RedRead

Agrégateur de presse militant. Clone structurel de Ground News, avec une grille d'analyse de classe DK-IR à la place de l'axe gauche/droite. Outil interne.

Chaque article de presse est analysé : qui possède le journal, quel intérêt il protège en publiant, ce qu'il cache, et ce que sert objectivement son traitement. Sortie en français clair, dans 19 langues, lisible sans formation théorique. La notation DK-IR pense en coulisse, jamais à l'écran.

## Démarrer

Lis d'abord **PLAN_CLAUDE_CODE.md** : le plan d'exécution complet en 33 micro-étapes, du dépôt vide au déploiement. **RECAP.md** donne la vue d'ensemble de l'architecture.

### Installation rapide
```bash
npm install
cp .env.example .env      # puis remplir avec tes clés Supabase et Qwen
```

### Vérifier les flux avant tout
```bash
npm run check-feeds
```
Corrige les URL en échec dans `ingestion/feeds.json`, puis recommence.

### Charger la base (Supabase, éditeur SQL, dans l'ordre)
```
create extension if not exists vector;
```
Puis `sql/01` à `sql/07` dans l'ordre numérique.

### Lancer le pipeline (après avoir monté Qwen via LM Studio)
```bash
npm run ingest     # aspire les flux RSS
npm run cluster    # vectorise + regroupe par événement
npm run analyze    # applique la grille DK-IR
# ou tout d'un coup :
npm run pipeline
```

## Structure

```
redread/
  ingestion/   ingest.js, cluster.js, analyze.js, feeds.json, check_feeds.js
  engine/      redread_engine.js (moteur DK-IR), redread_refinement.js, redread_langs.js
  sql/         01_schema → 07_refinement (charger dans l'ordre)
  app/         RedReadApp.jsx, RedReadSilence.jsx, redread_auth.jsx, redread_i18n_app.jsx
  validation/  redread_validation.html (relecture militante avant publication)
  PLAN_CLAUDE_CODE.md   plan d'exécution pas à pas
  RECAP.md              vue d'ensemble
```

## La grille : 6 axes

1. **Position de classe** — quel intérêt la source sert (remplace gauche/droite)
2. **Propriété / financement** — qui possède, avec quel argent, en clair
3. **Factualité matérielle** — adéquation au réel, INDÉPENDANTE de la classe (verrou anti-dogme)
4. **Fonction idéologique** — ce que le texte fait objectivement
5. **Mobile de publication** — quel intérêt précis ce texte protège
6. **Le non-dit** — absent / caché / à demi dévoilé (détecte l'agent effacé)

## Le pipeline

Ingestion RSS → clustering (Qwen local, embeddings 1024d) → analyse DK-IR → **validation humaine** → app multilingue. Les corrections de validation améliorent le moteur (boucle de raffinage).

Rien n'atteint le lecteur sans relecture militante : c'est garanti par les policies RLS, pas par convention.

## Couleurs

Rouge = prolétariat. Vert = capital. Jaune = petite bourgeoisie. L'axe factualité est neutralisé en blanc/gris pour ne pas brouiller le sens du rouge.

## Le piège à ne pas rater

L'étape de **calibration du seuil de clustering** (PLAN, bloc G) est celle où le projet se gagne ou se perd. Un clustering faux fait reposer tout l'aval sur des regroupements absurdes. Vérifier les clusters à l'œil humain avant de continuer.

## Ce qui n'est pas inclus (à faire sur ta machine)

L'app Expo (transposition de `app/*.jsx` : div→View, styles→StyleSheet), le branchement Supabase réel des écrans (actuellement données d'échantillon), et les traductions du chrome au-delà de FR/EN. Tout est décrit dans PLAN_CLAUDE_CODE.md, blocs J et K.
