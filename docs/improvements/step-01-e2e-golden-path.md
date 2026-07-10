# Étape 01 — E2E réels sur le golden-path

**Branche** : `test/step-01-e2e-golden-path` | **Taille** : M | **Prérequis** : aucun

## Contexte

Les 24 tests Playwright actuels valident une **maquette statique** (`e2e/fixtures/index.html`, chargée en
`file://`, `webServer: null` dans `playwright.config.cjs`) qui n'a aucun rapport avec l'application :
pas de serveur, pas d'iframe reveal.js, pas de socket, pas de web components TalkControl.
**Aucun des 10 scénarios de `docs/migration/golden-path.md` n'est couvert bout-en-bout.**

Cette étape est le prérequis de tout le plan : c'est elle qui rend le contrat iso-fonctionnel vérifiable.

## État actuel

- `playwright.config.cjs` : `webServer: null`, tests dans `e2e/`.
- `e2e/0{1..4}-*.spec.js` : 24 tests sur la fixture.
- L'app réelle se lance avec 3 services : tc-server (:3001), showcase (:3002), controller Vite (:3000).
  Le script `npm start` ajoute les tunnels ngrok et `get-started` — **inutiles et indésirables en test**.

## Actions

1. **Ajouter un script de démarrage sans tunnels** dans `package.json` :
   ```json
   "start:e2e": "npx npm-run-all --parallel tc-server tc-showcase tc-controller-and-component"
   ```
   (mêmes sous-scripts que `start`, sans `create-tunnels` ni `get-started` ni les barrières wait-on —
   Playwright gère l'attente).

2. **Configurer `webServer` dans `playwright.config.cjs`** :
   ```js
   webServer: {
       command: 'npm run start:e2e',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI,
       timeout: 120_000
   },
   use: { baseURL: 'http://localhost:3000' }
   ```
   Attention : le controller (:3000) démarre vite mais dépend de :3001/:3002 au runtime.
   Si des tests flakent au boot, ajouter un `globalSetup` qui attend aussi :3001 et :3002
   (fetch en boucle, pas de dépendance `wait-on` côté test).

3. **Écrire un fichier de spec par scénario du golden-path** dans `e2e/golden-path/`,
   en JS comme les specs existantes (`10-loading.spec.js`, `11-nav-horizontal.spec.js`, …).
   Les 10 scénarios de `docs/migration/golden-path.md` :
   1. Chargement initial — saisir l'URL du showcase (`http://localhost:3002`) dans le formulaire,
      vérifier que l'iframe patchée charge la présentation (le `tc-component.bundle.js` est injecté).
   2. Navigation horizontale — flèches → le compteur `h` change dans le controller ET dans l'iframe.
   3. Navigation verticale.
   4. Fragments (espace).
   5. Timer start/pause.
   6. Notes / vue on-stage.
   7. Menu plugins (autoActivate, activation manuelle du touch-pointer).
   8. Touch pointer — drag sur la zone → pointeur visible dans l'iframe.
   9. Multi-vues — ouvrir on-stage dans un second `context.newPage()`, vérifier la synchro.
   10. Multi-clients — deux pages controller synchronisées.
   Utiliser `page.frameLocator()` pour l'iframe patchée. Les sélecteurs des web components passent
   par le shadow DOM (Playwright le traverse nativement).

4. **Garder les anciens specs** `e2e/01-04` pour l'instant (ils tournent vite) mais les déplacer dans
   `e2e/legacy-fixture/` et documenter en tête de fichier qu'ils testent une fixture. Ils seront
   supprimés à l'étape 15 si les nouveaux e2e les rendent redondants.

5. **CI** : vérifier que le job `e2e` de `.github/workflows/develop.yml` passe toujours —
   le `webServer` Playwright lance maintenant l'app complète (build Vite dev). Augmenter le
   timeout du job si nécessaire.

## Validation spécifique

```bash
npm run test:e2e     # 24 anciens + ≥10 nouveaux, tous verts
```

Chaque scénario du golden-path doit être traçable vers un fichier de spec (mettre à jour
`docs/migration/golden-path.md` avec une colonne « Spec e2e »).

## Risques & pièges

- Le boot des 3 services en CI est l'étape la plus fragile : privilégier `reuseExistingServer: false`
  en CI et des retries (`retries: process.env.CI ? 2 : 0`).
- Scénario 8 (touch-pointer) : simuler le drag avec `page.mouse` ou `page.touchscreen` — voir le
  test unitaire `test/plugins/input/touch-pointer/index.spec.ts` pour la mécanique attendue.
- Ne PAS tester via ngrok — uniquement localhost. Les tunnels ne font pas partie du contrat e2e.

## Résultats de validation (2026-07-10)

**Statut : ✅ done.** 7 scénarios golden-path automatisés sur l'app réelle + 24 tests legacy conservés.

```
npm run test:e2e   → 31 passed (7 golden-path réels + 24 legacy fixture)
npx tsc --noEmit   → 0 erreur
npx eslint e2e/    → 0 erreur (warnings jsdoc corrigés)
```

### Réalisé

- **Infra** : script `start:e2e` (3 services sans tunnels ni `get-started`) + `webServer` dans
  `playwright.config.cjs` (attend `:3000`, `reuseExistingServer: !CI`, `retries: CI?2:0`, `baseURL`).
- **Legacy** : les 4 specs fixture déplacés dans `e2e/legacy-fixture/` (conservés, tournent vite).
- **Golden-path réels** dans `e2e/golden-path/` : helpers partagés (`openView`, `navTo` résilient à la
  course d'init, `currentFrame` gérant les 2 iframes du presenter) + specs pour les scénarios
  1, 2, 3, 4, 5, 7, 10.
- **golden-path.md** mis à jour : tableau de couverture e2e + écarts constatés (iframe directe vs patcher,
  timer sans pause).

### Découvertes clés (à réutiliser dans les étapes suivantes)

- L'iframe charge le showcase **en direct** (`:3002?delta=0&focus`), pas via le patcher. Le showcase
  auto-injecte `tc-component.bundle.js`. Le patcher ne sert qu'aux présentations distantes.
- **Course d'init** : après disparition du loader, la première touche clavier peut être perdue (le
  plugin clavier s'active via `pluginsList` un instant après). D'où le helper `navTo` avec `toPass`.
  → À garder en tête pour l'étape 04 (pairing socket) et 13 (moteur/clavier).
- État serveur **partagé sans room** : des runs concurrents/onglets multiples polluent le store
  (confirme la dette ciblée par l'étape 04).

### Restant (volontairement manuel pour l'instant — qualité > quantité)

- Scénario 6 (notes) : le deck de démo ne porte des notes que sur des slides profondes → navigation
  automatisée fragile. À reprendre avec une fixture de présentation dédiée.
- Scénario 8 (touch-pointer) : drag dans l'iframe, non automatisé.
- Scénario 9 (multi-vues on-stage + presenter) : partiellement couvert par le multi-client (10).
