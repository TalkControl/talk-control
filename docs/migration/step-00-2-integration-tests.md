# Étape 0.2 — Tests d'intégration serveur (supertest)

## Objectif

Ajouter une couche de tests d'intégration HTTP sur les contrôleurs Express
(`patcher`, `proxy`, `router`) avant la migration, en introduisant
`supertest` comme outil de test HTTP in-process.

## Dépendance ajoutée

| Package | Version | Raison |
|---|---|---|
| `supertest` | `^6.3.4` | Compatible Node 20+ et `module-alias` ; dernière version stable avant les breaking changes v7 |

## Fichiers créés

### `test/server/helpers/server.helper.js`

Helper qui instancie une application Express minimale pour les tests :

```js
export function createTestApp() {
    const app = express();
    app.use(cors());
    app.use(cookieParser());
    app.use('/patcher', patcher);
    app.use('/proxy', proxy);
    return app;
}
```

Monte uniquement `patcher` et `proxy` — le routeur principal est testé
séparément via son propre spec.

### Specs d'intégration

| Fichier | Périmètre |
|---|---|
| `test/server/integration/patcher.integration.spec.js` | Routes `/patcher/*` — happy paths + erreurs |
| `test/server/integration/proxy.integration.spec.js` | Routes `/proxy/*` — cookie manquant/invalide (branche non couverte en unitaire) |
| `test/server/integration/router.integration.spec.js` | Routeur principal — montage des sous-routes |

## Correctif `babel.config.js`

Le fichier était une constante plate. Il est devenu une fonction `api =>` pour
activer le cache Babel et surtout pour conditionner la cible de transpilation :

```js
module.exports = api => {
    const isTest = api.env('test');
    return {
        presets: [['@babel/preset-env', {
            targets: isTest ? { node: 'current' } : { /* browserslist */ }
        }]],
        // ...
    };
};
```

**Pourquoi `node: 'current'` en test** : en mode test, Babel n'a pas besoin
de générer du code compatible tous navigateurs. `node: 'current'` évite la
génération de `regeneratorRuntime` (async/await transpilé inutilement) et
accélère la suite de tests. Ce correctif était un forward-port du commit
`b023cf6` qui avait réglé `regeneratorRuntime is not defined` en step 0.1.

## Résultat

```
196 passing
```

Les tests d'intégration s'ajoutent aux 196 unitaires existants sans en casser
aucun. La branche `req.cookies` null/undefined dans `proxy.controller` est
désormais couverte à la fois en unitaire (step 0.1) et en intégration.
