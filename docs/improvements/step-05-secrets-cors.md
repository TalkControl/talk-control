# Étape 05 — Secrets hors git & CORS resserré

**Branche** : `fix/step-05-secrets-cors` | **Taille** : S | **Prérequis** : 01 (04 recommandé avant) | **Modèle** : Fable 5 / Opus (sécurité — secrets/CORS)

## Contexte

- Le token ngrok vit dans `config/config.json`, **fichier versionné** et **réécrit au runtime** avec les URLs
  de tunnels (`config-file.ts:9-10`, `tunnel.ts:1,10`). Risque élevé de commit accidentel du token.
- CORS `*` sur les trois surfaces exposées via ngrok (`router.ts:9`, `event-bus-websockets-server.ts:12`,
  `vite.config.mts:120-126`).

## Décision à tracer (IMP-003)

Séparer **config statique versionnée** (ports, noms de plugins, flags) de la **config sensible/runtime**
(token ngrok, URLs de tunnels générées) qui doit sortir du suivi git.

## Actions

### Secrets

1. Créer `config/config.example.json` (versionné) : structure complète avec `ngrok.authToken: ""` et un
   commentaire d'usage.
2. Retirer `config/config.json` du suivi git : `git rm --cached config/config.json` et l'ajouter à `.gitignore`.
   Le développeur copie l'example au premier run (documenter dans README + `get-started`).
3. **Token ngrok depuis l'env en priorité** : `tunnel.ts` lit `process.env.NGROK_AUTHTOKEN ?? config.ngrok.authToken`.
   Documenter `NGROK_AUTHTOKEN` dans README.
4. **URLs runtime hors du fichier de config** : `config-file.ts` réécrit aujourd'hui `config/config.json`
   avec les URLs ngrok. Écrire plutôt dans un fichier dédié gitignored (`config/tunnels.runtime.json`) ou
   les garder en mémoire et les exposer via l'event-bus. Choisir la solution la plus simple qui n'écrit
   jamais dans un fichier tracké. Vérifier les lecteurs actuels de ces URLs (`get-started.ts`, client ?)
   avant de déplacer.

### CORS

5. **Express** (`router.ts:9`) : remplacer `cors()` par une config restreinte. En dev, autoriser
   `localhost:3000/3002` ; en présence de tunnels, autoriser les origines ngrok connues (lues depuis la
   config runtime). Fonction `buildCorsOptions(config)` testable.
6. **socket.io** (`event-bus-websockets-server.ts:12`) : même origine allowlist que ci-dessus, au lieu de
   `origin: '*'`. Cohérent avec le middleware d'auth de l'étape 04.
7. **Vite dev server** (`vite.config.mts:120-126`) : les headers `ACAO: *` sont surtout nécessaires pour le
   dev cross-port. Les restreindre aux origines du projet ; garder `*` uniquement si un test prouve que le
   patcher/proxy en dépend (le documenter).

## Validation spécifique

```bash
git status                                  # config/config.json non tracké, config.example.json tracké
NODE_ENV=test npm test                      # dont buildCorsOptions
npm run test:e2e                            # golden-path complet en localhost toujours vert
NGROK_AUTHTOKEN=xxx npm start               # tunnels OK, aucune écriture dans config/config.json tracké (test manuel)
```

## Risques & pièges

- **Ne jamais committer un token** en faisant cette étape : vérifier `git diff --cached` avant chaque commit.
- Le CORS resserré ne doit pas casser le chargement de présentation via proxy — tester le golden-path 1
  après le changement, c'est le scénario le plus exposé au CORS.
- Si `config/config.json` contenait déjà un token en local (non commité), rappeler au dev de le migrer vers
  `NGROK_AUTHTOKEN`.

## Résultats de validation (2026-07-11, branche `fix/step-05-secrets-cors`)

- **Écart vs fichier d'étape, tracé dans IMP-003** : la vérification préalable des lecteurs a invalidé
  `tunnels.runtime.json`/mémoire — le client bundle `config.json` via Vite (QR `remote-control.ts`,
  `url-form.ts`, `bootstrap.ts`) et le tc-server se recharge par le watch nodemon du fichier. Véhicule
  retenu : le même `config.json`, **untracké** — l'écriture runtime ne touche plus aucun fichier suivi.
  Corollaire indispensable : `postinstall` (`scripts/ensure-config.mjs`) recrée `config.json` depuis
  l'example pour la CI et les clones frais (sinon `tsc`/imports cassent).
- `npx tsc --noEmit` ✅ — `npm run lint` ✅ (0 erreur, 5 warnings JSDoc préexistants)
- `NODE_ENV=test npm test` ✅ 380/380 (36 fichiers) — dont 11 cas `cors.spec.ts` (allowlist : locales,
  jumeaux loopback, externals ngrok, normalisation, dédup, URL invalide), 6 cas `tunnel.spec.ts`
  (`NGROK_AUTHTOKEN` prioritaire), intégration Express (origine hors allowlist → pas d'ACAO) et
  socket.io (handshake polling : origine autorisée reflétée, inconnue refusée) — tous vus rouges avant impl (TDD)
- `npm run test:components` ✅ 27/27 — `npm run build` ✅
- `npm run test:e2e` ✅ **35/35 sans modifier aucun test** — canaris golden-path 1 et
  `15-remote-control` (3 tests) verts avec l'allowlist
- **Smoke manuel `npm start`** (Playwright MCP, flux nominal index → validate → 2 vues) : handshakes
  socket.io 200 depuis `:3000`, navigation presenter → on-stage synchronisée, session partagée entre
  onglets (contrat IMP-002 intact). QR masqué sans tunnel (comportement attendu sans token).
- **`NGROK_AUTHTOKEN=xxx npm run create-tunnels`** (token bidon) : l'erreur ngrok cite le token de
  l'env → priorité env prouvée ; `git status` sans aucun churn de fichier tracké pendant l'exécution.
  Test avec un vrai token à faire par JF (aucun token local à migrer : `authToken` était vide).
- `git status` ✅ : `config/config.json` untracké (gitignored), `config/config.example.json` tracké.
