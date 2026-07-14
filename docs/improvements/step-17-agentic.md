# Étape 17 — Socle agentic versionné

**Branche** : `chore/step-17-agentic` | **Taille** : M | **Prérequis** : 01 (idéalement en dernier) | **Modèle** : Fable 5 / Opus (design/meta)

## Contexte

Le repo n'a **aucune configuration agentic versionnée** : pas de `CLAUDE.md`, pas de `.claude/settings.json`
partagé, pas de skills/agents/hooks/commands. Le seul artefact est un `.claude/settings.local.json` local,
pollué de permissions mortes (Mocha, PIDs codés en dur, chemins `/tmp`).

Or ce projet est développé **quasi exclusivement avec des agents** — toute la migration v0.5.0 l'a été, et ce
plan d'amélioration est destiné à être exécuté par un modèle Sonnet. Sans socle versionné, chaque session
repart de zéro, réapprend les commandes de validation, et risque d'introduire des régressions que rien
n'attrape automatiquement. C'est l'axe que tu as demandé : **garantir la qualité du code produit par l'IA
après ce plan**.

## Décision à tracer (IMP-011)

Versionner un socle agentic minimal mais opérant, aligné sur ce qui a marché pendant la migration :
contexte projet + commandes de validation + protocole d'exécution d'étapes + garde-fous automatisés.
Rester **KISS** : pas d'usine à gaz, seulement ce qui capitalise réellement sur le travail fait.

## Actions

### 1. `CLAUDE.md` à la racine (contexte projet)

Document court et dense (l'agent le lit à chaque session). Contenu :
- **Ce qu'est TalkControl** : télécommande de présentations reveal.js, 3 services (tc-server :3001,
  showcase :3002, controller :3000), architecture controller↔serveur↔component via event-bus.
- **Stack** : Node 24, TypeScript strict, Vite, Vitest 4 + browser mode + Playwright e2e, Lit, Express 5,
  socket.io. Pas de Redux (retiré étape 12), pas de webpack/babel/mocha (migration terminée).
- **Commandes de validation canoniques** (copiées du protocole `docs/improvements/README.md`) :
  `tsc --noEmit`, `lint:check`, `npm test`, `test:components`, `test:e2e`, `build`.
- **Le contrat iso-fonctionnel** : `docs/migration/golden-path.md` fait foi, couvert par les e2e (étape 01).
- **Conventions** : commits Gitmoji en français, branches `feat|fix|chore|test/…`, KISS/SOLID/TDD,
  ne pas renommer les variables existantes sans raison fonctionnelle, secrets jamais commités
  (`config/config.json` gitignored depuis l'étape 05).
- **Pièges connus** : mode browser Vitest sensible à Vite ; `import.meta.glob` pour les plugins ;
  event-bus typé via `TcEventMap` ; store maison et non Redux.
- Renvoi vers `docs/improvements/README.md` pour le protocole d'exécution d'étape détaillé.

### 2. `.claude/settings.json` versionné (partagé, propre)

- Allowlist de permissions **utiles et génériques** : les commandes de validation ci-dessus, `git`,
  `npm run *`, les MCP réellement utilisés (playwright). **Pas** de PIDs, pas de chemins `/tmp`, pas de
  Mocha (mort).
- Nettoyer `.claude/settings.local.json` (local, non versionné) de ses entrées obsolètes, ou le régénérer
  via la skill `/fewer-permission-prompts`.

### 3. Skill de vérification projet — `.claude/skills/verify-talkcontrol/`

Une skill qui encode le protocole de validation pour qu'un agent puisse « vérifier son travail » en une
invocation : lancer tsc + lint + les 3 suites de tests + build, et rapporter ce qui casse. S'inspirer de la
skill built-in `/verify` mais spécialisée pour ce projet (les 3 suites, les 3 services e2e). Alternative
KISS : un simple `scripts/verify.sh` documenté dans CLAUDE.md, si une skill complète est surdimensionnée.

### 4. Revue de code automatisée en CI

- Optionnel mais fort levier qualité : un workflow GitHub Actions qui, sur PR, lance une revue automatisée
  (la skill `/code-review` en mode CI, ou l'action Claude Code officielle) ciblant les patterns spécifiques
  du projet : casts `as` réintroduits, `console.*` bruts, `any`, secrets, CORS `*`, `innerHTML` non
  contrôlé, événements bus non typés.
- Encoder ces règles comme un fichier de contexte de revue (`.claude/review-guidelines.md`) que l'action
  charge — pour que la revue connaisse les dettes que ce plan a justement éliminées et empêche leur retour.

### 5. `AGENTS.md` (interop multi-outils)

Le repo est aussi utilisé avec d'autres outils (l'utilisateur mentionne Antigravity/Gemini). Ajouter un
`AGENTS.md` minimal (ou un lien symbolique de contenu vers CLAUDE.md) pour que tout agent, quel que soit
l'outil, parte du même contexte. Convention commit + validation identiques.

## Validation spécifique

- Ouvrir une nouvelle session d'agent sur le repo : il doit trouver le contexte, connaître les commandes de
  validation, et pouvoir exécuter une étape du plan sans redécouvrir l'outillage.
- Le workflow de revue (si implémenté) commente une PR de test avec au moins une observation pertinente.

## Risques & pièges

- **KISS avant tout** : ne pas construire un système agentic élaboré (multi-agents, workflows complexes) que
  personne ne maintiendra. Le socle doit être si simple qu'il reste vrai dans 6 mois. Un `CLAUDE.md` juste +
  un `verify.sh` valent mieux qu'une architecture de skills inutilisée.
- Ne rien mettre de sensible dans les fichiers versionnés (`settings.json`, `CLAUDE.md`) — pas de token,
  pas d'URL ngrok personnelle.
- Cette étape capitalise sur tout le reste : la faire **en dernier** permet d'y encoder les leçons réelles
  des étapes 01-16 (les vrais pièges rencontrés, pas ceux anticipés ici).

## Résultats de validation (2026-07-14, branche `chore/step-17-agentic`)

### Ce qui a été livré (décision détaillée : IMP-011)

| Action du step | Résultat |
|---|---|
| 1. `CLAUDE.md` | ✅ Racine — architecture 3 services, stack, validation (rapide vs complète), contrat golden-path, conventions, **pièges vécus** des étapes 01-16 (décorateurs Lit legacy IMP-006, `NODE_ENV=test`, `PIPESTATUS`, `workers: 1`, cache Vite, `vite.aliases.ts`, politique Actions org, TypeDoc IMP-014, port 3000 résiduel) |
| 2. `.claude/settings.json` | ✅ Versionné, allowlist générique (validation, git usuel, npm/npx outillage, MCP playwright). `settings.local.json` régénéré épuré : 139 → 37 entrées (PIDs, `/tmp`, Mocha, scratchpads de sessions mortes supprimés). `.gitignore` : `.claude/*` ignoré sauf les 2 fichiers versionnés |
| 3. Vérification projet | ✅ Option KISS retenue : `scripts/verify.sh` (pas de skill) — tsc, lint:check, coverage (suites incluses, IMP-013), e2e, build, audit, docs:build, récapitulatif + exit agrégé. Protocole du README § 4 harmonisé sur cette liste |
| 4. Revue CI automatisée | ❌ Écartée (IMP-011) : politique Actions org = github-owned uniquement, `anthropics/claude-code-action` inexécutable sans élargissement `admin:org` + secret API facturé. À la place : `.claude/review-guidelines.md` (dettes du plan encodées) pour `/code-review` manuel — prêt à brancher en CI si la politique change un jour |
| 5. `AGENTS.md` | ✅ Minimal, renvoie vers CLAUDE.md (source de vérité unique) avec l'essentiel inliné. Pas de symlink (fragile cross-plateforme) |

### Validation exécutée en réel

`./scripts/verify.sh` lancé sur la branche :

- **1er run : ÉCHEC e2e — et c'était le script qui avait raison.** typecheck/lint/coverage/build/
  audit (0 vulnérabilité)/docs verts, mais e2e 24/35 : un Vite résiduel d'une session précédente
  occupait le port 3000, `reuseExistingServer` (qui ne sonde que :3000) a cru l'environnement
  démarré et n'a lancé ni tc-server ni showcase. Le récapitulatif a correctement signalé `e2e
  ÉCHEC` et rendu exit 1 — le chemin d'échec du script est donc validé en conditions réelles.
  Piège ajouté à CLAUDE.md (« Pièges connus »), port libéré, e2e relancés : **35/35 verts en 27 s**.
- **2e run complet : tout vert**, exit 0 — typecheck 0 erreur, lint:check 0 erreur, coverage
  jsdom + browser + merge seuils 80/90/70/80 OK, e2e 35/35, build Vite OK, `npm audit` 0,
  `docs:build` OK (TypeDoc + VitePress).
- Test mental « nouvelle session » : un agent qui ouvre le repo lit CLAUDE.md (ou AGENTS.md selon
  l'outil) et y trouve les 3 services, les commandes exactes de validation, le contrat
  golden-path, le protocole du plan et les pièges — sans redécouvrir l'outillage. Le scénario
  vécu au 1er run (échec e2e environnemental) est précisément celui que le CLAUDE.md permet
  désormais de diagnostiquer en une commande.

### Hors scope assumé

Pas de skill `.claude/skills/`, pas de hooks, pas de multi-agents : critère « si simple que ça
reste vrai dans 6 mois ». Le workflow de revue CI reste une évolution documentée (IMP-011).
