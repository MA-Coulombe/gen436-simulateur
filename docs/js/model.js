/*
 * GEN436 – Simulateur de machine synchrone
 * model.js : calculs en régime permanent (modèle de Behn-Eschenburg et modèle à deux
 * réactances Xd/Xq) et équation du mouvement de l'arbre. Aucun accès au DOM ici.
 *
 * Conventions internes
 *  - Grandeurs en valeurs réduites (pu), par phase (ligne-neutre). Bases : Sn, Vn(L-N), fn.
 *    En pu : Ps = Vs·Is·cos(φ) (le facteur 3 est absorbé par la base triphasée).
 *  - Référence de phase : Vs = Vs∠0°.
 *  - Le point de fonctionnement est calculé UNE SEULE FOIS en convention générateur
 *    (courant sortant de la machine). La convention récepteur s'obtient en inversant le
 *    courant : voir view().
 *  - Axe q en phase avec E. Axe d = axe des pôles (Fr), en avance de 90° sur q en
 *    convention générateur. Iq et Id sont les composantes SIGNÉES du courant (convention
 *    générateur) sur +q et +d ; le cours utilise Isd = Is·sin(ψ) = −Id et Isq = Is·cos(ψ) = Iq.
 *  - k = fs/fn (vitesse relative). E = (Ir/Iro)·k et X = X(fn)·k.
 *
 * Équations (convention générateur) :
 *    E = Vs + Rs·Is + jXd·Isd + jXq·Isq        (pôles lisses : Xd = Xq = Xs)
 *    axe q :  Vs·cos(δ) = E − Rs·Iq + Xd·Id
 *    axe d : −Vs·sin(δ) =   − Rs·Id − Xq·Iq
 */
(function (global) {
  'use strict';

  var PI = Math.PI, TWO_PI = 2 * PI, DEG = PI / 180;
  var EPS = 1e-9;

  function wrap(a) {
    a = a % TWO_PI;
    if (a > PI) a -= TWO_PI; else if (a <= -PI) a += TWO_PI;
    return a;
  }
  function hyp(z) { return Math.sqrt(z.re * z.re + z.im * z.im); }
  function ang(z) { return Math.atan2(z.im, z.re); }
  function polar(r, a) { return { re: r * Math.cos(a), im: r * Math.sin(a) }; }

  // ----------------------------------------------------------------- machines
  var MACHINES = {
    generique: {
      id: 'generique', name: 'Machine générique à pôles lisses (Xs = 1,04 pu)',
      Sn: 200e3, Vn: 480, fn: 60, p: 3, Xd: 1.04, Xq: 1.04, Rs: 0, Ir0: 5,
      Pmec: 0, Pfe: 0, IrMax: 2.0
    },
    exemple200: {
      // Cours 4, diapositive 40 : 200 kVA, 277/480 V, 60 Hz, 6 pôles.
      // Essai à vide 540 V (L-L) à 5 A ; court-circuit 300 A à 5 A ; cc : 10 V / 25 A.
      id: 'exemple200', name: 'Exemple du cours 4 (200 kVA, 480 V, 6 pôles)',
      Sn: 200e3, Vn: 480, fn: 60, p: 3, Xd: 0, Xq: 0, Rs: 0, Ir0: 0,
      Pmec: 0, Pfe: 0, IrMax: 2.0
    },
    hydro: {
      id: 'hydro', name: 'Alternateur hydraulique à pôles saillants (Xd = 1,0 ; Xq = 0,6 pu)',
      Sn: 200e3, Vn: 480, fn: 60, p: 12, Xd: 1.0, Xq: 0.6, Rs: 0, Ir0: 5,
      Pmec: 0, Pfe: 0, IrMax: 2.0
    },
    turbo: {
      id: 'turbo', name: 'Turboalternateur (Xd = 1,15 ; Xq = 1,00 pu)',
      Sn: 200e3, Vn: 480, fn: 60, p: 1, Xd: 1.15, Xq: 1.0, Rs: 0, Ir0: 5,
      Pmec: 0, Pfe: 0, IrMax: 2.0
    }
  };
  (function () {
    // Paramètres de l'exemple déduits des essais, comme dans le cours.
    var m = MACHINES.exemple200;
    var Vb = m.Vn / Math.sqrt(3), Ib = m.Sn / (Math.sqrt(3) * m.Vn), Zb = Vb / Ib;
    var Ecc = 540 / Math.sqrt(3);                  // tension à vide à Ir = 5 A (L-N)
    var Rs = 10 / (2 * 25);                        // éq. (21) : Rs = Vdc / (2 Idc)
    var Xs = Math.sqrt(Math.pow(Ecc / 300, 2) - Rs * Rs);   // éq. (20)
    var K = Ecc / 5;                               // éq. (17) : K = Esn / Iro
    m.Rs = Rs / Zb; m.Xd = m.Xq = Xs / Zb; m.Ir0 = Vb / K;
  })();

  function cloneMachine(id) {
    var src = MACHINES[id] || MACHINES.generique, m = {};
    for (var key in src) m[key] = src[key];
    return m;
  }

  // Valeurs de base (SI) associées à une machine.
  function bases(m) {
    var Vb = m.Vn / Math.sqrt(3);
    var Ib = m.Sn / (Math.sqrt(3) * m.Vn);
    var wn = TWO_PI * m.fn;
    return {
      Sb: m.Sn, Vb: Vb, Ib: Ib, Zb: Vb / Ib,
      wn: wn, Wn: wn / m.p, Tb: m.Sn / (wn / m.p),
      Nn: 60 * m.fn / m.p,
      K: Vb / m.Ir0                                // K_Ωsn (V/A, ligne-neutre)
    };
  }

  function isSalient(m) { return Math.abs(m.Xd - m.Xq) > 1e-6; }

  // ------------------------------------------------------- équations de base
  // Courant (convention générateur) pour E, δ et Vs donnés.
  function currents(m, Vs, E, d, k) {
    var Xd = m.Xd * k, Xq = m.Xq * k, Rs = m.Rs;
    var det = Rs * Rs + Xd * Xq;
    var c = Math.cos(d), s = Math.sin(d);
    var a = E - Vs * c, b = Vs * s;
    var Iq = (Rs * a + Xd * b) / det;
    var Id = (Rs * b - Xq * a) / det;
    return { Iq: Iq, Id: Id, I: { re: Iq * c - Id * s, im: Iq * s + Id * c } };
  }

  // Puissance convertie dans l'entrefer (PE = Ps + Pcu) et puissance aux bornes.
  function powers(m, Vs, E, d, k) {
    var I = currents(m, Vs, E, d, k).I;
    var Ps = Vs * I.re;
    return { Ps: Ps, PE: Ps + m.Rs * (I.re * I.re + I.im * I.im) };
  }

  // E et δ à partir des conditions aux bornes (Vs∠0 et courant générateur I).
  function fromTerminal(m, Vs, I, k) {
    var Xd = m.Xd * k, Xq = m.Xq * k, Rs = m.Rs;
    // EQ = Vs + (Rs + jXq)·I est porté par l'axe q.
    var EQ = { re: Vs + Rs * I.re - Xq * I.im, im: Rs * I.im + Xq * I.re };
    var mag = hyp(EQ);
    var d = mag > 1e-12 ? ang(EQ) : 0;
    var c = Math.cos(d), s = Math.sin(d);
    var Iq = I.re * c + I.im * s, Id = I.im * c - I.re * s;
    return { E: mag - (Xd - Xq) * Id, delta: d, Iq: Iq, Id: Id };
  }

  // -------------------------------------------- recherche de l'angle interne
  function golden(f, a, b, sign) {
    // extremum de f sur [a, b] ; sign = +1 pour un maximum, −1 pour un minimum
    var g = (Math.sqrt(5) - 1) / 2;
    var c = b - g * (b - a), d = a + g * (b - a);
    var fc = sign * f(c), fd = sign * f(d);
    for (var i = 0; i < 60; i++) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = sign * f(c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = sign * f(d); }
    }
    return (a + b) / 2;
  }

  function bisect(f, a, b, fa, fb) {
    for (var i = 0; i < 70; i++) {
      var mid = 0.5 * (a + b), fm = f(mid);
      if ((fa <= 0 && fm <= 0) || (fa >= 0 && fm >= 0)) { a = mid; fa = fm; } else { b = mid; fb = fm; }
    }
    return 0.5 * (a + b);
  }

  var N_SCAN = 720;            // pas de 0,5°

  /*
   * Résout f(δ) = cible sur ]−π, π]. Une solution est « stable » si f y est croissante
   * (couple synchronisant positif). Retourne la solution stable la plus proche de `hint`
   * (0 par défaut), les bornes de la branche stable et l'équilibre instable voisin.
   */
  function solveAngle(f, target, hint) {
    var h = TWO_PI / N_SCAN, y = new Array(N_SCAN + 1), i;
    var iMax = 0, iMin = 0;
    for (i = 0; i <= N_SCAN; i++) {
      y[i] = f(-PI + i * h);
      if (y[i] > y[iMax]) iMax = i;
      if (y[i] < y[iMin]) iMin = i;
    }
    var span = y[iMax] - y[iMin];
    var res = { delta: 0, lost: false, atLimit: false, flat: false, delta2: NaN };
    if (span < 1e-12) {                      // f constante (ex. E = 0 à pôles lisses)
      res.flat = true;
      res.lost = Math.abs(target - y[0]) > 1e-9;
      res.fMax = res.fMin = y[0]; res.dMax = res.dMin = 0; res.dHi = res.dLo = 0;
      return res;
    }
    function refine(idx, sign) {
      var a = -PI + (idx - 1) * h, b = -PI + (idx + 1) * h;
      return golden(f, a, b, sign);
    }
    res.dMax = refine(iMax, +1); res.fMax = f(res.dMax);
    res.dMin = refine(iMin, -1); res.fMin = f(res.dMin);

    var g = function (x) { return f(x) - target; };
    var rising = [], falling = [];
    for (i = 0; i < N_SCAN; i++) {
      var a = y[i] - target, b = y[i + 1] - target;
      if (a === 0 && b === 0) continue;
      if ((a < 0 && b >= 0) || (a > 0 && b <= 0) || (a === 0 && i === 0)) {
        var x0 = -PI + i * h;
        var r = a === 0 ? x0 : bisect(g, x0, x0 + h, a, b);
        (b > a ? rising : falling).push(r);
      }
    }
    var tol = 1e-7 * Math.max(1, Math.abs(target));
    if (!rising.length) {
      if (Math.abs(target - res.fMax) <= tol) { res.delta = res.dMax; res.atLimit = true; }
      else if (Math.abs(target - res.fMin) <= tol) { res.delta = res.dMin; res.atLimit = true; }
      else { res.lost = true; res.delta = target > res.fMax ? res.dMax : res.dMin; }
      res.dHi = res.dMax; res.dLo = res.dMin;
      return res;
    }
    var ref = (hint === undefined || hint === null || isNaN(hint)) ? 0 : hint;
    var best = rising[0];
    for (i = 1; i < rising.length; i++) {
      if (Math.abs(wrap(rising[i] - ref)) < Math.abs(wrap(best - ref)) - 1e-12) best = rising[i];
    }
    res.delta = best;

    // Bornes de la branche stable contenant la solution.
    var idx = Math.min(N_SCAN - 1, Math.max(0, Math.floor((best + PI) / h)));
    var up = idx + 1, n = 0;
    while (n++ < N_SCAN && y[(up + 1) % N_SCAN] > y[up % N_SCAN]) up++;
    var dn = idx; n = 0;
    while (n++ < N_SCAN && y[(dn - 1 + N_SCAN) % N_SCAN] < y[(dn + N_SCAN) % N_SCAN]) dn--;
    res.dHi = golden(f, -PI + (up - 1) * h, -PI + (up + 1) * h, +1);
    res.dLo = golden(f, -PI + (dn - 1) * h, -PI + (dn + 1) * h, -1);

    // Équilibre instable voisin (point A2 du cours), du côté où le couple augmente.
    var d2 = NaN;
    for (i = 0; i < falling.length; i++) {
      var cand = falling[i];
      if (target >= f(0) ? cand > best : cand < best) {
        if (isNaN(d2) || Math.abs(cand - best) < Math.abs(d2 - best)) d2 = cand;
      }
    }
    res.delta2 = d2;
    return res;
  }

  // ------------------------------------------------- point de fonctionnement
  var MODES = ['bus_EP', 'bus_PQ', 'bus_Ed', 'load_VI', 'load_Z'];
  function isBus(mode) { return mode.indexOf('bus') === 0; }

  /*
   * inp (convention générateur) :
   *   mode    : bus_EP  réseau infini, Ir et puissance à l'arbre imposés
   *             bus_PQ  réseau infini, Ps et Qs imposés
   *             bus_Ed  réseau infini, Ir et δ imposés
   *             load_VI réseau indépendant, Vs régulée, charge Is∠−φ imposée
   *             load_Z  réseau indépendant, Ir imposé, charge Z∠φ (ou à vide / court-circuit)
   *   Vs, k, ir, Pu, Ps, Qs, delta, Is, phiL, Z, load ('charge' | 'vide' | 'cc')
   */
  function solve(m, inp) {
    var mode = inp.mode, bus = isBus(mode);
    var k = bus ? 1 : inp.k;
    var Vs = inp.Vs, E, d, I, flags = {}, sol = null, t;
    var Xd = m.Xd * k, Xq = m.Xq * k;

    if (mode === 'bus_EP') {
      E = inp.ir * k;
      var target = inp.Pu - m.Pfe - m.Pmec;
      sol = solveAngle(function (x) { return powers(m, Vs, E, x, k).PE; }, target, inp.hint);
      d = sol.delta;
      if (sol.lost) flags.lost = true;
      if (sol.atLimit) flags.atLimit = true;
      I = currents(m, Vs, E, d, k).I;
    } else if (mode === 'bus_PQ') {
      I = Vs > EPS ? { re: inp.Ps / Vs, im: -inp.Qs / Vs } : { re: 0, im: 0 };
      t = fromTerminal(m, Vs, I, k); E = t.E; d = t.delta;
    } else if (mode === 'bus_Ed') {
      E = inp.ir * k; d = inp.delta;
      I = currents(m, Vs, E, d, k).I;
    } else if (mode === 'load_VI') {
      I = polar(inp.Is, -inp.phiL);
      t = fromTerminal(m, Vs, I, k); E = t.E; d = t.delta;
    } else {                                      // load_Z
      E = inp.ir * k;
      if (inp.load === 'vide') {
        I = { re: 0, im: 0 }; Vs = E; d = 0;
      } else {
        var Z = inp.load === 'cc' ? { re: 0, im: 0 } : polar(inp.Z, inp.phiL);
        var Rt = Z.re + m.Rs;
        var det = Rt * Rt + (Z.im + Xd) * (Z.im + Xq);
        if (Math.abs(det) < 1e-9) { flags.singular = true; det = 1e-9; }
        var Iq = E * Rt / det, Id = -E * (Z.im + Xq) / det;
        // tension aux bornes dans le repère (q, d) : V = Z·I
        var Vq = Z.re * Iq - Z.im * Id, Vd = Z.re * Id + Z.im * Iq;
        Vs = Math.sqrt(Vq * Vq + Vd * Vd);
        d = Vs > 1e-9 ? -Math.atan2(Vd, Vq) : 0;
        var c = Math.cos(d), s = Math.sin(d);
        I = { re: Iq * c - Id * s, im: Iq * s + Id * c };
      }
    }
    if (E < -1e-9) flags.Eneg = true;
    return finish(m, mode, k, Vs, E, d, I, flags, sol, inp);
  }

  function finish(m, mode, k, Vs, E, d, I, flags, sol, inp) {
    var Xd = m.Xd * k, Xq = m.Xq * k, Rs = m.Rs;
    var Is = hyp(I);
    var c = Math.cos(d), s = Math.sin(d);
    var Iq = I.re * c + I.im * s, Id = I.im * c - I.re * s;
    var Ps = Vs * I.re, Qs = -Vs * I.im;           // S = Vs·I*
    var Pcu = Rs * Is * Is;
    var PE = Ps + Pcu;                             // puissance convertie (entrefer)
    var QE = -E * Id;                              // = E·Is·sin(ψ) = Qs + Xd·Id² + Xq·Iq²
    var Pu = PE + m.Pfe + m.Pmec;                  // puissance mécanique à l'arbre (> 0 : entre)
    var genOp = PE >= 0;
    // Pem au sens du cours : en moteur, les pertes fer sont retirées avant l'arbre.
    var Pem = genOp ? PE : PE + m.Pfe;

    if (!sol) {
      sol = solveAngle(function (x) { return powers(m, Vs, E, x, k).PE; }, PE, d);
    }
    var hd = 1e-5;
    var dPdd = (powers(m, Vs, E, d + hd, k).PE - powers(m, Vs, E, d - hd, k).PE) / (2 * hd);
    var tolS = 1e-6;                               // couple synchronisant nul : limite de stabilité
    var stable = dPdd > tolS;
    if (Is > 1e-9 && !sol.flat) {
      if (Math.abs(dPdd) <= tolS) flags.atLimit = true;
      else if (!stable) flags.unstable = true;
    }
    if (Is > 1.0005) flags.overI = true;
    var ir = E / k;
    if (ir > m.IrMax + 1e-9) flags.overIr = true;

    var eta = NaN;
    if (PE > 1e-9 && Ps > 1e-9 && Pu > 1e-9) eta = Ps / Pu;
    else if (PE < -1e-9 && Pu < -1e-9 && Ps < -1e-9) eta = Pu / Ps;

    var role;
    if (Math.abs(Pu) <= 0.005 && Ps <= 0.005) role = Is > 0.005 ? 'comp' : 'vide';
    else if (Ps > 0.005) role = 'gen';
    else if (Ps < -0.005) role = 'mot';
    else role = Is > 0.005 ? 'comp' : 'vide';
    var excit = Qs > 0.005 ? 'sur' : (Qs < -0.005 ? 'sous' : 'unit');

    return {
      mode: mode, bus: isBus(mode), k: k,
      Vs: Vs, E: E, ir: ir, delta: d, I: I, Is: Is, Iq: Iq, Id: Id,
      Ep: { re: Vs + Rs * I.re, im: Rs * I.im },   // E' = Vs + Rs·Is (conv. générateur)
      Ps: Ps, Qs: Qs, S: Vs * Is, Pcu: Pcu, PE: PE, QE: QE, Pu: Pu, Pem: Pem,
      Pfe: m.Pfe, Pmec: m.Pmec,
      Tem: Pem / k, Tu: Pu / k, eta: eta,
      Xd: Xd, Xq: Xq,
      dPdd: dPdd, stable: stable,
      lim: {
        Pmax: sol.fMax, dMax: sol.dMax, Pmin: sol.fMin, dMin: sol.dMin,
        dHi: sol.dHi, dLo: sol.dLo, flat: sol.flat
      },
      delta2: sol.delta2,
      role: role, excit: excit, genOp: genOp,
      flags: flags,
      load: inp && inp.load
    };
  }

  // -------------------------------------- lecture selon la convention de signe
  /*
   * Grandeurs exprimées dans la convention choisie ('gen' ou 'rec').
   *   φ = ∠Vs − ∠Is ; ψ = ∠E − ∠Is (peu importe la convention)
   *   δ = ∠E − ∠Vs (générateur) ; δ = ∠Vs − ∠E (récepteur)
   * Les phaseurs E et Vs sont identiques dans les deux conventions ; seul Is s'inverse.
   */
  function view(op, conv) {
    var sg = conv === 'rec' ? -1 : 1;
    var I = { re: sg * op.I.re, im: sg * op.I.im };
    var hasI = op.Is > 1e-7, hasV = op.Vs > 1e-7, hasE = Math.abs(op.E) > 1e-7;
    var aI = hasI ? ang(I) : NaN;
    var phi = hasI && hasV ? wrap(-aI) : NaN;
    var psi = hasI && hasE ? wrap(op.delta - aI) : NaN;
    var P = sg * op.Ps, Q = sg * op.Qs;
    var quad = '';
    var tq = 0.005;                                // même tolérance que pour le rôle et l'excitation
    if (Math.abs(P) > tq && Math.abs(Q) > tq) quad = P > 0 ? (Q > 0 ? 'I' : 'IV') : (Q > 0 ? 'II' : 'III');
    // fmm exprimées en « tension équivalente » : Fr ↔ ±j·(E/k), Fs ↔ Xd(fn)·Is, F = Fr + Fs
    var k = op.k, XdN = op.Xd / k;
    var Fr = polar(op.E / k, op.delta + sg * PI / 2);
    var Fs = { re: XdN * I.re, im: XdN * I.im };
    var F = { re: Fr.re + Fs.re, im: Fr.im + Fs.im };
    var aD = op.delta + sg * PI / 2;               // direction de l'axe d
    var Fsd = Fs.re * Math.cos(aD) + Fs.im * Math.sin(aD);
    var Fsq = Fs.re * Math.cos(op.delta) + Fs.im * Math.sin(op.delta);
    return {
      conv: conv, sg: sg, I: I, Is: op.Is, Vs: op.Vs, E: op.E, angI: aI,
      phi: phi, psi: psi, delta: hasV ? sg * op.delta : NaN, cosphi: Math.cos(phi),
      P: P, Q: Q, S: op.S, Pem: sg * op.Pem, Qem: sg * op.QE, Pu: sg * op.Pu,
      Tem: sg * op.Tem, Tu: sg * op.Tu,
      Isd: hasI && hasE ? op.Is * Math.sin(psi) : (hasI ? -sg * op.Id : 0),
      Isq: hasI && hasE ? op.Is * Math.cos(psi) : (hasI ? sg * op.Iq : 0),
      quad: quad,
      Fr: Fr, Fs: Fs, F: F, Fsd: Fsd, Fsq: Fsq, angD: aD, angQ: op.delta,
      // la réaction d'induit est magnétisante si Fs a une composante dans le sens de Fr
      armature: !hasI ? 'none' : (Math.abs(Fsd) < 1e-3 * Math.max(1e-6, hyp(Fs)) ? 'trans' : (Fsd > 0 ? 'mag' : 'demag'))
    };
  }

  // ------------------------------------------------------------------ courbes
  // Caractéristique puissance–angle à E et Vs constants (convention générateur).
  function curvePdelta(m, Vs, E, k, n) {
    var out = [], Xd = m.Xd * k, Xq = m.Xq * k, i;
    n = n || 181;
    for (i = 0; i < n; i++) {
      var d = -PI + TWO_PI * i / (n - 1);
      var p = powers(m, Vs, E, d, k);
      out.push({
        d: d, PE: p.PE, Ps: p.Ps,
        sync: Vs * E * Math.sin(d) / Xd,                       // terme classique (Rs = 0)
        rel: 0.5 * Vs * Vs * (1 / Xq - 1 / Xd) * Math.sin(2 * d) // terme de saillance (Rs = 0)
      });
    }
    return out;
  }

  // Plus petite tension interne permettant d'échanger |P| avec le réseau.
  function minEforP(m, Vs, P, k, Emax) {
    var f = function (E) {
      var lim = solveAngle(function (x) { return powers(m, Vs, E, x, k).Ps; }, 0);
      return (P >= 0 ? lim.fMax : -lim.fMin) - Math.abs(P);
    };
    var lo = 0, hi = Emax;
    if (f(lo) >= 0) return 0;
    if (f(hi) < 0) return NaN;
    for (var i = 0; i < 50; i++) { var mid = 0.5 * (lo + hi); if (f(mid) >= 0) hi = mid; else lo = mid; }
    return hi;
  }

  // Courbe de Mordey Is(E) à puissance active Ps constante (Vs fixe).
  function mordey(m, Vs, P, Emax, n) {
    var out = [], k = 1, i;
    n = n || 70;
    var E0 = minEforP(m, Vs, P, k, Emax);
    if (isNaN(E0)) return out;
    var hint = 0;
    for (i = 0; i < n; i++) {
      var u = i / (n - 1);
      var E = E0 + (Emax - E0) * u * u;             // points resserrés près du décrochage
      if (i === 0) E = E0 + 1e-9;
      var sol = solveAngle((function (Ev) {
        return function (x) { return powers(m, Vs, Ev, x, k).Ps; };
      })(E), P, hint);
      if (sol.lost) continue;
      hint = sol.delta;
      var I = currents(m, Vs, E, sol.delta, k).I;
      out.push({ E: E, Is: hyp(I), delta: sol.delta, Q: -Vs * I.im });
    }
    return out;
  }

  // Lieu cos(φ) = 1 dans le plan (E, Is) ; sign = +1 génératrice, −1 moteur.
  function mordeyUnity(m, Vs, sign, Pmax, n) {
    var out = [], i;
    n = n || 60;
    for (i = 0; i < n; i++) {
      var P = Pmax * i / (n - 1);
      var t = fromTerminal(m, Vs, { re: sign * P / Vs, im: 0 }, 1);
      out.push({ E: t.E, Is: P / Vs, P: P });
    }
    return out;
  }

  // Limite de stabilité (décrochage) dans le plan (E, Is).
  function mordeyLimit(m, Vs, sign, Emax, n) {
    var out = [], i;
    n = n || 60;
    for (i = 0; i < n; i++) {
      var E = Emax * i / (n - 1);
      var lim = solveAngle((function (Ev) {
        return function (x) { return powers(m, Vs, Ev, x, 1).PE; };
      })(E), 0);
      var d = lim.flat ? sign * PI / 2 : (sign > 0 ? lim.dMax : lim.dMin);
      out.push({ E: E, Is: hyp(currents(m, Vs, E, d, 1).I), delta: d });
    }
    return out;
  }

  // Caractéristique de régulation : Ir nécessaire pour maintenir Vs en fonction de Is.
  function regulation(m, Vs, phiL, k, IsMax, n) {
    var out = [], i;
    n = n || 60;
    for (i = 0; i < n; i++) {
      var Is = IsMax * i / (n - 1);
      var t = fromTerminal(m, Vs, polar(Is, -phiL), k);
      out.push({ Is: Is, E: t.E, ir: t.E / k });
    }
    return out;
  }

  // Caractéristique externe Vs(Is) à Ir et vitesse constants, cos(φ) de la charge fixé.
  function external(m, ir, k, phiL, n) {
    var out = [], i;
    n = n || 90;
    out.push({ Is: 0, Vs: ir * k, Z: Infinity });
    for (i = 0; i < n; i++) {
      var Z = Math.pow(10, 2.5 - 4.5 * i / (n - 1));           // de 316 pu à 0,01 pu
      var op = solve(m, { mode: 'load_Z', k: k, ir: ir, Z: Z, phiL: phiL, load: 'charge' });
      out.push({ Is: op.Is, Vs: op.Vs, Z: Z });
    }
    var cc = solve(m, { mode: 'load_Z', k: k, ir: ir, Z: 0, phiL: 0, load: 'cc' });
    out.push({ Is: cc.Is, Vs: 0, Z: 0 });
    return out;
  }

  // Lieu de l'extrémité de E à puissance à l'arbre constante (Ir variable).
  function locusPconst(m, Vs, PE, Emax, n) {
    var out = [], hint = 0, i;
    n = n || 80;
    for (i = 0; i < n; i++) {
      var E = Emax * (1 - i / (n - 1));
      var sol = solveAngle((function (Ev) {
        return function (x) { return powers(m, Vs, Ev, x, 1).PE; };
      })(E), PE, hint);
      if (sol.lost || sol.flat) continue;
      hint = sol.delta;
      out.push({ E: E, delta: sol.delta });
    }
    return out;
  }

  // Lieu (Ps, Qs) à E constant sur la branche stable (Ir constant, couple variable).
  function pqLocusE(m, Vs, E, k, dLo, dHi, n) {
    var out = [], i;
    n = n || 60;
    for (i = 0; i < n; i++) {
      var d = dLo + (dHi - dLo) * i / (n - 1);
      var I = currents(m, Vs, E, d, k).I;
      out.push({ d: d, P: Vs * I.re, Q: -Vs * I.im });
    }
    return out;
  }

  // ------------------------------------------- équation du mouvement de l'arbre
  /*
   * 2H·dΔω/dt = Pm − PE(δ) − D·Δω      dδ/dt = ωn·Δω       (convention générateur)
   * st = { delta, w } ; par = { Vs, E, Pm, H, D } ; Pm = puissance mécanique nette (pu).
   */
  function swingStep(m, st, par, dt) {
    var wn = TWO_PI * m.fn;
    function f(d, w) {
      return {
        dd: wn * w,
        dw: (par.Pm - powers(m, par.Vs, par.E, d, 1).PE - par.D * w) / (2 * par.H)
      };
    }
    var k1 = f(st.delta, st.w);
    var k2 = f(st.delta + 0.5 * dt * k1.dd, st.w + 0.5 * dt * k1.dw);
    var k3 = f(st.delta + 0.5 * dt * k2.dd, st.w + 0.5 * dt * k2.dw);
    var k4 = f(st.delta + dt * k3.dd, st.w + dt * k3.dw);
    return {
      delta: st.delta + dt / 6 * (k1.dd + 2 * k2.dd + 2 * k3.dd + k4.dd),
      w: st.w + dt / 6 * (k1.dw + 2 * k2.dw + 2 * k3.dw + k4.dw)
    };
  }

  global.MS = global.MS || {};
  global.MS.model = {
    PI: PI, DEG: DEG, wrap: wrap, hyp: hyp, ang: ang, polar: polar,
    MACHINES: MACHINES, MODES: MODES, cloneMachine: cloneMachine, bases: bases,
    isSalient: isSalient, isBus: isBus,
    currents: currents, powers: powers, fromTerminal: fromTerminal,
    solveAngle: solveAngle, solve: solve, view: view,
    curvePdelta: curvePdelta, minEforP: minEforP, mordey: mordey,
    mordeyUnity: mordeyUnity, mordeyLimit: mordeyLimit,
    regulation: regulation, external: external, locusPconst: locusPconst, pqLocusE: pqLocusE,
    swingStep: swingStep
  };
})(typeof window !== 'undefined' ? window : globalThis);
