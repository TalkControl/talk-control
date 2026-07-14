# Guidelines de revue — TalkControl

Dettes **éliminées par le plan d'amélioration 2026-07** (`docs/improvements/`). Une revue de code
sur ce repo doit empêcher leur retour. Utilisables manuellement avec `/code-review` (pas de revue
CI automatisée : la politique Actions de l'org n'autorise que les actions github-owned — voir IMP-011).

## Bloquant (dette qui revient)

- **Casts `as` sur les payloads du bus** : consommer via `TcEventMap`/`PayloadFor<K>`
  (`src/common/event-bus/events.ts`), jamais `data as {...}` (IMP-007). Les seuls casts tolérés
  sont les casts-frontière documentés inline (socket.io, pass-through plugins, `currentSlide as
Slide` du moteur) — un nouveau cast non documenté est un défaut.
- **`any` / `as any`** : interdits (le `this as any` historique a été résolu par une interface —
  faire pareil).
- **`console.*` bruts** : passer par `src/common/services/logger.ts`. Exception assumée :
  `get-started.ts` (bannière CLI).
- **Secrets** : aucun token dans un fichier versionné ; `config/config.json` reste gitignored ;
  token ngrok = `NGROK_AUTHTOKEN` (IMP-003). Aucune URL ngrok personnelle.
- **CORS `*`** : les 3 surfaces (Express, socket.io, Vite dev server) passent par l'allowlist
  `buildCorsOptions` (`src/common/services/cors.ts`) — tout retour d'un `*` est une régression (IMP-003).
- **`innerHTML` non contrôlé** : seul usage légitime = `unsafeHTML` explicite sur contenu déjà
  filtré par l'anti-SSRF (notes). Pas de nouvelle injection de HTML brut.
- **Événement bus non typé** : tout nouvel événement s'ajoute à `TcEventMap` ; pas de
  `on('nouvelEvent', …)` hors map. Pas de surcharges sur `on`/`broadcast` (le fallback `string`
  avale silencieusement les erreurs de payload — IMP-007).
- **Anti-SSRF contourné** : toute cible patcher/proxy passe par
  `src/server/services/presentation-url.ts` (IMP-001). Pas de fetch/proxy d'URL non validée.
- **Broadcast hors room** : toute émission serveur reste dans `session:<id>` (`io.to`), jamais
  globale (IMP-002).
- **Seuils de coverage baissés** ou tests supprimés pour faire passer la CI.

## Bloquant (contraintes de stack)

- **Décorateurs Lit standards** : legacy uniquement (`experimentalDecorators: true`) — les
  standards cassent au runtime avec oxc/Rolldown + Chromium (IMP-006).
- **Réintroduction** de webpack, babel, mocha, redux, `--legacy-peer-deps` : migration terminée.
- **e2e `workers > 1`** : interdit tant que le store serveur est global (IMP-002).
- **Action GitHub tierce** dans un workflow : la politique org n'autorise que `actions/*`.

## À challenger (pas bloquant, mais motiver)

- Renommage de variables/clés existantes sans nécessité fonctionnelle.
- Nouvelle dépendance (KISS : le plan en a retiré plus qu'ajouté).
- Nouvelle abstraction à un seul site d'usage (cf. IMP-009 : la dédup à un appelant unique a été
  refusée).
