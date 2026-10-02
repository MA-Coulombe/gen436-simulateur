/*
 * GEN436 – Simulateur de machine synchrone
 * machine.js : coupe animée de la machine (stator, rotor, courants de phase, fmm tournantes).
 *
 * Représentation en angle électrique (équivalent à p = 1). L'axe magnétique de la phase a est
 * à 0° (vers la droite), comme la référence du diagramme vectoriel : à t = 0, les vecteurs
 * Fr, Fs et F de l'animation coïncident avec ceux du diagramme. Rotation anti-horaire.
 */
(function (global) {
  'use strict';
  var M = global.MS.model, D = global.MS.draw;
  var S = 540, C = { x: 270, y: 270 };
  var R_OUT = 196, R_IN = 151, R_SLOT = 173.5, R_GAP_O = 148, R_GAP_I = 121, R_ROT = 117;
  var DEG = Math.PI / 180;
  // conducteurs : la phase x produit un champ selon son axe quand le courant sort en « x »
  var COND = [
    { ph: 'a', name: 'a', ang: 90, sign: 1, shift: 0 }, { ph: 'a', name: 'a′', ang: 270, sign: -1, shift: 0 },
    { ph: 'b', name: 'b', ang: 210, sign: 1, shift: -120 }, { ph: 'b', name: 'b′', ang: 30, sign: -1, shift: -120 },
    { ph: 'c', name: 'c', ang: 330, sign: 1, shift: 120 }, { ph: 'c', name: 'c′', ang: 150, sign: -1, shift: 120 }
  ];
  var state = { key: null, gRot: null, gGap: null, gDyn: null };

  function ringPath(r1, r2) {
    return 'M' + (C.x + r2) + ' ' + C.y + 'A' + r2 + ' ' + r2 + ' 0 1 0 ' + (C.x - r2) + ' ' + C.y +
      'A' + r2 + ' ' + r2 + ' 0 1 0 ' + (C.x + r2) + ' ' + C.y + 'Z' +
      'M' + (C.x + r1) + ' ' + C.y + 'A' + r1 + ' ' + r1 + ' 0 1 1 ' + (C.x - r1) + ' ' + C.y +
      'A' + r1 + ' ' + r1 + ' 0 1 1 ' + (C.x + r1) + ' ' + C.y + 'Z';
  }
  function cross(g, x, y, r, cls) {
    var k = r * 0.7071;
    D.svg('path', { d: 'M' + (x - k) + ' ' + (y - k) + 'L' + (x + k) + ' ' + (y + k) + 'M' + (x - k) + ' ' + (y + k) + 'L' + (x + k) + ' ' + (y - k), 'class': cls }, g);
  }

  function build(el, salient) {
    D.clear(el);
    el.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
    var gStatic = D.svg('g', {}, el);
    D.svg('path', { d: ringPath(R_IN, R_OUT), 'class': 'stator', 'fill-rule': 'evenodd' }, gStatic);
    // axes magnétiques des phases
    [['a', 0], ['b', 120], ['c', 240]].forEach(function (ax) {
      var p0 = D.onCircle(C, R_OUT + 3, ax[1] * DEG), p1 = D.onCircle(C, R_OUT + 13, ax[1] * DEG);
      D.svg('line', { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, 'class': 'phaseaxis' }, gStatic);
      var pl = D.onCircle(C, R_OUT + 34, ax[1] * DEG);
      D.label(gStatic, pl.x, pl.y + 4, '~axe ' + ax[0] + '~', { size: 13, cls: 'muted', anchor: 'middle', halo: false });
    });
    COND.forEach(function (c) {
      var p = D.onCircle(C, R_SLOT, c.ang * DEG);
      D.svg('circle', { cx: p.x, cy: p.y, r: 15, 'class': 'slot ph-' + c.ph }, gStatic);
      var pl = D.onCircle(C, R_OUT + 13, c.ang * DEG);
      D.label(gStatic, pl.x, pl.y + 5, c.name, { size: 14, cls: 'ink2', anchor: 'middle', halo: false });
    });

    // onde de fmm résultante dans l'entrefer (tourne avec F)
    var gGap = D.svg('g', { 'class': 'gap' }, el);
    var n = 72, da = 360 / n;
    for (var i = 0; i < n; i++) {
      var a = i * da, val = Math.cos(a * DEG);
      var a0 = (a - da / 2) * DEG, a1 = (a + da / 2) * DEG;
      var p0 = D.onCircle(C, R_GAP_O, a0), p1 = D.onCircle(C, R_GAP_O, a1);
      var p2 = D.onCircle(C, R_GAP_I, a1), p3 = D.onCircle(C, R_GAP_I, a0);
      D.svg('path', {
        d: 'M' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2) + 'A' + R_GAP_O + ' ' + R_GAP_O + ' 0 0 0 ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) +
          'L' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2) + 'A' + R_GAP_I + ' ' + R_GAP_I + ' 0 0 1 ' + p3.x.toFixed(2) + ' ' + p3.y.toFixed(2) + 'Z',
        'class': val >= 0 ? 'gapN' : 'gapS', 'fill-opacity': (Math.abs(val) * 0.85).toFixed(3)
      }, gGap);
    }

    // rotor : pôle N vers +x dans son repère propre
    var gRot = D.svg('g', { 'class': 'rotorg' }, el);
    var cx = C.x, cy = C.y, R = R_ROT;
    if (!salient) {
      D.svg('path', { d: 'M' + cx + ' ' + (cy - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + cx + ' ' + (cy + R) + 'Z', 'class': 'poleN' }, gRot);
      D.svg('path', { d: 'M' + cx + ' ' + (cy - R) + 'A' + R + ' ' + R + ' 0 0 0 ' + cx + ' ' + (cy + R) + 'Z', 'class': 'poleS' }, gRot);
      [-36, -18, 0, 18, 36].forEach(function (off) {       // enroulement inducteur réparti
        var pt = D.onCircle(C, R - 13, (90 + off) * DEG), pb = D.onCircle(C, R - 13, (270 + off) * DEG);
        D.svg('circle', { cx: pt.x, cy: pt.y, r: 6.5, 'class': 'fieldslot' }, gRot);
        D.svg('circle', { cx: pt.x, cy: pt.y, r: 2.2, 'class': 'fielddot' }, gRot);
        D.svg('circle', { cx: pb.x, cy: pb.y, r: 6.5, 'class': 'fieldslot' }, gRot);
        cross(gRot, pb.x, pb.y, 4.4, 'fieldcross');
      });
    } else {
      var a = 52 * DEG, xo = R * Math.cos(a), yo = R * Math.sin(a), xb = xo - 16, hb = 33;
      var half = function (s, cls) {
        D.svg('path', {
          d: 'M' + cx + ' ' + (cy - hb) + 'L' + (cx + s * xb) + ' ' + (cy - hb) + 'L' + (cx + s * xb) + ' ' + (cy - yo) +
            'L' + (cx + s * xo) + ' ' + (cy - yo) + 'A' + R + ' ' + R + ' 0 0 ' + (s > 0 ? 1 : 0) + ' ' + (cx + s * xo) + ' ' + (cy + yo) +
            'L' + (cx + s * xb) + ' ' + (cy + yo) + 'L' + (cx + s * xb) + ' ' + (cy + hb) + 'L' + cx + ' ' + (cy + hb) + 'Z',
          'class': cls
        }, gRot);
      };
      half(1, 'poleN'); half(-1, 'poleS');
      [-40, -18, 18, 40].forEach(function (x) {              // bobines d'excitation autour du noyau
        D.svg('circle', { cx: cx + x, cy: cy - hb - 10, r: 7.5, 'class': 'fieldslot' }, gRot);
        D.svg('circle', { cx: cx + x, cy: cy - hb - 10, r: 2.4, 'class': 'fielddot' }, gRot);
        D.svg('circle', { cx: cx + x, cy: cy + hb + 10, r: 7.5, 'class': 'fieldslot' }, gRot);
        cross(gRot, cx + x, cy + hb + 10, 5, 'fieldcross');
      });
    }
    D.svg('circle', { cx: cx, cy: cy, r: 9, 'class': 'shaft' }, gRot);

    state.gRot = gRot; state.gGap = gGap;
    state.gDyn = D.svg('g', {}, el);
    state.key = salient ? 'sal' : 'lis';
    state.el = el;
  }

  /*
   * Met à jour l'animation. theta = ωs·t (rad). Les vecteurs sont ceux de view() tournés de theta.
   */
  function update(el, ctx, theta) {
    var m = ctx.m, op = ctx.op, v = ctx.v;
    var key = M.isSalient(m) ? 'sal' : 'lis';
    if (state.key !== key || state.el !== el || !el.firstChild) build(el, key === 'sal');
    var g = state.gDyn;
    D.clear(g);

    var aFr = M.ang(v.Fr) + theta, lenFr = M.hyp(v.Fr), lenFs = M.hyp(v.Fs), lenF = M.hyp(v.F);
    var hasFr = lenFr > 1e-6, hasI = op.Is > 1e-6;
    if (!hasFr) aFr = v.angD + theta;
    var aF = lenF > 1e-6 ? M.ang(v.F) + theta : aFr;
    state.gRot.setAttribute('transform', 'rotate(' + (-aFr / DEG).toFixed(2) + ' ' + C.x + ' ' + C.y + ')');
    state.gGap.setAttribute('transform', 'rotate(' + (-aF / DEG).toFixed(2) + ' ' + C.x + ' ' + C.y + ')');
    state.gGap.setAttribute('opacity', Math.min(1, lenF / 1.1).toFixed(3));

    // pôles
    var side = M.wrap(aFr - aF) >= 0 ? 1 : -1;
    [['N', 0], ['S', Math.PI]].forEach(function (pl) {
      // décalées de l'axe des pôles, du côté opposé à F, pour ne pas être masquées par les vecteurs
      var p = D.onCircle(C, R_ROT - 15, aFr + pl[1] + side * 30 * DEG);
      D.label(g, p.x, p.y + 5, '~' + pl[0] + '~', { size: 15, cls: 'polelbl', anchor: 'middle', halo: false });
    });

    // courants instantanés dans les conducteurs (point : vers l'observateur ; croix : s'éloigne)
    var amp = Math.min(1.25, op.Is);
    COND.forEach(function (c) {
      var i = amp * Math.cos(theta + v.angI + c.shift * DEG) * c.sign;
      if (!hasI || Math.abs(i) < 0.02) return;
      var p = D.onCircle(C, R_SLOT, c.ang * DEG), r = 2 + 8.5 * Math.min(1, Math.abs(i));
      if (i > 0) D.svg('circle', { cx: p.x, cy: p.y, r: (r * 0.62).toFixed(2), 'class': 'idot' }, g);
      else cross(g, p.x, p.y, r, 'icross');
    });

    // vecteurs tournants
    var sc = Math.min(100, 138 / Math.max(lenFr, lenFs, lenF, 0.01));
    function tip(z, extra) {
      var a = M.ang(z) + theta, r = M.hyp(z) * sc + (extra || 0);
      return D.onCircle(C, r, a);
    }
    var tFr = tip(v.Fr), tFs = tip(v.Fs), tF = tip(v.F);
    if (hasI) {
      D.svg('line', { x1: tFr.x, y1: tFr.y, x2: tF.x, y2: tF.y, 'class': 'helper' }, g);
      D.svg('line', { x1: tFs.x, y1: tFs.y, x2: tF.x, y2: tF.y, 'class': 'helper' }, g);
    }
    function vecLabel(z, lbl, cls) {
      var p = tip(z, 15);
      D.label(g, p.x, p.y + 5, lbl, { size: 16, cls: cls, anchor: 'middle' });
    }
    if (hasI) { D.arrow(g, C, tFs, { cls: 'cFs', width: 2.6, head: 12 }); }
    if (hasI) { D.arrow(g, C, tF, { cls: 'cF', width: 2.6, head: 12 }); }
    if (hasFr) { D.arrow(g, C, tFr, { cls: 'cFr', width: 3, head: 13 }); }
    if (hasI && lenFs * sc > 10) vecLabel(v.Fs, '*F*_s', 'cFs');
    if (hasI && lenF * sc > 10) vecLabel(v.F, '*F*', 'cF');
    if (hasFr) vecLabel(v.Fr, '*F*_r', 'cFr');

    // angle entre le champ résultant F et le rotor Fr
    var lead = hasFr && lenF > 1e-6 ? M.wrap(M.ang(v.Fr) - M.ang(v.F)) : 0;
    if (hasI && Math.abs(lead) > 0.05 && key === 'lis') {
      var r = Math.min(46, 0.8 * Math.min(lenFr, lenF) * sc);
      if (r > 16) {
        D.arcArrow(g, C, r, aF, aF + lead, { cls: 'ink', width: 1.1, head: 6 });
        var pm = D.onCircle(C, r + 11, aF + lead / 2);
        D.label(g, pm.x, pm.y + 5, m.Rs > 1e-9 ? "δ'" : 'δ', { size: 14, cls: 'ink', anchor: 'middle' });
      }
    }

    // sens de rotation et couples sur l'arbre
    D.arcArrow(g, C, 236, 44 * DEG, 76 * DEG, { cls: 'cDq', width: 1.8, head: 10 });
    var po = D.onCircle(C, 254, 60 * DEG);
    D.label(g, po.x, po.y + 5, 'Ω_s', { size: 16, cls: 'cDq', anchor: 'middle', halo: false });
    function torque(T, center, dirCCW, lbl, cls) {
      if (Math.abs(T) < 0.003) return;
      var half = (6 + 12 * Math.min(1, Math.abs(T))) * DEG, c0 = center * DEG, s = dirCCW ? 1 : -1;
      D.arcArrow(g, C, 236, c0 - s * half, c0 + s * half, { cls: cls, width: 2.2, head: 11 });
      var p = D.onCircle(C, 254, c0);
      D.label(g, p.x, p.y + 5, lbl, { size: 16, cls: cls, anchor: 'middle', halo: false });
    }
    // génératrice : Tem s'oppose à la rotation, Tu entraîne ; moteur : l'inverse
    torque(op.Tem, 150, !op.genOp, 'T_{em}', 'ink');
    torque(op.Tu, 195, op.Pu > 0, 'T_u', 'cV');
    return { lead: lead };
  }

  global.MS.machine = { update: update };
})(window);
