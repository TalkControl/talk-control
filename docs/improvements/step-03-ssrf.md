# Étape 03 — Anti-SSRF sur le patcher et le proxy

**Branche** : `fix/step-03-ssrf` | **Taille** : M | **Prérequis** : 01 | **Modèle** : Fable 5 / Opus (sécurité — allowlist SSRF)

## Contexte

La cible du proxy est **entièrement pilotée par le client** : le patcher pose un cookie
`tc-presentation-url` non signé et sans flags (`patcher.controller.ts:34`), et le proxy fait
`proxy.web(req, res, { target: new URL(cookie).origin, secure: false })` sans aucune validation
(`proxy.controller.ts:10-20`). Le patcher lui-même `fetch()` une URL venant d'un query param
(`patcher.controller.ts:12,22`).

Conséquence : avec l'URL ngrok, n'importe qui transforme le serveur en **proxy ouvert vers le réseau
interne** (`http://169.254.169.254/…`, `http://localhost:…`). C'est la faille la plus grave de l'audit.

## Décision à tracer (IMP-001)

Créer un module de validation d'URL de présentation unique, utilisé par le patcher ET le proxy.
Politique par défaut (mode présentation locale) :

- Schémas autorisés : `http:`, `https:` uniquement.
- **Refus des adresses privées/spéciales** : loopback (sauf les ports du projet en dev, voir plus bas),
  RFC1918 (10/8, 172.16/12, 192.168/16), link-local (169.254/16, dont metadata cloud), `0.0.0.0`, IPv6
  équivalents (::1, fc00::/7, fe80::/10).
- **Exception dev** : `localhost:3002` (showcase) doit rester joignable — c'est le golden-path scénario 1.
  Autoriser explicitement les hosts listés dans une allowlist de config (`config.presentation.allowedHosts`,
  défaut `["localhost", "127.0.0.1"]` en dev, `[]` en prod), en plus des hosts publics.
- Résoudre le DNS **avant** de valider (sinon `evil.com` → 127.0.0.1 contourne le filtre) :
  `dns.lookup` puis validation de l'IP résolue. Pour rester KISS, utiliser `node:net.isIP` +
  une fonction `isPrivateAddress(ip)` maison (~20 lignes, testée).

## Actions

1. **Créer `src/server/services/presentation-url.ts`** :
   ```ts
   export async function validatePresentationUrl(raw: string): Promise<URL> // throw si invalide
   export function isPrivateAddress(ip: string): boolean
   ```
   TDD : écrire d'abord `test/server/services/presentation-url.spec.ts` — cas : URL valide publique,
   localhost autorisé par allowlist, 169.254.169.254 refusé, 10.x refusé, `file:` refusé, `ftp:` refusé,
   host DNS→IP privée refusé (mocker `dns.lookup`), URL non parsable refusée.

2. **Patcher** (`src/server/controllers/patcher.controller.ts`) :
   - Valider via `validatePresentationUrl` avant le `fetch` (ligne ~22). Réponse 400 avec message clair si refus.
   - Ajouter un **timeout** au fetch (`AbortSignal.timeout(10_000)`) — actuellement aucune limite.
   - Poser le cookie avec des flags : `res.cookie('tc-presentation-url', url.href, { httpOnly: true, sameSite: 'lax', signed: true })`.
     (`secure: true` seulement derrière HTTPS — conditionner à `req.secure || x-forwarded-proto === 'https'`,
     ce qui couvre ngrok.)
   - Note : `httpOnly` est possible car aucun code client ne lit ce cookie en JS (vérifier par grep avant —
     si le client le lit, documenter et garder lisible mais signé).

3. **cookie-parser signé** (`src/server/router.ts:10`) : `cookieParser(secret)` avec un secret venant de
   l'env (`TC_COOKIE_SECRET`, généré aléatoirement au boot si absent — pas de valeur par défaut codée en dur).
   Lire le cookie via `req.signedCookies['tc-presentation-url']` dans le proxy.

4. **Proxy** (`src/server/controllers/proxy.controller.ts`) :
   - Revalider la cible via `validatePresentationUrl` (le cookie signé protège de la falsification,
     la revalidation protège d'un patcher contourné).
   - Supprimer `secure: false` — laisser la vérification TLS par défaut. Si une présentation en
     self-signed casse, le documenter comme une option de config explicite, pas un défaut.
   - Corriger `req.url = req.originalUrl.replace('/proxy', '')` en remplacement **ancré**
     (`replace(/^\/proxy/, '')`).

5. **Adapter les tests d'intégration existants** (`test/server/integration/{proxy,patcher}.integration.spec.ts`
   et `test/server/helpers/server.helper.ts`) : cookie signé, cibles de test dans l'allowlist.

## Validation spécifique

```bash
NODE_ENV=test npm test    # dont les nouveaux specs presentation-url
npm run test:e2e          # golden-path 1 (chargement showcase localhost:3002) toujours vert
```

Test manuel : `curl -v "http://localhost:3001/patcher?tc-presentation-url=http://169.254.169.254/"` → 400.

## Risques & pièges

- Ne pas casser le scénario 1 du golden-path : le showcase EST sur localhost — d'où l'allowlist de config,
  pas un blocage aveugle du loopback.
- `http-proxy` suit sa propre résolution DNS : la fenêtre TOCTOU (DNS rebinding) existe toujours en théorie ;
  pour ce projet (outil de présentation, exposition temporaire), la validation à l'entrée est le bon
  compromis KISS. Le noter dans IMP-001.
