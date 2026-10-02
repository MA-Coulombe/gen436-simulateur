# GEN436 – Simulateur de machine synchrone

Page web interactive pour le cours **GEN436 – Machines électriques** : génératrice, moteur et
compensateur synchrones, à pôles lisses ou saillants, en convention générateur ou récepteur.
Tout le calcul se fait dans le navigateur (JavaScript, aucune dépendance, aucun serveur).

La page montre en même temps, pour le même point de fonctionnement :

- le **schéma du système** (sens réel des échanges de P et Q, puis circuit équivalent dans la convention choisie) ;
- la **coupe animée** de la machine (rotor, courants des phases, fmm **F**<sub>r</sub>, **F**<sub>s</sub>, **F**, couples) ;
- le **diagramme vectoriel** (phaseurs, angles δ, φ, ψ, axes d-q, axes P-Q, lieux de **E**) ;
- les **courbes** (puissance–angle, Mordey, plan P-Q, formes d'onde, régulation, essais, δ(t)).

## Utiliser la page

Ouvrir `docs/index.html` dans un navigateur (double-clic) : rien à installer.

1. Choisir une **préconfiguration** : chaque cas reproduit une diapositive des cours 3 à 7.
2. Régler les **grandeurs imposées** : curseur, saisie directe (virgule ou point, puis Entrée),
   boutons − / + ou flèches ↑ ↓ (Maj : dix pas). Sur un réseau infini, on peut aussi faire glisser
   l'extrémité de **E** directement sur le diagramme vectoriel.
3. Lire les **grandeurs calculées**, qui se mettent à jour en continu.
4. Basculer entre convention **générateur** et **récepteur** : la machine ne change pas, seuls les signes changent.
5. **Mémoriser cet état** garde le point actuel en gris pour le comparer au suivant.

Le menu « Réseau et grandeurs imposées » fixe ce qui est figé :

| Mode | Imposé | Calculé |
|---|---|---|
| Réseau infini – I<sub>r</sub> et couple | V<sub>s</sub>, f<sub>s</sub> (réseau), I<sub>r</sub>, P<sub>u</sub> | δ, I<sub>s</sub>, P<sub>s</sub>, Q<sub>s</sub> |
| Réseau infini – P<sub>s</sub> et Q<sub>s</sub> | V<sub>s</sub>, f<sub>s</sub>, P<sub>s</sub>, Q<sub>s</sub> | I<sub>r</sub>, δ, I<sub>s</sub> |
| Réseau infini – I<sub>r</sub> et δ | V<sub>s</sub>, f<sub>s</sub>, I<sub>r</sub>, δ | couple, I<sub>s</sub>, P<sub>s</sub>, Q<sub>s</sub> (zone instable accessible) |
| Réseau indépendant – V<sub>s</sub> régulée | V<sub>s</sub>, f<sub>s</sub>, I<sub>s</sub>, cos φ de la charge | I<sub>r</sub> requis |
| Réseau indépendant – I<sub>r</sub> fixe | I<sub>r</sub>, f<sub>s</sub>, charge Z (ou à vide, ou court-circuit) | V<sub>s</sub>, I<sub>s</sub> |

Liens directs : `index.html?s=c5-54` ouvre une préconfiguration (identifiants dans
`docs/js/presets.js`) ; on peut ajouter `&conv=rec`, `&u=si`, `&theme=dark`.

## Publier sur GitHub Pages

1. Créer un dépôt GitHub et y pousser ce dossier (les PDF du cours sont exclus par `.gitignore`).
2. Dans le dépôt : **Settings → Pages → Build and deployment → Deploy from a branch**, branche
   `main`, dossier **`/docs`**.
3. La page est servie à `https://<utilisateur>.github.io/<dépôt>/`.

## Modèle

Régime permanent, circuit magnétique non saturé, grandeurs par phase (ligne-neutre), valeurs
réduites (bases S<sub>n</sub>, V<sub>n</sub> ligne-neutre, f<sub>n</sub>).

- Pôles lisses (Behn-Eschenburg) : **E** = **V**<sub>s</sub> + R<sub>s</sub>**I**<sub>s</sub> + jX<sub>s</sub>**I**<sub>s</sub> (générateur),
  **V**<sub>s</sub> = **E** + jX<sub>s</sub>**I**<sub>s</sub> + R<sub>s</sub>**I**<sub>s</sub> (récepteur).
- Pôles saillants : **E** = **V**<sub>s</sub> + R<sub>s</sub>**I**<sub>s</sub> + jX<sub>d</sub>**I**<sub>sd</sub> + jX<sub>q</sub>**I**<sub>sq</sub>.
- φ = ∠**V**<sub>s</sub> − ∠**I**<sub>s</sub> ; ψ = ∠**E** − ∠**I**<sub>s</sub> ; δ = ∠**E** − ∠**V**<sub>s</sub> (générateur) ou ∠**V**<sub>s</sub> − ∠**E** (récepteur).
- E = K·I<sub>r</sub> à la vitesse nominale ; E et X proportionnelles à f<sub>s</sub> (réseau indépendant).
- Dynamique : 2H·dΔω/dt = P<sub>m</sub> − P<sub>em</sub>(δ) − D·Δω, dδ/dt = ω<sub>n</sub>·Δω, à E constante.

Le calcul est fait une seule fois en convention générateur ; la convention récepteur inverse le
courant (`view()` dans `docs/js/model.js`). Choix de modélisation à connaître :

- les fmm sont tracées en « tension équivalente » (F<sub>r</sub> ↔ E/ω, F<sub>s</sub> ↔ X<sub>d</sub>·I<sub>s</sub>), avec leur propre échelle ;
- l'animation est en angle électrique (équivalent p = 1) ;
- en moteur, les pertes fer sont retirées avant l'arbre (P<sub>em</sub> = P<sub>s</sub> − P<sub>cu</sub> − P<sub>fe</sub>), comme dans le cours 6 ;
- la simulation dynamique est le modèle classique (E constante, amortissement D) : elle illustre la stabilité, elle ne remplace pas une étude transitoire.

## Validation

```
python tests/reference.py     # (re)génère tests/reference.js avec numpy/scipy
python tests/run_tests.py     # lance les deux pages de test dans Edge ou Chrome sans interface
```

- `tests/tests.html` – modèle : comparaison à une implémentation Python indépendante dans les
  cinq modes, valeurs chiffrées des diapositives (Mordey, pôles saillants, exemple 200 kVA,
  accrochage), équations du cours sur des points aléatoires, conventions de signe, réaction
  d'induit, bilans de puissance, stabilité, sens de variation attendus.
- `tests/ui_tests.html` – interface : curseurs, saisie, conventions, unités, modes,
  préconfigurations, déplacement de **E**, état mémorisé, dynamique, fluidité.

`tests/tests.html` s'ouvre aussi directement dans un navigateur. `tests/ui_tests.html` lit le
simulateur dans un iframe : sous `file://`, passer par `run_tests.py`.

## Fichiers

```
docs/index.html      page
docs/css/style.css   mise en forme, thèmes clair et sombre
docs/js/model.js     calculs (aucun accès à la page)
docs/js/presets.js   préconfigurations : une entrée par cas du cours
docs/js/phasor.js    diagramme vectoriel
docs/js/machine.js   coupe animée
docs/js/schema.js    schéma du système
docs/js/charts.js    courbes
docs/js/draw.js      utilitaires SVG, étiquettes mathématiques, unités
docs/js/app.js       état, commandes, boucle d'affichage
tests/               validation
```

Ajouter un cas : copier une entrée de `docs/js/presets.js` et ajuster `mode`, `conv`, `in`
(valeurs lues dans la convention du cas, angles en degrés) et `ov` (éléments affichés).

Nomenclature d'après les notes du cours GEN436 (UQAR), adaptées de M. Berger, P. Viarouge et A. Chebak.

## Licence

© 2026 Marc-Antoine Coulombe, CPI

Distribué sous licence [Creative Commons Attribution – Pas d'utilisation commerciale – Partage dans
les mêmes conditions 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr) ;
texte complet dans [LICENSE](LICENSE). Vous pouvez utiliser et adapter ce simulateur à des fins non
commerciales, à condition de citer l'auteur et de partager vos adaptations sous la même licence.
