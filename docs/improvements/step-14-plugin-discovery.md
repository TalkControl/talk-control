# Étape 14 — Plugins auto-découverts

**Branche** : `feat/step-14-plugin-discovery` | **Taille** : S | **Prérequis** : 11 | **Modèle** : Sonnet 5 + relecture (plugins hors filet, piège client/serveur)

## Contexte

Le plugin loader est verrouillé par un `switch` codé en dur (`plugin-loader.ts:7-18`) qui mappe chaque nom
de plugin vers un `import()` dynamique. Ajouter un plugin oblige à éditer **deux endroits** : le switch ET
`config/plugins.json`. Le serveur ne connaît les plugins que via `plugins.json` (`tc-server.ts:20`).

L'architecture est extensible dans le principe (classe de base `Plugin`, contrat `init/unload/onEvent`,
events pass-through) mais bridée par ce switch.

## Décision à tracer (IMP-010)

Remplacer le switch par une découverte automatique via `import.meta.glob` (Vite) sur les modules de plugins,
en gardant `config/plugins.json` comme **source d'activation** (quels plugins sont actifs + autoActivate),
mais plus comme catalogue de code à câbler manuellement.

## Actions

1. **Découverte par glob** (`plugin-loader.ts`) :
   ```ts
   const modules = import.meta.glob('../plugins/**/index.ts');
   // clé = chemin, valeur = () => import(...)
   ```
   Construire une map `nom → loader` à partir des chemins (convention : le nom du dossier ou un `name`
   exporté par le module). Vérifier la convention de nommage actuelle des plugins (`keyboard`, `touch`,
   `touch-pointer`) pour dériver le nom de façon fiable.

2. **Contrat de plugin** : s'assurer que chaque `index.ts` de plugin exporte de manière uniforme son
   `instance` + un `name` (ou dériver le name du chemin). Aligner les 3 plugins existants sur cette
   convention si nécessaire (sans renommer les variables existantes au-delà du besoin — cf. interdits).

3. **`plugins.json` reste la source d'activation** : `{ name, autoActivate }`. Le loader ne charge que les
   plugins listés comme actifs, mais les résout via la map glob au lieu du switch. Un plugin présent sur
   disque mais absent de `plugins.json` n'est pas chargé (contrôle explicite conservé).

4. **Robustesse** : si un nom de `plugins.json` ne correspond à aucun module découvert, logger un warning
   clair (service `logger`) au lieu d'un `default:` de switch silencieux.

5. **Tests** (`test/plugins/plugin-loader.spec.ts`) : adapter — la découverte glob doit être testable.
   En environnement Vitest, `import.meta.glob` est supporté ; sinon, injecter la map de modules pour
   permettre le test (inversion de dépendance légère).

## Validation spécifique

```bash
NODE_ENV=test npm test    # plugin-loader.spec adapté
npm run test:e2e          # golden-path 7 (menu plugins, autoActivate keyboard/touch, activation touch-pointer)
npm run build             # import.meta.glob résolu correctement par Vite au build
```

## Risques & pièges

- `import.meta.glob` est une API **Vite** : vérifier qu'elle fonctionne à la fois au build (Vite) et en test
  (Vitest, qui partage le moteur Vite) ET côté serveur si le loader tourne aussi côté Node (le loader est-il
  client-only ? vérifier — `plugin-loader.ts` est appelé où ?). Si le loader est partagé client/serveur,
  `import.meta.glob` ne marchera pas côté Node pur → dans ce cas, garder un registre explicite mais généré,
  ou limiter la découverte au client. Trancher selon l'usage réel et documenter dans IMP-010.
- Ne pas sur-concevoir un système de plugins tiers/externes : le besoin est de dé-verrouiller l'ajout de
  plugins internes, pas de bâtir un marketplace. KISS.
