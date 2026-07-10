# Étape 09 — Bulma 0.9 → 1.0

**Branche** : `chore/step-09-bulma1` | **Taille** : S | **Prérequis** : 08 | **Modèle** : Sonnet 5 (mécanique)

## Contexte

Bulma est en 0.9.0, deux majeures derrière (1.0.4). L'étape 08 ayant unifié la source CSS
(une seule feuille partagée), l'upgrade ne se fait plus qu'à un seul endroit.

## Contexte breaking (Bulma 1.0)

Bulma 1.0 est une réécriture CSS variables / dart-sass :
- Passage aux **CSS custom properties** (`--bulma-*`).
- Suppression/renommage de certaines classes helpers et de la palette par défaut.
- La distribution `bulma.min.css` existe toujours (pas besoin de compiler du Sass), donc l'import `?raw`
  reste valable.

## Actions

1. `bulma` 0.9.0 → 1.0.4. `npm install`.
2. Vérifier l'import : `bulma/css/bulma.min.css?raw` — le chemin est inchangé en 1.0, confirmer que le fichier
   existe (`ls node_modules/bulma/css/`).
3. **Auditer les classes utilisées** dans les 13 composants + layouts (`grep -rn "class=" src/client` et les
   templates Lit). Recenser les classes Bulma employées (`button`, `is-primary`, `dropdown`, `is-active`,
   `field`, `control`, `input`, `columns`, etc.) et croiser avec le [changelog Bulma 1.0](https://github.com/jgthms/bulma/releases/tag/1.0.0)
   pour les renommages/suppressions.
4. Corriger les classes cassées. Points chauds probables : les dropdowns des menus (`menu-navigation`,
   `menu-plugins`), le formulaire (`url-form`), les couleurs.
5. Vérifier visuellement le rendu (les tests browser + le golden-path e2e couvrent le fonctionnel, mais
   l'apparence demande un œil humain — lister les écrans à vérifier dans le step).

## Validation spécifique

```bash
npm run build
npm run test:components
npm run test:e2e
```
Vérification visuelle manuelle : controller, on-stage, presenter, menu plugins, formulaire URL, touch-pointer.

## Risques & pièges

- Si trop de classes cassent, envisager de **figer la palette** via les nouvelles CSS custom properties
  plutôt que de réécrire les templates — souvent moins invasif.
- Le snapshot visuel smoke va changer : le régénérer sciemment.
- Cette étape est purement cosmétique/dépendance : si le budget est serré, elle peut être reportée sans
  bloquer les phases D/E/F (Bulma 0.9 fonctionne). Le noter comme optionnelle si besoin.
