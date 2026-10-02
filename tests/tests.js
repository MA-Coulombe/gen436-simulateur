/* GEN436 – tests du modèle (exécutés dans le navigateur, voir tests.html). */
(function () {
  'use strict';
  var M = MS.model, REF = window.REF, DEG = Math.PI / 180;
  var lines = [], nPass = 0, nFail = 0, current = '';

  function group(name) { current = name; lines.push({ t: '\n' + name, cls: '' }); }
  function check(name, cond, detail) {
    if (cond) nPass++; else nFail++;
    if (!cond || name.charAt(0) !== '~') {
      lines.push({ t: (cond ? '  ok   ' : '  ÉCHEC ') + name.replace(/^~/, '') + (detail ? '  [' + detail + ']' : ''), cls: cond ? 'ok' : 'ko' });
    }
  }
  function near(name, got, want, tol) {
    tol = tol === undefined ? 1e-9 : tol;
    var ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
    check(name, ok, 'obtenu ' + (+got).toPrecision(7) + ', attendu ' + (+want).toPrecision(7));
  }
  function mach(Xd, Xq, Rs, extra) {
    var m = { Sn: 200e3, Vn: 480, fn: 60, p: 3, Xd: Xd, Xq: Xq, Rs: Rs, Ir0: 5, Pmec: 0, Pfe: 0, IrMax: 99 };
    for (var key in (extra || {})) m[key] = extra[key];
    return m;
  }
  function cplx(r, a) { return { re: r * Math.cos(a), im: r * Math.sin(a) }; }
  function dist(a, b) { return Math.hypot(a.re - b.re, a.im - b.im); }
  // écart maximal entre un point calculé et une référence Python
  function errVsRef(op, r) {
    var e = 0;
    e = Math.max(e, dist(op.I, { re: r.Ire, im: r.Iim }));
    e = Math.max(e, dist(cplx(op.E, op.delta), cplx(r.E, r.delta)));
    e = Math.max(e, Math.abs(op.Vs - r.Vs), Math.abs(op.Ps - r.Ps), Math.abs(op.Qs - r.Qs));
    e = Math.max(e, Math.abs(op.PE - r.PE), Math.abs(op.QE - r.QE));
    return e;
  }
  function batch(name, list, fn, tol) {
    var worst = 0;
    list.forEach(function (r) { worst = Math.max(worst, fn(r)); });
    check(name + ' (' + list.length + ' cas)', worst < tol, 'écart max ' + worst.toExponential(2));
  }

  // ======================================================================
  group('1. Comparaison à l\'implémentation Python indépendante (numpy/scipy)');
  batch('Réseau infini, E et δ imposés', REF.bus_Ed, function (r) {
    var m = mach(r.m[0], r.m[1], r.m[2]);
    return errVsRef(M.solve(m, { mode: 'bus_Ed', Vs: r.Vs, ir: r.E, delta: r.delta }), r);
  }, 1e-9);
  batch('Réseau infini, Ir et puissance à l\'arbre imposés', REF.bus_EP, function (r) {
    var m = mach(r.m[0], r.m[1], r.m[2]);
    return errVsRef(M.solve(m, { mode: 'bus_EP', Vs: r.Vs, ir: r.E, Pu: r.P }), r);
  }, 1e-8);
  batch('Réseau infini, Ps et Qs imposés', REF.bus_PQ, function (r) {
    var m = mach(r.m[0], r.m[1], r.m[2]);
    return errVsRef(M.solve(m, { mode: 'bus_PQ', Vs: r.Vs, Ps: r.P, Qs: r.Q }), r);
  }, 1e-8);
  batch('Réseau indépendant, Vs, Is et cos φ imposés (vitesse variable)', REF.load_VI, function (r) {
    var m = mach(r.m[0], r.m[1], r.m[2]);
    var op = M.solve(m, { mode: 'load_VI', Vs: r.Vs, k: r.k, Is: r.Is, phiL: r.phi });
    return Math.max(errVsRef(op, r), Math.abs(Math.abs(op.ir) - r.ir));
  }, 1e-8);
  batch('Réseau indépendant, Ir et impédance de charge imposés', REF.load_Z, function (r) {
    var m = mach(r.m[0], r.m[1], r.m[2]);
    return errVsRef(M.solve(m, { mode: 'load_Z', k: r.k, ir: r.ir, Z: r.Z, phiL: r.phi, load: 'charge' }), r);
  }, 1e-8);
  batch('Équation du mouvement (RK4, pas 1 ms) contre solve_ivp', REF.swing, function (r) {
    var m = mach(r.m[0], r.m[1], r.m[2]);
    var st = { delta: r.d0, w: 0 }, par = { Vs: r.Vs, E: r.E, Pm: r.P1, H: r.H, D: r.D };
    var n = Math.round(r.T / 1e-3);
    for (var i = 0; i < n; i++) st = M.swingStep(m, st, par, 1e-3);
    return Math.max(Math.abs(st.delta - r.dT), Math.abs(st.w - r.wT) * 100);
  }, 1e-6);

  // ======================================================================
  group('2. Valeurs chiffrées des diapositives');
  var g = M.cloneMachine('generique');
  (function () {
    // Cours 5, diapo 59 / cours 6, diapos 18 et 23 : courbes de Mordey (Vs = 1 pu, Xs = 1,04 pu)
    var c0 = M.mordey(g, 1, 0, 1.8, 91);
    near('Mordey Ps = 0 : Is(E = 0) = Vs/Xs', c0[0].Is, 1 / 1.04, 1e-6);
    var v = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1, Pu: 0 });
    near('Mordey Ps = 0 : Is = 0 à E = Vs (accrochage)', v.Is, 0, 1e-9);
    near('Mordey Ps = 0 : branche linéaire Is = (E − Vs)/Xs à E = 1,8', M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1.8, Pu: 0 }).Is, 0.8 / 1.04, 1e-9);
    var c5 = M.mordey(g, 1, 0.5, 1.8, 121), c10 = M.mordey(g, 1, 1.0, 1.8, 121);
    near('Mordey Ps = 0,5 : début de courbe E = Ps·Xs/Vs', c5[0].E, 0.52, 1e-5);
    near('Mordey Ps = 0,5 : Is au décrochage = √(E²+Vs²)/Xs', c5[0].Is, Math.sqrt(0.52 * 0.52 + 1) / 1.04, 1e-3);
    var min5 = c5.reduce(function (a, b) { return b.Is < a.Is ? b : a; });
    near('Mordey Ps = 0,5 : minimum Is = 0,5 pu', min5.Is, 0.5, 1e-3);
    near('Mordey Ps = 0,5 : minimum à E = √(1 + 0,52²)', min5.E, Math.sqrt(1 + 0.52 * 0.52), 2e-2);
    near('Mordey Ps = 1,0 : début de courbe E = 1,04', c10[0].E, 1.04, 1e-5);
    near('Mordey Ps = 1,0 : Is au décrochage ≈ 1,39', c10[0].Is, Math.sqrt(1.04 * 1.04 + 1) / 1.04, 1e-3);
    var u = M.mordeyUnity(g, 1, +1, 1.0, 11);
    near('Lieu cos φ = 1 : E = √(Vs² + (Xs·Is)²) à Ps = 1', u[10].E, Math.sqrt(1 + 1.04 * 1.04), 1e-9);
    near('Lieu cos φ = 1 : part de (E = Vs, Is = 0)', u[0].E, 1, 1e-12);
    var L = M.mordeyLimit(g, 1, +1, 1.04, 3);
    near('Limite δ = 90° : Is(E = 0) = 0,96 pu', L[0].Is, 1 / 1.04, 1e-9);
    near('Limite δ = 90° : Is(E = 1,04) = 1,387 pu', L[2].Is, Math.sqrt(1.04 * 1.04 + 1) / 1.04, 1e-6);
    near('Limite δ = 90° : angle', L[2].delta, Math.PI / 2, 1e-6);
  })();
  (function () {
    // Cours 7, diapos 45-46 : E = 1, Vs = 1, Xd = 1, Xq = 0,6
    var h = M.cloneMachine('hydro');
    var op = M.solve(h, { mode: 'bus_Ed', Vs: 1, ir: 1, delta: 1.131 });
    near('Pôles saillants : P(1,131 rad) = 1,162 pu', op.PE, 1.162, 5e-4);
    var p = M.curvePdelta(h, 1, 1, 1, 721).reduce(function (a, b) { return Math.abs(b.d - 1.131) < Math.abs(a.d - 1.131) ? b : a; });
    near('Pôles saillants : terme classique = 0,9048', Math.sin(1.131), 0.9048, 1e-4);
    near('Pôles saillants : terme de saillance = 0,2568', 0.5 * (1 / 0.6 - 1) * Math.sin(2.262), 0.2568, 2e-4);
    near('Pôles saillants : somme des deux termes = PE (éq. 28)', p.sync + p.rel, p.PE, 1e-12);
    near('Pôles saillants : maximum à δ = 64,8°', op.lim.dMax / DEG, 64.8, 1e-3);
    near('Pôles saillants : Pmax = 1,162 pu', op.lim.Pmax, 1.162, 5e-4);
    near('Pôles saillants : P(90°) = terme classique seul = 1', M.solve(h, { mode: 'bus_Ed', Vs: 1, ir: 1, delta: Math.PI / 2 }).PE, 1, 1e-12);
    [0.8, 1.0, 1.2].forEach(function (E) {
      var o = M.solve(h, { mode: 'bus_Ed', Vs: 1, ir: E, delta: 45 * DEG });
      near('Pôles saillants : P(45°) à E = ' + E + ' (éq. 28)', o.PE, E * Math.sin(45 * DEG) + 0.5 * (1 / 0.6 - 1), 1e-12);
    });
  })();
  (function () {
    // Cours 4, diapo 40 : 200 kVA, 277/480 V, 60 Hz, 6 pôles
    var e = M.cloneMachine('exemple200'), b = M.bases(e);
    near('Exemple 200 kVA : a) vitesse synchrone 1200 rpm', b.Nn, 1200, 1e-12);
    near('Exemple 200 kVA : b) Isn = 240,56 A', b.Ib, 240.56, 1e-4);
    near('Exemple 200 kVA : c) Rs = 0,2 Ω', e.Rs * b.Zb, 0.2, 1e-12);
    near('Exemple 200 kVA : c) Xs = 1,0198 Ω', e.Xd * b.Zb, 1.0198, 1e-4);
    near('Exemple 200 kVA : K = 62,35 V/A (L-N)', b.K, 540 / Math.sqrt(3) / 5, 1e-12);
    var vide = M.solve(e, { mode: 'load_Z', k: 1, ir: 5 / e.Ir0, load: 'vide' });
    near('Exemple 200 kVA : essai à vide, 540 V (L-L) à Ir = 5 A', vide.Vs * b.Vb * Math.sqrt(3), 540, 1e-12);
    var cc = M.solve(e, { mode: 'load_Z', k: 1, ir: 5 / e.Ir0, load: 'cc' });
    near('Exemple 200 kVA : essai en court-circuit, 300 A à Ir = 5 A', cc.Is * b.Ib, 300, 1e-9);
    near('Exemple 200 kVA : court-circuit, Vs = 0', cc.Vs, 0, 1e-12);
    var nom = M.solve(e, { mode: 'load_VI', Vs: 1, k: 1, Is: 1, phiL: 0 });
    near('Exemple 200 kVA : d) pertes cuivre au courant nominal = 34,7 kW', nom.Pcu * b.Sb, 3 * 0.2 * 240.5626 * 240.5626, 1e-6);
  })();
  (function () {
    // Cours 5, diapos 41-42 : accrochage, K = 100 V/A, réseau 12 kV (L-N), p = 2
    var m = mach(1, 1, 0, { Vn: 12e3 * Math.sqrt(3), Ir0: 120, p: 2 }), b = M.bases(m);
    near('Accrochage : K = 100 V/A', b.K, 100, 1e-12);
    near('Accrochage : a) E = 10 kV à Ir = 100 A', M.solve(m, { mode: 'load_Z', k: 1, ir: 100 / 120, load: 'vide' }).E * b.Vb, 10e3, 1e-12);
    near('Accrochage : b) Ir = 120 A pour E = 12 kV', M.solve(m, { mode: 'bus_PQ', Vs: 1, Ps: 0, Qs: 0 }).ir * m.Ir0, 120, 1e-12);
    near('Accrochage : c) 1800 rpm', b.Nn, 1800, 1e-12);
    var acc = M.solve(m, { mode: 'bus_EP', Vs: 1, ir: 1, Pu: 0 });
    check('Accrochage : Is = 0, δ = 0, Tem = 0', acc.Is < 1e-12 && Math.abs(acc.delta) < 1e-12 && Math.abs(acc.Tem) < 1e-12);
  })();

  // ======================================================================
  group('3. Équations du cours (vérifiées sur des points aléatoires)');
  var seed = 12345;
  function rnd(a, b) { seed = (seed * 1664525 + 1013904223) % 4294967296; return a + (b - a) * seed / 4294967296; }
  (function () {
    var e23 = 0, e31 = 0, e41 = 0, e37 = 0, e38 = 0, e5 = 0, e28 = 0, kvl = 0, eqd = 0, i;
    for (i = 0; i < 300; i++) {
      var Xs = rnd(0.5, 1.8), Rs = rnd(0, 0.2), Vs = rnd(0.7, 1.1);
      var Is = rnd(0, 1.3), phi = rnd(-1.5, 1.5);
      // éq. (23) cours 4 : E² = (Vs + Rs·Is·cos φ + Xs·Is·sin φ)² + (Xs·Is·cos φ − Rs·Is·sin φ)²
      var op = M.solve(mach(Xs, Xs, Rs), { mode: 'load_VI', Vs: Vs, k: 1, Is: Is, phiL: phi });
      var E2 = Math.pow(Vs + Rs * Is * Math.cos(phi) + Xs * Is * Math.sin(phi), 2) + Math.pow(Xs * Is * Math.cos(phi) - Rs * Is * Math.sin(phi), 2);
      e23 = Math.max(e23, Math.abs(op.E * op.E - E2));

      var m0 = mach(Xs, Xs, 0), E = rnd(0.3, 2.2), d = rnd(-Math.PI, Math.PI);
      var o = M.solve(m0, { mode: 'bus_Ed', Vs: Vs, ir: E, delta: d });
      var vg = M.view(o, 'gen'), vr = M.view(o, 'rec');
      e31 = Math.max(e31, Math.abs(o.Is * Math.cos(vg.phi) - E * Math.sin(d) / Xs));           // éq. (31)
      e41 = Math.max(e41, Math.abs(o.Ps - Vs * E * Math.sin(d) / Xs), Math.abs(o.Tem - o.Ps));  // éq. (32), (41)
      e37 = Math.max(e37, Math.abs(vg.Pem - E * o.Is * Math.cos(vg.psi)), Math.abs(vg.Pem - Vs * o.Is * Math.cos(vg.phi)));
      e38 = Math.max(e38, Math.abs(vg.Qem - E * o.Is * Math.sin(vg.psi)), Math.abs(vg.Qem - (vg.Q + Xs * o.Is * o.Is)));
      // cours 6, éq. (4), (5), (8) en convention récepteur
      e5 = Math.max(e5, Math.abs(vr.Qem - E * o.Is * Math.sin(vr.psi)), Math.abs(vr.Qem - (vr.Q - Xs * o.Is * o.Is)),
        Math.abs(vr.Pem - E * o.Is * Math.cos(vr.psi)), Math.abs(vr.P - Vs * E * Math.sin(vr.delta) / Xs));

      // pôles saillants : éq. (28) cours 7 et équation de phaseurs (6)
      var Xd = rnd(0.6, 1.6), Xq = Xd * rnd(0.4, 1.3);
      var os = M.solve(mach(Xd, Xq, 0), { mode: 'bus_Ed', Vs: Vs, ir: E, delta: d });
      e28 = Math.max(e28, Math.abs(os.Ps - (Vs * E * Math.sin(d) / Xd + 0.5 * Vs * Vs * (1 / Xq - 1 / Xd) * Math.sin(2 * d))));
      var mr = mach(Xd, Xq, Rs), or = M.solve(mr, { mode: 'bus_Ed', Vs: Vs, ir: E, delta: d });
      var uq = cplx(1, d), ud = cplx(1, d + Math.PI / 2);
      // Vs + Rs·I + jXd·Isd + jXq·Isq, avec Isd = Id·ud et Isq = Iq·uq
      var re = Vs + Rs * or.I.re + (-Xd * or.Id * ud.im) + (-Xq * or.Iq * uq.im);
      var im = Rs * or.I.im + (Xd * or.Id * ud.re) + (Xq * or.Iq * uq.re);
      kvl = Math.max(kvl, Math.hypot(re - E * uq.re, im - E * uq.im));
      eqd = Math.max(eqd, Math.abs(or.QE - (or.Qs + Xd * or.Id * or.Id + Xq * or.Iq * or.Iq)),
        Math.abs(or.PE - (E * or.Iq + (Xd - Xq) * or.Id * or.Iq)));
    }
    check('Cours 4 éq. (23) : E(Is, cos φ, Vs, Rs, Xs)', e23 < 1e-10, e23.toExponential(2));
    check('Cours 5 éq. (31) : Is·cos φ = E·sin δ / Xs', e31 < 1e-10, e31.toExponential(2));
    check('Cours 5 éq. (32), (34), (41) : Pem = Ps = Vs·E·sin δ / Xs ; Tem(pu) = Pem(pu)', e41 < 1e-10, e41.toExponential(2));
    check('Cours 5 éq. (37) : Pem = E·Is·cos ψ = Vs·Is·cos φ', e37 < 1e-10, e37.toExponential(2));
    check('Cours 5 éq. (38) : Qem = E·Is·sin ψ = Qs + Xs·Is² (conv. générateur)', e38 < 1e-10, e38.toExponential(2));
    check('Cours 6 éq. (4), (5), (8) : Qem = Qs − Xs·Is², Ps = Vs·E·sin δ / Xs (conv. récepteur)', e5 < 1e-10, e5.toExponential(2));
    check('Cours 7 éq. (28) : P(δ) avec terme de saillance', e28 < 1e-10, e28.toExponential(2));
    check('Cours 7 éq. (6) : E = Vs + Rs·Is + jXd·Isd + jXq·Isq', kvl < 1e-10, kvl.toExponential(2));
    check('Bilans : Qem = Qs + Xd·Isd² + Xq·Isq² ; PE = E·Isq + (Xd − Xq)·Isd·Isq', eqd < 1e-10, eqd.toExponential(2));
  })();

  // ======================================================================
  group('4. Conventions de signe (cours 3)');
  (function () {
    function pq(P, Q) { return M.solve(g, { mode: 'bus_PQ', Vs: 1, Ps: P, Qs: Q }); }
    var o = pq(0.6, 0.45), vg = M.view(o, 'gen'), vr = M.view(o, 'rec');
    check('Fournit P et Q, conv. générateur : quadrant I, cos φ > 0, sin φ > 0, δ > 0',
      vg.quad === 'I' && Math.cos(vg.phi) > 0 && Math.sin(vg.phi) > 0 && vg.delta > 0);
    check('Fournit P et Q, conv. récepteur : quadrant III, cos φ < 0, sin φ < 0, δ < 0',
      vr.quad === 'III' && Math.cos(vr.phi) < 0 && Math.sin(vr.phi) < 0 && vr.delta < 0);
    check('E et Vs identiques dans les deux conventions, Is inversé',
      Math.abs(vg.I.re + vr.I.re) < 1e-15 && Math.abs(vg.I.im + vr.I.im) < 1e-15 && vg.E === vr.E);
    near('φ = ∠Vs − ∠Is (générateur)', vg.phi, -Math.atan2(o.I.im, o.I.re), 1e-12);
    near('ψ = ∠E − ∠Is = δ + φ (générateur)', vg.psi, vg.delta + vg.phi, 1e-12);
    near('ψ = φ − δ (récepteur, δ = ∠Vs − ∠E)', M.wrap(vr.psi - (vr.phi - vr.delta)), 0, 1e-12);
    near('Ps = Vs·Is·cos φ dans la convention récepteur', vr.P, o.Vs * o.Is * Math.cos(vr.phi), 1e-12);
    near('Qs = Vs·Is·sin φ dans la convention récepteur', vr.Q, o.Vs * o.Is * Math.sin(vr.phi), 1e-12);
    check('Rôle : génératrice surexcitée', o.role === 'gen' && o.excit === 'sur');
    var q2 = pq(-0.6, 0.45), q3 = pq(-0.6, -0.35), q4 = pq(0.6, -0.35);
    check('Exercice, quadrant II : moteur surexcité, E en retard sur Vs et E > Vs',
      M.view(q2, 'gen').quad === 'II' && q2.role === 'mot' && q2.excit === 'sur' && q2.delta < 0 && q2.E > 1);
    check('Exercice, quadrant III : moteur sous-excité, E en retard sur Vs et E < Vs',
      M.view(q3, 'gen').quad === 'III' && q3.role === 'mot' && q3.excit === 'sous' && q3.delta < 0 && q3.E < 1);
    check('Exercice, quadrant IV : génératrice sous-excitée, E en avance sur Vs et E < Vs',
      M.view(q4, 'gen').quad === 'IV' && q4.role === 'gen' && q4.excit === 'sous' && q4.delta > 0 && q4.E < 1);
    check('δ > 0 pour un moteur étudié en convention récepteur', M.view(q2, 'rec').delta > 0 && M.view(q3, 'rec').delta > 0);
  })();

  // ======================================================================
  group('5. Réaction d\'induit et forces magnétomotrices (cours 4, 5 et 6)');
  (function () {
    var Xs = 1.04, Is = 0.6;
    // ψ = 0 : courant en phase avec E
    var o = M.solve(g, { mode: 'bus_Ed', Vs: 1, ir: Math.sqrt(1 - Xs * Is * Xs * Is), delta: Math.asin(Xs * Is) });
    var v = M.view(o, 'gen');
    check('ψ = 0 : réaction transversale, charge légèrement capacitive (φ < 0), Qem = 0',
      Math.abs(v.psi) < 1e-9 && v.armature === 'trans' && v.phi < 0 && Math.abs(v.Qem) < 1e-9);
    near('ψ = 0 : Fs ⟂ Fr', v.Fs.re * v.Fr.re + v.Fs.im * v.Fr.im, 0, 1e-9);
    var d = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1.6, Pu: 0 }), vd = M.view(d, 'gen');
    check('ψ = +π/2 : longitudinale démagnétisante, charge inductive, couple nul',
      Math.abs(vd.psi - Math.PI / 2) < 1e-9 && vd.armature === 'demag' && vd.Q > 0 && Math.abs(d.Tem) < 1e-12);
    var a = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 0.5, Pu: 0 }), va = M.view(a, 'gen');
    check('ψ = −π/2 : longitudinale magnétisante, charge capacitive, couple nul',
      Math.abs(va.psi + Math.PI / 2) < 1e-9 && va.armature === 'mag' && va.Q < 0 && Math.abs(a.Tem) < 1e-12);

    var worst = 0, i;
    for (i = 0; i < 200; i++) {
      var Xq = rnd(0.5, 1.5), m = mach(Xq, Xq, 0);
      var op = M.solve(m, { mode: 'bus_Ed', Vs: rnd(0.8, 1.1), ir: rnd(0.4, 2), delta: rnd(-1.5, 1.5) });
      ['gen', 'rec'].forEach(function (conv) {
        var w = M.view(op, conv), s = w.sg;
        // Fr en avance (générateur) ou en retard (récepteur) de 90° sur E
        worst = Math.max(worst, Math.abs(M.wrap(M.ang(w.Fr) - op.delta - s * Math.PI / 2)));
        // F en avance/retard de 90° sur E' (= Vs sans pertes) ; δ = ∠Fr − ∠F (gén.) ou ∠F − ∠Fr (réc.)
        worst = Math.max(worst, Math.abs(M.wrap(M.ang(w.F) - s * Math.PI / 2)));
        worst = Math.max(worst, Math.abs(M.wrap(s * (M.ang(w.Fr) - M.ang(w.F)) - w.delta)));
        // Fs en phase avec Is ; |F| = Vs ; Fr et Fs déphasées de π/2 + ψ (générateur)
        worst = Math.max(worst, Math.abs(M.wrap(M.ang(w.Fs) - w.angI)), Math.abs(M.hyp(w.F) - op.Vs));
        if (conv === 'gen') worst = Math.max(worst, Math.abs(M.wrap(M.ang(w.Fr) - M.ang(w.Fs) - Math.PI / 2 - w.psi)));
        // composantes : Fsd ∝ Is·sin ψ (démagnétisant si ψ > 0 en générateur), Fsq ∝ Is·cos ψ
        worst = Math.max(worst, Math.abs(Math.abs(w.Fsd) - m.Xd * Math.abs(w.Isd)), Math.abs(Math.abs(w.Fsq) - m.Xd * Math.abs(w.Isq)));
      });
      // même verdict dans les deux conventions ; démagnétisante si et seulement si ψ > 0 (générateur)
      var wg = M.view(op, 'gen'), wr = M.view(op, 'rec');
      if (wg.armature !== wr.armature) worst = 1;
      if (wg.armature !== 'trans' && (wg.armature === 'demag') !== (Math.sin(wg.psi) > 0)) worst = 1;
      if (wr.armature !== 'trans' && (wr.armature === 'demag') !== (Math.sin(wr.psi) < 0)) worst = 1;
    }
    check('Fr ⟂ E, F ⟂ E\', F = Fr + Fs, δ entre Fr et F, Fs ∥ Is, décomposition d-q (200 points × 2 conventions)', worst < 1e-9, worst.toExponential(2));
    var gen = M.solve(g, { mode: 'bus_PQ', Vs: 1, Ps: 0.7, Qs: 0.3 }), mot = M.solve(g, { mode: 'bus_PQ', Vs: 1, Ps: -0.7, Qs: 0.3 });
    var vG = M.view(gen, 'gen'), vM = M.view(mot, 'rec');
    check('Génératrice : Fr en avance sur F et sur Fs (le rotor « tire » le champ)',
      M.wrap(M.ang(vG.Fr) - M.ang(vG.F)) > 0 && M.wrap(M.ang(vG.Fr) - M.ang(vG.Fs)) > 0);
    check('Moteur : Fr en retard sur F et sur Fs (le champ « tire » le rotor)',
      M.wrap(M.ang(vM.Fr) - M.ang(vM.F)) < 0 && M.wrap(M.ang(vM.Fr) - M.ang(vM.Fs)) < 0);
    check('La physique ne dépend pas de la convention : avance de Fr sur F identique',
      Math.abs(M.wrap(M.ang(vG.Fr) - M.ang(vG.F)) - M.wrap(M.ang(M.view(gen, 'rec').Fr) - M.ang(M.view(gen, 'rec').F))) < 1e-12);
  })();

  // ======================================================================
  group('6. Moteur et compensateur synchrone en convention récepteur (cours 6)');
  (function () {
    function mot(ir, P) { var o = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: ir, Pu: -P }); return { o: o, v: M.view(o, 'rec') }; }
    var Eu = Math.sqrt(1 + Math.pow(0.55 * 1.04, 2));
    var sur = mot(1.67, 0.55), uni = mot(Eu, 0.55), sous = mot(0.8, 0.55);
    check('Moteur surexcité : fournit Q (Qs < 0), Is en avance sur Vs (φ < 0), charge capacitive', sur.v.Q < 0 && sur.v.phi < 0 && sur.v.P > 0 && sur.o.excit === 'sur');
    check('Moteur à cos φ = 1 : φ = 0, Qs = 0', Math.abs(uni.v.phi) < 1e-9 && Math.abs(uni.v.Q) < 1e-9);
    check('Moteur sous-excité : absorbe Q (Qs > 0), φ > 0, charge inductive', sous.v.Q > 0 && sous.v.phi > 0 && sous.o.excit === 'sous');
    check('Moteur : δ > 0 en convention récepteur dans les trois cas', sur.v.delta > 0 && uni.v.delta > 0 && sous.v.delta > 0);
    near('Moteur : Ps constant quand Ir varie (Xs·Is·cos φ constant)', sur.v.P, sous.v.P, 1e-9);
    near('Moteur : E·sin δ constant quand Ir varie', sur.o.E * Math.sin(sur.v.delta), sous.o.E * Math.sin(sous.v.delta), 1e-9);
    check('Moteur sous-excité (E = 0,8) : ψ < 0, le rotor fournit encore une partie de Q à Xs', sous.v.psi < 0 && sous.v.Qem < 0);
    var cap = mot(1.5, 0), ind = mot(0.6, 0);
    check('Compensateur capacitif (E > Vs) : φ = ψ = −π/2, δ = 0', Math.abs(cap.v.phi + Math.PI / 2) < 1e-9 && Math.abs(cap.v.psi + Math.PI / 2) < 1e-9 && Math.abs(cap.v.delta) < 1e-12);
    check('Compensateur inductif (E < Vs) : φ = ψ = +π/2, δ = 0', Math.abs(ind.v.phi - Math.PI / 2) < 1e-9 && Math.abs(ind.v.psi - Math.PI / 2) < 1e-9 && Math.abs(ind.v.delta) < 1e-12);
    check('Compensateur : rôle reconnu', cap.o.role === 'comp' && ind.o.role === 'comp');
    near('Compensateur : Is = |E − Vs| / Xs', cap.o.Is, 0.5 / 1.04, 1e-9);
    // bilan de puissance moteur avec pertes : Ps = Pem + Pcu + Pfe ; Pem = Pu + Pmec
    var ml = mach(1.04, 1.04, 0.03, { Pmec: 0.02, Pfe: 0.015 });
    var o = M.solve(ml, { mode: 'bus_EP', Vs: 1, ir: 1.5, Pu: -0.8 }), v = M.view(o, 'rec');
    near('Bilan moteur éq. (9) : Ps = Pem + Pcu + Pfe', v.P, v.Pem + o.Pcu + o.Pfe, 1e-9);
    near('Bilan moteur éq. (10) : Pem = Pu + Pmec', v.Pem, v.Pu + o.Pmec, 1e-9);
    near('Bilan moteur éq. (18) : η = Pu / Ps', o.eta, v.Pu / v.P, 1e-9);
    check('Bilan moteur : 0 < η < 1 et Tem = Tu + Tmec', o.eta > 0 && o.eta < 1 && Math.abs(v.Tem - (v.Tu + o.Pmec)) < 1e-9);
    // bilan génératrice : Pu = Pem + Pmec + Pfe ; Pem = Ps + Pcu
    var og = M.solve(ml, { mode: 'bus_EP', Vs: 1, ir: 1.5, Pu: 0.8 });
    near('Bilan génératrice éq. (15) : Pu = Pem + Pmec + Pfe', og.Pu, og.Pem + og.Pmec + og.Pfe, 1e-9);
    near('Bilan génératrice éq. (16) : Pem = Ps + Pcu', og.Pem, og.Ps + og.Pcu, 1e-9);
    near('Bilan génératrice éq. (25) : η = Ps / Pu', og.eta, og.Ps / og.Pu, 1e-9);
    near('Bilan génératrice éq. (23) : Pem = E·Is·cos ψ', og.Pem, og.E * og.Is * Math.cos(M.view(og, 'gen').psi), 1e-9);
  })();

  // ======================================================================
  group('7. Stabilité et décrochage (cours 5 et 6)');
  (function () {
    var a1 = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1.2, Pu: 0.7 });
    near('Point A1 : δ1 = asin(P·Xs / (Vs·E))', a1.delta, Math.asin(0.7 * 1.04 / 1.2), 1e-9);
    check('Point A1 : stable (dP/dδ > 0)', a1.stable && !a1.flags.unstable);
    near('Point A2 = π − δ1 retourné comme équilibre instable', a1.delta2, Math.PI - a1.delta, 1e-8);
    var a2 = M.solve(g, { mode: 'bus_Ed', Vs: 1, ir: 1.2, delta: Math.PI - a1.delta });
    check('Point A2 : même couple que A1 mais instable', Math.abs(a2.PE - a1.PE) < 1e-9 && !a2.stable && a2.flags.unstable);
    near('Limite : Pmax = Vs·E / Xs à δ = π/2', a1.lim.Pmax, 1.2 / 1.04, 1e-9);
    near('Limite : δ = π/2', a1.lim.dMax, Math.PI / 2, 1e-6);
    var lim = M.solve(g, { mode: 'bus_Ed', Vs: 1, ir: 1.2, delta: Math.PI / 2 });
    check('δ = π/2 imposé : signalé comme limite de stabilité (ni stable, ni instable)', lim.flags.atLimit === true && !lim.stable && !lim.flags.unstable);
    near('δ = π/2 : puissance transmise maximale Vs·E/Xs', lim.Ps, 1.2 / 1.04, 1e-12);
    var hyLim = M.solve(M.cloneMachine('hydro'), { mode: 'bus_Ed', Vs: 1, ir: 1, delta: 90 * DEG });
    check('Pôles saillants : δ = 90° est déjà dans la zone instable (limite à 64,8°)', hyLim.flags.unstable === true && !hyLim.flags.atLimit);
    var lost = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1.2, Pu: 1.2 });
    check('Couple supérieur à Tem max : décrochage signalé', lost.flags.lost === true);
    var lostM = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1.2, Pu: -1.2 });
    check('Moteur : couple résistant supérieur à Tem max : décrochage signalé', lostM.flags.lost === true);
    check('Juste sous la limite : pas de décrochage', !M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1.2, Pu: 1.15 }).flags.lost);
    // Dynamique : petit écart autour de A1 -> retour ; au-delà de A2 -> décrochage
    function run(d0, T) {
      var st = { delta: d0, w: 0 }, par = { Vs: 1, E: 1.2, Pm: 0.7, H: 3, D: 15 }, i;
      for (i = 0; i < T / 1e-3; i++) { st = M.swingStep(g, st, par, 1e-3); if (Math.abs(st.delta) > Math.PI) return st; }
      return st;
    }
    near('Dynamique : retour à A1 après une perturbation de +20°', run(a1.delta + 20 * DEG, 20).delta, a1.delta, 1e-4);
    check('Dynamique : au-delà de A2, la machine décroche', Math.abs(run(Math.PI - a1.delta + 2 * DEG, 20).delta) > Math.PI);
    near('Dynamique : juste avant A2, la machine revient à A1', run(Math.PI - a1.delta - 2 * DEG, 30).delta, a1.delta, 1e-4);
    // échelon de couple moteur Tr1 -> Tr2 : dépassement transitoire de δ2 puis convergence
    var st = { delta: -Math.asin(0.3 * 1.04 / 1.2), w: 0 }, par = { Vs: 1, E: 1.2, Pm: -0.9, H: 3, D: 8 }, peak = 0, i;
    for (i = 0; i < 20000; i++) { st = M.swingStep(g, st, par, 1e-3); peak = Math.min(peak, st.delta); }
    var d2 = -Math.asin(0.9 * 1.04 / 1.2);
    check('Échelon de couple moteur : dépassement transitoire de δ2 puis convergence vers δ2', peak < d2 - 0.02 && Math.abs(st.delta - d2) < 1e-4);
    // aimants insérés (Xq > Xd) : δ = 0 peut devenir instable à faible excitation
    var ipm = mach(0.6, 1.2, 0), o = M.solve(ipm, { mode: 'bus_EP', Vs: 1, ir: 0.3, Pu: 0 });
    check('Xq > Xd et faible excitation : l\'équilibre stable à couple nul n\'est plus à δ = 0', o.stable && Math.abs(o.delta) > 0.5 && Math.abs(o.PE) < 1e-9);
    check('Xq > Xd : δ = 0 est alors un équilibre instable', !M.solve(ipm, { mode: 'bus_Ed', Vs: 1, ir: 0.3, delta: 0 }).stable);
  })();

  // ======================================================================
  group('8. Comportements attendus quand on déplace un curseur');
  (function () {
    var i, okQ = true, okI = true, okD = true, okQ2 = true, prev = null, minIs = 9, minE = 0;
    for (i = 0; i <= 60; i++) {
      var ir = 0.7 + 1.3 * i / 60;
      var o = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: ir, Pu: 0.55 });
      if (prev) {
        if (!(o.Qs > prev.Qs)) okQ = false;                 // plus d'excitation -> plus de Q fourni
        if (!(Math.abs(o.delta) < Math.abs(prev.delta))) okD = false;   // et angle interne plus petit
        if (Math.abs(o.Ps - prev.Ps) > 1e-9) okI = false;   // P inchangé
      }
      if (o.Is < minIs) { minIs = o.Is; minE = ir; }
      prev = o;
    }
    check('P constant, Ir croissant : Qs croît de façon monotone (sous-excité → surexcité)', okQ);
    check('P constant, Ir croissant : |δ| décroît, Ps inchangé', okD && okI);
    near('P constant : Is minimal à cos φ = 1 (fond de la courbe en V)', minIs, 0.55, 1e-3);
    prev = null;
    for (i = 0; i <= 50; i++) {
      var P = 1.1 * i / 50, o2 = M.solve(g, { mode: 'bus_EP', Vs: 1, ir: 1.2, Pu: P });
      if (prev && !(o2.delta > prev.delta && o2.Qs < prev.Qs)) okQ2 = false;
      prev = o2;
    }
    check('Ir constant, couple croissant : δ croît et Qs décroît (cours 5, diapo 52)', okQ2);
    var E0 = M.solve(g, { mode: 'bus_Ed', Vs: 1, ir: 1.3, delta: 0.5 });
    near('Ir constant : l\'extrémité de E reste sur un cercle de rayon E', E0.E, 1.3, 1e-12);
    // réseau indépendant
    var vide1 = M.solve(g, { mode: 'load_Z', k: 1, ir: 1, load: 'vide' }), vide2 = M.solve(g, { mode: 'load_Z', k: 0.5, ir: 1, load: 'vide' });
    near('À vide : E proportionnelle à la vitesse (Ir constant)', vide2.Vs / vide1.Vs, 0.5, 1e-12);
    near('À vide : E proportionnelle à Ir (vitesse constante)', M.solve(g, { mode: 'load_Z', k: 1, ir: 1.4, load: 'vide' }).Vs, 1.4, 1e-12);
    near('Court-circuit sans pertes : Iscc indépendant de la vitesse', M.solve(g, { mode: 'load_Z', k: 0.5, ir: 1, load: 'cc' }).Is, M.solve(g, { mode: 'load_Z', k: 1, ir: 1, load: 'cc' }).Is, 1e-12);
    var hy = M.cloneMachine('hydro'), cc = M.solve(hy, { mode: 'load_Z', k: 1, ir: 1, load: 'cc' });
    check('Court-circuit, pôles saillants : Is = Isd (Isq = 0) et Is = E / Xd (cours 7, éq. 26)', Math.abs(cc.Iq) < 1e-12 && Math.abs(cc.Is - 1 / hy.Xd) < 1e-12);
    var rl = [], rc = [];
    [8, 4, 2, 1, 0.5].forEach(function (Z) {
      rl.push(M.solve(g, { mode: 'load_Z', k: 1, ir: 1, Z: Z, phiL: Math.acos(0.8), load: 'charge' }).Vs);
      rc.push(M.solve(g, { mode: 'load_Z', k: 1, ir: 1, Z: Z, phiL: -Math.acos(0.8), load: 'charge' }).Vs);
    });
    check('Ir fixe, charge inductive croissante : Vs chute', rl.every(function (x, j) { return x < 1 && (j === 0 || x < rl[j - 1]); }));
    check('Ir fixe, charge capacitive : Vs monte au-dessus de E (réaction magnétisante)', rc[0] > 1 && rc[1] > rc[0]);
    var r1 = M.regulation(g, 1, Math.acos(0.8), 1, 1.2, 13), r2 = M.regulation(g, 1, 0, 1, 1.2, 13), r3 = M.regulation(g, 1, -Math.acos(0.8), 1, 1.2, 13);
    check('Régulation : à Is donné, Ir(cos φ RET.) > Ir(cos φ = 1) > Ir(cos φ AV.) (cours 4, diapo 46)',
      r1.every(function (p, j) { return j === 0 || (p.ir > r2[j].ir && r2[j].ir > r3[j].ir); }));
    near('Régulation : les trois courbes partent de Ir = Vs/K à Is = 0', r1[0].ir, 1, 1e-12);
    check('Régulation : cos φ AV., Ir commence par diminuer quand Is augmente', r3[2].ir < r3[0].ir);
  })();

  // ======================================================================
  group('9. Cohérence entre modes de pilotage');
  (function () {
    var worst = 0, i;
    for (i = 0; i < 200; i++) {
      var Xd = rnd(0.6, 1.6), Xq = i % 2 ? Xd : Xd * rnd(0.5, 0.95);
      var m = mach(Xd, Xq, i % 3 ? 0 : rnd(0, 0.1), { Pmec: rnd(0, 0.02), Pfe: rnd(0, 0.02) });
      var a = M.solve(m, { mode: 'bus_EP', Vs: rnd(0.8, 1.1), ir: rnd(0.9, 2), Pu: rnd(-0.6, 0.6) });
      if (a.flags.lost) continue;
      var b = M.solve(m, { mode: 'bus_PQ', Vs: a.Vs, Ps: a.Ps, Qs: a.Qs });
      var c = M.solve(m, { mode: 'bus_Ed', Vs: a.Vs, ir: a.ir, delta: a.delta });
      worst = Math.max(worst, Math.abs(b.E - a.E), Math.abs(M.wrap(b.delta - a.delta)), dist(c.I, a.I), Math.abs(b.Pu - a.Pu), Math.abs(c.Pu - a.Pu));
      if (a.Is > 1e-3 && a.Ps > 0) {
        var phi = M.view(a, 'gen').phi;
        var d = M.solve(m, { mode: 'load_VI', Vs: a.Vs, k: 1, Is: a.Is, phiL: phi });
        var e = M.solve(m, { mode: 'load_Z', k: 1, ir: a.ir, Z: a.Vs / a.Is, phiL: phi, load: 'charge' });
        worst = Math.max(worst, Math.abs(d.E - a.E), Math.abs(M.wrap(d.delta - a.delta)), Math.abs(e.Vs - a.Vs), dist(e.I, a.I));
      }
    }
    check('Un même point obtenu par les 5 modes donne les mêmes grandeurs (200 points)', worst < 1e-8, worst.toExponential(2));
  })();

  // ---------------------------------------------------------------- sortie
  var out = document.getElementById('out');
  lines.forEach(function (l) {
    var s = document.createElement('span');
    s.className = l.cls; s.textContent = l.t + '\n';
    out.appendChild(s);
  });
  var sum = document.getElementById('summary');
  sum.textContent = (nFail ? 'ÉCHEC' : 'RÉUSSI') + ' : ' + nPass + ' vérifications réussies, ' + nFail + ' en échec';
  sum.className = nFail ? 'ko' : 'ok';
  document.body.setAttribute('data-status', nFail ? 'FAIL' : 'PASS');
  document.title = (nFail ? 'FAIL ' : 'PASS ') + nPass + '/' + (nPass + nFail);
})();
