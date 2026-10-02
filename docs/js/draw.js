/*
 * GEN436 – Simulateur de machine synchrone
 * draw.js : utilitaires SVG (flèches, arcs, étiquettes mathématiques) et formatage des nombres.
 *
 * Mini-syntaxe des étiquettes mathématiques :
 *    *V*        phaseur / vecteur (gras droit)
 *    _s  _{sd}  indice            ^2  ^{max}  exposant
 *    ~cos~      texte droit       le reste est en italique (les chiffres et signes restent droits)
 */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var UPRIGHT = /[0-9+\-−=()°.,·∠×\s<>≈∝|\/:;%'′]/;

  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var key in attrs) if (attrs[key] !== undefined && attrs[key] !== null) e.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function h(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    for (var key in (attrs || {})) {
      if (key === 'class') e.className = attrs[key]; else e.setAttribute(key, attrs[key]);
    }
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  // ------------------------------------------------------------ étiquettes
  function parseMath(spec) {
    var runs = [], i = 0, n = spec.length;
    function push(t, o) {
      if (!t) return;
      var last = runs[runs.length - 1];
      if (last && last.b === !!o.b && last.i === !!o.i && last.rm === !!o.rm && last.lvl === (o.lvl || 0)) last.t += t;
      else runs.push({ t: t, b: !!o.b, i: !!o.i, rm: !!o.rm, lvl: o.lvl || 0 });
    }
    function plain(text, lvl) {
      var rm = false;
      for (var j = 0; j < text.length; j++) {
        var ch = text.charAt(j);
        if (ch === '~') { rm = !rm; continue; }           // texte droit à l'intérieur d'un indice
        push(ch, { i: lvl === 0 && !UPRIGHT.test(ch), rm: rm, lvl: lvl });
      }
    }
    while (i < n) {
      var c = spec.charAt(i), end;
      if (c === '*') {
        end = spec.indexOf('*', i + 1); if (end < 0) end = n;
        push(spec.slice(i + 1, end), { b: true }); i = end + 1;
      } else if (c === '~') {
        end = spec.indexOf('~', i + 1); if (end < 0) end = n;
        push(spec.slice(i + 1, end), { rm: true }); i = end + 1;
      } else if (c === '_' || c === '^') {
        var lvl = c === '_' ? -1 : 1, body;
        if (spec.charAt(i + 1) === '{') {
          end = spec.indexOf('}', i + 2); if (end < 0) end = n;
          body = spec.slice(i + 2, end); i = end + 1;
        } else { body = spec.charAt(i + 1); i += 2; }
        plain(body, lvl);
      } else { plain(c, 0); i++; }
    }
    return runs;
  }

  // Étiquette mathématique SVG. opts : size, anchor, cls, halo (contour de la couleur de fond).
  function label(parent, x, y, spec, opts) {
    opts = opts || {};
    var size = opts.size || 15;
    var t = svg('text', {
      x: x, y: y, 'font-size': size, 'text-anchor': opts.anchor || 'start',
      'class': 'math' + (opts.halo === false ? '' : ' halo') + (opts.cls ? ' ' + opts.cls : '')
    }, parent);
    var shift = 0;
    parseMath(spec).forEach(function (r) {
      var want = r.lvl < 0 ? 0.26 * size : (r.lvl > 0 ? -0.42 * size : 0);
      var ts = svg('tspan', { dy: (want - shift).toFixed(2) }, t);
      shift = want;
      if (r.lvl !== 0) ts.setAttribute('font-size', (0.7 * size).toFixed(1));
      if (r.b) ts.setAttribute('font-weight', '700');
      if (r.i) ts.setAttribute('font-style', 'italic');
      if (r.rm) ts.setAttribute('class', 'rm');
      ts.textContent = r.t;
    });
    if (shift !== 0) svg('tspan', { dy: (-shift).toFixed(2) }, t).textContent = '​';
    return t;
  }

  // Même syntaxe, rendue en HTML (dans un élément fourni).
  function mathInto(el, spec) {
    parseMath(spec).forEach(function (r) {
      var node = r.lvl < 0 ? document.createElement('sub') : (r.lvl > 0 ? document.createElement('sup') : null);
      var inner = document.createElement(r.b ? 'b' : (r.i ? 'i' : 'span'));
      if (r.rm) inner.className = 'rm';
      inner.textContent = r.t;
      if (node) { node.appendChild(inner); el.appendChild(node); } else el.appendChild(inner);
    });
    return el;
  }
  function mathEl(spec, cls) {
    var s = document.createElement('span');
    s.className = 'math' + (cls ? ' ' + cls : '');
    return mathInto(s, spec);
  }

  // ---------------------------------------------------------------- flèches
  // Flèche droite de p0 à p1 (pixels). opts : cls, width, head (longueur de pointe), dash.
  function arrow(parent, p0, p1, opts) {
    opts = opts || {};
    var dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.sqrt(dx * dx + dy * dy);
    var g = svg('g', { 'class': 'vec ' + (opts.cls || '') }, parent);
    if (len < 0.8) return g;
    var w = opts.width || 2.2;
    var hl = Math.min(opts.head || 11, len * 0.45), hw = hl * 0.36 + w * 0.3;
    var ux = dx / len, uy = dy / len;
    var bx = p1.x - ux * hl, by = p1.y - uy * hl;
    svg('line', {
      x1: p0.x.toFixed(2), y1: p0.y.toFixed(2), x2: (bx + ux * 0.5).toFixed(2), y2: (by + uy * 0.5).toFixed(2),
      'stroke-width': w, 'stroke-dasharray': opts.dash, 'stroke-linecap': 'round'
    }, g);
    svg('polygon', {
      points: [p1.x, p1.y, bx - uy * hw, by + ux * hw, bx + uy * hw, by - ux * hw].map(function (v) { return v.toFixed(2); }).join(' ')
    }, g);
    return g;
  }

  // Point d'un cercle : angle trigonométrique (anti-horaire, y vers le haut) -> pixels.
  function onCircle(c, r, a) { return { x: c.x + r * Math.cos(a), y: c.y - r * Math.sin(a) }; }

  /*
   * Arc orienté de l'angle a0 vers l'angle a1 (trajet direct a1 − a0, signé, |a1 − a0| < 2π),
   * avec une pointe en a1. opts : cls, width, head, noHead.
   */
  function arcArrow(parent, c, r, a0, a1, opts) {
    opts = opts || {};
    var g = svg('g', { 'class': 'arc ' + (opts.cls || '') }, parent);
    var da = a1 - a0;
    if (Math.abs(da) < 1e-4 || r < 1) return g;
    var w = opts.width || 1.2;
    var hl = opts.noHead ? 0 : Math.min(opts.head || 7, Math.abs(da) * r * 0.5);
    var aEnd = a1 - Math.sign(da) * (hl * 0.85) / r;        // l'arc s'arrête à la base de la pointe
    var p0 = onCircle(c, r, a0), p1 = onCircle(c, r, aEnd);
    svg('path', {
      d: 'M' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' +
        (Math.abs(aEnd - a0) > Math.PI ? 1 : 0) + ' ' + (da > 0 ? 0 : 1) + ' ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2),
      fill: 'none', 'stroke-width': w
    }, g);
    if (hl > 1.5) {
      var tip = onCircle(c, r, a1);
      var ux = tip.x - p1.x, uy = tip.y - p1.y, l = Math.sqrt(ux * ux + uy * uy) || 1;
      ux /= l; uy /= l;
      var hw = hl * 0.38;
      svg('polygon', {
        points: [tip.x, tip.y, p1.x - uy * hw, p1.y + ux * hw, p1.x + uy * hw, p1.y - ux * hw].map(function (v) { return v.toFixed(2); }).join(' ')
      }, g);
    }
    return g;
  }

  function polyline(parent, pts, cls, extra) {
    if (!pts.length) return null;
    var d = '';
    for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + pts[i].x.toFixed(2) + ' ' + pts[i].y.toFixed(2);
    var attrs = { d: d, fill: 'none', 'class': cls };
    for (var key in (extra || {})) attrs[key] = extra[key];
    return svg('path', attrs, parent);
  }

  // ------------------------------------------------------------- formatage
  function num(x, digits) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    var s = x.toFixed(digits === undefined ? 3 : digits);
    if (parseFloat(s) === 0) s = s.replace('-', '');
    return s.replace('-', '−').replace('.', ',');
  }
  function sig(x, n) {                      // n chiffres significatifs, sans notation scientifique
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var mag = Math.floor(Math.log10(Math.abs(x)));
    var s = num(x, Math.max(0, Math.min(6, n - 1 - mag)));
    return s.indexOf(',') >= 0 ? s.replace(/0+$/, '').replace(/,$/, '') : s;   // 300,0 -> 300
  }
  function deg(rad, digits) {
    if (!isFinite(rad)) return '—';
    return num(rad * 180 / Math.PI, digits === undefined ? 1 : digits) + '°';
  }

  /*
   * Conversion d'affichage pu <-> SI. kind : V, I, Z, P (kW), Q (kvar), S (kVA), T, Ir, f, N.
   * Retourne { v: valeur affichée, u: unité, k: facteur (affiché = pu × k) }.
   */
  function scalePrefix(base, unit) {
    var a = Math.abs(base);
    if (a >= 1e6) return { k: base / 1e6, u: 'M' + unit };
    if (a >= 1e3) return { k: base / 1e3, u: 'k' + unit };
    return { k: base, u: unit };
  }
  function makeUnits(m, mode) {
    var b = global.MS.model.bases(m), si = mode === 'si';
    var table = {
      V: si ? scalePrefix(b.Vb, 'V') : { k: 1, u: 'pu' },
      I: si ? scalePrefix(b.Ib, 'A') : { k: 1, u: 'pu' },
      Z: si ? { k: b.Zb, u: 'Ω' } : { k: 1, u: 'pu' },
      P: si ? scalePrefix(b.Sb, 'W') : { k: 1, u: 'pu' },
      Q: si ? scalePrefix(b.Sb, 'var') : { k: 1, u: 'pu' },
      S: si ? scalePrefix(b.Sb, 'VA') : { k: 1, u: 'pu' },
      T: si ? scalePrefix(b.Tb, 'N·m') : { k: 1, u: 'pu' },
      Ir: si ? { k: m.Ir0, u: 'A' } : { k: 1, u: 'pu' },
      f: { k: m.fn, u: 'Hz' },
      N: { k: b.Nn, u: 'rpm' },
      one: { k: 1, u: '' }
    };
    return {
      si: si, b: b, table: table,
      k: function (kind) { return table[kind].k; },
      u: function (kind) { return table[kind].u; },
      val: function (kind, pu) { return pu * table[kind].k; },
      txt: function (kind, pu, n) {
        if (!isFinite(pu)) return '—';
        var t = table[kind];
        return (si || kind === 'f' || kind === 'N' ? sig(pu * t.k, n || 4) : num(pu, 3)) + (t.u ? ' ' + t.u : '');
      },
      // variantes pour les étiquettes mathématiques : l'unité reste en caractères droits
      m: function (kind, pu, n) {
        if (!isFinite(pu)) return '—';
        var t = table[kind];
        return (si || kind === 'f' || kind === 'N' ? sig(pu * t.k, n || 4) : num(pu, 3)) + (t.u ? ' ~' + t.u + '~' : '');
      },
      um: function (kind) { return '~(' + table[kind].u + ')~'; },
      numOnly: function (kind, pu, n) {
        if (!isFinite(pu)) return '—';
        var t = table[kind];
        return si || kind === 'f' || kind === 'N' ? sig(pu * t.k, n || 4) : num(pu, 3);
      }
    };
  }

  // Graduations « rondes » couvrant [a, b].
  function ticks(a, b, target) {
    var span = b - a;
    if (!(span > 0)) return [a];
    var raw = span / (target || 6), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    var step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 3.6 ? 2.5 : f < 7.5 ? 5 : 10) * p;
    var out = [], t0 = Math.ceil(a / step - 1e-9) * step;
    for (var t = t0; t <= b + step * 1e-9; t += step) out.push(Math.abs(t) < step * 1e-9 ? 0 : t);
    out.step = step;
    return out;
  }
  function tickLabel(v, step) {
    var d = 0;                                  // assez de décimales pour écrire le pas exactement
    while (d < 6 && Math.abs(step * Math.pow(10, d) - Math.round(step * Math.pow(10, d))) > 1e-9) d++;
    return num(v, d);
  }

  global.MS = global.MS || {};
  global.MS.draw = {
    svg: svg, clear: clear, h: h, parseMath: parseMath, label: label, mathInto: mathInto, mathEl: mathEl,
    arrow: arrow, arcArrow: arcArrow, onCircle: onCircle, polyline: polyline,
    num: num, sig: sig, deg: deg, makeUnits: makeUnits, ticks: ticks, tickLabel: tickLabel
  };
})(window);
