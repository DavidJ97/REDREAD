# RedRead — Plan d'exécution pour Claude Code

Instructions destinées à Claude Code, à exécuter sur la machine de Jupiterre.
Chaque micro-étape est atomique : une action, un critère de réussite, quoi faire si ça échoue.
Ne pas passer à l'étape suivante tant que le critère de réussite n'est pas atteint.

Prérequis machine : Node 18+, un compte Supabase, LM Studio installé avec un modèle Qwen.

---

## BLOC A — Préparation du dépôt

### A1. Créer la structure du projet
- Créer un dossier `redread/` et y placer tous les fichiers livrés.
- Arborescence cible :
  ```
  redread/
    ingestion/   ingest.js, cluster.js, analyze.js, feeds.json, check_feeds.js
    engine/      redread_engine.js, redread_refinement.js, redread_langs.js
    sql/         tous les .sql
    app/         RedReadApp.jsx, RedReadSilence.jsx, redread_auth.jsx, redread_i18n_app.jsx
    validation/  redread_validation.html
  ```
- **Réussite** : `ls` montre l'arborescence ci-dessus.

### A2. Initialiser Node et installer les dépendances
- `cd redread && npm init -y`
- Ajouter `"type": "module"` au `package.json`.
- `npm install rss-parser @supabase/supabase-js`
- **Réussite** : `node -e "import('rss-parser').then(()=>console.log('ok'))"` affiche `ok`.

### A3. Corriger les chemins d'import
- Les workers importent le moteur. Vérifier que les chemins relatifs correspondent à l'arborescence A1 (ex. `analyze.js` importe `../engine/redread_engine.js`).
- **Réussite** : `node --check ingestion/analyze.js` ne renvoie aucune erreur, et idem pour ingest.js, cluster.js.

---

## BLOC B — Vérifier les flux RSS (avant toute base)

### B1. Lancer le vérificateur
- `node ingestion/check_feeds.js ./ingestion/feeds.json`
- **Réussite** : le script s'exécute et affiche le bilan (OK / à vérifier / échec).

### B2. Réparer les flux en échec
- Pour chaque flux marqué « échec » (404, DNS, non-RSS) : ouvrir le site de la source, trouver la vraie URL RSS actuelle (chercher « rss » ou « flux » en pied de page, ou tester `/feed`, `/rss`, `/rss.xml`).
- Mettre à jour `feeds.json` avec les URL corrigées.
- Pour un flux 403 : essayer, dans `check_feeds.js`, un User-Agent de navigateur récent. Si le blocage persiste, marquer ce domaine comme « à scraper plus tard » et le laisser à `""`.
- **Réussite** : relancer B1 jusqu'à ce qu'au moins 12 des 19 flux soient OK.

### B3. Figer la liste des flux fonctionnels
- Garder dans `feeds.json` uniquement les flux OK et à-vérifier ; laisser `""` pour les morts.
- **Réussite** : `check_feeds.js` ne montre plus aucune ligne rouge non assumée.

---

## BLOC C — Monter la base Supabase

### C1. Créer le projet Supabase
- Sur supabase.com, créer un nouveau projet. Noter l'URL du projet et les deux clés (anon, service_role).
- **Réussite** : le tableau de bord SQL du projet est accessible.

### C2. Activer pgvector
- Dans l'éditeur SQL Supabase : `create extension if not exists vector;`
- **Réussite** : la requête passe sans erreur.

### C3. Charger les schémas DANS L'ORDRE
- Exécuter, l'un après l'autre, dans l'éditeur SQL :
  1. `sql/redread_schema.sql`
  2. `sql/redread_seed.sql`
  3. `sql/redread_validation_schema.sql`
  4. `sql/redread_auth_schema.sql`
  5. `sql/redread_i18n_schema.sql`
  6. `sql/redread_cluster_helpers.sql`
  7. `sql/redread_refinement_schema.sql`
- **Réussite** après chaque fichier : aucune erreur rouge. Si une erreur « relation déjà existante » apparaît, le fichier a déjà été chargé, passer au suivant.

### C4. Vérifier les 30 sources
- Requête : `select count(*) from sources;`
- **Réussite** : renvoie 30.

### C5. Créer le compte admin militant
- Créer un utilisateur dans Supabase Auth (Authentication > Users > Add user) avec ton courriel.
- Copier son `uid`.
- Exécuter : `insert into militants(id, email, role) values ('<uid>', '<ton-courriel>', 'admin');`
- **Réussite** : `select role from militants where email='<ton-courriel>';` renvoie `admin`.

---

## BLOC D — Configurer les variables d'environnement

### D1. Créer le fichier .env
- Dans `redread/`, créer `.env` :
  ```
  SUPABASE_URL=https://<projet>.supabase.co
  SUPABASE_SERVICE_KEY=<clé service_role>
  QWEN_URL=http://localhost:1234/v1/embeddings
  QWEN_MODEL=text-embedding-qwen3-embedding-0.6b
  QWEN_CHAT_URL=http://localhost:1234/v1/chat/completions
  QWEN_CHAT_MODEL=<nom exact du modèle chat chargé dans LM Studio>
  ```
- Ajouter `.env` au `.gitignore`.
- Adapter les workers pour charger `.env` (ajouter `import 'dotenv/config'` en tête, et `npm install dotenv`).
- **Réussite** : `node -e "import 'dotenv/config'; console.log(!!process.env.SUPABASE_URL)"` affiche `true`.

---

## BLOC E — Premier contact réel : ingestion seule

### E1. Lancer l'ingestion
- `node ingestion/ingest.js`
- **Réussite** : le rapport affiche un nombre de « nouveaux articles » supérieur à 0, et liste les sources avec leurs comptes.

### E2. Vérifier en base
- `select count(*) from articles;` et `select s.name, count(*) from articles a join sources s on s.id=a.source_id group by s.name;`
- **Réussite** : des articles répartis sur plusieurs sources.

### E3. Diagnostiquer les sources à zéro
- Pour toute source avec 0 article : revérifier son URL de flux (retour ponctuel à B2).
- **Réussite** : la majorité des sources à flux valide ont des articles.

---

## BLOC F — Monter Qwen et brancher le clustering

### F1. Démarrer LM Studio en mode serveur
- Charger un modèle d'embedding Qwen (ex. Qwen3-Embedding-0.6B) ET un modèle de chat (ex. Qwen2.5-14B-Instruct).
- Démarrer le serveur local (port 1234 par défaut).
- **Réussite** : `curl http://localhost:1234/v1/models` répond avec la liste des modèles.

### F2. Vérifier la dimension d'embedding
- Tester un embedding : envoyer un court texte à `/v1/embeddings`, compter la longueur du vecteur renvoyé.
- Si ce n'est pas 1024, ajuster `vector(1024)` dans le schéma `articles.embedding` à la bonne dimension, et recréer l'index ivfflat.
- **Réussite** : la dimension du vecteur renvoyé correspond à celle déclarée dans le schéma.

### F3. Lancer le clustering
- `node ingestion/cluster.js`
- **Réussite** : le rapport affiche des articles vectorisés, assignés, et des events créés.

### F4. Inspecter les clusters à l'œil
- `select e.title, count(a.id) from events e join articles a on a.event_id=e.id group by e.id order by 2 desc limit 20;`
- Ouvrir 3-4 events à plusieurs articles : les articles parlent-ils vraiment du même événement ?
- **Réussite** : les regroupements sont cohérents. Sinon, étape G.

### G. CALIBRER LE SEUIL (étape la plus délicate)
- Si les events fusionnent des sujets distincts → seuil trop bas → monter `SIM_THRESHOLD` (ex. 0.85, 0.88).
- Si un même événement est éclaté en plusieurs events → seuil trop haut → baisser (ex. 0.80, 0.78).
- Après chaque ajustement : vider les assignations de test (`update articles set event_id=null; delete from events;`) et relancer F3.
- **Réussite** : sur un échantillon réel, les regroupements correspondent au jugement humain. Noter le seuil retenu.

---

## BLOC H — Brancher le moteur d'analyse

### H1. Lancer l'analyse sur un petit volume
- `node ingestion/analyze.js`
- **Réussite** : le rapport affiche des articles analysés et des events analysés sans erreur de parsing massive.

### H2. Lire les analyses produites
- `select a.title, aa.mobile, aa.class_reading, aa.factuality from article_analysis aa join articles a on a.id=aa.article_id limit 10;`
- Comparer au gabarit de référence (l'analyse de l'itinérance dans les fichiers de conception).
- **Réussite** : le mobile relie bien le contenu au propriétaire, le non-dit est pertinent, AUCUN symbole DK-IR (π, Ξ, χ) n'apparaît dans les champs visibles.

### H3. Corriger le prompt si dérive
- Si les analyses sont faibles ou laissent fuir du jargon DK-IR : ajuster `ARTICLE_SYSTEM_PROMPT` dans `engine/redread_engine.js` (renforcer la règle de langue claire, baisser la température).
- Si le modèle de chat est trop faible : charger un Qwen plus gros dans LM Studio.
- **Réussite** : H2 redonne des analyses propres.

---

## BLOC I — Validation humaine

### I1. Ouvrir l'interface de validation
- Servir `validation/redread_validation.html` (l'ouvrir dans un navigateur, ou via un petit serveur statique).
- Brancher son fetch sur les analyses où `validated_at is null` (remplacer l'échantillon statique par une requête Supabase réelle, en service_role côté serveur, ou via une fonction Edge).
- **Réussite** : l'interface affiche de vraies analyses non encore validées.

### I2. Valider quelques analyses
- Relire, corriger, valider. Vérifier que `validated_at` se remplit en base.
- **Réussite** : `select count(*) from article_analysis where validated_at is not null;` augmente après validation.

### I3. Vérifier la capture de raffinage
- Après avoir corrigé un champ puis validé : `select * from refinement_log order by created_at desc limit 5;`
- **Réussite** : la correction apparaît dans le journal (avant/après).

---

## BLOC J — Brancher et lancer l'app

### J1. Créer le projet Expo
- `npx create-expo-app redread-app` (projet séparé, ou intégrer dans `app/`).
- Installer `@supabase/supabase-js`.
- **Réussite** : l'app Expo de base démarre (`npx expo start`).

### J2. Transposer les écrans
- Porter `RedReadApp.jsx`, `RedReadSilence.jsx`, `redread_auth.jsx`, `redread_i18n_app.jsx` : remplacer `div`→`View`, `span`→`Text`, styles inline → `StyleSheet.create`.
- Garder la logique (navigation, barre de classe, sélecteur de langue, RTL) à l'identique.
- **Réussite** : les 3 écrans s'affichent dans Expo Go sur ton téléphone.

### J3. Brancher sur Supabase (clé ANON, pas service_role)
- Initialiser le client Supabase avec l'URL et la clé anon.
- Remplacer les données d'échantillon par des fetchs réels : events validés, leur class_scores, leurs article_analysis validées.
- **Réussite** : le feed affiche les vrais événements analysés et validés, avec la barre de classe réelle.

### J4. Tester l'auth
- Se connecter avec le compte admin. Vérifier que l'accès passe, et qu'un compte hors liste blanche est bloqué.
- **Réussite** : le `Guard` laisse entrer le militant, bloque l'inconnu.

---

## BLOC K — Mise en service continue

### K1. Planifier la chaîne
- Mettre en cron (ou tâche planifiée) la chaîne complète, ex. toutes les 30 min :
  ```
  node ingestion/ingest.js && node ingestion/cluster.js && node ingestion/analyze.js
  ```
- **Réussite** : la base se remplit toute seule, les analyses s'accumulent en attente de validation.

### K2. Routine de validation
- Définir qui valide, à quelle fréquence. Sans validation, rien n'atteint l'app (par construction).
- **Réussite** : un flux régulier d'analyses validées alimente l'app.

### K3. Traductions
- Pour les langues réellement servies : faire traduire les analyses validées (par le moteur puis relecture militante, ou directement par des militants pour créole/swahili/amharique).
- **Réussite** : le sélecteur de langue affiche du contenu réel, pas seulement le repli français.

---

## Ordre de priorité si le temps manque

Le chemin minimal pour un RedRead qui tourne vraiment :
A → B → C → D → E → F → G → H → I, puis J3 (app branchée).
Les blocs K (continu) et les traductions viennent une fois le cœur prouvé sur de vraies données.

## Le piège à ne pas oublier

L'étape G (calibration du seuil de clustering) est celle où le projet se gagne ou se perd. Ne pas bâcler. Un clustering faux fait que tout l'aval, même brillant, repose sur des regroupements absurdes. Vérifier les clusters à l'œil humain avant de continuer.
