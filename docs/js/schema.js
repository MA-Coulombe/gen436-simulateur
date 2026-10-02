/*
 * GEN436 – Simulateur de machine synchrone
 * schema.js : schéma du système simulé.
 *   - en haut : chaîne réseau/charge – machine – arbre, avec le sens RÉEL des échanges ;
 *   - en bas  : circuit équivalent ligne-neutre, avec les sens POSITIFS de la convention choisie.
 */
(function (global) {
  'use strict';
  var M = global.MS.model, D = global.MS.draw;
  var W = 520, H = 470;

  function blockArrow(g, x, y, len, dir, cls) {            // dir = +1 vers la droite, −1 vers la gauche
    var x0 = dir > 0 ? x : x + len, x1 = dir > 0 ? x + len : x, hh = 9, hw = 14, bh = 4.5;
    var xb = x1 - dir * hw;
    D.svg('polygon', {
      points: [x0, y - bh, xb, y - bh, xb, y - hh, x1, y, xb, y + hh, xb, y + bh, x0, y + bh].join(' '), 'class': cls
    }, g);
  }
  function coil(g, x0, x1, y, n, cls) {
    var w = (x1 - x0) / n, d = 'M' + x0 + ' ' + y;
    for (var i = 0; i < n; i++) d += 'a' + (w / 2) + ' ' + (w / 2) + ' 0 0 1 ' + w + ' 0';
    D.svg('path', { d: d, 'class': cls }, g);
  }
  function resistor(g, x0, x1, y, cls) {
    var n = 6, w = (x1 - x0) / n, d = 'M' + x0 + ' ' + y;
    for (var i = 0; i < n; i++) d += 'l' + (w / 4) + ' ' + (i % 2 ? 7 : -7) + 'l' + (w / 2) + ' ' + (i % 2 ? -14 : 14) + 'l' + (w / 4) + ' ' + (i % 2 ? 7 : -7);
    D.svg('path', { d: d, 'class': cls }, g);
  }
  function source(g, x, y, r) {
    D.svg('circle', { cx: x, cy: y, r: r, 'class': 'wire fillbg' }, g);
    D.svg('path', { d: 'M' + (x - 9) + ' ' + y + 'q4.5 -9 9 0t9 0', 'class': 'wire' }, g);
  }
  function box(g, x, y, w, h, cls) {
    return D.svg('rect', { x: x, y: y, width: w, height: h, rx: 6, 'class': cls }, g);
  }
  function text2(g, x, y, lines, cls, size) {
    lines.forEach(function (ln, i) {
      D.label(g, x, y + i * (size + 3), '~' + ln + '~', { size: size, cls: cls, anchor: 'middle', halo: false });
    });
  }
  function polarTxt(u, kind, mag, a) {
    return u.numOnly(kind, mag) + (isFinite(a) ? '∠' + D.deg(a) : '') + (u.si ? ' ~' + u.u(kind) + '~' : '');
  }

  function render(el, ctx) {
    var m = ctx.m, op = ctx.op, v = ctx.v, u = ctx.units, gen = ctx.conv !== 'rec';
    D.clear(el);
    el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var defs = D.svg('defs', {}, el);
    var pat = D.svg('pattern', { id: 'bricks', width: 22, height: 14, patternUnits: 'userSpaceOnUse' }, defs);
    D.svg('rect', { width: 22, height: 14, 'class': 'brickfill' }, pat);
    D.svg('path', { d: 'M0 0H22M0 7H22M0 14H22M11 0V7M0 7V14M22 7V14', 'class': 'brickline' }, pat);
    var g = D.svg('g', {}, el);
    var eps = 0.002;

    // ============================ chaîne de conversion (sens réels) ============================
    var yB = 62, hB = 84, yL = yB + hB / 2;
    // réseau ou charge
    if (op.bus) {
      box(g, 8, yB, 104, hB, 'gridblock').setAttribute('fill', 'url(#bricks)');
      D.svg('rect', { x: 14, y: yB + 8, width: 92, height: 26, rx: 4, 'class': 'plate' }, g);
      text2(g, 60, yB + 26, ['Réseau infini'], 'ink strong', 13.5);
      D.svg('rect', { x: 14, y: yB + 42, width: 92, height: 34, rx: 4, 'class': 'plate' }, g);
      D.label(g, 60, yB + 56, 'V_s = ~cte~', { size: 13, cls: 'ink', anchor: 'middle', halo: false });
      D.label(g, 60, yB + 71, 'f_s = ~cte~', { size: 13, cls: 'ink', anchor: 'middle', halo: false });
    } else {
      box(g, 8, yB, 104, hB, 'block');
      var l2 = op.load === 'vide' ? 'à vide' : (op.load === 'cc' ? 'court-circuit' : (op.mode === 'load_VI' ? 'tension régulée' : 'excitation fixe'));
      text2(g, 60, yB + 32, ['Charge'], 'ink strong', 15);
      text2(g, 60, yB + 52, ['réseau', 'indépendant'], 'ink2', 12);
      text2(g, 60, yB + hB + 15, ['(' + l2 + ')'], 'ink2', 11.5);
    }
    [yL - 16, yL, yL + 16].forEach(function (y) { D.svg('line', { x1: 112, y1: y, x2: 190, y2: y, 'class': 'wire' }, g); });
    // machine
    box(g, 190, yB, 140, hB, 'block machine');
    var name = op.bus ? { gen: 'Génératrice', mot: 'Moteur', comp: 'Compensateur', vide: 'Machine' }[op.role] : 'Génératrice';
    text2(g, 260, yB + 34, [name, 'synchrone'], 'ink strong', 15.5);
    D.label(g, 260, yB + 74, m.Xd === m.Xq ? '~pôles lisses~' : '~pôles saillants~', { size: 12, cls: 'ink2', anchor: 'middle', halo: false });
    // inducteur
    D.svg('path', { d: 'M232 ' + yB + 'V44M288 ' + yB + 'V44', 'class': 'wire' }, g);
    coil(g, 232, 288, 44, 4, 'wire');
    D.arrow(g, { x: 221, y: 38 }, { x: 221, y: 58 }, { cls: 'ink', width: 1.4, head: 8 });
    D.label(g, 260, 26, 'I_r = ' + u.m('Ir', op.ir), { size: 14, cls: 'ink', anchor: 'middle', halo: false });
    // arbre et partie mécanique
    D.svg('rect', { x: 330, y: yL - 6, width: 70, height: 12, 'class': 'shaftbar' }, g);
    box(g, 400, yB, 112, hB, 'block');
    var mech = op.role === 'gen' || !op.bus ? ['Entraînement', 'externe'] : (op.role === 'mot' ? ['Charge', 'mécanique'] : ['Arbre', 'sans charge']);
    text2(g, 456, yB + 38, mech, 'ink strong', 14);
    D.arcArrow(g, { x: 365, y: yL }, 17, -0.9, 0.9, { cls: 'cDq', width: 1.4, head: 7 });
    D.label(g, 365, yL + 36, 'Ω_s', { size: 14, cls: 'cDq', anchor: 'middle', halo: false });
    D.label(g, 365, yL + 52, '~' + u.txt('N', op.k) + '~', { size: 12, cls: 'ink2', anchor: 'middle', halo: false });

    // flèches de puissance : sens réel de l'écoulement
    function flow(x, y, towardLeft, val, lbl, kind, cls, yLbl, xLbl) {
      var has = Math.abs(val) > eps;
      if (has) blockArrow(g, x, y, 58, towardLeft ? -1 : 1, cls);
      else D.svg('line', { x1: x + 8, y1: y, x2: x + 50, y2: y, 'class': 'noflow' }, g);
      D.label(g, xLbl, yLbl, lbl + ' = ' + u.m(kind, val), { size: 13.5, cls: 'ink', anchor: 'middle', halo: false });
    }
    // Ps > 0 (convention générateur) : la machine fournit P au réseau, donc flèche vers la gauche
    flow(122, yB - 14, op.Ps > 0, v.P, 'P_s', 'P', 'flowP', yB - 32, 112);
    flow(122, yB + hB + 16, op.Qs > 0, v.Q, 'Q_s', 'Q', 'flowQ', yB + hB + 42, 112);
    flow(336, yB + 16, op.Pu > 0, v.Pu, 'P_u', 'P', 'flowP', yB - 10, 420);
    var loss = op.Pcu + (op.Pfe || 0) + (op.Pmec || 0);
    if (loss > 1e-6) {
      D.arrow(g, { x: 250, y: yB + hB }, { x: 250, y: yB + hB + 24 }, { cls: 'bad', width: 3, head: 10 });
      D.label(g, 260, yB + hB + 22, '~pertes~ = ' + u.m('P', loss), { size: 13, cls: 'bad', halo: false });
    }

    // =============================== circuit équivalent (convention) ===============================
    var yt = 300, yb = 412, xl = 46, xr = 474, ym = 0.5 * (yt + yb);
    D.svg('line', { x1: 8, y1: 212, x2: W - 8, y2: 212, 'class': 'sep' }, g);
    D.label(g, 8, 234, gen ? '~Circuit équivalent ligne-neutre — convention générateur~' : '~Circuit équivalent ligne-neutre — convention récepteur~',
      { size: 13, cls: 'ink2', halo: false });
    var hasR = m.Rs > 1e-9, sal = M.isSalient(m);
    var xR0 = 222, xR1 = 282, xX0 = hasR ? 338 : 270, xX1 = xX0 + 80;
    var top = 'M' + xl + ' ' + yt + 'H' + (hasR ? xR0 : xX0);
    if (hasR) top += 'M' + xR1 + ' ' + yt + 'H' + xX0;
    top += 'M' + xX1 + ' ' + yt + 'H' + xr;
    D.svg('path', { d: top + 'M' + xl + ' ' + yb + 'H' + xr + 'M' + xr + ' ' + yt + 'V' + yb, 'class': 'wire' }, g);
    if (hasR) { resistor(g, xR0, xR1, yt, 'wire'); D.label(g, 0.5 * (xR0 + xR1), yt - 15, 'R_s', { size: 15, cls: 'ink', anchor: 'middle', halo: false }); }
    coil(g, xX0, xX1, yt, 4, 'wire');
    D.label(g, 0.5 * (xX0 + xX1), yt - 17, sal ? 'X_d , X_q' : 'jX_s', { size: 15, cls: 'ink', anchor: 'middle', halo: false });
    source(g, xr, ym, 17);
    // côté réseau / charge
    if (op.bus) { D.svg('path', { d: 'M' + xl + ' ' + yt + 'V' + yb, 'class': 'wire' }, g); source(g, xl, ym, 17); }
    else if (op.load === 'vide') {
      D.svg('circle', { cx: xl, cy: yt, r: 3.5, 'class': 'wire fillbg' }, g); D.svg('circle', { cx: xl, cy: yb, r: 3.5, 'class': 'wire fillbg' }, g);
    } else if (op.load === 'cc') { D.svg('path', { d: 'M' + xl + ' ' + yt + 'V' + yb, 'class': 'wire' }, g); }
    else {
      D.svg('path', { d: 'M' + xl + ' ' + yt + 'V' + yb, 'class': 'wire' }, g);
      D.svg('rect', { x: xl - 12, y: ym - 24, width: 24, height: 48, 'class': 'wire fillbg' }, g);
      D.label(g, xl, ym + 5, 'Z', { size: 15, cls: 'ink', anchor: 'middle', halo: false });
    }
    // frontière machine / réseau
    D.svg('line', { x1: 150, y1: yt - 44, x2: 150, y2: yb + 20, 'class': 'helper' }, g);
    D.label(g, 144, yb + 18, op.bus ? '~Réseau~' : '~Charge~', { size: 12, cls: 'muted', anchor: 'end', halo: false });
    D.label(g, 156, yb + 18, '~Machine~', { size: 12, cls: 'muted', halo: false });
    // tensions
    function volt(x, lbl, cls, side) {
      D.arrow(g, { x: x, y: yb - 8 }, { x: x, y: yt + 10 }, { cls: cls, width: 1.8, head: 10 });
      D.label(g, x + side * 8, ym + 5, lbl, { size: 16, cls: cls, anchor: side > 0 ? 'start' : 'end', halo: false });
    }
    volt(96, '*V*_s', 'cV', 1);
    if (hasR) volt(310, "*E*'", 'cEp', 1);
    volt(xr - 36, '*E*', 'cE', -1);
    // courant : sortant de la machine (générateur) ou entrant (récepteur)
    var xi = 186;
    if (gen) D.arrow(g, { x: xi + 15, y: yt }, { x: xi - 15, y: yt }, { cls: 'cI', width: 2.2, head: 12 });
    else D.arrow(g, { x: xi - 15, y: yt }, { x: xi + 15, y: yt }, { cls: 'cI', width: 2.2, head: 12 });
    D.label(g, xi, yt + 22, '*I*_s', { size: 16, cls: 'cI', anchor: 'middle', halo: false });
    // sens positifs des puissances dans cette convention
    function conv(x, y, lbl) {
      var d = gen ? -1 : 1;
      D.arrow(g, { x: x - d * 16, y: y }, { x: x + d * 16, y: y }, { cls: 'ink', width: 1.3, head: 8 });
      D.label(g, x, y - 7, lbl + ' > 0', { size: 13.5, cls: 'ink', anchor: 'middle', halo: false });
    }
    conv(78, yt - 14, 'P_s , Q_s');
    conv(xr - 50, yt - 30, 'P_{em} , Q_{em}');
    // valeurs des phaseurs
    var yv = yb + 46;
    D.label(g, 8, yv, '*V*_s', { size: 15, cls: 'cV', halo: false });
    D.label(g, 34, yv, '= ' + polarTxt(u, 'V', op.Vs, 0), { size: 13, cls: 'ink', halo: false });
    D.label(g, 176, yv, '*I*_s', { size: 15, cls: 'cI', halo: false });
    D.label(g, 198, yv, '= ' + polarTxt(u, 'I', op.Is, v.angI), { size: 13, cls: 'ink', halo: false });
    D.label(g, 352, yv, '*E*', { size: 15, cls: 'cE', halo: false });
    D.label(g, 370, yv, '= ' + polarTxt(u, 'V', op.E, op.delta), { size: 13, cls: 'ink', halo: false });
  }

  global.MS.schema = { render: render };
})(window);
