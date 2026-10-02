/*
 * GEN436 – Simulateur de machine synchrone
 * presets.js : préconfigurations reproduisant les cas présentés dans les notes de cours.
 *
 * Chaque préconfiguration donne : la machine, la convention, les grandeurs imposées (mode) et
 * les éléments affichés sur le diagramme vectoriel. Les valeurs de `in` sont exprimées dans la
 * convention de la préconfiguration (comme on les lirait sur la diapositive) ; angles en degrés.
 *   ov : angles, dq (axes d-q), fmm (Fr, Fs, F), decomp (composantes d et q), pq (axes P-Q),
 *        loci (lieux de E à Ir constant et à P constant)
 */
(function (global) {
  'use strict';
  var XS = 1.04;                 // réactance synchrone de la machine générique (pu)
  var P0 = 0.55;                 // puissance utilisée pour les études à P constant

  var LIST = [
    // ------------------------------------------------------------------ Cours 3
    {
      id: 'c3-gen', group: 'Cours 3 – Conventions de signe', slide: 'Cours 3, diapos 64 à 67',
      title: 'La machine fournit P et Q – convention générateur',
      conv: 'gen', mode: 'bus_PQ', in: { Ps: 0.6, Qs: 0.45 }, ov: { angles: true },
      text: 'La machine fournit P et Q au réseau. En convention générateur : E = Vs + jXs·Is, Ps > 0 et Qs > 0 (quadrant I), φ > 0 et δ > 0. Basculez en convention récepteur : E et Vs ne bougent pas, Is s\'inverse et le même fonctionnement se lit dans le quadrant III.'
    },
    {
      id: 'c3-rec', group: 'Cours 3 – Conventions de signe', slide: 'Cours 3, diapos 64 à 67',
      title: 'La machine fournit P et Q – convention récepteur',
      conv: 'rec', mode: 'bus_PQ', in: { Ps: -0.6, Qs: -0.45 }, ov: { angles: true },
      text: 'Même machine, même fonctionnement, étudiés en convention récepteur : Vs = E + jXs·Is, Ps < 0 et Qs < 0 (quadrant III), cos(φ) < 0, sin(φ) < 0 et δ = ∠Vs − ∠E < 0. La convention ne change pas la physique, seulement les signes.'
    },
    {
      id: 'c3-q2', group: 'Cours 3 – Conventions de signe', slide: 'Cours 3, diapos 69 et 70',
      title: 'Exercice – quadrant II (convention générateur)',
      conv: 'gen', mode: 'bus_PQ', in: { Ps: -0.6, Qs: 0.45 }, ov: { angles: true },
      text: 'Ps < 0 et Qs > 0 en convention générateur : la machine absorbe P et fournit Q. C\'est un moteur surexcité : E est en retard sur Vs et E > Vs.'
    },
    {
      id: 'c3-q3', group: 'Cours 3 – Conventions de signe', slide: 'Cours 3, diapos 69 et 72',
      title: 'Exercice – quadrant III (convention générateur)',
      conv: 'gen', mode: 'bus_PQ', in: { Ps: -0.6, Qs: -0.35 }, ov: { angles: true },
      text: 'Ps < 0 et Qs < 0 en convention générateur : la machine absorbe P et Q. C\'est un moteur sous-excité : E est en retard sur Vs et E < Vs.'
    },
    {
      id: 'c3-q4', group: 'Cours 3 – Conventions de signe', slide: 'Cours 3, diapos 69 et 73',
      title: 'Exercice – quadrant IV (convention générateur)',
      conv: 'gen', mode: 'bus_PQ', in: { Ps: 0.6, Qs: -0.35 }, ov: { angles: true },
      text: 'Ps > 0 et Qs < 0 en convention générateur : la machine fournit P et absorbe Q. C\'est une génératrice sous-excitée : E est en avance sur Vs et E < Vs.'
    },

    // ------------------------------------------------------------------ Cours 4
    {
      id: 'c4-vide', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapos 3 à 8 et 31 à 33',
      title: 'Caractéristique à vide E(Ir)',
      conv: 'gen', mode: 'load_Z', in: { ir: 1, f: 60, load: 'vide' }, ov: { angles: true },
      text: 'À vide, Is = 0 et Vs = E. Variez Ir à vitesse constante : E = K·Ir (caractéristique linéarisée). Variez ensuite la vitesse à Ir constant : E est proportionnelle à Ωs. Le couple électromagnétique est nul.'
    },
    {
      id: 'c4-23', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapo 23',
      title: 'Génératrice qui fournit Ps et Qs – Rs négligée',
      conv: 'gen', mode: 'load_VI', in: { Vs: 1, Is: 0.75, phiL: 40, f: 60 }, ov: { angles: true },
      text: 'Modèle de Behn-Eschenburg sans pertes : E = Vs + jXs·Is. La chute jXs·Is est en avance de 90° sur Is. Changez Is et cos(φ) de la charge et observez E (donc Ir) nécessaire pour maintenir Vs.'
    },
    {
      id: 'c4-23r', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapo 23',
      title: 'Génératrice qui fournit Ps et Qs – Rs non négligée',
      mset: { Rs: 0.15 },
      conv: 'gen', mode: 'load_VI', in: { Vs: 1, Is: 0.75, phiL: 40, f: 60 }, ov: { angles: true },
      text: 'Avec pertes : E\' = Vs + Rs·Is puis E = E\' + jXs·Is. La chute Rs·Is est en phase avec Is. (Rs est volontairement grande ici pour que la chute soit visible.)'
    },
    {
      id: 'c4-25', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapos 24 et 25',
      title: 'Superposition des grandeurs magnétiques (Fr, Fs, F)',
      conv: 'gen', mode: 'load_VI', in: { Vs: 1, Is: 0.75, phiL: 40, f: 60 }, ov: { angles: true, fmm: true },
      text: 'En convention générateur, Fr (axe des pôles du rotor) est en avance de 90° sur E, Fs est en phase avec Is et F = Fr + Fs est en avance de 90° sur E\'. L\'angle entre Fr et F est δ. Comparez avec l\'animation : ce sont les mêmes vecteurs, en rotation.'
    },
    {
      id: 'c4-40v', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapo 40',
      title: 'Exemple 200 kVA – essai à vide',
      machine: 'exemple200', units: 'si',
      conv: 'gen', mode: 'load_Z', in: { irA: 5, f: 60, load: 'vide' }, ov: { angles: true },
      text: 'Machine de l\'exemple (200 kVA, 277/480 V, 6 pôles, 1200 rpm). À Ir = 5 A, la tension à vide vaut 311,8 V ligne-neutre, soit 540 V ligne-ligne : K = 62,35 V/A.'
    },
    {
      id: 'c4-40c', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapos 34 à 36 et 40',
      title: 'Exemple 200 kVA – essai en court-circuit',
      machine: 'exemple200', units: 'si',
      conv: 'gen', mode: 'load_Z', in: { irA: 5, f: 60, load: 'cc' }, ov: { angles: true },
      text: 'Stator en court-circuit (Vs = 0) : toute la tension interne chute dans Rs + jXs. À Ir = 5 A, Iscc = 300 A, d\'où Xs = √((Ecc/Iscc)² − Rs²) = 1,02 Ω avec Rs = 0,2 Ω.'
    },
    {
      id: 'c4-44', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapos 44 et 45',
      title: 'Réseau indépendant – modèle avec pertes',
      mset: { Rs: 0.1 },
      conv: 'gen', mode: 'load_VI', in: { Vs: 1, Is: 0.8, phiL: 35, f: 60 }, ov: { angles: true },
      text: 'E² = (Vs + Rs·Is·cos φ + Xs·Is·sin φ)² + (Xs·Is·cos φ − Rs·Is·sin φ)² (éq. 23). Le courant d\'excitation à appliquer pour maintenir Vs est Ir = E/K (éq. 24).'
    },
    {
      id: 'c4-46', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapo 46',
      title: 'Caractéristique de régulation Ir(Is) à Vs constante',
      conv: 'gen', mode: 'load_VI', in: { Vs: 1, Is: 1, phiL: 36.87, f: 60 }, ov: { angles: true },
      text: 'L\'alternateur est régulé pour maintenir Vs. Variez Is : avec une charge inductive (cos φ RET.), il faut augmenter Ir ; avec une charge capacitive (cos φ AV.), il faut d\'abord le diminuer. Le point se déplace sur la courbe de régulation.'
    },
    {
      id: 'c4-ext', group: 'Cours 4 – Génératrice à pôles lisses', slide: 'Cours 4, diapos 42 à 44',
      title: 'Sans régulation : Vs chute quand la charge augmente',
      conv: 'gen', mode: 'load_Z', in: { ir: 1.6, f: 60, load: 'charge', Z: 1.2, phiL: 36.87 }, ov: { angles: true },
      text: 'Ir est maintenant fixe. Diminuez |Z| (la charge augmente) : Vs chute avec une charge inductive ou résistive, et monte avec une charge capacitive. C\'est pour cela qu\'il faut asservir Ir.'
    },

    // ------------------------------------------------------------------ Cours 5
    {
      id: 'c5-06', group: 'Cours 5 – Réaction d\'induit et couple', slide: 'Cours 5, diapo 6',
      title: 'Réaction d\'induit transversale (ψ = 0)',
      conv: 'gen', mode: 'bus_Ed', calc: function (m) {
        var Is = 0.6, x = m.Xd * Is;               // Is en phase avec E : Vs² = E² + (Xs·Is)²
        return { ir: Math.sqrt(1 - x * x), delta: Math.asin(x) * 180 / Math.PI };
      }, ov: { angles: true, fmm: true, dq: true },
      text: 'Is est en phase avec E : Fs est perpendiculaire à Fr (réaction transversale). La charge est légèrement capacitive (φ < 0) : elle fournit à Xs la puissance réactive qu\'elle consomme, sans que le rotor n\'en absorbe (Qem = 0).'
    },
    {
      id: 'c5-07', group: 'Cours 5 – Réaction d\'induit et couple', slide: 'Cours 5, diapo 7',
      title: 'Réaction longitudinale démagnétisante (ψ = +π/2)',
      conv: 'gen', mode: 'bus_EP', in: { ir: 1.6, Pu: 0 }, ov: { angles: true, fmm: true, dq: true },
      text: 'Is est en retard de 90° sur E : Fs s\'oppose à Fr, dans l\'axe des pôles. Le couple est nul (Fr et Fs alignées) et la charge est inductive.'
    },
    {
      id: 'c5-08', group: 'Cours 5 – Réaction d\'induit et couple', slide: 'Cours 5, diapo 8',
      title: 'Réaction longitudinale magnétisante (ψ = −π/2)',
      conv: 'gen', mode: 'bus_EP', in: { ir: 0.5, Pu: 0 }, ov: { angles: true, fmm: true, dq: true },
      text: 'Is est en avance de 90° sur E : Fs s\'additionne à Fr, dans l\'axe des pôles. Le couple est nul et la charge est capacitive.'
    },
    {
      id: 'c5-09', group: 'Cours 5 – Réaction d\'induit et couple', slide: 'Cours 5, diapos 9, 10 et 15',
      title: 'Cas général : composantes Fsd et Fsq',
      conv: 'gen', mode: 'bus_EP', in: { ir: 1.67, Pu: P0 }, ov: { angles: true, fmm: true, dq: true, decomp: true },
      text: 'Fs se décompose en Fsd (∝ Is·sin ψ, effet magnétisant ou démagnétisant, liée à Qem) et Fsq (∝ Is·cos ψ, liée au couple et à Pem). En génératrice, Fr est en avance sur F : le couple électromagnétique s\'oppose à la rotation.'
    },
    {
      id: 'c5-27', group: 'Cours 5 – Réaction d\'induit et couple', slide: 'Cours 5, diapos 26 à 30',
      title: 'Caractéristique couple – angle (convention générateur)',
      conv: 'gen', mode: 'bus_Ed', in: { ir: 1.2, delta: 30 }, ov: { angles: true, fmm: true },
      text: 'Tem = (3p/ωs)·Vs·E·sin(δ)/Xs. Faites varier δ : δ > 0 correspond à la génératrice (Fr en avance sur F), δ < 0 au moteur. Le couple maximal est atteint à δ = π/2 et il est proportionnel à E, donc à Ir.'
    },
    {
      id: 'c5-33', group: 'Cours 5 – Réaction d\'induit et couple', slide: 'Cours 5, diapos 33 et 35',
      title: 'Stabilité – point A1 (stable)',
      conv: 'gen', mode: 'bus_EP', in: { ir: 1.2, Pu: 0.7 }, ov: { angles: true, fmm: true },
      dyn: { on: true },
      text: 'Pour un couple Tu donné, il y a deux équilibres. En A1 (δ < π/2), si δ augmente, Tem augmente et freine le rotor : retour à l\'équilibre. La simulation dynamique est active : changez brusquement Pu (tapez une valeur) et observez les oscillations amorties de δ autour du nouveau point.'
    },
    {
      id: 'c5-34', group: 'Cours 5 – Réaction d\'induit et couple', slide: 'Cours 5, diapos 33 et 34',
      title: 'Stabilité – point A2 (instable)',
      conv: 'gen', mode: 'bus_Ed', calc: function (m) {
        return { ir: 1.2, delta: 180 - Math.asin(0.7 * m.Xd / 1.2) * 180 / Math.PI };
      }, ov: { angles: true, fmm: true },
      text: 'Même couple qu\'en A1, mais δ > π/2 : si δ augmente, Tem diminue, le rotor accélère encore et la machine décroche. Ce point n\'existe qu\'en imposant δ ; en imposant le couple, la machine se place en A1.'
    },

    // ------------------------------------------------------------------ Cours 5 (réseau infini)
    {
      id: 'c5-49', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapos 38 à 40 et 49',
      title: 'À l\'accrochage (E = Vs, δ = 0)',
      conv: 'gen', mode: 'bus_EP', in: { ir: 1, Pu: 0 }, ov: { angles: true, pq: true, loci: true },
      text: 'Tensions égales, en phase, même séquence et même fréquence : Is = 0, aucun échange de puissance, Tem = 0. Augmentez ensuite Pu (couple de l\'entraînement) ou Ir.'
    },
    {
      id: 'c5-50', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapos 48 et 50',
      title: 'Ir constant, puissance active variable',
      conv: 'gen', mode: 'bus_EP', in: { ir: 1, Pu: 0.6 }, ov: { angles: true, pq: true, loci: true },
      text: 'Ir constant : l\'extrémité de E reste sur un cercle de rayon E. Augmentez Pu : δ augmente, Ps augmente… et la machine absorbe de plus en plus de Q, à cause des pertes réactives dans Xs.'
    },
    {
      id: 'c5-51', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapo 51',
      title: 'À la limite du décrochage (δ = π/2)',
      conv: 'gen', mode: 'bus_Ed', in: { ir: 1, delta: 90 }, ov: { angles: true, pq: true, loci: true },
      text: 'δ = 90° : la puissance transmise est maximale (Vs·E/Xs). Au-delà, la zone est instable en régime permanent et la génératrice décroche.'
    },
    {
      id: 'c5-54', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapos 53 et 54',
      title: 'Ir variable, P constante – génératrice surexcitée',
      conv: 'gen', mode: 'bus_EP', in: { ir: 1.67, Pu: P0 }, ov: { angles: true, pq: true, loci: true },
      text: 'Le couple Tu est constant : Xs·Is·cos φ est constant et l\'extrémité de E se déplace sur une droite parallèle à Vs. Ici E est grande : la génératrice fournit Q (le réseau se comporte comme une charge inductive). Diminuez Ir pour passer par cos φ = 1 puis en sous-excitation.'
    },
    {
      id: 'c5-55', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapo 55',
      title: 'Ir variable, P constante – facteur de puissance unitaire',
      conv: 'gen', mode: 'bus_EP', calc: function (m) { return { ir: Math.sqrt(1 + Math.pow(P0 * m.Xd, 2)), Pu: P0 }; },
      ov: { angles: true, pq: true, loci: true },
      text: 'φ = 0 : la machine ne fournit que P. L\'excitation injecte juste la puissance réactive Qem qui compense les pertes réactives dans Xs. C\'est le minimum de Is sur la courbe de Mordey.'
    },
    {
      id: 'c5-56', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapo 56',
      title: 'Ir variable, P constante – génératrice sous-excitée',
      conv: 'gen', mode: 'bus_EP', in: { ir: 0.65, Pu: P0 }, ov: { angles: true, pq: true, loci: true },
      text: 'E est petite : la génératrice absorbe Q (le réseau se comporte comme une charge capacitive). Si on diminue encore Ir, δ atteint 90° et la machine décroche.'
    },
    {
      id: 'c5-59', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapos 58 et 59',
      title: 'Courbes de Mordey (courbes en « V »)',
      conv: 'gen', mode: 'bus_EP', calc: function (m) { return { ir: Math.sqrt(1 + m.Xd * m.Xd), Pu: 1.0 }; }, ov: { angles: true },
      text: 'Is en fonction de E à Ps constant. Le point se trouve au creux de la courbe Ps = 1,0 pu, sur le lieu cos φ = 1. Variez Ir : à gauche la machine est sous-excitée, à droite surexcitée ; trop à gauche, elle atteint la limite δ = 90°.'
    },
    {
      id: 'c5-bilan', group: 'Cours 5 – Génératrice sur réseau infini', slide: 'Cours 5, diapos 18 à 24',
      title: 'Bilan de puissance de la génératrice (avec pertes)',
      mset: { Rs: 0.03, Pmec: 0.02, Pfe: 0.015 },
      conv: 'gen', mode: 'bus_EP', in: { ir: 1.5, Pu: 0.8 }, ov: { angles: true },
      text: 'Pu = Pem + Pmec + Pfe et Pem = Ps + Pcu. Le rendement est η = Ps/Pu. Les pertes sont réglables dans « Machine ». Avec Rs ≠ 0, E\' = Vs + Rs·Is apparaît sur le diagramme.'
    },

    // ------------------------------------------------------------------ Cours 6
    {
      id: 'c6-06', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 5 et 6',
      title: 'Moteur qui fournit Qs – Rs négligée (convention récepteur)',
      conv: 'rec', mode: 'bus_PQ', in: { Ps: 0.6, Qs: -0.4 }, ov: { angles: true },
      text: 'Convention récepteur : Vs = E + jXs·Is et δ = ∠Vs − ∠E > 0. Le moteur absorbe P (Ps > 0) et fournit Q (Qs < 0) : Is est en avance sur Vs, quadrant IV.'
    },
    {
      id: 'c6-06r', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapo 6',
      title: 'Moteur qui fournit Qs – Rs non négligée',
      mset: { Rs: 0.15 },
      conv: 'rec', mode: 'bus_PQ', in: { Ps: 0.6, Qs: -0.4 }, ov: { angles: true },
      text: 'E\' = E + jXs·Is et Vs = E\' + Rs·Is. (Rs est volontairement grande ici pour que la chute soit visible.)'
    },
    {
      id: 'c6-08', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 7 à 9',
      title: 'Moteur – grandeurs magnétiques (convention récepteur)',
      conv: 'rec', mode: 'bus_PQ', in: { Ps: 0.6, Qs: -0.4 }, ov: { angles: true, fmm: true },
      text: 'En convention récepteur, Fr est en retard de 90° sur E et F en retard de 90° sur E\'. En moteur, Fr est en retard sur F : c\'est le champ résultant qui tire le rotor. Basculez en convention générateur pour comparer avec la diapo 9.'
    },
    {
      id: 'c6-14', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 11, 13 et 14',
      title: 'Ir variable, P constante – moteur surexcité',
      conv: 'rec', mode: 'bus_EP', in: { ir: 1.67, Pu: P0 }, ov: { angles: true, pq: true, loci: true },
      text: 'Attention : c\'est la convention qui dicte le sens des axes P et Q (ici Q vers la gauche et P vers le bas), pas le fonctionnement. Le moteur surexcité fournit Q : il se comporte comme une charge capacitive.'
    },
    {
      id: 'c6-15', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapo 15',
      title: 'Ir variable, P constante – moteur à cos φ = 1',
      conv: 'rec', mode: 'bus_EP', calc: function (m) { return { ir: Math.sqrt(1 + Math.pow(P0 * m.Xd, 2)), Pu: P0 }; },
      ov: { angles: true, pq: true, loci: true },
      text: 'φ = 0 : le moteur se comporte comme une charge résistive. Le rotor fournit uniquement la puissance réactive consommée par Xs.'
    },
    {
      id: 'c6-16', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapo 16',
      title: 'Ir variable, P constante – moteur sous-excité',
      conv: 'rec', mode: 'bus_EP', in: { ir: 0.8, Pu: P0 }, ov: { angles: true, pq: true, loci: true },
      text: 'Le moteur sous-excité absorbe Q : il se comporte comme une charge inductive. Ici ψ < 0 : le rotor fournit encore une partie de la puissance réactive de Xs, le réseau fournit le reste.'
    },
    {
      id: 'c6-18', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 18 et 19',
      title: 'Courbes de Mordey du moteur',
      conv: 'rec', mode: 'bus_EP', calc: function (m) { return { ir: Math.sqrt(1 + Math.pow(0.5 * m.Xd, 2)), Pu: 0.5 }; }, ov: { angles: true },
      text: 'En réglant Ir, le moteur synchrone peut fonctionner à cos φ = 1 quelle que soit sa charge, ou même relever le facteur de puissance d\'une installation en se comportant comme un condensateur.'
    },
    {
      id: 'c6-22c', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 21 à 23',
      title: 'Compensateur synchrone – capacitif (surexcité)',
      conv: 'rec', mode: 'bus_EP', in: { ir: 1.5, Pu: 0 }, ov: { angles: true, pq: true },
      text: 'Moteur sans charge mécanique : Ps = 0 et δ = 0. Avec E > Vs, φ = ψ = −π/2 : la machine injecte de la puissance réactive, comme un condensateur réglable par Ir.'
    },
    {
      id: 'c6-22i', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 21 à 23',
      title: 'Compensateur synchrone – inductif (sous-excité)',
      conv: 'rec', mode: 'bus_EP', in: { ir: 0.6, Pu: 0 }, ov: { angles: true, pq: true },
      text: 'Avec E < Vs, φ = ψ = +π/2 : la machine absorbe de la puissance réactive, comme une inductance. À E = Vs, Is = 0 : c\'est la pointe de la courbe en V.'
    },
    {
      id: 'c6-27', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 27 à 32',
      title: 'Bilan de puissance du moteur (avec pertes)',
      mset: { Rs: 0.03, Pmec: 0.02, Pfe: 0.015 },
      conv: 'rec', mode: 'bus_EP', in: { ir: 1.5, Pu: 0.8 }, ov: { angles: true },
      text: 'Ps = Pem + Pcu + Pfe et Pem = Pu + Pmec. En moteur, les pertes fer sont retirées avant l\'arbre. Le rendement est η = Pu/Ps.'
    },
    {
      id: 'c6-33', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 33 à 35',
      title: 'Caractéristique couple – angle (convention récepteur)',
      conv: 'rec', mode: 'bus_Ed', in: { ir: 1.2, delta: 30 }, ov: { angles: true, fmm: true },
      text: 'Mêmes équations qu\'en génératrice. En convention récepteur, δ = ∠Vs − ∠E = ∠F − ∠Fr est positif pour un moteur : la courbe est la même, mais les zones moteur et génératrice sont inversées.'
    },
    {
      id: 'c6-38', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 38 et 39',
      title: 'Moteur à la limite du décrochage',
      conv: 'rec', mode: 'bus_Ed', in: { ir: 0.6, delta: 90 }, ov: { angles: true, fmm: true },
      text: 'Le couple résistant Tr = Tu + Tmec est égal au couple électromagnétique maximal. Au-delà, le synchronisme ne peut plus être maintenu : le couple moyen devient nul et les courants au stator deviennent très importants.'
    },
    {
      id: 'c6-40', group: 'Cours 6 – Moteur à pôles lisses', slide: 'Cours 6, diapos 40 à 43',
      title: 'Stabilité transitoire – échelon de couple résistant',
      conv: 'rec', mode: 'bus_EP', in: { ir: 1.2, Pu: 0.4 }, ov: { angles: true, fmm: true },
      dyn: { on: true, D: 6 },
      text: 'Simulation dynamique active. Tapez Pu = 0,9 pu puis Entrée : le couple résistant passe de Tr1 à Tr2. Le rotor ralentit, δ dépasse δ2 puis oscille (oscillations pendulaires, amorties par les enroulements amortisseurs). Tant que δ reste sous π − δ2, le moteur revient vers A2. Essayez Pu = 1,1 pu, ou diminuez Ir : la marge de stabilité est d\'autant plus grande que Ir est élevé.'
    },

    // ------------------------------------------------------------------ Cours 7
    {
      id: 'c7-08', group: 'Cours 7 – Machine à pôles saillants', slide: 'Cours 7, diapos 6 à 9',
      title: 'Pôles lisses : décomposition dans les axes d et q',
      conv: 'gen', mode: 'bus_PQ', in: { Ps: 0.6, Qs: 0.4 }, ov: { angles: true, fmm: true, dq: true, decomp: true },
      text: 'L\'axe d est l\'axe des pôles (en phase avec Fr) ; l\'axe q est en phase avec E. Isq = Is·cos ψ est la composante active par rapport à E (couple) ; Isd = Is·sin ψ est la composante réactive (effet magnétisant ou démagnétisant). Entrefer constant : Ls = Ld = Lq.'
    },
    {
      id: 'c7-19', group: 'Cours 7 – Machine à pôles saillants', slide: 'Cours 7, diapos 13 à 19',
      title: 'Génératrice à pôles saillants qui fournit Qs',
      machine: 'hydro',
      conv: 'gen', mode: 'bus_PQ', in: { Ps: 0.7, Qs: 0.5 }, ov: { angles: true, dq: true, decomp: true },
      text: 'Xd ≠ Xq : le modèle de Behn-Eschenburg ne s\'applique plus. E = Vs + jXd·Isd + jXq·Isq : la chute jXq·Isq est perpendiculaire à E et jXd·Isd est portée par l\'axe q. Rapprochez Xq de Xd pour retrouver la machine à pôles lisses.'
    },
    {
      id: 'c7-38', group: 'Cours 7 – Machine à pôles saillants', slide: 'Cours 7, diapos 37 et 38',
      title: 'Pôles saillants : essai en court-circuit',
      machine: 'hydro',
      conv: 'gen', mode: 'load_Z', in: { ir: 1, f: 60, load: 'cc' }, ov: { angles: true, dq: true, fmm: true },
      text: 'En court-circuit (Rs négligée), Vs = 0 et Isq = 0 : le courant est purement longitudinal, Is = Isd, et Fs s\'oppose à Fr. La réactance mesurée est donc Xd = E/Is.'
    },
    {
      id: 'c7-45', group: 'Cours 7 – Machine à pôles saillants', slide: 'Cours 7, diapos 44 et 45',
      title: 'Caractéristique puissance – angle (E = 1, Xd = 1, Xq = 0,6 pu)',
      machine: 'hydro',
      conv: 'gen', mode: 'bus_Ed', in: { ir: 1, delta: 64.8 }, ov: { angles: true, dq: true },
      text: 'Pem = Vs·E·sin(δ)/Xd + (Vs²/2)·(1/Xq − 1/Xd)·sin(2δ). Le terme de saillance (réluctance) déplace le maximum : 1,162 pu à δ = 64,8° au lieu de 1 pu à 90°. Essayez Xq > Xd (aimants insérés) et observez le signe du terme de saillance.'
    },
    {
      id: 'c7-46', group: 'Cours 7 – Machine à pôles saillants', slide: 'Cours 7, diapo 46',
      title: 'Puissance – angle pour E = 0,8 ; 1,0 ; 1,2 pu',
      machine: 'hydro',
      conv: 'gen', mode: 'bus_Ed', in: { ir: 1.2, delta: 45 }, ov: { angles: true, dq: true },
      text: 'Variez Ir : le terme classique est proportionnel à E alors que le terme de saillance n\'en dépend pas. Même à Ir = 0, une machine à pôles saillants peut transmettre un peu de puissance (couple de réluctance).'
    }
  ];

  global.MS = global.MS || {};
  global.MS.presets = { list: LIST, XS: XS };
})(window);
