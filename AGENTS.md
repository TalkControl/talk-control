# TalkControl — instructions agents (tous outils)

Ce fichier s'applique à tout agent de code (Gemini/Antigravity, Claude Code, autres).
**Le contexte projet complet est dans [CLAUDE.md](CLAUDE.md) — lis-le en premier**, il vaut
pour tous les outils (le nom est historique, pas une exclusivité).

L'essentiel, si tu ne lis qu'ici :

- Télécommande de présentations reveal.js : 3 services (tc-server :3001, controller :3000,
  showcase :3002), event-bus typé `TcEventMap`, store maison (pas Redux), Lit en décorateurs
  **legacy** (ne pas passer aux décorateurs standards — cassent au runtime).
- **Validation complète avant commit** : `./scripts/verify.sh` (tsc, lint:check, coverage avec
  seuils, e2e, build, audit, docs). Rapide pendant le dev : `npx tsc --noEmit`,
  `npm run lint:check`, `NODE_ENV=test npm test`, `npm run test:components`.
- Contrat iso-fonctionnel : `docs/migration/golden-path.md`, couvert par `e2e/golden-path/`.
- Commits Gitmoji en français, branches `feat|fix|chore|test/<slug>`, KISS/SOLID/TDD.
- Ne pas renommer l'existant sans raison fonctionnelle ; ne jamais committer
  `config/config.json` ni un secret ; ne jamais baisser un seuil de coverage.
- Guidelines de revue : `.claude/review-guidelines.md`.
