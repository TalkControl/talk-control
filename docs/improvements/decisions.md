# Décisions techniques — Plan d'amélioration post-migration

Trace des décisions structurantes du plan `docs/improvements/`.
Format : contexte → options → décision → conséquences. À compléter au fil de l'exécution des étapes.

Réf. audit : [audit-2026-07.md](audit-2026-07.md).

---

## IMP-001 — Validation anti-SSRF des URLs de présentation

**Étape :** 03 | **Statut :** ⬜ à décider/implémenter

### Contexte
Cible du proxy/patcher pilotée par cookie/query non validé → proxy ouvert vers réseau interne/metadata.

### Décision (à confirmer à l'implémentation)
Module `validatePresentationUrl` partagé patcher+proxy : schémas http/https, refus IP privées/link-local,
résolution DNS avant validation, allowlist de hosts en config (localhost autorisé pour le showcase dev).
Fenêtre TOCTOU (DNS rebinding) assumée pour un outil de présentation à exposition temporaire.

### Conséquences
Nouveau module + tests, cookie signé, `secure:false` retiré. Golden-path 1 (showcase localhost) préservé.

---

## IMP-002 — Pairing socket.io par session

**Étape :** 04 | **Statut :** ⬜

### Contexte
Aucune auth socket, broadcast global, pilotage libre via URL ngrok.

### Décision (à confirmer)
`sessionId` opaque (UUID) au handshake + room `session:<id>`. Store serveur unique conservé (option a, KISS),
multi-store par session noté comme évolution possible (option b). Pas de JWT/compte.

### Conséquences
Middleware `io.use`, broadcast par room, propagation du token dans URLs + QR. Synchro intra-session préservée
(golden-path 9/10).

---

## IMP-003 — Secrets hors git

**Étape :** 05 | **Statut :** ⬜

### Contexte
Token ngrok dans `config/config.json` versionné et réécrit au runtime.

### Décision (à confirmer)
`config.example.json` versionné, `config.json` gitignored, token via `NGROK_AUTHTOKEN`, URLs runtime dans un
fichier gitignored ou en mémoire. CORS `*` → allowlist.

### Conséquences
`git rm --cached config/config.json`, adaptation tunnel/config-file, README mis à jour.

---

## IMP-004 — Stratégie d'upgrade groupée (Vite 8)

**Étape :** 06 | **Statut :** ⬜

### Contexte
Vite 5 (vuln esbuild), 3 majeures de retard, `--legacy-peer-deps` masquant un conflit.

### Décision (à confirmer)
Upgrades groupées par chaîne de résolution (vite/vitest/vitepress), traversée des majeures une par une,
fin de `--legacy-peer-deps`. ESLint traité à part (IMP-005 étape 07).

---

## IMP-005 — CSS Bulma partagé via adoptedStyleSheets

**Étape :** 08 | **Statut :** ⬜

### Contexte
Bulma dupliqué dans 13 shadow roots (~200K ×13) + CSS global → bundle 308K.

### Décision (à confirmer)
`CSSStyleSheet` construite unique adoptée par tous les shadow roots. Composants ne gardent que leur CSS propre.

### Conséquences
Réduction bundle/mémoire (à mesurer), régénération du snapshot visuel smoke, vérif support jsdom.

> Note : numérotation IMP-005/006/007/008 réassignée par ordre d'étape lors de l'implémentation si besoin —
> les numéros ci-dessous suivent l'ordre des étapes, pas l'ordre de décision.

---

## IMP-006 — Migration lit-element → lit + décorateurs

**Étape :** 10 | **Statut :** ⬜

### Décision (à confirmer)
Package `lit` unique, décorateurs standards (pas `experimentalDecorators`), classe de base commune pour les
wrappers, factorisation `formatTime`/dropdown. Migration composant par composant.

---

## IMP-007 — Event-bus typé (TcEventMap)

**Étape :** 11 | **Statut :** ⬜

### Décision (à confirmer)
Event map TypeScript, `on`/`broadcast` génériques, suppression des ~30 casts. `unknown` assumé et documenté
pour les seuls events plugin pass-through.

---

## IMP-008 — Suppression de Redux

**Étape :** 12 | **Statut :** ⬜

### Contexte
Redux surdimensionné : 1 store, 1 reducer, 2 actions, 1 abonné.

### Décision (à confirmer)
Store minimal typé maison (~40 l.), API `dispatch`/`getState`/`subscribe` conservée, logger conditionnel
maison. Suppression redux + redux-logger + redux-mock-store.

---

## IMP-009 — Sort de handleTouch (bug vs code mort)

**Étape :** 13 | **Statut :** ⬜ à investiguer

### Contexte
`RevealEngine.handleTouch` dupliqué de `handleInput` et jamais câblé dans `TCServer.init`.

### Décision (à trancher à l'implémentation)
Investiguer si le plugin touch doit router vers `handleTouch` (→ câbler, bug fonctionnel) ou si le touch est
client-only (→ supprimer, code mort). Ne pas dédupliquer avant d'avoir tranché.

---

## IMP-010 — Découverte automatique des plugins

**Étape :** 14 | **Statut :** ⬜

### Décision (à confirmer)
`import.meta.glob` remplace le switch codé en dur, `plugins.json` reste source d'activation. Vérifier la
compatibilité client/serveur du loader (import.meta.glob est Vite-only).

---

## IMP-011 — Socle agentic versionné

**Étape :** 17 | **Statut :** ⬜

### Décision (à confirmer)
CLAUDE.md + AGENTS.md + `.claude/settings.json` propre + skill/script de vérification + revue CI automatisée
avec guidelines encodant les dettes éliminées. KISS : simple et maintenable à 6 mois.
