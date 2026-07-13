# Plan d'amélioration post-migration — TalkControl

Suite de l'audit [audit-2026-07.md](audit-2026-07.md). 17 étapes, chacune exécutable de manière autonome
par un modèle Sonnet, dans l'esprit du plan `docs/migration/` qui a mené la v0.5.0.

## Contrat

- **Iso-fonctionnel strict** : le comportement utilisateur décrit dans [`docs/migration/golden-path.md`](../migration/golden-path.md) est le contrat. Les refactors internes sont libres tant que les suites de tests passent.
- **Une étape = une branche = une PR**, mergée avant d'attaquer la suivante (sauf mention explicite d'indépendance).
- Chaque décision structurante est tracée dans [decisions.md](decisions.md) (format `IMP-XXX`, même structure que les `DEC-XXX` de la migration).

## Protocole d'exécution (pour l'agent)

Chaque étape suit ce cycle. Les fichiers `step-XX` ne le répètent pas — il fait foi ici.

1. **Branche** : `git checkout develop && git pull && git checkout -b <type>/step-XX-<slug>` (type = `feat|fix|chore|test` selon l'étape).
2. **Lire le fichier d'étape en entier** avant de toucher au code. Vérifier que l'état actuel décrit correspond toujours au code (le plan peut avoir vieilli — si divergence, le signaler et adapter, ne pas appliquer aveuglément).
3. **TDD quand l'étape s'y prête** : écrire/adapter les tests d'abord, les voir échouer, implémenter.
4. **Validation systématique** avant commit (en plus des validations spécifiques de l'étape) :
   ```bash
   npx tsc --noEmit          # 0 erreur
   npm run lint              # 0 erreur
   NODE_ENV=test npm test    # suite jsdom verte
   npm run test:components   # suite browser verte
   npm run test:e2e          # suite e2e verte
   npm run build             # build Vite OK
   ```
5. **Commits Gitmoji** (convention du repo), messages en français comme l'historique récent, un commit par unité logique.
6. **Documenter** : cocher l'étape dans ce README, compléter le `step-XX.md` avec la section « Résultats de validation » (comme dans `docs/migration/`), ajouter un `IMP-XXX` dans decisions.md si une décision a été prise.
7. **Rollback** : chaque étape est une branche jetable. Si la validation échoue de façon non résoluble, ne pas merger, documenter le blocage dans le step-XX.md et s'arrêter.

**Interdits** : renommer des variables existantes sans nécessité fonctionnelle ; élargir le scope d'une étape ; committer `config/config.json` avec un token ; baisser un seuil de coverage pour faire passer la CI.

## Modèle recommandé par étape

Chaque fiche `step-XX.md` porte un champ `**Modèle**` dans son en-tête. Trois tiers :

- **Sonnet 5** — étape mécanique/déterministe. Le filet e2e (étape 01) suffit à attraper une régression : le modèle applique, lance la validation, commit.
- **Sonnet 5 + relecture** — jugement d'implémentation requis, et/ou l'étape touche des zones **hors couverture e2e** (notes, touch-pointer, multi-vues, plugins). À relire avant merge.
- **Fable 5 / Opus** — sécurité (03-05) ou décision structurante (13, 17). Un modèle plus petit peut produire du code plausible mais faux (allowlist SSRF contournable, pairing cassable, mauvaise tranche sur `handleTouch`).

Garde-fous quel que soit le modèle : exécuter réellement les 6 commandes de validation ; une étape = une PR relue ; compléter les scénarios e2e 6/8/9 avant les étapes qui touchent ces surfaces.

| Étape | Modèle |
|---|---|
| 01 e2e | Fable 5 / Opus (fait — découverte intensive) |
| 02 cleanup | Sonnet 5 |
| 03 SSRF, 04 socket, 05 secrets/CORS | Fable 5 / Opus (sécurité) |
| 06 Vite 8, 07 ESLint 10, 09 Bulma 1 | Sonnet 5 |
| 08 CSS, 10 lit, 11 event-bus, 12 Redux, 14 plugins, 16 CI | Sonnet 5 + relecture |
| 13 moteur serveur | Fable 5 / Opus (décision handleTouch) |
| 15 gaps tests | Sonnet 5 |
| 17 agentic | Fable 5 / Opus (design/meta) |

## Les étapes

### Phase A — Filet de sécurité (prérequis à tout le reste)

| Étape | Statut | Contenu |
|---|---|---|
| [01 — E2E réels golden-path](step-01-e2e-golden-path.md) | ✅ | Playwright sur l'app réelle : 7/10 scénarios automatisés (1-5,7,10), 3 restés manuels |
| [02 — Grand nettoyage](step-02-cleanup.md) | ✅ | Fichiers morts, `colors`→natif, vestiges webpack/husky4, CONTRIBUTING |

### Phase B — Sécurité (avant toute exposition ngrok)

| Étape | Statut | Contenu |
|---|---|---|
| [03 — Anti-SSRF](step-03-ssrf.md) | ✅ | Validation des cibles patcher/proxy, cookie signé + flags |
| [04 — Pairing socket.io](step-04-socket-auth.md) | ✅ | Token de session (`?s=<uuid>`, « le secret est l'id »), middleware `io.use`, broadcast par room |
| [05 — Secrets & CORS](step-05-secrets-cors.md) | ✅ | `config.json` gitignored + example versionné + postinstall, `NGROK_AUTHTOKEN` prioritaire, CORS allowlist sur les 3 surfaces |

### Phase C — Dépendances & build

| Étape | Statut | Contenu |
|---|---|---|
| [06 — Upgrades groupées + Vite 8](step-06-deps-vite8.md) | ✅ | Vite 5→8 (Rolldown, audit 0), VitePress 2-alpha, exit `vite-tsconfig-paths` (alias partagés `vite.aliases.ts`), fin de `--legacy-peer-deps` |
| [07 — ESLint 10 + preset TS](step-07-eslint10.md) | ✅ | ESLint 10, `tseslint.configs.recommended`, purge des règles redondantes Prettier |
| [08 — CSS partagé](step-08-shared-css.md) | ✅ | Dédupliquer Bulma des 13 shadow roots via `adoptedStyleSheets` |
| [09 — Bulma 1.x](step-09-bulma1.md) | ✅ | Upgrade 0.9 → 1.0.4, CSS gzip 26K → 66K assumé (IMP-005b) |

### Phase D — Modernisation du code

| Étape | Statut | Contenu |
|---|---|---|
| [10 — lit-element → lit](step-10-lit.md) | ✅ | Package `lit`, décorateurs legacy (voir IMP-006), factorisation (formatTime, menus, wrappers) |
| [11 — Event-bus typé](step-11-typed-event-bus.md) | ✅ | `TcEventMap` (21 events), `on`/`broadcast`/`emitTo` génériques sur `PayloadFor<K>` (voir IMP-007), -12 casts de consommation |
| [12 — Redux → store minimal](step-12-remove-redux.md) | ✅ | Store typé maison (voir IMP-008), suppression de redux/redux-logger/redux-mock-store, -3 casts |
| [13 — Moteur serveur](step-13-server-engine.md) | ✅ | handleTouch supprimé (code mort, IMP-009), fixes datés (keypressed, keyCode, innerHTML, logger) |
| [14 — Plugins auto-découverts](step-14-plugin-discovery.md) | ✅ | `import.meta.glob` à la place du switch codé en dur (IMP-010) |

### Phase E — Tests & CI

| Étape | Statut | Contenu |
|---|---|---|
| [15 — Gaps de tests](step-15-test-gaps.md) | ✅ | Modules non testés comblés (plugin.ts, tc-controller, touch-pointer, wrappers, server/bootstrap), helpers factorisés (`test/helpers/dom.ts`), seuils remontés (80/90/70/80), `changeSlide` mort supprimé (IMP-012), doc coverage régénérée |
| [16 — CI refonte](step-16-ci.md) | ⬜ | Lint bloquant, cache Playwright, dédup jobs (IMP-013), TypeDoc remplace jsdoc-to-markdown (IMP-014), déploiement docs GitHub Pages, release sur tag — en attente du run CI réel (blocage org débloqué, PR #36) |

### Phase F — Agentic

| Étape | Statut | Contenu |
|---|---|---|
| [17 — Socle agentic](step-17-agentic.md) | ⬜ | CLAUDE.md, .claude/ versionné, skills de vérification, revue IA automatisée |

## Dépendances entre étapes

```
01 ──► (toutes : c'est le filet)
02 ──► 06 (le nettoyage évite d'upgrader du mort)
06 ──► 07 (ESLint 10 après la vague de deps)
08 ──► 09 (une seule source CSS avant l'upgrade Bulma)
10 ──► 11 (composants modernisés avant le typage du bus qui les traverse)
11 ──► 12 (le store minimal réutilise les types d'événements)
03,04,05 : indépendantes entre elles, mais avant 16 (la CI teste les nouveaux contrats)
17 : peut être faite à tout moment après 01 ; idéalement en dernier pour capitaliser sur tout le plan
```

## Estimation

| Phase | Étapes | Taille |
|---|---|---|
| A | 01–02 | M + S |
| B | 03–05 | M + M + S |
| C | 06–09 | L + S + M + S |
| D | 10–14 | L + M + M + S + S |
| E | 15–16 | L + M |
| F | 17 | M |

S = une session courte, M = une session, L = une session longue ou deux.
