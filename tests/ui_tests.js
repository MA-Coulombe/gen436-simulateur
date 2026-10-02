/* GEN436 – tests de l'interface : pilote docs/index.html dans un iframe (voir ui_tests.html). */
(async function () {
  'use strict';
  var nPass = 0, nFail = 0, out = document.getElementById('out');
  function line(text, cls) {                        // affichage au fil de l'eau
    var s = document.createElement('span');
    s.className = cls; s.textContent = text + '\n';
    out.appendChild(s);
  }
  function group(name) { line('\n' + name, ''); }
  function check(name, cond, detail) {
    if (cond) nPass++; else nFail++;
    line((cond ? '  ok   ' : '  ÉCHEC ') + name + (detail !== undefined ? '  [' + detail + ']' : ''), cond ? 'ok' : 'ko');
  }
  function finish() {
    var sum = document.getElementById('summary');
    sum.textContent = (nFail ? 'ÉCHEC' : 'RÉUSSI') + ' : ' + nPass + ' vérifications réussies, ' + nFail + ' en échec';
    sum.className = nFail ? 'ko' : 'ok';
    document.body.setAttribute('data-status', nFail ? 'FAIL' : 'PASS');
  }

  var frame = document.getElementById('app'), win, doc;
  try {
    await new Promise(function (res, rej) {
      var ready = function () { return frame.contentWindow && frame.contentWindow.MS && frame.contentWindow.MS.charts && frame.contentDocument.getElementById('status').textContent; };
      var tries = 0;
      (function wait() {
        try { if (ready()) return res(); } catch (e) {
          // accès refusé à l'iframe : politique de même origine (voir tests/run_tests.py)
          if (++tries > 100) return rej(e);
        }
        if (++tries > 400) return rej(new Error('la page du simulateur ne se charge pas'));
        setTimeout(wait, 30);
      })();
    });
    win = frame.contentWindow; doc = frame.contentDocument;
  } catch (e) {
    check('Accès à la page du simulateur', false, String(e)); finish(); return;
  }

  // ----------------------------------------------------------------- outils
  // n images de 1/60 s, déclenchées directement (indépendant de la cadence réelle du navigateur)
  function tick(n) { for (var k = n || 2; k > 0; k--) win.MS.app.advance(1 / 60); }
  function $(id) { return doc.getElementById(id); }
  function ev(el, type) { el.dispatchEvent(new win.Event(type, { bubbles: true })); }
  async function slide(id, v) { var r = doc.querySelector('#row-' + id + ' .rng'); r.value = v; ev(r, 'input'); await tick(); }
  async function type(id, v) { var n = $('num-' + id); n.value = v; ev(n, 'change'); await tick(); }
  async function choose(id, v) { var s = $(id); s.value = v; ev(s, 'change'); await tick(); }
  async function click(sel) { doc.querySelector(sel).click(); await tick(); }
  async function preset(pid) {
    var idx = win.MS.presets.list.findIndex(function (p) { return p.id === pid; });
    await choose('preset', String(idx));
  }
  function status() { return $('status').textContent; }
  function numVal(id) { return parseFloat($('num-' + id).value.replace(',', '.')); }
  function rowState(id) { return $('row-' + id).className; }
  function tile(sym) {
    var t = Array.prototype.find.call(doc.querySelectorAll('.tile'), function (e) { return e.querySelector('.tsym').textContent === sym; });
    return t ? t.querySelector('.tval').textContent : null;
  }
  function tnum(sym) {
    var s = tile(sym);
    return s === null ? NaN : parseFloat(s.replace(/ /g, ' ').replace('−', '-').replace(',', '.'));
  }
  function near(a, b, tol) { return Math.abs(a - b) <= (tol || 2e-3); }
  function pressed(sel) { return doc.querySelector(sel).getAttribute('aria-pressed') === 'true'; }
  function errors() { return $('errbox').textContent.trim(); }

  async function run() {
  // ======================================================================
  group('1. Chargement');
  check('Aucune erreur JavaScript au chargement', errors() === '', errors());
  check('Préconfiguration par défaut : cours 5, diapos 53 et 54', $('preset-slide').textContent.indexOf('Cours 5') === 0);
  check('État affiché : génératrice surexcitée, stable', /Génératrice surexcitée/.test(status()) && /stable/.test(status()));
  check('Ps = 0,550 pu ; δ = 20,0°', near(tnum('Ps'), 0.55) && near(tnum('δ'), 20.0, 0.06), tile('Ps') + ' ; ' + tile('δ'));
  ['svg-schema', 'svg-machine', 'svg-phasor'].forEach(function (id) {
    check('Panneau « ' + id + ' » dessiné', $(id).querySelectorAll('*').length > 20, $(id).querySelectorAll('*').length + ' éléments');
  });
  check('Quatre courbes affichées (P–δ, Mordey, P–Q, formes d\'onde)',
    ['pdelta', 'mordey', 'pq', 'waves'].every(function (k) { return $('card-' + k) && $('card-' + k).querySelector('path.curve'); }));
  check('Diagramme vectoriel : Vs, E, Is et jXsIs présents',
    ['cV', 'cE', 'cI'].every(function (c) { return $('svg-phasor').querySelector('g.vec.' + c); }));

  // ======================================================================
  group('2. Réseau infini : Ir variable à puissance constante');
  await slide('ir', 0.65);
  check('Ir = 0,65 : génératrice sous-excitée, Qs < 0, Ps inchangé', /Génératrice sous-excitée/.test(status()) && tnum('Qs') < 0 && near(tnum('Ps'), 0.55), status());
  check('Qs est une grandeur calculée (curseur verrouillé)', /\bout\b/.test(rowState('Qs')) && doc.querySelector('#row-Qs .rng').disabled);
  await type('ir', 1.152);
  check('Ir = 1,152 : facteur de puissance unitaire', /facteur de puissance unitaire/.test(status()) && near(tnum('cos(φ)'), 1, 1e-3), tile('cos(φ)'));
  check('Is minimal = Ps/Vs à cos φ = 1', near(tnum('Is'), 0.55), tile('Is'));
  await slide('Pu', 1.3);
  check('Couple supérieur au couple maximal : décrochage signalé', /Décrochage/.test(status()), status());
  await slide('Pu', 0.55);
  await slide('ir', 1.67);
  check('Retour à la génératrice surexcitée', /Génératrice surexcitée/.test(status()) && !/Décrochage/.test(status()));

  // ======================================================================
  group('2 bis. Saisie des valeurs');
  await type('ir', '1,3');
  check('Saisie avec une virgule : « 1,3 » est comprise', near(tnum('E'), 1.3) && $('num-ir').value === '1,3', $('num-ir').value);
  await type('ir', 'abc');
  check('Saisie illisible : la valeur précédente est rétablie', $('num-ir').value === '1,3' && near(tnum('E'), 1.3), $('num-ir').value);
  await click('#row-ir .step[aria-label="Augmenter"]');
  check('Bouton + : un pas de curseur (0,01)', near(numVal('ir'), 1.31), numVal('ir'));
  doc.querySelector('#row-ir .step[aria-label="Diminuer"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true, shiftKey: true }));
  tick();
  check('Maj + bouton − : dix pas (0,1)', near(numVal('ir'), 1.21), numVal('ir'));
  $('num-ir').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
  tick();
  check('Flèche ↑ dans la case : un pas de plus, affiché tout de suite', near(numVal('ir'), 1.22) && near(tnum('E'), 1.22), numVal('ir'));
  await type('ir', 9);
  check('Valeur hors plage : ramenée à la borne du curseur (2,5)', near(numVal('ir'), 2.5), numVal('ir'));
  check('Les grandeurs calculées sont regroupées sous les grandeurs imposées',
    +$('row-Qs').style.order >= 100 && +$('row-ir').style.order < 100 && +$('row-Pu').style.order < 100);
  check('Les boutons − et + d\'une grandeur calculée sont inactifs', doc.querySelector('#row-Qs .step').disabled && $('num-Qs').disabled);
  await click('#preset-reload');
  check('Bouton ↺ : retour aux réglages du cas (Ir = 1,67)', near(numVal('ir'), 1.67) && $('preset-slide').textContent.indexOf('modifié') < 0, numVal('ir'));

  group('2 ter. État mémorisé');
  await click('#btn-ghost');
  check('« Mémoriser cet état » : l\'état est tracé en gris sur le diagramme', $('svg-phasor').querySelectorAll('g.vec.ghost').length === 3 && /Effacer/.test($('btn-ghost').textContent));
  check('Aucune valeur de référence tant que rien n\'a bougé', !doc.querySelector('.tref'));
  await slide('ir', 1.2);
  var tQ = Array.prototype.find.call(doc.querySelectorAll('.tile'), function (e) { return e.querySelector('.tsym').textContent === 'Qs'; });
  check('Après un changement : la valeur mémorisée s\'affiche sous la nouvelle', !!tQ.querySelector('.tref') && /0,547/.test(tQ.querySelector('.tref').textContent), tQ.textContent);
  check('Point mémorisé sur les courbes (P–δ, Mordey, P–Q)', ['pdelta', 'mordey', 'pq'].every(function (k) { return $('card-' + k).querySelector('.pt.ghostpt'); }));
  await click('#btn-ghost');
  check('« Effacer la référence »', !$('svg-phasor').querySelector('g.vec.ghost') && !doc.querySelector('.tref') && !doc.querySelector('.pt.ghostpt'));
  await slide('ir', 1.67);

  group('2 quater. Déplacement direct de E sur le diagramme');
  var ph = $('svg-phasor');
  function dragE(dx, dy) {                    // saisit la pastille et la déplace de (dx, dy) pixels
    var h = ph.querySelector('.handle'), r = h.getBoundingClientRect();
    var x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    h.dispatchEvent(new win.PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x0, clientY: y0, pointerId: 1 }));
    ph.dispatchEvent(new win.PointerEvent('pointermove', { bubbles: true, clientX: x0 + dx, clientY: y0 + dy, pointerId: 1 }));
    ph.dispatchEvent(new win.PointerEvent('pointerup', { bubbles: true, clientX: x0 + dx, clientY: y0 + dy, pointerId: 1 }));
    tick();
  }
  check('Pastille présente à l’extrémité de E (réseau infini)', !!ph.querySelector('.handle'));
  var ir0 = numVal('ir'), pu0 = numVal('Pu'), dl0 = tnum('δ');
  dragE(-60, 0);
  check('Glisser E vers la gauche : Ir diminue, les curseurs suivent', numVal('ir') < ir0 - 0.05 && near(tnum('E'), numVal('ir'), 6e-3), ir0 + ' -> ' + numVal('ir'));
  dragE(0, -50);
  check('Glisser E vers le haut : le couple et δ augmentent', numVal('Pu') > pu0 + 0.05 && tnum('δ') > dl0, pu0 + ' -> ' + numVal('Pu') + ' ; δ ' + tile('δ'));
  dragE(-900, 0);
  check('Glisser E au-delà de la limite : la machine reste sur la branche stable', !/instable/.test(status()) && !/Décrochage/.test(status()) && Math.abs(tnum('δ')) <= 90.05, tile('δ') + ' ; ' + status().slice(0, 40));
  await preset('c5-54');

  // ======================================================================
  group('3. Conventions et unités');
  var isGen = tnum('Is'), dGen = tnum('δ');
  await click('#seg-conv button[data-v="rec"]');
  check('Convention récepteur : Ps = −0,550 pu, Qs < 0, δ < 0', near(tnum('Ps'), -0.55) && tnum('Qs') < 0 && near(tnum('δ'), -dGen, 0.06), tile('Ps') + ' ; ' + tile('δ'));
  check('Le fonctionnement ne change pas (génératrice surexcitée), le quadrant oui (III)', /Génératrice surexcitée/.test(status()) && /Quadrant III/.test(status()), status());
  check('Curseur Pu : même point physique, signe inversé', near(numVal('Pu'), -0.55), numVal('Pu'));
  check('Is inchangé en module', near(tnum('Is'), isGen));
  await click('#seg-conv button[data-v="gen"]');
  check('Retour en convention générateur : quadrant I', /Quadrant I /.test(status()) && near(tnum('Ps'), 0.55));
  await click('#seg-units button[data-v="si"]');
  check('Unités SI : Vs = 277,1 V ; Ir = 8,35 A ; Ps = 110 kW', near(tnum('Vs'), 277.1, 0.06) && near(numVal('ir'), 8.35, 0.01) && near(tnum('Ps'), 110, 0.06),
    tile('Vs') + ' ; ' + numVal('ir') + ' A ; ' + tile('Ps'));
  await type('ir', 5);
  check('Saisie de Ir = 5 A en SI : E = Vn (277,1 V)', near(tnum('E'), 277.1, 0.06), tile('E'));
  await click('#seg-units button[data-v="pu"]');
  await type('ir', 1.67);

  // ======================================================================
  group('4. Changement des grandeurs imposées');
  var q0 = tnum('Qs'), e0 = tnum('E');
  await choose('mode', 'bus_PQ');
  check('Passage à « Ps et Qs imposées » : même point de fonctionnement', near(numVal('Ps'), 0.55) && near(numVal('Qs'), q0) && near(tnum('E'), e0), numVal('Qs'));
  check('Ir devient une grandeur calculée', /\bout\b/.test(rowState('ir')) && /\bin\b/.test(rowState('Qs')));
  await slide('Qs', 0);
  check('Qs = 0 : cos φ = 1 et Ir = 1,152 pu', near(tnum('cos(φ)'), 1, 1e-3) && near(numVal('ir'), 1.152), numVal('ir'));
  await choose('mode', 'bus_Ed');
  await slide('delta', 120);
  check('δ = 120° imposé : équilibre instable', /instable/.test(status()), status());
  await slide('delta', 90);
  check('δ = 90° : limite du décrochage', /limite du décrochage/.test(status()), status());
  await slide('delta', 30);
  check('δ = 30° : stable', /stable/.test(status()) && !/instable/.test(status()));

  // ======================================================================
  group('5. Réseau indépendant');
  await choose('mode', 'load_Z');
  check('Les curseurs de la charge apparaissent, fs devient réglable', !$('row-Z').hidden && !$('loadstate').hidden && /\bin\b/.test(rowState('f')));
  await type('ir', 1.2);
  await click('#loadstate button[data-v="vide"]');
  check('À vide : Is = 0 et Vs = E', /Génératrice à vide/.test(status()) && near(tnum('Is'), 0) && near(tnum('Vs'), 1.2) && near(tnum('E'), 1.2), status());
  await slide('f', 0.5);
  check('Vitesse réduite de moitié (30 Hz, 600 rpm) : E réduite de moitié', near(tnum('Vs'), 0.6) && /600/.test(tile('Ns')), tile('Vs') + ' ; ' + tile('Ns'));
  await slide('f', 1);
  await click('#loadstate button[data-v="cc"]');
  check('Court-circuit : Vs = 0 et Is = E/Xs', /court-circuit/.test(status()) && near(tnum('Vs'), 0) && near(tnum('Is'), 1.2 / 1.04), tile('Is'));
  await choose('mode', 'load_VI');
  await slide('Vs', 1); await slide('Is', 1); await slide('phiL', 37);
  var Eexp = Math.hypot(1 + 1.04 * Math.sin(37 * Math.PI / 180), 1.04 * Math.cos(37 * Math.PI / 180));
  check('Vs régulée, Is = 1 pu, cos φ = 0,8 RET. : Ir calculé selon l\'éq. (24)', near(numVal('ir'), Eexp, 2e-3) && /\bout\b/.test(rowState('ir')), numVal('ir') + ' attendu ' + Eexp.toFixed(4));
  check('Courbe de régulation affichée', !!$('card-regul') && !$('card-mordey'));

  // ======================================================================
  group('6. Machine');
  await choose('mode', 'bus_Ed');
  await choose('machine', 'hydro');
  check('Alternateur hydraulique : Xq visible, équation à deux réactances', !$('row-Xq').hidden && /Xd/.test($('phasor-eq').textContent), $('phasor-eq').textContent);
  await type('ir', 1); await slide('Vs', 1); await type('delta', 64.8);
  check('Pôles saillants : Pem(64,8°) = 1,162 pu (cours 7, diapo 45)', near(tnum('Pem'), 1.162, 1.5e-3), tile('Pem'));
  check('Termes classique et de saillance tracés', $('card-pdelta').querySelectorAll('path.curve').length >= 3);
  await click('#seg-rotor button[data-v="lisse"]');
  check('Retour aux pôles lisses : Xq masqué, Behn-Eschenburg', $('row-Xq').hidden && /Xs/.test($('phasor-eq').textContent));
  await slide('Rs', 0.1);
  check('Rs ≠ 0 : E\' et Rs·Is apparaissent', /Rs/.test($('phasor-eq').textContent) && tile("E'") !== null);

  // ======================================================================
  group('7. Préconfigurations et affichage');
  await preset('c6-14');
  check('Cas « moteur surexcité » : convention récepteur sélectionnée', pressed('#seg-conv button[data-v="rec"]') && /Moteur surexcité/.test(status()), status());
  check('Axes P-Q et lieux de E activés', doc.querySelector('[data-ov="pq"]').checked && doc.querySelector('[data-ov="loci"]').checked && !!$('svg-phasor').querySelector('g.vec.cPQ'));
  check('Fmm masquées tant que la case n\'est pas cochée', !$('svg-phasor').querySelector('g.vec.cFr'));
  await click('[data-ov="fmm"]');
  check('Case « fmm » : Fr, Fs et F tracées', ['cFr', 'cFs', 'cF'].every(function (c) { return $('svg-phasor').querySelector('g.vec.' + c); }));
  await preset('c6-22c');
  check('Compensateur synchrone : P = 0, φ = −90°', /Compensateur synchrone/.test(status()) && near(tnum('φ'), -90, 0.06), status());
  await click('#preset-next');
  check('Bouton « cas suivant »', /inductif/.test(status()), status());

  // ======================================================================
  group('8. Animation, infobulles et thème');
  var rot = function () { return $('svg-machine').querySelector('.rotorg').getAttribute('transform'); };
  var r0 = rot();
  await tick(6);
  check('En pause : le rotor ne tourne pas', rot() === r0);
  await click('#anim-play');
  await tick(8);
  check('Lecture : le rotor tourne', rot() !== r0, r0 + ' -> ' + rot());
  await click('#anim-play');
  var svg = $('card-pdelta').querySelector('svg'), box = svg.getBoundingClientRect();
  svg.dispatchEvent(new win.PointerEvent('pointermove', { bubbles: true, clientX: box.left + box.width * 0.6, clientY: box.top + box.height * 0.4 }));
  var tip = $('card-pdelta').querySelector('.tip');
  check('Infobulle au survol de la courbe P–δ', !tip.hidden && /Pem/.test(tip.textContent) && /δ/.test(tip.textContent), tip.textContent);
  svg.dispatchEvent(new win.PointerEvent('pointerleave', { bubbles: true }));
  check('Infobulle masquée en quittant la courbe', tip.hidden);
  await click('#btn-theme');
  check('Bouton de thème', doc.documentElement.getAttribute('data-theme') === 'dark');
  await click('#btn-theme');

  // ======================================================================
  group('9. Simulation dynamique (équation du mouvement)');
  await preset('c6-40');
  check('Cas « stabilité transitoire » : dynamique active, courbe δ(t) affichée', $('dyn-on').checked && !!$('card-swing'));
  await click('#anim-play');
  await tick(10);
  var d1 = tnum('δ');
  check('Équilibre initial : δ1 = asin(0,4·Xs/E)', near(d1, Math.asin(0.4 * 1.04 / 1.2) * 180 / Math.PI, 0.3), tile('δ'));
  await type('Pu', 0.9);
  var peak = 0, i;
  for (i = 0; i < 400; i++) { await tick(1); peak = Math.max(peak, tnum('δ')); }
  var d2 = Math.asin(0.9 * 1.04 / 1.2) * 180 / Math.PI;
  check('Échelon de couple 0,4 → 0,9 pu : δ dépasse δ2 puis s\'en rapproche', peak > d2 + 2 && Math.abs(tnum('δ') - d2) < 8 && !/Décrochage/.test(status()),
    'pic ' + peak.toFixed(1) + '° ; δ2 = ' + d2.toFixed(1) + '° ; actuel ' + tile('δ'));
  await type('Pu', 1.4);
  for (i = 0; i < 600 && !/Décrochage/.test(status()); i++) await tick(1);
  check('Couple résistant supérieur à Tem max : le moteur décroche', /Décrochage/.test(status()), status());
  await type('Pu', 0.4);
  await click('#dyn-reset');
  await tick(4);
  check('« Resynchroniser » : retour à l\'équilibre', !/Décrochage/.test(status()) && near(tnum('δ'), d1, 1), tile('δ'));
  await click('#anim-play');

  group('10. Fluidité');
  await preset('c5-54');
  var t0 = win.performance.now(), n = 60;
  for (i = 0; i < n; i++) await slide('ir', 0.7 + 1.2 * i / n);
  var ms = (win.performance.now() - t0) / n;
  check('Déplacement d\'un curseur : moins de 50 ms par mise à jour complète de la page', ms < 50, ms.toFixed(1) + ' ms en moyenne');

  group('11. Bilan');
  var cr = doc.querySelector('footer .copyright');
  check('Mention de droit d\'auteur visible en pied de page', !!cr && cr.textContent === '© 2026 Marc-Antoine Coulombe, CPI' && cr.getBoundingClientRect().height > 0, cr && cr.textContent);
  var lic = doc.querySelector('footer .license a');
  check('Licence CC BY-NC-SA 4.0 indiquée, avec lien vers le résumé officiel', !!lic && /CC BY-NC-SA 4\.0/.test(lic.textContent) && /creativecommons\.org\/licenses\/by-nc-sa\/4\.0\//.test(lic.href));
  check('Aucune erreur JavaScript pendant tous les essais', errors() === '', errors());
  }
  run().catch(function (e) { check('Exception pendant les tests', false, String((e && e.stack) || e)); }).then(finish);
})();
