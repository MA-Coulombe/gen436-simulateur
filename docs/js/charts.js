/*
 * GEN436 – Simulateur de machine synchrone
 * charts.js : courbes caractéristiques (SVG, sans dépendance externe).
 *   pdelta  puissance/couple – angle interne        mordey   courbes en « V »
 *   pq      plan P-Q et quadrants                   waves    formes d'onde de la phase a
 *   regul   caractéristique de régulation Ir(Is)    ext      caractéristique externe Vs(Is)
 *   occ     essais à vide et en court-circuit       swing    δ(t), équation du mouvement
 */
(function (global) {
  'use strict';
  var M = global.MS.model, D = global.MS.draw;
  var DEG = Math.PI / 180, uid = 0;
  var cache = {}, cacheN = 0;
  function memo(key, fn) {
    if (cache[key]) return cache[key];
    if (cacheN > 60) { cache = {}; cacheN = 0; }
    cacheN++;
    return (cache[key] = fn());
  }
  function mkey(m) { return [m.Xd, m.Xq, m.Rs].join('|'); }

  // ------------------------------------------------------------------ Plot
  function Plot(el, o) {
    this.el = el; this.o = o;
    this.ml = o.ml === undefined ? 50 : o.ml; this.mr = o.mr === undefined ? 14 : o.mr;
    this.mt = o.mt === undefined ? 12 : o.mt; this.mb = o.mb === undefined ? 40 : o.mb;
    this.x0 = o.x[0]; this.x1 = o.x[1]; this.y0 = o.y[0]; this.y1 = o.y[1];
    this.pw = o.w - this.ml - this.mr; this.ph = o.h - this.mt - this.mb;
    if (o.square) {
      var side = Math.min(this.pw, this.ph);
      this.ml += (this.pw - side) / 2; this.pw = side; this.ph = side;
    }
    this.g = D.svg('g', { transform: 'translate(' + (o.ox || 0) + ' ' + (o.oy || 0) + ')' }, el);
    var id = 'clip' + (++uid);
    var cp = D.svg('clipPath', { id: id }, this.g);
    D.svg('rect', { x: this.ml, y: this.mt, width: this.pw, height: this.ph }, cp);
    this.gGrid = D.svg('g', {}, this.g);
    this.gData = D.svg('g', { 'clip-path': 'url(#' + id + ')' }, this.g);
    this.gTop = D.svg('g', {}, this.g);
    this.series = [];
  }
  Plot.prototype.X = function (v) { return this.ml + (v - this.x0) / (this.x1 - this.x0) * this.pw; };
  Plot.prototype.Y = function (v) { return this.mt + this.ph - (v - this.y0) / (this.y1 - this.y0) * this.ph; };
  Plot.prototype.frame = function () {
    var o = this.o, g = this.gGrid, self = this;
    D.svg('rect', { x: this.ml, y: this.mt, width: this.pw, height: this.ph, 'class': 'plotbg' }, g);
    var xt = o.xTicks || D.ticks(this.x0, this.x1, o.xN || 6), yt = o.yTicks || D.ticks(this.y0, this.y1, o.yN || 5);
    var xs = o.xStep || xt.step || 1, ys = o.yStep || yt.step || 1;
    xt.forEach(function (t) {
      var x = self.X(t);
      D.svg('line', { x1: x, y1: self.mt, x2: x, y2: self.mt + self.ph, 'class': t === 0 ? 'zero' : 'grid' }, g);
      D.svg('text', { x: x, y: self.mt + self.ph + 15, 'class': 'tick', 'text-anchor': 'middle' }, g).textContent =
        (o.xFmt ? o.xFmt(t) : D.tickLabel(t, xs));
    });
    yt.forEach(function (t) {
      var y = self.Y(t);
      D.svg('line', { x1: self.ml, y1: y, x2: self.ml + self.pw, y2: y, 'class': t === 0 ? 'zero' : 'grid' }, g);
      D.svg('text', { x: self.ml - 6, y: y + 4, 'class': 'tick', 'text-anchor': 'end' }, g).textContent =
        (o.yFmt ? o.yFmt(t) : D.tickLabel(t, ys));
    });
    if (o.xlabel) D.label(g, this.ml + this.pw / 2, this.mt + this.ph + 33, o.xlabel, { size: 13, cls: 'axlbl', anchor: 'middle', halo: false });
    if (o.ylabel) {
      var t = D.label(g, 0, 0, o.ylabel, { size: 13, cls: 'axlbl', anchor: 'middle', halo: false });
      t.setAttribute('transform', 'translate(' + (this.ml - 36) + ' ' + (this.mt + this.ph / 2) + ') rotate(-90)');
    }
    return this;
  };
  // opts : name (étiquette pour l'infobulle), fn (y fonction de x), noHover
  Plot.prototype.line = function (pts, cls, opts) {
    opts = opts || {};
    var self = this, px = [];
    pts.forEach(function (p) { if (isFinite(p.x) && isFinite(p.y)) px.push({ x: self.X(p.x), y: self.Y(p.y) }); });
    D.polyline(this.gData, px, 'curve ' + cls);
    if (opts.name) this.series.push({ name: opts.name, cls: cls, pts: pts, fn: opts.fn !== false });
    return this;
  };
  Plot.prototype.hline = function (y, cls) {
    D.svg('line', { x1: this.ml, y1: this.Y(y), x2: this.ml + this.pw, y2: this.Y(y), 'class': cls }, this.gData); return this;
  };
  Plot.prototype.vline = function (x, cls) {
    return D.svg('line', { x1: this.X(x), y1: this.mt, x2: this.X(x), y2: this.mt + this.ph, 'class': cls }, this.gData);
  };
  Plot.prototype.dot = function (x, y, cls, hollow) {
    if (!isFinite(x) || !isFinite(y)) return this;
    D.svg('circle', { cx: this.X(x), cy: this.Y(y), r: 5.5, 'class': 'pt ' + cls + (hollow ? ' hollow' : '') }, this.gTop);
    return this;
  };
  Plot.prototype.text = function (x, y, spec, opts) {
    opts = opts || {};
    return D.label(this.gTop, this.X(x) + (opts.dx || 0), this.Y(y) + (opts.dy || 0), spec,
      { size: opts.size || 12, cls: opts.cls || 'ink2', anchor: opts.anchor || 'start' });
  };
  Plot.prototype.inside = function (x, y) { return x >= this.x0 && x <= this.x1 && y >= this.y0 && y <= this.y1; };
  /*
   * Étiquette directe posée sur une courbe (l'identité d'une courbe ne repose jamais sur la
   * seule couleur). where : fraction 0..1 de la partie visible, ou 'last' pour son extrémité.
   */
  Plot.prototype.tag = function (pts, where, spec, opts) {
    var self = this;
    var vis = pts.filter(function (p) { return isFinite(p.x) && isFinite(p.y) && self.inside(p.x, p.y); });
    if (!vis.length) return this;
    var p = where === 'last' ? vis[vis.length - 1] : vis[Math.min(vis.length - 1, Math.round(where * (vis.length - 1)))];
    this.text(p.x, p.y, spec, opts);
    return this;
  };

  // ---------------------------------------------------------------- légende
  function legend(box, items) {
    if (!box) return;
    D.clear(box);
    items.forEach(function (it) {
      var li = D.h('span', { 'class': 'lg' }, box);
      D.h('span', { 'class': 'key ' + it.cls + (it.dot ? ' dotkey' : '') }, li);
      D.mathInto(D.h('span', { 'class': 'lgtxt' }, li), it.text);
    });
  }

  // -------------------------------------------------------------- infobulle
  function interp(pts, x) {
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      if ((a.x <= x && x <= b.x) || (b.x <= x && x <= a.x)) {
        if (b.x === a.x) return a.y;
        return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
      }
    }
    return NaN;
  }
  function attachHover(el, tip) {
    if (el.__hover) return;
    el.__hover = true;
    el.addEventListener('pointermove', function (ev) {
      var plots = el.__plots || [], r = el.getBoundingClientRect(), vb = el.viewBox.baseVal;
      var sx = (ev.clientX - r.left) * vb.width / r.width, sy = (ev.clientY - r.top) * vb.height / r.height;
      var hit = null;
      plots.forEach(function (p) {
        var lx = sx - (p.o.ox || 0), ly = sy - (p.o.oy || 0);
        if (lx >= p.ml && lx <= p.ml + p.pw && ly >= p.mt && ly <= p.mt + p.ph && p.series.length) hit = { p: p, lx: lx, ly: ly };
      });
      if (el.__hair) { el.__hair.remove(); el.__hair = null; }
      if (!hit) { tip.hidden = true; return; }
      var p = hit.p, x = p.x0 + (hit.lx - p.ml) / p.pw * (p.x1 - p.x0), rows = [];
      p.series.forEach(function (s) {
        var y;
        if (s.fn) y = interp(s.pts, x);
        else {                                // courbe paramétrée : point le plus proche du pointeur
          var best = Infinity, yy = NaN, xx = NaN;
          s.pts.forEach(function (q) {
            var d = Math.pow(p.X(q.x) - hit.lx, 2) + Math.pow(p.Y(q.y) - hit.ly, 2);
            if (d < best) { best = d; yy = q.y; xx = q.x; }
          });
          y = yy; if (isFinite(xx)) s._x = xx;
        }
        if (isFinite(y)) rows.push({ s: s, y: y });
      });
      if (!rows.length) { tip.hidden = true; return; }
      el.__hair = D.svg('line', { x1: hit.lx, y1: p.mt, x2: hit.lx, y2: p.mt + p.ph, 'class': 'hair' }, p.gTop);
      D.clear(tip);
      var head = D.h('div', { 'class': 'tiphead' }, tip);
      D.mathInto(head, p.o.hoverX || 'x');
      head.appendChild(document.createTextNode(' = ' + (p.o.hoverXFmt ? p.o.hoverXFmt(x) : D.num(x, 2))));
      rows.forEach(function (rw) {
        var d = D.h('div', { 'class': 'tiprow' }, tip);
        D.h('span', { 'class': 'key ' + rw.s.cls }, d);
        D.h('b', {}, d, p.o.hoverYFmt ? p.o.hoverYFmt(rw.y) : D.num(rw.y, 3));
        D.mathInto(D.h('span', { 'class': 'tipname' }, d), rw.s.name);
      });
      tip.hidden = false;
      var host = tip.parentNode.getBoundingClientRect();
      var left = ev.clientX - host.left + 14, topv = ev.clientY - host.top + 12;
      if (left + tip.offsetWidth > host.width - 4) left = ev.clientX - host.left - tip.offsetWidth - 14;
      tip.style.left = Math.max(2, left) + 'px'; tip.style.top = topv + 'px';
    });
    el.addEventListener('pointerleave', function () {
      tip.hidden = true;
      if (el.__hair) { el.__hair.remove(); el.__hair = null; }
    });
  }

  function start(el, w, h) {
    D.clear(el);
    el.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    el.__plots = []; el.__hair = null;
  }
  function niceMax(v, step) { return Math.ceil(v / step - 1e-9) * step; }
  // couleur du point de fonctionnement : stable, à la limite de stabilité ou instable
  function ptCls(op) { return op.stable || op.Is < 1e-9 ? 'good' : (op.flags.atLimit ? 'warnc' : 'bad'); }

  var W = 440, H = 300;

  // ============================================================ P(δ)
  function pdelta(el, ctx, lg) {
    var m = ctx.m, op = ctx.op, u = ctx.units, sg = ctx.v.sg, kP = u.k('P');
    var sal = M.isSalient(m) && m.Rs < 1e-9;
    var raw = memo('pd|' + mkey(m) + '|' + [op.Vs, op.E, op.k].join('|'), function () { return M.curvePdelta(m, op.Vs, op.E, op.k, 241); });
    var main = [], sync = [], rel = [], pmax = 0;
    raw.forEach(function (p) {
      var x = sg * p.d / DEG;
      main.push({ x: x, y: sg * p.PE * kP }); sync.push({ x: x, y: sg * p.sync * kP }); rel.push({ x: x, y: sg * p.rel * kP });
      pmax = Math.max(pmax, Math.abs(p.PE), sal ? Math.abs(p.sync) : 0);
    });
    if (sg < 0) { main.reverse(); sync.reverse(); rel.reverse(); }
    var target = ctx.PEref === undefined ? op.PE : ctx.PEref;
    var ym = niceMax(Math.max(1.5, 1.12 * pmax, 1.1 * Math.abs(target)), 0.5) * kP;
    start(el, W, H);
    var xt = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
    var p = new Plot(el, {
      w: W, h: H, x: [-180, 180], y: [-ym, ym], xTicks: xt, xFmt: function (t) { return t + '°'; },
      xlabel: 'δ', ylabel: 'P_{em} ' + u.um('P'), hoverX: 'δ', hoverXFmt: function (x) { return D.num(x, 1) + '°'; },
      hoverYFmt: function (y) { return D.sig(y, 4) + ' ' + u.u('P'); }
    }).frame();
    el.__plots.push(p);
    // zones moteur / génératrice : δ > 0 est la génératrice en convention générateur, le moteur en récepteur
    p.text(90, -ym, sg > 0 ? '~Génératrice~' : '~Moteur~', { anchor: 'middle', dy: -7, cls: 'muted' });
    p.text(-90, -ym, sg > 0 ? '~Moteur~' : '~Génératrice~', { anchor: 'middle', dy: -7, cls: 'muted' });
    if (!op.lim.flat) [op.lim.dHi, op.lim.dLo].forEach(function (d) { if (isFinite(d)) p.vline(sg * d / DEG, 'limit'); });
    if (sal) {
      p.line(sync, 's-red dash', { name: '~terme classique~' });
      p.line(rel, 's-green dash', { name: '~terme de saillance~' });
      p.tag(sync, 0.88, '~classique~', { anchor: 'middle', dy: -7 });
      p.tag(rel, 0.63, '~saillance~', { anchor: 'middle', dy: 15 });
    }
    p.hline(sg * target * kP, 'refline s-red');
    p.line(main, 's-main', { name: 'P_{em}(δ)' });
    if (isFinite(op.delta2) && Math.abs(op.PE - target) < 1e-6) {
      p.dot(sg * op.delta2 / DEG, sg * M.powers(m, op.Vs, op.E, op.delta2, op.k).PE * kP, 'bad', true);
    }
    if (ctx.ghost) p.dot(sg * ctx.ghost.delta / DEG, sg * ctx.ghost.PE * kP, 'ghostpt', true);
    p.dot(sg * op.delta / DEG, sg * op.PE * kP, ptCls(op));
    var items = [{ cls: 's-main', text: 'P_{em}(δ) ~à~ E ~et~ V_s ~constants~' },
      { cls: 's-red', text: '~puissance imposée par l\'arbre~' }];
    if (sal) items.push({ cls: 's-red dash', text: '~terme classique~' }, { cls: 's-green dash', text: '~terme de saillance~' });
    items.push({
      cls: ptCls(op), dot: true,
      text: op.stable ? '~point de fonctionnement (stable)~' : (op.flags.atLimit ? '~point de fonctionnement (limite de stabilité)~' : '~point de fonctionnement (instable)~')
    });
    if (isFinite(op.delta2)) items.push({ cls: 'bad hollow', dot: true, text: '~équilibre instable~ A_2' });
    legend(lg, items);
  }

  // ============================================================ Mordey
  function mordey(el, ctx, lg) {
    var m = ctx.m, op = ctx.op, u = ctx.units, kV = u.k('V'), kI = u.k('I');
    var sign = op.Ps < -0.005 ? -1 : 1;
    var Emax = Math.min(3.2, Math.max(1.8, niceMax(Math.abs(op.E) + 0.15, 0.2)));
    var base = memo('mo|' + mkey(m) + '|' + [op.Vs, sign, Emax].join('|'), function () {
      return {
        c: [0, 0.5, 1.0].map(function (P) { return M.mordey(m, op.Vs, sign * P, Emax, 70); }),
        unity: M.mordeyUnity(m, op.Vs, sign, 2.2, 70),
        limit: M.mordeyLimit(m, op.Vs, sign, Emax, 60)
      };
    });
    var Pc = ctx.PsRef === undefined ? op.Ps : ctx.PsRef;
    var cur = memo('mc|' + mkey(m) + '|' + [op.Vs, Emax, Pc.toFixed(4)].join('|'), function () { return M.mordey(m, op.Vs, Pc, Emax, 70); });
    var Imax = Math.max(1.4, niceMax(op.Is + 0.1, 0.2));
    function xy(c) { return c.map(function (q) { return { x: q.E * kV, y: q.Is * kI }; }); }
    start(el, W, H);
    var p = new Plot(el, {
      w: W, h: H, mt: 20, x: [0, Emax * kV], y: [0, Imax * kI], xlabel: 'E ' + u.um('V'), ylabel: 'I_s ' + u.um('I'),
      hoverX: 'E', hoverXFmt: function (x) { return D.sig(x, 4) + ' ' + u.u('V'); },
      hoverYFmt: function (y) { return D.sig(y, 4) + ' ' + u.u('I'); }
    }).frame();
    el.__plots.push(p);
    var names = ['P_s = 0', 'P_s = ' + u.m('P', 0.5), 'P_s = ' + u.m('P', 1)], cls = ['s-ink', 's-green', 's-mag'];
    p.line(xy(base.limit), 's-lim dash', { name: '~limite de décrochage~' });
    p.line(xy(base.unity), 's-red dash', { name: '~cos~(φ) = 1' });
    base.c.forEach(function (c, i) {
      p.line(xy(c), cls[i], { name: names[i] });
      // comme sur la diapositive : Ps = 0 sur la branche gauche, les autres au départ de la courbe
      if (i === 0) p.tag(xy(c), 0.2, names[i], { anchor: 'start', dx: 8, dy: -5 });
      else p.tag(xy(c), 0, names[i], { anchor: 'start', dx: 7, dy: 13 });
    });
    p.tag(xy(base.limit), 0.4, '~décrochage~', { anchor: 'end', dx: -6, dy: -5 });
    // étiquette au-dessus du cadre, là où le lieu cos φ = 1 en sort : aucune courbe à cet endroit
    var uv = xy(base.unity).filter(function (q) { return p.inside(q.x, q.y); }), ul = uv[uv.length - 1];
    if (ul) p.text(ul.x, p.y1, '~cos~(φ) = 1', { anchor: ul.x > 0.86 * p.x1 ? 'end' : 'middle', dy: -5 });
    var showCur = [0, 0.5, 1].every(function (P) { return Math.abs(Math.abs(Pc) - P) > 0.012; });
    if (showCur) p.line(xy(cur), 's-main bold', { name: '|P_s| = ' + u.m('P', Math.abs(Pc)) });
    // régions de part et d'autre de cos φ = 1
    var yr = 0.24 * Imax, Eu = NaN;
    base.unity.forEach(function (q) { if (isNaN(Eu) && q.Is >= yr) Eu = q.E; });
    if (isNaN(Eu)) Eu = base.unity[base.unity.length - 1].E;
    if (Eu < Emax - 0.05) {
      p.text(Eu * kV, yr * kI, '~sous-excité~', { anchor: 'end', dx: -7, cls: 'ink2', size: 11 });
      if (Eu < Emax - 0.35) p.text(Eu * kV, yr * kI, '~surexcité~', { anchor: 'start', dx: 9, cls: 'ink2', size: 11 });
    }
    if (ctx.ghost) p.dot(ctx.ghost.E * kV, ctx.ghost.Is * kI, 'ghostpt', true);
    p.dot(op.E * kV, op.Is * kI, ptCls(op));
    var items = [{ cls: 's-ink', text: names[0] }, { cls: 's-green', text: names[1] }, { cls: 's-mag', text: names[2] }];
    if (showCur) items.push({ cls: 's-main bold', text: '|P_s| = ' + u.m('P', Math.abs(Pc)) + ' ~(actuel)~' });
    items.push({ cls: 's-red dash', text: '~cos~(φ) = 1' }, { cls: 's-lim dash', text: '~limite de décrochage~' },
      { cls: ptCls(op), dot: true, text: '~point de fonctionnement~' });
    legend(lg, items);
  }

  // ============================================================ plan P-Q
  function pq(el, ctx, lg) {
    var m = ctx.m, op = ctx.op, v = ctx.v, u = ctx.units, sg = v.sg, kS = u.k('P');
    var R = Math.max(1.5, niceMax(1.12 * Math.max(Math.abs(op.Ps), Math.abs(op.Qs)), 0.5));
    start(el, W, H + 60);
    var p = new Plot(el, {
      w: W, h: H + 60, x: [-R * kS, R * kS], y: [-R * kS, R * kS], square: true, xN: 6, yN: 6,
      xlabel: 'P_s ' + u.um('P'), ylabel: 'Q_s ' + u.um('Q')
    }).frame();
    el.__plots.push(p);
    // puissance apparente nominale
    D.svg('circle', { cx: p.X(0), cy: p.Y(0), r: Math.abs(p.X(kS) - p.X(0)), 'class': 'refcircle' }, p.gData);
    p.text(0.707 * kS, 0.707 * kS, 'S_n', { dx: 4, dy: -4, cls: 'muted' });
    // quadrants : le nom du fonctionnement dépend de la convention
    var names = sg > 0
      ? { I: ['Génératrice', 'surexcitée'], II: ['Moteur', 'surexcité'], III: ['Moteur', 'sous-excité'], IV: ['Génératrice', 'sous-excitée'] }
      : { I: ['Moteur', 'sous-excité'], II: ['Génératrice', 'sous-excitée'], III: ['Génératrice', 'surexcitée'], IV: ['Moteur', 'surexcité'] };
    [['I', 1, 1], ['II', -1, 1], ['III', -1, -1], ['IV', 1, -1]].forEach(function (qd) {
      // dans le coin du quadrant ; le quadrant occupé est mis en évidence
      var x = qd[1] * R * kS, y = qd[2] * R * kS, on = v.quad === qd[0];
      var o = { anchor: qd[1] > 0 ? 'end' : 'start', dx: -6 * qd[1], size: 11.5, cls: on ? 'ink strong' : 'muted' };
      o.dy = qd[2] > 0 ? 15 : -19;
      p.text(x, y, '~' + qd[0] + ' · ' + names[qd[0]][0] + '~', o);
      o.dy = qd[2] > 0 ? 28 : -6;
      p.text(x, y, '~' + names[qd[0]][1] + '~', o);
    });
    var items = [];
    if (op.bus && !op.lim.flat && isFinite(op.lim.dHi)) {
      var loc = M.pqLocusE(m, op.Vs, op.E, op.k, op.lim.dLo, op.lim.dHi, 90)
        .map(function (q) { return { x: sg * q.P * kS, y: sg * q.Q * kS }; });
      p.line(loc, 's-E', { name: 'I_r ~constant~', fn: false });
      p.vline(v.P * kS, 'refline s-red');
      items.push({ cls: 's-E', text: 'I_r ~constant (couple variable)~' }, { cls: 's-red', text: 'P_s ~constant (~I_r ~variable)~' });
    }
    // vecteur S et angle φ
    var o = { x: p.X(0), y: p.Y(0) }, t = { x: p.X(v.P * kS), y: p.Y(v.Q * kS) };
    if (op.S > 1e-4) {
      D.svg('line', { x1: o.x, y1: o.y, x2: t.x, y2: t.y, 'class': 'curve s-main' }, p.gData);
      var r = Math.min(26, 0.6 * Math.hypot(t.x - o.x, t.y - o.y));
      if (isFinite(v.phi) && Math.abs(v.phi) > 0.05 && r > 10) {
        D.arcArrow(p.gTop, o, r, 0, v.phi, { cls: 'ink', width: 1, head: 6 });
        var pm = D.onCircle(o, r + 10, v.phi / 2);
        D.label(p.gTop, pm.x, pm.y + 4, 'φ', { size: 13, cls: 'ink', anchor: 'middle' });
      }
    }
    if (ctx.ghost) p.dot(sg * ctx.ghost.Ps * kS, sg * ctx.ghost.Qs * kS, 'ghostpt', true);
    p.dot(v.P * kS, v.Q * kS, op.bus ? ptCls(op) : 'good');
    items.push({ cls: 's-main', text: 'S = P_s + jQ_s' }, { cls: 'refkey', text: 'S_n ~(courant nominal)~' });
    legend(lg, items);
  }

  // ============================================================ formes d'onde
  function waves(el, ctx, lg) {
    var op = ctx.op, v = ctx.v;
    var ym = Math.max(1.2, niceMax(1.08 * Math.max(op.Vs, Math.abs(op.E), op.Is), 0.2));
    var sv = [], se = [], si = [], x;
    for (x = 0; x <= 720; x += 4) {
      sv.push({ x: x, y: op.Vs * Math.cos(x * DEG) });
      se.push({ x: x, y: op.E * Math.cos(x * DEG + op.delta) });
      si.push({ x: x, y: op.Is > 1e-9 ? op.Is * Math.cos(x * DEG + v.angI) : 0 });
    }
    start(el, W, H);
    var p = new Plot(el, {
      w: W, h: H, x: [0, 720], y: [-ym, ym], xTicks: [0, 90, 180, 270, 360, 450, 540, 630, 720],
      xFmt: function (t) { return t + '°'; }, xlabel: 'ω_st', ylabel: '~valeur instantanée (pu)~',
      hoverX: 'ω_st', hoverXFmt: function (t) { return D.num(t, 0) + '°'; }
    }).frame();
    el.__plots.push(p);
    p.line(sv, 's-V', { name: 'v_a' }); p.line(se, 's-E dash', { name: 'e_a' }); p.line(si, 's-I', { name: 'i_a' });
    // étiquettes directes, chacune sur une crête différente pour ne pas se chevaucher
    function crest(pts, a, b, sign) {
      var best = null;
      pts.forEach(function (q) { if (q.x >= a && q.x <= b && (!best || sign * q.y > sign * best.y)) best = q; });
      return best;
    }
    var cv = crest(sv, 200, 520, 1), ce = crest(se, 380, 716, 1), ci = crest(si, 60, 420, -1);
    if (op.Vs > 0.05) p.text(cv.x, cv.y, 'v_a', { anchor: 'middle', dy: -6, size: 13, cls: 'ink' });
    if (Math.abs(op.E) > 0.05) p.text(ce.x, ce.y, 'e_a', { anchor: 'middle', dy: -6, size: 13, cls: 'ink' });
    if (op.Is > 0.05) p.text(ci.x, ci.y, 'i_a', { anchor: 'middle', dy: 15, size: 13, cls: 'ink' });
    el.__cursor = p.vline(0, 'cursor'); el.__cursorPlot = p;
    legend(lg, [{ cls: 's-V', text: 'v_a(t)' }, { cls: 's-E dash', text: 'e_a(t)' }, { cls: 's-I', text: 'i_a(t)' },
      { cls: 'cursorkey', text: '~instant de l\'animation~' }]);
  }
  function setCursor(el, theta) {
    if (!el.__cursor) return;
    var x = el.__cursorPlot.X(((theta / DEG) % 720 + 720) % 720);
    el.__cursor.setAttribute('x1', x); el.__cursor.setAttribute('x2', x);
  }

  // ============================================================ régulation
  var PF = Math.acos(0.8);
  function regul(el, ctx, lg) {
    var m = ctx.m, op = ctx.op, u = ctx.units, kI = u.k('I'), kR = u.k('Ir');
    var phi = ctx.inp.phiL, IsMax = Math.max(1.5, niceMax(op.Is + 0.1, 0.5));
    var set = memo('rg|' + mkey(m) + '|' + [op.Vs, op.k, IsMax].join('|'), function () {
      return [-PF, 0, PF].map(function (f) { return M.regulation(m, op.Vs, f, op.k, IsMax, 60); });
    });
    var cur = M.regulation(m, op.Vs, phi, op.k, IsMax, 60);
    var irMax = 1;
    set.concat([cur]).forEach(function (c) { c.forEach(function (q) { irMax = Math.max(irMax, q.ir); }); });
    irMax = Math.min(4, niceMax(irMax * 1.05, 0.5));
    function xy(c) { return c.map(function (q) { return { x: q.ir * kR, y: q.Is * kI }; }); }
    start(el, W, H);
    var p = new Plot(el, {
      w: W, h: H, x: [0, irMax * kR], y: [0, IsMax * kI], xlabel: 'I_r ' + u.um('Ir'), ylabel: 'I_s ' + u.um('I')
    }).frame();
    el.__plots.push(p);
    p.hline(kI, 'refline'); p.text(0, kI, 'I_{sn}', { dx: 5, dy: -5, cls: 'muted' });
    var cls = ['s-ink', 's-green', 's-red'], names = ['~cos~(φ) = 0,8 ~AV.~', '~cos~(φ) = 1', '~cos~(φ) = 0,8 ~RET.~'];
    set.forEach(function (c, i) {
      p.line(xy(c), cls[i], { name: names[i], fn: false });
      p.tag(xy(c), i === 1 ? 0.55 : 'last', ['~AV.~', '~cos~(φ) = 1', '~RET.~'][i], { anchor: 'end', dx: -7, dy: i === 1 ? 4 : 14 });
    });
    p.line(xy(cur), 's-main bold', { name: '~charge actuelle~', fn: false });
    if (ctx.ghost) p.dot(ctx.ghost.ir * kR, ctx.ghost.Is * kI, 'ghostpt', true);
    p.dot(op.ir * kR, op.Is * kI, 'good');
    legend(lg, [{ cls: 's-ink', text: names[0] }, { cls: 's-green', text: names[1] }, { cls: 's-red', text: names[2] },
      { cls: 's-main bold', text: '~cos~(φ) ~de la charge actuelle~' }, { cls: 'good', dot: true, text: '~point de fonctionnement~' }]);
  }

  // ============================================================ caractéristique externe
  function ext(el, ctx, lg) {
    var m = ctx.m, op = ctx.op, u = ctx.units, kI = u.k('I'), kV = u.k('V');
    var ir = op.ir, k = op.k;
    var set = memo('ex|' + mkey(m) + '|' + [ir, k].join('|'), function () {
      return [-PF, 0, PF].map(function (f) { return M.external(m, ir, k, f, 90); });
    });
    var cur = M.external(m, ir, k, ctx.inp.phiL, 90);
    var Imax = 0.5;
    set.concat([cur]).forEach(function (c) { c.forEach(function (q) { if (q.Is < 4) Imax = Math.max(Imax, q.Is); }); });
    Imax = Math.min(3, niceMax(Imax * 1.05, 0.5));
    var Vmax = Math.min(3, niceMax(Math.max(1.2, 1.5 * ir * k, op.Vs * 1.1), 0.5));
    function xy(c) { return c.map(function (q) { return { x: q.Is * kI, y: q.Vs * kV }; }); }
    start(el, W, H);
    var p = new Plot(el, {
      w: W, h: H, x: [0, Imax * kI], y: [0, Vmax * kV], xlabel: 'I_s ' + u.um('I'), ylabel: 'V_s ' + u.um('V')
    }).frame();
    el.__plots.push(p);
    var cls = ['s-ink', 's-green', 's-red'], names = ['~cos~(φ) = 0,8 ~AV.~', '~cos~(φ) = 1', '~cos~(φ) = 0,8 ~RET.~'];
    set.forEach(function (c, i) {
      p.line(xy(c), cls[i], { name: names[i], fn: false });
      p.tag(xy(c), 0.6, ['~AV.~', '~cos~(φ) = 1', '~RET.~'][i], { anchor: i === 2 ? 'end' : 'start', dx: i === 2 ? -6 : 6, dy: i === 2 ? 12 : -5 });
    });
    p.line(xy(cur), 's-main bold', { name: '~charge actuelle~', fn: false });
    if (ctx.ghost) p.dot(ctx.ghost.Is * kI, ctx.ghost.Vs * kV, 'ghostpt', true);
    p.dot(op.Is * kI, op.Vs * kV, 'good');
    legend(lg, [{ cls: 's-ink', text: names[0] }, { cls: 's-green', text: names[1] }, { cls: 's-red', text: names[2] },
      { cls: 's-main bold', text: '~cos~(φ) ~de la charge actuelle~' }, { cls: 'good', dot: true, text: '~point de fonctionnement~' }]);
  }

  // ============================================================ essais à vide et en court-circuit
  function occ(el, ctx, lg) {
    var m = ctx.m, op = ctx.op, u = ctx.units, kV = u.k('V'), kI = u.k('I'), kR = u.k('Ir');
    var k = op.k, irMax = Math.max(2, niceMax(op.ir + 0.1, 0.5));
    var zcc = Math.sqrt(m.Rs * m.Rs + m.Xd * k * m.Xd * k);
    var Emax = niceMax(irMax * Math.max(1, k), 0.5), Icc = niceMax(irMax * k / zcc, 0.5);
    start(el, W, H);
    var w2 = W / 2;
    var a = new Plot(el, {
      w: w2, h: H, x: [0, irMax * kR], y: [0, Emax * kV], xN: 4, xlabel: 'I_r ' + u.um('Ir'), ylabel: 'E ' + u.um('V'),
      hoverX: 'I_r', hoverXFmt: function (x) { return D.sig(x, 4) + ' ' + u.u('Ir'); }, hoverYFmt: function (y) { return D.sig(y, 4) + ' ' + u.u('V'); }
    }).frame();
    var b = new Plot(el, {
      ox: w2, w: w2, h: H, x: [0, irMax * kR], y: [0, Icc * kI], xN: 4, xlabel: 'I_r ' + u.um('Ir'), ylabel: 'I_{scc} ' + u.um('I'),
      hoverX: 'I_r', hoverXFmt: function (x) { return D.sig(x, 4) + ' ' + u.u('Ir'); }, hoverYFmt: function (y) { return D.sig(y, 4) + ' ' + u.u('I'); }
    }).frame();
    el.__plots.push(a, b);
    a.line([{ x: 0, y: 0 }, { x: irMax * kR, y: irMax * kV }], 's-main', { name: 'E(I_r) ~à~ Ω_{sn}' });
    if (Math.abs(k - 1) > 1e-3) a.line([{ x: 0, y: 0 }, { x: irMax * kR, y: irMax * k * kV }], 's-green', { name: 'E(I_r) ~à~ Ω_s' });
    a.dot(op.ir * kR, op.ir * k * kV, 'good', op.load !== 'vide');
    b.line([{ x: 0, y: 0 }, { x: irMax * kR, y: irMax * k / zcc * kI }], 's-I', { name: 'I_{scc}(I_r)' });
    b.hline(kI, 'refline'); b.text(0, kI, 'I_{sn}', { dx: 5, dy: -5, cls: 'muted' });
    b.dot(op.ir * kR, op.ir * k / zcc * kI, 'good', op.load !== 'cc');
    var items = [{ cls: 's-main', text: 'E = K_{Ωsn} I_r ~(vitesse nominale)~' }];
    if (Math.abs(k - 1) > 1e-3) items.push({ cls: 's-green', text: 'E ~à la vitesse actuelle~' });
    items.push({ cls: 's-I', text: 'I_{scc} = E / √(R_s^2 + X_s^2)' });
    legend(lg, items);
  }

  // ============================================================ δ(t)
  function swing(el, ctx, lg) {
    var dyn = ctx.dyn, sg = ctx.v.sg, T = 8;
    var t1 = Math.max(T, dyn.t), t0 = t1 - T;
    var pts = [];
    dyn.hist.forEach(function (h) { if (h.t >= t0) pts.push({ x: h.t, y: sg * h.d / DEG }); });
    start(el, W, H);
    var p = new Plot(el, {
      w: W, h: H, x: [t0, t1], y: [-180, 180], yTicks: [-180, -90, 0, 90, 180], yFmt: function (t) { return t + '°'; },
      xlabel: 't (s)', ylabel: 'δ', hoverX: 't', hoverXFmt: function (x) { return D.num(x, 2) + ' s'; },
      hoverYFmt: function (y) { return D.num(y, 1) + '°'; }
    }).frame();
    el.__plots.push(p);
    if (isFinite(dyn.dEq)) p.hline(sg * dyn.dEq / DEG, 'refline s-green');
    if (isFinite(dyn.dCrit)) p.hline(sg * dyn.dCrit / DEG, 'refline s-red');
    p.line(pts, 's-main', { name: 'δ(t)' });
    legend(lg, [{ cls: 's-main', text: 'δ(t)' }, { cls: 's-green', text: '~équilibre stable~' }, { cls: 's-red', text: '~équilibre instable (angle critique)~' }]);
  }

  var GHOSTED = { pdelta: 1, mordey: 1, pq: 1, regul: 1, ext: 1 };
  var KINDS = { pdelta: pdelta, mordey: mordey, pq: pq, waves: waves, regul: regul, ext: ext, occ: occ, swing: swing };
  function render(kind, el, ctx, lg, tip) {
    KINDS[kind](el, ctx, lg);
    if (ctx.ghost && lg && GHOSTED[kind]) {              // rappel de l'état mémorisé dans la légende
      var li = D.h('span', { 'class': 'lg' }, lg);
      D.h('span', { 'class': 'key ghostpt dotkey hollow' }, li);
      D.h('span', { 'class': 'lgtxt rm' }, li, 'état mémorisé');
    }
    if (tip) attachHover(el, tip);
  }

  global.MS.charts = { render: render, setCursor: setCursor };
})(window);
