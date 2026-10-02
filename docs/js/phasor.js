/*
 * GEN436 – Simulateur de machine synchrone
 * phasor.js : diagramme vectoriel (phaseurs électriques, fmm, axes d-q, axes P-Q, lieux).
 *
 * Mêmes conventions de dessin que les notes de cours : Vs à 0° (rouge), Is (bleu), E (vert),
 * chutes de tension en bleu, rotation anti-horaire. Le courant et les fmm sont tracés avec
 * leur propre échelle (CI, CF) : seules leur direction et leur évolution comptent.
 */
(function (global) {
  'use strict';
  var M = global.MS.model, D = global.MS.draw;
  var W = 660, H = 500, PAD = 50;
  var CI = 0.5, CF = 0.8;
  var view = null;

  function add(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function mul(a, s) { return { re: a.re * s, im: a.im * s }; }
  function proj(a, ang) {                     // projection de a sur la direction ang
    var c = Math.cos(ang), s = Math.sin(ang), d = a.re * c + a.im * s;
    return { re: d * c, im: d * s };
  }

  // ---------------------------------------------- placement des étiquettes sans chevauchement
  function Labels(layer) { this.layer = layer; this.boxes = []; }
  Labels.prototype.width = function (spec, size) {
    var w = 0;
    D.parseMath(spec).forEach(function (r) { w += r.t.length * size * (r.lvl ? 0.42 : (r.b ? 0.64 : 0.54)); });
    return w;
  };
  Labels.prototype.box = function (c, w, size) {
    var x0 = c.anchor === 'middle' ? c.x - w / 2 : (c.anchor === 'end' ? c.x - w : c.x);
    return { x0: x0 - 2, x1: x0 + w + 2, y0: c.y - 0.82 * size, y1: c.y + 0.34 * size };
  };
  Labels.prototype.free = function (b) {
    if (b.x0 < 2 || b.x1 > W - 2 || b.y0 < 2 || b.y1 > H - 2) return false;
    for (var i = 0; i < this.boxes.length; i++) {
      var o = this.boxes[i];
      if (b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) return false;
    }
    return true;
  };
  // cands : positions candidates { x, y, anchor } par ordre de préférence
  Labels.prototype.put = function (cands, spec, size, cls) {
    var w = this.width(spec, size), pick = null, b;
    for (var i = 0; i < cands.length && !pick; i++) {
      b = this.box(cands[i], w, size);
      if (this.free(b)) pick = cands[i];
    }
    if (!pick) { pick = cands[0]; b = this.box(pick, w, size); }
    this.boxes.push(b);
    D.label(this.layer, pick.x, pick.y, spec, { size: size, cls: cls, anchor: pick.anchor });
  };
  function anchorOf(dx) { return dx > 0.35 ? 'start' : (dx < -0.35 ? 'end' : 'middle'); }

  function render(el, ctx) {
    var m = ctx.m, op = ctx.op, v = ctx.v, ov = ctx.ov, gen = ctx.conv !== 'rec';
    var sal = M.isSalient(m), hasI = op.Is > 1e-6, hasR = m.Rs > 1e-9 && hasI;
    var O = { re: 0, im: 0 }, V = { re: op.Vs, im: 0 };
    var Et = M.polar(op.E, op.delta), Ep = op.Ep;
    var A = add(Ep, M.polar(op.Xq * op.Iq, op.delta + Math.PI / 2));   // E' + jXq·Isq
    var It = mul(v.I, CI);
    var vecs = [], lines = [], pts = [O, V, Et, It], back = [];

    // prio : ordre de placement des étiquettes (0 = phaseurs principaux)
    function vec(from, to, cls, lbl, prio, mid) {
      vecs.push({ from: from, to: to, cls: cls, lbl: lbl, prio: prio, mid: !!mid });
      pts.push(from, to);
    }
    function dash(a, b, cls) { lines.push({ a: a, b: b, cls: cls || 'helper' }); pts.push(a, b); }

    // --- chutes de tension : Vs — (Rs·Is) — E' — (jX·Is) — E, orientées selon la convention
    if (hasI) {
      if (hasR) {
        if (gen) vec(V, Ep, 'cI thin', 'R_s*I*_s', 1, true); else vec(Ep, V, 'cI thin', 'R_s*I*_s', 1, true);
      }
      if (sal) {
        if (gen) { vec(Ep, A, 'cI', 'jX_q*I*_{sq}', 1, true); vec(A, Et, 'cI', 'jX_d*I*_{sd}', 1, true); }
        else { vec(Et, A, 'cI', 'jX_d*I*_{sd}', 1, true); vec(A, Ep, 'cI', 'jX_q*I*_{sq}', 1, true); }
      } else if (gen) vec(Ep, Et, 'cI', 'jX_s*I*_s', 1, true);
      else vec(Et, Ep, 'cI', 'jX_s*I*_s', 1, true);
    }
    if (hasR) vec(O, Ep, 'cEp', "*E*'", 1);
    if (op.Vs > 1e-6) vec(O, V, 'cV', '*V*_s', 0);
    if (Math.abs(op.E) > 1e-6) vec(O, Et, 'cE', '*E*', 0);
    if (hasI) vec(O, It, 'cI', '*I*_s', 0);

    // --- état mémorisé (bouton « Mémoriser cet état ») : tracé en gris pour comparaison
    var ghost = null;
    if (ctx.ghost) {
      ghost = { V: { re: ctx.ghost.Vs, im: 0 }, E: M.polar(ctx.ghost.E, ctx.ghost.delta), I: mul(M.view(ctx.ghost, ctx.conv).I, CI) };
      pts.push(ghost.V, ghost.E, ghost.I);
    }

    // --- axes d-q
    var uq = v.angQ, ud = v.angD;
    if (ov.dq || ov.decomp) {
      var L = 1.15 * Math.max(0.7, Math.abs(op.E), ov.fmm ? CF * M.hyp(v.Fr) : 0);
      back.push({ a: M.polar(-0.3 * L, uq), b: M.polar(L, uq), cls: 'cDq', lbl: 'q' });
      back.push({ a: M.polar(-0.3 * L, ud), b: M.polar(L, ud), cls: 'cDq', lbl: 'd' });
      pts.push(M.polar(L, uq), M.polar(L, ud), M.polar(-0.3 * L, uq), M.polar(-0.3 * L, ud));
    }
    // --- forces magnétomotrices
    if (ov.fmm) {
      var Fr = mul(v.Fr, CF), Fs = mul(v.Fs, CF), F = mul(v.F, CF);
      if (M.hyp(Fr) > 1e-6) vec(O, Fr, 'cFr', '*F*_r', 2);
      if (hasI) {
        vec(O, Fs, 'cFs', '*F*_s', 2);
        vec(O, F, 'cF', '*F*', 2);
        dash(Fr, F); dash(Fs, F);
      }
      if (ov.decomp && hasI) {
        var Fsd = proj(Fs, ud), Fsq = proj(Fs, uq);
        vec(O, Fsd, 'cFs thin', '*F*_{sd}', 3); vec(O, Fsq, 'cFs thin', '*F*_{sq}', 3);
        dash(Fs, Fsd); dash(Fs, Fsq);
      }
    }
    if (ov.decomp && hasI) {
      var Isd = proj(It, ud), Isq = proj(It, uq);
      vec(O, Isd, 'cI thin', '*I*_{sd}', 3); vec(O, Isq, 'cI thin', '*I*_{sq}', 3);
      dash(It, Isd); dash(It, Isq);
    }
    // --- axes P et Q (origine à l'extrémité de Vs ; leur sens dépend de la convention)
    if (ov.pq && !sal && op.Vs > 1e-6) {
      var sg = v.sg, dq = sg * (Et.re - V.re), dp = sg * Et.im;
      var qa = Math.min(-0.25, dq - 0.15), qb = Math.max(0.6, dq + 0.25);
      var pa = Math.min(-0.25, dp - 0.15), pb = Math.max(0.6, dp + 0.25);
      back.push({ a: { re: V.re + sg * qa, im: 0 }, b: { re: V.re + sg * qb, im: 0 }, cls: 'cPQ', lbl: 'Q' });
      back.push({ a: { re: V.re, im: sg * pa }, b: { re: V.re, im: sg * pb }, cls: 'cPQ', lbl: 'P' });
      pts.push({ re: V.re + sg * qa, im: 0 }, { re: V.re + sg * qb, im: 0 }, { re: V.re, im: sg * pa }, { re: V.re, im: sg * pb });
      if (hasI) {
        dash(Et, { re: Et.re, im: 0 }, 'helper pq'); dash(Et, { re: V.re, im: Et.im }, 'helper pq');
      }
    }
    // --- lieux géométriques de l'extrémité de E (réseau infini)
    var loci = null;
    if (ov.loci && op.bus) {
      loci = { R: Math.abs(op.E) };
      loci.P = M.locusPconst(m, op.Vs, op.PE, 3.0, 70).map(function (p) { return M.polar(p.E, p.delta); });
      if (isFinite(op.lim.dHi) && !op.lim.flat) loci.lim = [op.lim.dLo, op.lim.dHi];
      // le cercle n'entre pas dans le cadrage : seul l'arc voisin de E doit rester lisible
      pts.push(M.polar(loci.R, op.delta + 0.5), M.polar(loci.R, op.delta - 0.5));
    }

    // ------------------------------------------------------------ cadrage
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(function (p) {
      if (!isFinite(p.re) || !isFinite(p.im)) return;
      x0 = Math.min(x0, p.re); x1 = Math.max(x1, p.re); y0 = Math.min(y0, p.im); y1 = Math.max(y1, p.im);
    });
    var q = 0.25;
    var box = {
      x0: Math.floor((x0 - 0.12) / q) * q, x1: Math.ceil((x1 + 0.12) / q) * q,
      y0: Math.floor((y0 - 0.12) / q) * q, y1: Math.ceil((y1 + 0.12) / q) * q
    };
    if (box.x1 - box.x0 < 1.5) box.x1 = box.x0 + 1.5;
    if (box.y1 - box.y0 < 1.0) { var cy0 = 0.5 * (box.y0 + box.y1); box.y0 = cy0 - 0.5; box.y1 = cy0 + 0.5; }
    if (!view || ctx.refit) view = box;
    else {                                   // la vue ne fait que s'agrandir : pas de zoom incessant
      view = {
        x0: Math.min(view.x0, box.x0), x1: Math.max(view.x1, box.x1),
        y0: Math.min(view.y0, box.y0), y1: Math.max(view.y1, box.y1)
      };
    }
    var sc = Math.min((W - 2 * PAD) / (view.x1 - view.x0), (H - 2 * PAD) / (view.y1 - view.y0));
    var cx = W / 2 - sc * 0.5 * (view.x0 + view.x1), cy = H / 2 + sc * 0.5 * (view.y0 + view.y1);
    function P(z) { return { x: cx + sc * z.re, y: cy - sc * z.im }; }
    var o = P(O);

    // ------------------------------------------------------------- dessin
    D.clear(el);
    el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var gBack = D.svg('g', {}, el), gHelp = D.svg('g', {}, el), gArc = D.svg('g', {}, el),
      gVec = D.svg('g', {}, el), gLab = D.svg('g', {}, el);
    var lab = new Labels(gLab);

    // référence 0° et repère de rotation
    D.svg('line', { x1: 0, y1: o.y, x2: W, y2: o.y, 'class': 'ref' }, gBack);
    var rc = { x: W - 50, y: 44 };
    D.arcArrow(gBack, rc, 22, -0.5, 1.5, { cls: 'ink2', width: 1.2 });
    D.label(gLab, rc.x + 2, rc.y + 6, 'ω_s', { size: 14, cls: 'ink2', anchor: 'middle' });
    lab.boxes.push({ x0: rc.x - 28, x1: rc.x + 28, y0: rc.y - 28, y1: rc.y + 28 });
    // échelle
    var bar = 0.5 * sc, bx = 16, by = H - 14;
    D.svg('path', { d: 'M' + bx + ' ' + (by - 4) + 'v4h' + bar.toFixed(1) + 'v-4', 'class': 'scale' }, gBack);
    D.label(gLab, bx + bar + 6, by + 1, '0,5 pu ~(tension)~', { size: 12, cls: 'muted' });
    lab.boxes.push({ x0: bx - 2, x1: bx + bar + 100, y0: by - 14, y1: by + 6 });

    if (loci) {
      D.svg('circle', { cx: o.x, cy: o.y, r: (loci.R * sc).toFixed(1), 'class': 'locus' }, gBack);
      if (loci.P.length > 1) D.polyline(gBack, loci.P.map(P), 'locus locusP');
      if (loci.lim) loci.lim.forEach(function (a) {
        var e = P(M.polar(Math.max(0.5, loci.R * 1.12), a));
        D.svg('line', { x1: o.x, y1: o.y, x2: e.x, y2: e.y, 'class': 'limit' }, gBack);
      });
    }
    back.forEach(function (b) {
      D.arrow(gBack, P(b.a), P(b.b), { cls: b.cls + ' axis', width: 1.1, head: 9 });
    });
    lines.forEach(function (ln) {
      var a = P(ln.a), b = P(ln.b);
      D.svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': ln.cls }, gHelp);
    });
    if (ghost) {
      [ghost.V, ghost.E, ghost.I].forEach(function (z) { D.arrow(gHelp, o, P(z), { cls: 'ghost', width: 1.5, head: 9 }); });
      var gv = P(ghost.V), ge = P(ghost.E);
      D.svg('line', { x1: gv.x, y1: gv.y, x2: ge.x, y2: ge.y, 'class': 'ghostline' }, gHelp);
    }

    // vecteurs (tracés dans l'ordre de la liste), puis étiquettes par ordre de priorité
    var cen = P({ re: (V.re + Et.re) / 3, im: Et.im / 3 }), jobs = [];
    vecs.forEach(function (it) {
      var p0 = P(it.from), p1 = P(it.to);
      var dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.sqrt(dx * dx + dy * dy);
      if (l < 1.5) return;
      var thin = it.cls.indexOf('thin') >= 0;
      D.arrow(gVec, p0, p1, { cls: it.cls, width: thin ? 1.5 : 2.4, head: thin ? 9 : 12 });
      var ux = dx / l, uy = dy / l, nx = -uy, ny = ux, cands = [];
      var cls = it.cls.split(' ')[0], size = thin ? 14 : 16;
      function c(x, y, ax) { cands.push({ x: x, y: y + 5, anchor: anchorOf(ax) }); }
      if (it.mid) {
        var mx = 0.5 * (p0.x + p1.x), my = 0.5 * (p0.y + p1.y);
        if ((mx + nx - cen.x) * nx + (my + ny - cen.y) * ny < 0) { nx = -nx; ny = -ny; }   // vers l'extérieur
        c(mx + nx * 14, my + ny * 14, nx); c(mx - nx * 14, my - ny * 14, -nx);
        c(mx + nx * 28, my + ny * 28, nx); c(mx - nx * 28, my - ny * 28, -nx);
      } else {
        if (cls === 'cV') cands.push({ x: p1.x - 6, y: p1.y - 9, anchor: 'end' });   // comme dans les notes
        c(p1.x + ux * 13, p1.y + uy * 13, ux);
        c(p1.x + nx * 15 - ux * 4, p1.y + ny * 15 - uy * 4, nx); c(p1.x - nx * 15 - ux * 4, p1.y - ny * 15 - uy * 4, -nx);
        c(p1.x + ux * 28, p1.y + uy * 28, ux);
        c(p1.x + nx * 26, p1.y + ny * 26, nx); c(p1.x - nx * 26, p1.y - ny * 26, -nx);
      }
      jobs.push({ prio: it.prio, cands: cands, spec: it.lbl, size: size, cls: cls });
    });

    // angles : δ entre Vs et E, φ de Is vers Vs, ψ de Is vers E
    if (ov.angles) {
      var lenV = op.Vs * sc, lenE = Math.abs(op.E) * sc, lenI = op.Is * CI * sc, arcs = [];
      if (op.Vs > 1e-6 && Math.abs(op.E) > 1e-6 && Math.abs(op.delta) > 0.035) {
        arcs.push({ a0: gen ? 0 : op.delta, a1: gen ? op.delta : 0, r: Math.min(70, 0.85 * Math.min(lenV, lenE)), lbl: 'δ' });
      }
      if (hasI && isFinite(v.phi) && Math.abs(v.phi) > 0.035) {
        arcs.push({ a0: v.angI, a1: v.angI + v.phi, r: Math.min(38, 0.8 * Math.min(lenV, lenI)), lbl: 'φ' });
      }
      if (hasI && isFinite(v.psi) && Math.abs(v.psi) > 0.035) {
        arcs.push({ a0: v.angI, a1: v.angI + v.psi, r: Math.min(54, 0.95 * Math.min(lenE, lenI)), lbl: 'ψ' });
      }
      arcs.forEach(function (a) {
        if (a.r < 14) return;
        D.arcArrow(gArc, o, a.r, a.a0, a.a1, { cls: 'ink', width: 1.1, head: 7 });
        var cands = [0.5, 0.3, 0.7, 0.85, 0.15].map(function (f) {
          var pm = D.onCircle(o, a.r + 11, a.a0 + f * (a.a1 - a.a0));
          return { x: pm.x, y: pm.y + 5, anchor: 'middle' };
        });
        jobs.push({ prio: 1.5, cands: cands, spec: a.lbl, size: 15, cls: 'ink' });
      });
    }
    // axes
    back.forEach(function (b) {
      var p0 = P(b.a), p1 = P(b.b), dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / l, uy = dy / l;
      jobs.push({
        prio: 4, spec: b.lbl, size: 14, cls: b.cls,
        cands: [{ x: p1.x + ux * 12, y: p1.y + uy * 12 + 5, anchor: 'middle' },
          { x: p1.x - uy * 13 - ux * 6, y: p1.y + ux * 13 - uy * 6 + 5, anchor: 'middle' },
          { x: p1.x + uy * 13 - ux * 6, y: p1.y - ux * 13 - uy * 6 + 5, anchor: 'middle' }]
      });
    });
    if (loci) {
      var pe = P(M.polar(loci.R, op.delta + (op.delta >= 0 ? 0.42 : -0.42)));
      jobs.push({ prio: 5, spec: 'I_r = ~cte~', size: 12, cls: 'muted', cands: [{ x: pe.x, y: pe.y - 6, anchor: 'middle' }, { x: pe.x, y: pe.y + 16, anchor: 'middle' }] });
      if (loci.P.length > 1) {
        var pl = P(loci.P[0]), xl = Math.max(60, Math.min(pl.x, W - 12));
        jobs.push({ prio: 5, spec: 'P = ~cte~', size: 12, cls: 'muted', cands: [{ x: xl, y: pl.y - 7, anchor: 'end' }, { x: xl, y: pl.y + 15, anchor: 'end' }] });
      }
      if (loci.lim) {
        // au bout du rayon limite si la place est libre, sinon plus près de l'origine
        var aLim = op.delta >= 0 ? op.lim.dHi : op.lim.dLo, rLim = Math.max(0.5, loci.R * 1.12), lc = [];
        [1, 0.8, 0.6, 0.4].forEach(function (f) {
          var e2 = P(M.polar(rLim * f, aLim));
          var ey = Math.max(16, Math.min(H - 8, e2.y + (f < 1 ? 4 : (op.delta >= 0 ? 2 : 12))));
          lc.push({ x: e2.x + 5, y: ey, anchor: 'start' }, { x: e2.x - 5, y: ey, anchor: 'end' });
        });
        jobs.push({ prio: 5, spec: '~décrochage~', size: 12, cls: 'bad', cands: lc });
      }
    }
    jobs.sort(function (a, b) { return a.prio - b.prio; });
    jobs.forEach(function (j) { lab.put(j.cands, j.spec, j.size, j.cls); });
    // poignée : l'extrémité de E peut être déplacée à la souris ou au doigt (voir app.js)
    if (ctx.dragE) {
      var pe2 = P(Et);
      D.svg('circle', { cx: pe2.x, cy: pe2.y, r: 11, 'class': 'handle' }, el);
    }
    geom = { sc: sc, cx: cx, cy: cy };
    return { scale: sc };
  }

  // Coordonnées (pu) du point de l'écran (clientX, clientY) dans le dernier diagramme tracé.
  var geom = null;
  function toComplex(el, clientX, clientY) {
    var r = el.getBoundingClientRect();
    var x = (clientX - r.left) * W / r.width, y = (clientY - r.top) * H / r.height;
    return { re: (x - geom.cx) / geom.sc, im: (geom.cy - y) / geom.sc };
  }

  function reset() { view = null; }

  global.MS.phasor = { render: render, reset: reset, toComplex: toComplex, CI: CI, CF: CF };
})(window);
