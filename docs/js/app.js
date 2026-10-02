/*
 * GEN436 – Simulateur de machine synchrone
 * app.js : état de l'application, commandes et orchestration de l'affichage.
 *
 * L'état interne (state.inp) est toujours en pu et en convention générateur ; la convention
 * choisie par l'utilisateur ne change que l'affichage (signes de P, Q, δ et sens de Is).
 */
(function () {
  'use strict';
  var M = MS.model, D = MS.draw, DEG = Math.PI / 180;
  function $(id) { return document.getElementById(id); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  var state = {
    m: M.cloneMachine('generique'), machineId: 'generique',
    conv: 'gen', units: 'pu',
    inp: { mode: 'bus_EP', Vs: 1, k: 1, ir: 1.2, Pu: 0.5, Ps: 0.5, Qs: 0.3, delta: 0.45, Is: 0.6, phiL: 0.6435, Z: 1.5, load: 'charge' },
    ov: { angles: true, fmm: false, dq: false, decomp: false, pq: false, loci: false },
    anim: { theta: 0, playing: true, speed: 0.15 },
    dyn: { on: false, H: 3, D: 12, rate: 0.5, delta: 0, w: 0, t: 0, hist: [], lost: false, dEq: NaN, dCrit: NaN },
    presetIdx: -1, refit: true, ghost: null           // ghost : point de fonctionnement mémorisé
  };
  var dirty = true, last = null;        // last = dernier contexte rendu

  // grandeurs imposées par mode
  var INPUTS = {
    bus_EP: { Vs: 1, ir: 1, Pu: 1 }, bus_PQ: { Vs: 1, Ps: 1, Qs: 1 }, bus_Ed: { Vs: 1, ir: 1, delta: 1 },
    load_VI: { Vs: 1, k: 1, Is: 1, phiL: 1 }, load_Z: { k: 1, ir: 1, Z: 1, phiL: 1 }
  };
  function sgn() { return state.conv === 'rec' ? -1 : 1; }
  function units() { return D.makeUnits(state.m, state.units); }
  function dynActive() { return state.dyn.on && state.inp.mode === 'bus_EP'; }

  // ------------------------------------------------------------ lignes de réglage
  /*
   * def : id, sym, kind (unité via makeUnits), min/max/step dans l'unité du curseur,
   *       get()/set(v) dans cette unité, st() -> 'in' | 'grid' | 'out' | 'lock' | 'hide',
   *       out() valeur calculée, info() texte complémentaire, fixedUnit, digits.
   */
  // Saisie : la virgule ou le point sont acceptés ; l'affichage utilise la virgule, comme le reste de la page.
  function fmtIn(x, prec) {
    if (!isFinite(x)) return '';
    if (Math.abs(x) < 5e-5) x = 0;                          // pas de 2,8e-24 pour un zéro numérique
    return String(+x.toPrecision(prec || 4)).replace('.', ',');
  }
  function parseIn(s) { return parseFloat(String(s).replace(/[\s ]/g, '').replace(',', '.').replace('−', '-')); }
  function userEdited() {                  // l'utilisateur s'écarte du cas préconfiguré
    leavePreset();
    if (state.machineChanged) { state.machineId = 'perso'; state.machineChanged = false; }
  }

  function makeRow(box, def, index) {
    var row = D.h('div', { 'class': 'row', id: 'row-' + def.id }, box);
    var sym = D.h('label', { 'class': 'sym', 'for': 'num-' + def.id }, row);
    var tag = D.h('span', { 'class': 'tag' }, row);
    var valbox = D.h('div', { 'class': 'valbox' }, row);
    var minus = D.h('button', { type: 'button', 'class': 'step', tabindex: '-1', 'aria-label': 'Diminuer', title: 'Diminuer (Maj : ×10)' }, valbox, '−');
    var num = D.h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'class': 'num', id: 'num-' + def.id }, valbox);
    var plus = D.h('button', { type: 'button', 'class': 'step', tabindex: '-1', 'aria-label': 'Augmenter', title: 'Augmenter (Maj : ×10)' }, valbox, '+');
    var unit = D.h('span', { 'class': 'unit' }, valbox);
    var rng = D.h('input', {
      type: 'range', 'class': 'rng', min: def.min, max: def.max, step: def.step,
      'aria-label': def.aria || def.id
    }, row);
    var info = D.h('div', { 'class': 'rowinfo' }, row);
    var force = false;                     // réécrire la case même si elle a le focus (flèches, boutons)
    function factor() { return def.kind ? units().k(def.kind) : 1; }
    function editable() { var st = def.st ? def.st() : 'in'; return st === 'in' || st === 'grid' || st === 'param'; }
    function apply(v) {
      if (!isFinite(v)) return;
      def.set(def.noClamp ? v : clamp(v, def.min, def.max));
      if (def.after) def.after();
      userEdited();
      invalidate();
    }
    function bump(dir, big) {              // un pas du curseur (dix avec Maj)
      if (!editable()) return;
      var v = def.get(), s = def.step * (big ? 10 : 1);
      if (def.log) v = Math.pow(10, Math.log10(v) + dir * s);
      else v = Math.round((v + dir * s) / def.step) * def.step;
      force = true;
      apply(v);
    }
    rng.addEventListener('input', function () { apply(def.log ? Math.pow(10, parseFloat(rng.value)) : parseFloat(rng.value)); });
    num.addEventListener('change', function () {
      var v = parseIn(num.value) / factor();
      force = true;
      if (isFinite(v)) apply(v); else invalidate();           // saisie illisible : on réaffiche la valeur
    });
    num.addEventListener('focus', function () { num.select(); });
    num.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { num.blur(); return; }
      var dir = e.key === 'ArrowUp' || e.key === 'PageUp' ? 1 : (e.key === 'ArrowDown' || e.key === 'PageDown' ? -1 : 0);
      if (dir) { e.preventDefault(); bump(dir, e.shiftKey || e.key.indexOf('Page') === 0); }
    });
    [[minus, -1], [plus, 1]].forEach(function (b) {
      var timer = null;
      function stop() { if (timer) { clearInterval(timer); clearTimeout(timer); timer = null; } }
      b[0].addEventListener('click', function (e) { bump(b[1], e.shiftKey); });
      b[0].addEventListener('pointerdown', function (e) {      // maintien : répétition
        stop();
        var big = e.shiftKey;
        timer = setTimeout(function () { timer = setInterval(function () { bump(b[1], big); }, 70); }, 420);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { b[0].addEventListener(t, stop); });
    });
    return {
      def: def,
      update: function () {
        var st = def.st ? def.st() : 'in';
        row.hidden = st === 'hide';
        if (st === 'hide') return;
        var ed = st === 'in' || st === 'grid' || st === 'param';
        row.className = 'row ' + (st === 'grid' ? 'net' : st);
        row.style.order = (st === 'out' ? 100 : 0) + (index || 0);
        D.clear(sym); D.mathInto(sym, typeof def.sym === 'function' ? def.sym() : def.sym);
        tag.textContent = { grid: 'réseau', lock: 'réseau · figée' }[st] || '';
        rng.disabled = num.disabled = minus.disabled = plus.disabled = !ed;
        var v = ed ? def.get() : def.out();
        var pos = isFinite(v) ? (def.log ? Math.log10(Math.max(1e-6, v)) : v) : def.min;
        if (document.activeElement !== rng) rng.value = pos;
        // partie colorée de la piste : de zéro (ou du minimum) jusqu'à la valeur
        var p = clamp((pos - def.min) / (def.max - def.min), 0, 1);
        var p0 = def.min < 0 && def.max > 0 && !def.log ? -def.min / (def.max - def.min) : 0;
        rng.style.setProperty('--a', (100 * Math.min(p, p0)).toFixed(1) + '%');
        rng.style.setProperty('--b', (100 * Math.max(p, p0)).toFixed(1) + '%');
        if (document.activeElement !== num || force) num.value = fmtIn(v * factor(), def.prec);
        force = false;
        unit.textContent = def.fixedUnit !== undefined ? def.fixedUnit : (def.kind ? units().u(def.kind) : '');
        var txt = def.info ? def.info() : '';
        info.hidden = !txt;
        if (txt) { D.clear(info); D.mathInto(info, txt); }
      }
    };
  }

  function inSt(key, extra) {
    return function () {
      var mode = state.inp.mode;
      if (extra) { var e = extra(mode); if (e) return e; }
      return INPUTS[mode][key] ? 'in' : 'out';
    };
  }
  var rows = [], mrows = [], nrows = [], drows = [];

  function buildRows() {
    var inp = state.inp;
    var defs = [
      {
        id: 'Vs', sym: 'V_s', kind: 'V', min: 0.5, max: 1.2, step: 0.01, aria: 'Tension aux bornes',
        get: function () { return inp.Vs; }, set: function (v) { inp.Vs = v; }, out: function () { return last.op.Vs; },
        st: inSt('Vs', function (mode) { return M.isBus(mode) ? 'grid' : null; }),
        info: function () { return state.units === 'si' ? '~ligne-neutre ; ligne-ligne :~ ' + D.sig(last.op.Vs * state.m.Vn, 4) + ' V' : ''; }
      },
      {
        id: 'f', sym: 'f_s', kind: 'f', min: 0.2, max: 1.2, step: 0.01, aria: 'Fréquence',
        get: function () { return inp.k; }, set: function (v) { inp.k = v; }, out: function () { return 1; },
        st: function () { return M.isBus(inp.mode) ? 'lock' : 'in'; },
        info: function () { return 'N_s = ' + units().m('N', last.op.k) + ' ~;~ X ~et~ E ~∝~ f_s'; }
      },
      {
        id: 'ir', sym: 'I_r', kind: 'Ir', min: 0, max: 2.5, step: 0.01, aria: 'Courant d\'excitation',
        get: function () { return inp.ir; }, set: function (v) { inp.ir = v; }, out: function () { return last.op.ir; }, st: inSt('ir'),
        info: function () { return 'E = ' + units().m('V', last.op.E) + (state.units === 'si' ? ' ~(~K = ' + D.sig(units().b.K, 4) + ' ~V/A)~' : ' ~(~E = K·I_r~)~'); }
      },
      {
        id: 'Pu', sym: 'P_u', kind: 'P', min: -1.5, max: 1.5, step: 0.01, aria: 'Puissance mécanique à l\'arbre',
        get: function () { return sgn() * inp.Pu; }, set: function (v) { inp.Pu = sgn() * v; }, out: function () { return sgn() * last.op.Pu; }, st: inSt('Pu'),
        info: function () {
          return sgn() > 0 ? '~arbre : > 0 fournie par l\'entraînement~' : '~arbre : > 0 fournie à la charge mécanique~';
        }
      },
      {
        id: 'Ps', sym: 'P_s', kind: 'P', min: -1.5, max: 1.5, step: 0.01, aria: 'Puissance active',
        get: function () { return sgn() * inp.Ps; }, set: function (v) { inp.Ps = sgn() * v; }, out: function () { return sgn() * last.op.Ps; }, st: inSt('Ps'),
        info: function () { return sgn() > 0 ? '~> 0 : fournie au réseau~' : '~> 0 : absorbée du réseau~'; }
      },
      {
        id: 'Qs', sym: 'Q_s', kind: 'Q', min: -1.5, max: 1.5, step: 0.01, aria: 'Puissance réactive',
        get: function () { return sgn() * inp.Qs; }, set: function (v) { inp.Qs = sgn() * v; }, out: function () { return sgn() * last.op.Qs; }, st: inSt('Qs'),
        info: function () { return sgn() > 0 ? '~> 0 : fournie au réseau (surexcitée)~' : '~> 0 : absorbée du réseau (sous-excitée)~'; }
      },
      {
        id: 'delta', sym: 'δ', fixedUnit: '°', min: -180, max: 180, step: 0.5, aria: 'Angle interne',
        get: function () { return sgn() * inp.delta / DEG; }, set: function (v) { inp.delta = sgn() * v * DEG; },
        out: function () { return sgn() * last.op.delta / DEG; }, st: inSt('delta'),
        info: function () { return sgn() > 0 ? 'δ = ∠*E* − ∠*V*_s' : 'δ = ∠*V*_s − ∠*E*'; }
      },
      {
        id: 'Is', sym: 'I_s', kind: 'I', min: 0, max: 1.5, step: 0.01, aria: 'Courant au stator',
        get: function () { return inp.Is; }, set: function (v) { inp.Is = v; }, out: function () { return last.op.Is; }, st: inSt('Is')
      },
      {
        id: 'phiL', sym: 'φ_{~charge~}', fixedUnit: '°', min: -90, max: 90, step: 1, aria: 'Angle de la charge',
        get: function () { return inp.phiL / DEG; }, set: function (v) { inp.phiL = v * DEG; }, out: function () { return inp.phiL / DEG; },
        st: function () { return M.isBus(inp.mode) || (inp.mode === 'load_Z' && inp.load !== 'charge') ? 'hide' : 'in'; },
        info: function () {
          var c = Math.cos(inp.phiL);
          return '~cos~(φ) = ' + D.num(c, 3) + (inp.phiL > 1e-6 ? ' ~RET. (charge inductive)~' : (inp.phiL < -1e-6 ? ' ~AV. (charge capacitive)~' : ' ~(charge résistive)~'));
        }
      },
      {
        id: 'Z', sym: '|Z|_{~charge~}', kind: 'Z', log: true, min: -1.3, max: 1.3, step: 0.01, noClamp: true, aria: 'Impédance de la charge',
        get: function () { return inp.Z; }, set: function (v) { inp.Z = clamp(v, 0.05, 20); }, out: function () { return inp.Z; },
        st: function () { return inp.mode === 'load_Z' && inp.load === 'charge' ? 'in' : 'hide'; },
        info: function () { return '~plus~ |Z| ~est petite, plus la charge est grande~'; }
      }
    ];
    var box = $('rows');
    D.h('h3', { 'class': 'rowgroup in', style: 'order:-1' }, box, 'Grandeurs imposées – à régler');
    D.h('h3', { 'class': 'rowgroup', style: 'order:99' }, box, 'Grandeurs calculées – elles en résultent');
    rows = defs.map(function (d, i) { return makeRow(box, d, i + 1); });

    var m = function () { return state.m; };
    function par(st) { return function () { return st ? st() : 'param'; }; }
    mrows = [
      {
        id: 'Xd', sym: function () { return M.isSalient(m()) ? 'X_d' : 'X_s'; }, fixedUnit: 'pu', min: 0.2, max: 2, step: 0.01,
        get: function () { return m().Xd; }, set: function (v) { var s = M.isSalient(m()); m().Xd = v; if (!s) m().Xq = v; }, st: par(),
        info: function () { return '= ' + D.sig(m().Xd * units().b.Zb, 4) + ' Ω ~à~ f_n'; }
      },
      {
        id: 'Xq', sym: 'X_q', fixedUnit: 'pu', min: 0.2, max: 2, step: 0.01,
        get: function () { return m().Xq; }, set: function (v) { m().Xq = Math.abs(v - m().Xd) < 1e-6 ? v + 0.01 : v; },
        st: function () { return M.isSalient(m()) ? 'param' : 'hide'; },
        info: function () { return m().Xq > m().Xd ? 'X_q > X_d ~: aimants insérés~' : '~saillance~ X_d/X_q = ' + D.num(m().Xd / m().Xq, 2); }
      },
      {
        id: 'Rs', sym: 'R_s', fixedUnit: 'pu', min: 0, max: 0.25, step: 0.005,
        get: function () { return m().Rs; }, set: function (v) { m().Rs = v; }, st: par(),
        info: function () { return m().Rs > 0 ? '= ' + D.sig(m().Rs * units().b.Zb, 3) + ' Ω' : '~pertes cuivre négligées~'; }
      }
    ].map(function (d) { d.after = function () { state.machineChanged = true; }; return makeRow($('mrows'), d); });

    nrows = [
      { id: 'Sn', sym: 'S_n', fixedUnit: 'kVA', min: 1, max: 1000, step: 1, get: function () { return m().Sn / 1e3; }, set: function (v) { m().Sn = v * 1e3; } },
      { id: 'Vn', sym: 'V_n ~(L-L)~', fixedUnit: 'V', min: 100, max: 25000, step: 10, get: function () { return m().Vn; }, set: function (v) { m().Vn = v; } },
      { id: 'fn', sym: 'f_n', fixedUnit: 'Hz', min: 50, max: 60, step: 10, get: function () { return m().fn; }, set: function (v) { m().fn = v; } },
      { id: 'p', sym: 'p ~(paires de pôles)~', fixedUnit: '', min: 1, max: 36, step: 1, get: function () { return m().p; }, set: function (v) { m().p = Math.round(v); } },
      { id: 'Ir0', sym: 'I_{ro} ~(~E = V_n~)~', fixedUnit: 'A', min: 0.5, max: 200, step: 0.5, get: function () { return m().Ir0; }, set: function (v) { m().Ir0 = v; } },
      { id: 'IrMax', sym: 'I_r ~max~', fixedUnit: 'pu', min: 1, max: 3, step: 0.05, get: function () { return m().IrMax; }, set: function (v) { m().IrMax = v; } },
      { id: 'Pmec', sym: 'P_{mec}', fixedUnit: 'pu', min: 0, max: 0.1, step: 0.005, get: function () { return m().Pmec; }, set: function (v) { m().Pmec = v; } },
      { id: 'Pfe', sym: 'P_{fe}', fixedUnit: 'pu', min: 0, max: 0.1, step: 0.005, get: function () { return m().Pfe; }, set: function (v) { m().Pfe = v; } }
    ].map(function (d) { d.st = par(); return makeRow($('nrows'), d); });

    var dyn = state.dyn;
    drows = [
      { id: 'H', sym: 'H ~(inertie)~', fixedUnit: 's', min: 0.5, max: 10, step: 0.1, get: function () { return dyn.H; }, set: function (v) { dyn.H = v; } },
      {
        id: 'Dd', sym: 'D ~(amortisseurs)~', fixedUnit: 'pu', min: 0, max: 40, step: 0.5, get: function () { return dyn.D; }, set: function (v) { dyn.D = v; },
        info: function () { return dyn.D === 0 ? '~sans amortissement : oscillations entretenues~' : ''; }
      },
      { id: 'rate', sym: '~ralenti~', fixedUnit: '×', min: 0.05, max: 1, step: 0.05, get: function () { return dyn.rate; }, set: function (v) { dyn.rate = v; } }
    ].map(function (d) { d.st = par(); return makeRow($('drows'), d); });
  }

  // ------------------------------------------------------------- préconfigurations
  function buildPresetList() {
    var sel = $('preset'), groups = {};
    D.h('option', { value: '-1' }, sel, '— Réglage libre —');
    MS.presets.list.forEach(function (p, i) {
      if (!groups[p.group]) groups[p.group] = D.h('optgroup', { label: p.group }, sel);
      D.h('option', { value: i }, groups[p.group], p.title);
    });
    var ms = $('machine');
    Object.keys(M.MACHINES).forEach(function (id) { D.h('option', { value: id }, ms, M.MACHINES[id].name); });
    D.h('option', { value: 'perso' }, ms, 'Machine personnalisée');
  }

  function applyPreset(idx) {
    var p = MS.presets.list[idx];
    state.presetIdx = idx;
    if (!p) { refreshPresetUI(); invalidate(); return; }
    state.machineId = p.machine || 'generique';
    state.m = M.cloneMachine(state.machineId);
    for (var key in (p.mset || {})) state.m[key] = p.mset[key];
    state.conv = p.conv;
    if (p.units) state.units = p.units;
    var q = p.calc ? p.calc(state.m) : p.in, s = sgn(), m = state.m;
    function val(x, d) { return x === undefined ? d : x; }
    state.inp = {
      mode: p.mode, Vs: val(q.Vs, 1), k: q.f ? q.f / m.fn : 1,
      ir: q.irA !== undefined ? q.irA / m.Ir0 : val(q.ir, 1),
      Pu: s * val(q.Pu, 0), Ps: s * val(q.Ps, 0), Qs: s * val(q.Qs, 0), delta: s * val(q.delta, 0) * DEG,
      Is: val(q.Is, 0.8), phiL: val(q.phiL, 36.87) * DEG, Z: val(q.Z, 1.2), load: q.load || 'charge'
    };
    state.ov = { angles: false, fmm: false, dq: false, decomp: false, pq: false, loci: false };
    state.ghost = null;
    for (var o in (p.ov || {})) state.ov[o] = p.ov[o];
    state.dyn.on = !!(p.dyn && p.dyn.on);
    state.dyn.H = (p.dyn && p.dyn.H) || 3; state.dyn.D = (p.dyn && p.dyn.D) || 12;
    state.dyn.init = true;
    state.refit = true;
    buildRowsFresh();
    refreshPresetUI();
    invalidate();
  }
  function buildRowsFresh() {              // les lignes référencent state.inp : on les reconstruit
    ['rows', 'mrows', 'nrows', 'drows'].forEach(function (id) { D.clear($(id)); });
    buildRows();
  }
  function refreshPresetUI() {
    var p = MS.presets.list[state.presetIdx];
    $('preset').value = String(state.presetIdx);
    $('preset-slide').textContent = p ? p.slide : 'Choisissez un cas du cours, ou réglez librement.';
    $('preset-text').textContent = p ? p.text : 'Déplacez les curseurs marqués « imposé » : les grandeurs « calculé » en résultent. Le schéma, l\'animation, le diagramme vectoriel et les courbes se mettent à jour ensemble.';
  }
  function leavePreset() {                 // l'utilisateur modifie un réglage : le texte du cas reste affiché
    if (state.presetIdx >= 0) $('preset-slide').textContent = MS.presets.list[state.presetIdx].slide + ' (modifié)';
  }

  // ------------------------------------------------------------------ calcul
  function invalidate() { dirty = true; }

  function canDragE() { return M.isBus(state.inp.mode) && !dynActive(); }
  /*
   * L'utilisateur a placé l'extrémité de E en E∠d (convention générateur) : on en déduit les
   * grandeurs imposées du mode courant pour que le point de fonctionnement suive le pointeur.
   */
  function setFromE(E, d) {
    if (!canDragE()) return;
    var m = state.m, inp = state.inp;
    E = clamp(Math.round(E * 200) / 200, 0.02, 2.5);
    var op = M.solve(m, { mode: 'bus_Ed', Vs: inp.Vs, ir: E, delta: d });
    if (inp.mode === 'bus_Ed') { inp.ir = E; inp.delta = d; }
    else if (inp.mode === 'bus_PQ') { inp.Ps = op.Ps; inp.Qs = op.Qs; }
    else {                                 // Ir et couple imposés : on reste sur la branche stable
      if (!op.lim.flat) d = clamp(d, op.lim.dLo, op.lim.dHi);
      inp.ir = E;
      inp.Pu = M.powers(m, inp.Vs, E, d, 1).PE + m.Pfe + m.Pmec;
      inp.hint = d;
    }
    userEdited();
    invalidate();
  }

  function syncInp(op) {
    var inp = state.inp, need = INPUTS[inp.mode];
    if (!need.Vs) inp.Vs = clamp(op.Vs, 0, 3);
    if (!need.ir) inp.ir = Math.max(0, op.ir);
    if (!need.Pu) inp.Pu = op.Pu;
    if (!need.Ps) inp.Ps = op.Ps;
    if (!need.Qs) inp.Qs = op.Qs;
    if (!need.delta) inp.delta = op.delta;
    if (!need.Is) inp.Is = op.Is;
    if (!need.phiL && op.Is > 1e-3 && op.Vs > 1e-3) inp.phiL = clamp(-M.ang(op.I), -Math.PI / 2, Math.PI / 2);
    if (!need.Z && op.Is > 1e-3 && op.Vs > 1e-3) inp.Z = clamp(op.Vs / op.Is, 0.05, 20);
  }

  function compute() {
    var m = state.m, inp = state.inp, dyn = state.dyn;
    var ss = M.solve(m, inp), op = ss;
    var ctx = { m: m, inp: inp, conv: state.conv, ov: state.ov, refit: state.refit, units: units(), dyn: dyn, ss: ss, ghost: state.ghost, dragE: canDragE() };
    if (inp.mode === 'bus_EP') {
      ctx.PEref = inp.Pu - m.Pfe - m.Pmec;
      inp.hint = ss.flags.lost ? undefined : ss.delta;
    }
    if (dynActive()) {
      dyn.dEq = ss.flags.lost ? NaN : ss.delta; dyn.dCrit = ss.flags.lost ? NaN : ss.delta2;
      if (dyn.init) { dyn.delta = isFinite(dyn.dEq) ? dyn.dEq : 0; dyn.w = 0; dyn.t = 0; dyn.hist = []; dyn.lost = false; dyn.init = false; }
      op = M.solve(m, { mode: 'bus_Ed', Vs: inp.Vs, ir: inp.ir, delta: dyn.delta });
      op.Pu = inp.Pu; op.Tu = inp.Pu; op.dynamic = true;   // l'arbre impose Pu ; Pem suit δ(t)
      if (dyn.lost) op.flags.lost = true;
      delete op.flags.unstable;
      ctx.PsRef = ss.flags.lost ? op.Ps : ss.Ps;
    } else syncInp(op);
    ctx.op = op; ctx.v = M.view(op, state.conv);
    return ctx;
  }

  function stepDynamics(dtReal) {
    var dyn = state.dyn, m = state.m, inp = state.inp;
    if (dyn.lost || dyn.init) return;
    var par = { Vs: inp.Vs, E: inp.ir, Pm: inp.Pu - m.Pfe - m.Pmec, H: dyn.H, D: dyn.D };
    var T = dtReal * dyn.rate, n = Math.max(1, Math.ceil(T / 1e-3)), h = T / n, st = { delta: dyn.delta, w: dyn.w };
    for (var i = 0; i < n; i++) {
      st = M.swingStep(m, st, par, h);
      if (Math.abs(st.delta) > Math.PI) { dyn.lost = true; break; }
    }
    dyn.delta = clamp(st.delta, -Math.PI, Math.PI); dyn.w = st.w; dyn.t += T;
    dyn.hist.push({ t: dyn.t, d: dyn.delta });
    while (dyn.hist.length && dyn.hist[0].t < dyn.t - 9) dyn.hist.shift();
  }

  // ------------------------------------------------------------------ rendu
  var ROLE = { gen: 'Génératrice', mot: 'Moteur', comp: 'Compensateur synchrone', vide: 'Machine à vide' };

  function chip(box, cls, text, title) {
    var c = D.h('span', { 'class': 'chip ' + cls }, box);
    if (title) c.title = title;
    D.mathInto(c, text);
    return c;
  }

  function renderStatus(ctx) {
    var op = ctx.op, v = ctx.v, box = $('status'), fl = op.flags;
    D.clear(box);
    var fem = op.role === 'gen';
    var ex = { sur: fem ? 'surexcitée' : 'surexcité', sous: fem ? 'sous-excitée' : 'sous-excité', unit: 'à facteur de puissance unitaire' }[op.excit];
    var title;
    if (!op.bus) {                         // réseau indépendant : la machine ne peut être que génératrice
      if (op.Is < 1e-6) title = 'Génératrice à vide';
      else if (op.load === 'cc') title = 'Génératrice en court-circuit';
      else title = op.role === 'gen' ? 'Génératrice ' + ex : 'Génératrice sur charge purement réactive';
    } else if (fl.lost && op.dynamic) title = 'Machine décrochée';
    else if (op.role === 'vide') title = 'Machine accrochée au réseau, sans échange (Is = 0)';
    else if (op.role === 'comp') title = 'Compensateur synchrone ' + (op.excit === 'sur' ? 'capacitif (surexcité)' : (op.excit === 'sous' ? 'inductif (sous-excité)' : ''));
    else title = ROLE[op.role] + ' ' + ex;
    D.h('strong', { 'class': 'role' }, box, title);

    var pTxt = op.Ps > 0.005 ? 'fournit P' : (op.Ps < -0.005 ? 'absorbe P' : 'P = 0');
    var qTxt = op.Qs > 0.005 ? 'fournit Q' : (op.Qs < -0.005 ? 'absorbe Q' : 'Q = 0');
    if (op.Is > 1e-6 && op.Vs > 1e-6) chip(box, 'neutral', '~' + pTxt + ', ' + qTxt + '~');
    if (v.quad) {
      chip(box, 'neutral', '~Quadrant ' + v.quad + ' en convention ' + (ctx.conv === 'gen' ? 'générateur' : 'récepteur') + ' :~ P_s ' +
        (v.P > 0 ? '> 0' : '< 0') + ', Q_s ' + (v.Q > 0 ? '> 0' : '< 0'),
        'Le quadrant dépend de la convention choisie, pas le fonctionnement.');
    }
    var arm = { mag: 'magnétisante', demag: 'démagnétisante', trans: 'transversale' }[v.armature];
    if (arm) chip(box, 'neutral', '~réaction d\'induit ' + arm + '~', 'Sens de la composante longitudinale de Fs par rapport à Fr.');

    if (fl.lost) {
      chip(box, 'bad', op.dynamic ? '~⚠ Décrochage : synchronisme perdu~' : '~⚠ Décrochage : couple à l\'arbre supérieur à~ T_{em} ~max (affiché à la limite)~',
        'Aucun point d\'équilibre : réduisez le couple ou augmentez Ir.');
    } else if (op.bus && op.Is > 1e-6) {
      if (op.dynamic) chip(box, 'info', '~régime transitoire :~ δ = ' + D.deg(v.delta) + ' , Δω = ' + D.num(ctx.dyn.w * 100, 2) + ' %');
      else if (op.stable) chip(box, 'good', '~✔ stable~', 'dPem/dδ > 0 : couple synchronisant positif.');
      else if (fl.atLimit) chip(box, 'warn', '~⚠ limite du décrochage :~ T_{em} ~maximal~', 'dPem/dδ = 0 : le moindre couple supplémentaire fait décrocher la machine.');
      else if (op.lim.flat) chip(box, 'warn', '~aucun couple synchronisant (~E = 0~)~');
      else chip(box, 'bad', '~⚠ équilibre instable (~dP/dδ < 0~)~', 'Ce point ne peut pas être maintenu en régime permanent.');
    }
    if (fl.overI) chip(box, 'warn', '~⚠~ I_s > I_{sn}', 'Courant nominal du stator dépassé (échauffement de l\'induit).');
    if (fl.overIr) chip(box, 'warn', '~⚠~ I_r > I_r ~max~', 'Courant d\'excitation admissible dépassé (échauffement de l\'inducteur).');
    if (fl.Eneg) chip(box, 'bad', '~⚠ excitation négative requise~', 'Ce point demande E < 0 : non réalisable avec un courant d\'excitation positif.');
    if (fl.singular) chip(box, 'bad', '~⚠ résonance charge–machine~');
  }

  function renderValues(ctx) {
    var op = ctx.op, u = ctx.units, box = $('values'), m = ctx.m;
    D.clear(box);
    // texte de chaque grandeur pour un point de fonctionnement (actuel ou mémorisé)
    function texts(o, v) {
      var hasI = o.Is > 1e-7;
      return {
        Vs: u.txt('V', o.Vs), E: u.txt('V', o.E), Ep: u.txt('V', M.hyp(o.Ep)), Is: u.txt('I', o.Is), Ir: u.txt('Ir', o.ir),
        delta: D.deg(v.delta), phi: D.deg(v.phi), psi: D.deg(v.psi),
        pf: !hasI || !isFinite(v.phi) ? '—' : D.num(v.cosphi, 3) + (Math.abs(Math.sin(v.phi)) < 1e-4 ? '' : (v.phi > 0 ? ' RET.' : ' AV.')),
        P: u.txt('P', v.P), Q: u.txt('Q', v.Q), S: u.txt('S', o.S), Pem: u.txt('P', v.Pem), Qem: u.txt('Q', v.Qem), Pu: u.txt('P', v.Pu),
        Pcu: u.txt('P', o.Pcu), Pfm: u.txt('P', o.Pfe + o.Pmec), eta: isFinite(o.eta) ? D.num(o.eta * 100, 1) + ' %' : '—',
        N: u.txt('N', o.k), Tem: u.txt('T', v.Tem), Tu: u.txt('T', v.Tu),
        Tmax: u.txt('T', Math.max(Math.abs(o.lim.Pmax), Math.abs(o.lim.Pmin))),
        dmax: D.deg(Math.abs(o.Ps >= 0 ? o.lim.dHi : o.lim.dLo)),
        Isd: u.txt('I', v.Isd), Isq: u.txt('I', v.Isq)
      };
    }
    var cur = texts(op, ctx.v), ref = ctx.ghost ? texts(ctx.ghost, M.view(ctx.ghost, ctx.conv)) : null;
    function group(name) {
      var g = D.h('div', { 'class': 'vgroup' }, box);
      D.h('h3', {}, g, name);
      return D.h('div', { 'class': 'vtiles' }, g);
    }
    function tile(g, sym, key, title) {
      var t = D.h('div', { 'class': 'tile' }, g);
      if (title) t.title = title;
      D.mathInto(D.h('span', { 'class': 'tsym math' }, t), sym);
      D.h('span', { 'class': 'tval' }, t, cur[key]);
      if (ref && ref[key] !== cur[key]) D.h('span', { 'class': 'tref' }, t, 'réf. ' + ref[key]);   // état mémorisé
    }
    var g1 = group('Tensions et courants');
    tile(g1, 'V_s', 'Vs', 'Tension aux bornes (ligne-neutre)');
    tile(g1, 'E', 'E', 'Tension interne (fem à vide) : E = K·Ir à la vitesse nominale');
    if (m.Rs > 1e-9) tile(g1, "E'", 'Ep', 'Fem en charge');
    tile(g1, 'I_s', 'Is', 'Courant au stator');
    tile(g1, 'I_r', 'Ir', 'Courant d\'excitation au rotor');

    var g2 = group('Angles');
    tile(g2, 'δ', 'delta', ctx.conv === 'gen' ? 'δ = ∠E − ∠Vs (convention générateur)' : 'δ = ∠Vs − ∠E (convention récepteur)');
    tile(g2, 'φ', 'phi', 'φ = ∠Vs − ∠Is');
    tile(g2, 'ψ', 'psi', 'ψ = ∠E − ∠Is');
    tile(g2, '~cos~(φ)', 'pf', 'Facteur de puissance ; RET. : Is en retard sur Vs, AV. : Is en avance.');

    var g3 = group('Puissances (triphasées)');
    tile(g3, 'P_s', 'P', 'Ps = 3·Vs·Is·cos(φ)');
    tile(g3, 'Q_s', 'Q', 'Qs = 3·Vs·Is·sin(φ)');
    tile(g3, 'S', 'S', 'S = 3·Vs·Is');
    tile(g3, 'P_{em}', 'Pem', 'Puissance électromagnétique ; pôles lisses : 3·E·Is·cos(ψ)');
    tile(g3, 'Q_{em}', 'Qem', 'Qem = 3·E·Is·sin(ψ) : puissance réactive échangée avec le rotor');
    tile(g3, 'P_u', 'Pu', 'Puissance mécanique à l\'arbre');
    if (op.Pcu + op.Pfe + op.Pmec > 1e-9) {
      tile(g3, 'P_{cu}', 'Pcu', 'Pertes cuivre : 3·Rs·Is²');
      tile(g3, 'P_{fe}+P_{mec}', 'Pfm', 'Pertes fer et pertes mécaniques');
    }
    tile(g3, 'η', 'eta', op.genOp ? 'Rendement η = Ps/Pu' : 'Rendement η = Pu/Ps');

    var g4 = group('Arbre');
    tile(g4, 'N_s', 'N', 'Vitesse synchrone Ns = 60·fs/p');
    tile(g4, 'T_{em}', 'Tem', 'Couple électromagnétique Tem = Pem/Ωs');
    tile(g4, 'T_u', 'Tu', 'Couple utile sur l\'arbre');
    if (op.bus && !op.lim.flat) {
      tile(g4, 'T_{em}^{max}', 'Tmax', 'Couple maximal avant décrochage (à E et Vs actuels)');
      tile(g4, 'δ_{max}', 'dmax', 'Angle interne à la limite de stabilité en régime permanent');
    }
    var g5 = group('Axes d et q');
    tile(g5, 'I_{sd}', 'Isd', 'Isd = Is·sin(ψ) : composante réactive par rapport à E (effet magnétisant ou démagnétisant)');
    tile(g5, 'I_{sq}', 'Isq', 'Isq = Is·cos(ψ) : composante active par rapport à E (liée au couple)');
    $('values-sub').textContent = 'signes selon la convention ' + (ctx.conv === 'gen' ? 'générateur' : 'récepteur') +
      (u.si ? ' ; tensions ligne-neutre' : ' ; base ' + D.sig(m.Sn / 1e3, 4) + ' kVA, ' + D.sig(m.Vn, 4) + ' V') +
      (ref ? ' ; « réf. » : état mémorisé' : '');
  }

  function renderCaptions(ctx) {
    var op = ctx.op, v = ctx.v, m = ctx.m, gen = ctx.conv === 'gen', sal = M.isSalient(m), hasR = m.Rs > 1e-9;
    var eq = $('phasor-eq');
    D.clear(eq);
    var drop = sal ? 'jX_d*I*_{sd} + jX_q*I*_{sq}' : 'jX_s*I*_s';
    D.mathInto(eq, gen ? '*E* = *V*_s + ' + (hasR ? 'R_s*I*_s + ' : '') + drop : '*V*_s = *E* + ' + drop + (hasR ? ' + R_s*I*_s' : ''));
    var cap = $('phasor-caption');
    D.clear(cap);
    D.mathInto(cap, '~Convention ' + (gen ? 'générateur' : 'récepteur') + ' :~ δ = ' + (gen ? '∠*E* − ∠*V*_s' : '∠*V*_s − ∠*E*') +
      ' ~;~ φ = ∠*V*_s − ∠*I*_s ~;~ ψ = ∠*E* − ∠*I*_s~.' +
      (ctx.ov.pq && sal ? ' Les axes P-Q ne sont tracés que pour les pôles lisses.' : '') +
      (ctx.ov.loci && !op.bus ? ' Les lieux de E sont tracés sur réseau infini.' : '') +
      (ctx.dragE ? ' Astuce : faites glisser l’extrémité de E (pastille verte).' : '') + '~');

    var mc = $('machine-caption'), lead = M.wrap(M.ang(v.Fr) - M.ang(v.F));
    var txt;
    if (op.Is < 1e-6) txt = '~Aucun courant au stator : seul~ *F*_r ~existe, le couple est nul.~';
    else if (Math.abs(op.Tem) < 0.003) txt = '*F*_r ~et~ *F* ~sont alignées : aucun couple.~';
    else if (op.genOp) txt = '~Génératrice : le rotor (~*F*_r~) est en avance de ' + D.deg(Math.abs(lead)) + ' sur le champ résultant~ *F*~.~ T_{em} ~s\'oppose à la rotation,~ T_u ~l\'entraîne.~';
    else txt = '~Moteur : le rotor (~*F*_r~) est en retard de ' + D.deg(Math.abs(lead)) + ' sur le champ résultant~ *F*~, qui le tire.~ T_{em} ~entraîne l\'arbre,~ T_u ~s\'y oppose.~';
    var arm = { mag: ' ~Réaction d\'induit magnétisante :~ *F*_s ~renforce~ *F*_r~.~', demag: ' ~Réaction d\'induit démagnétisante :~ *F*_s ~s\'oppose à~ *F*_r~.~', trans: ' ~Réaction d\'induit transversale :~ *F*_s ⟂ *F*_r~.~' }[v.armature] || '';
    D.clear(mc); D.mathInto(mc, txt + arm);
  }

  // cartes de courbes
  var CH = {
    pdelta: ['Puissance – angle interne', 'P_{em}(δ) ; T_{em} = P_{em}/Ω_s'],
    mordey: ['Courbes de Mordey (en « V »)', 'I_s(E) ~à~ P_s ~constante~'],
    pq: ['Plan P-Q et quadrants', ''],
    waves: ['Formes d\'onde de la phase a', '~valeurs de crête ramenées en pu~'],
    regul: ['Caractéristique de régulation', 'I_r ~requis pour maintenir~ V_s'],
    ext: ['Caractéristique externe', 'V_s(I_s) ~à~ I_r ~et vitesse constants~'],
    occ: ['Essais à vide et en court-circuit', '~caractéristiques linéarisées~'],
    swing: ['Angle interne δ(t)', '~équation du mouvement de l\'arbre~']
  };
  var chartCards = {}, chartKey = '';
  function chartKinds() {
    var mode = state.inp.mode;
    if (mode === 'load_VI') return ['regul', 'pdelta', 'pq', 'waves'];
    if (mode === 'load_Z') return ['occ', 'ext', 'pq', 'waves'];
    return dynActive() ? ['swing', 'pdelta', 'mordey', 'pq', 'waves'] : ['pdelta', 'mordey', 'pq', 'waves'];
  }
  function renderCharts(ctx) {
    var kinds = chartKinds(), key = kinds.join(','), box = $('charts');
    if (key !== chartKey) {
      D.clear(box); chartCards = {}; chartKey = key;
      kinds.forEach(function (kind) {
        var card = D.h('article', { 'class': 'card chart', id: 'card-' + kind }, box);
        var head = D.h('header', {}, card);
        D.h('h2', {}, head, CH[kind][0]);
        var sub = D.h('span', { 'class': 'sub math' }, head);
        var wrap = D.h('div', { 'class': 'plotwrap' }, card);
        var el = D.svg('svg', { 'class': 'plot', role: 'img', 'aria-label': CH[kind][0] }, wrap);
        var tip = D.h('div', { 'class': 'tip' }, wrap); tip.hidden = true;
        chartCards[kind] = { svg: el, lg: D.h('div', { 'class': 'legend' }, card), tip: tip, sub: sub };
      });
    }
    kinds.forEach(function (kind) {
      var c = chartCards[kind];
      D.clear(c.sub);
      D.mathInto(c.sub, kind === 'pq' ? '~convention ' + (ctx.conv === 'gen' ? 'générateur' : 'récepteur') + '~' : CH[kind][1]);
      MS.charts.render(kind, c.svg, ctx, c.lg, c.tip);
    });
  }

  function renderAll() {
    var ctx = compute();
    last = ctx;
    rows.concat(mrows, nrows, drows).forEach(function (r) { r.update(); });
    updateControls(ctx);
    renderStatus(ctx);
    renderValues(ctx);
    MS.schema.render($('svg-schema'), ctx);
    MS.phasor.render($('svg-phasor'), ctx);
    renderCaptions(ctx);
    renderCharts(ctx);
    state.refit = false;
    dirty = false;
  }

  function setSeg(id, value) {
    Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-v') === value ? 'true' : 'false');
    });
  }
  function updateControls(ctx) {
    var m = state.m, inp = state.inp;
    setSeg('seg-conv', state.conv); setSeg('seg-units', state.units);
    setSeg('seg-rotor', M.isSalient(m) ? 'saillant' : 'lisse'); setSeg('loadstate', inp.load);
    $('mode').value = inp.mode;
    $('loadstate').hidden = inp.mode !== 'load_Z';
    $('machine').value = state.machineId;
    Array.prototype.forEach.call($('overlays').querySelectorAll('input'), function (c) { c.checked = !!state.ov[c.getAttribute('data-ov')]; });
    var can = inp.mode === 'bus_EP';
    $('dyn-on').disabled = !can; $('dyn-on').checked = state.dyn.on && can;
    $('dyn-note').hidden = can;
    $('drows').hidden = !dynActive(); $('dyn-kick').hidden = !dynActive(); $('dyn-reset').hidden = !dynActive();
    var b = ctx.units.b;
    $('basetext').textContent = 'Bases : Sn = ' + D.sig(m.Sn / 1e3, 4) + ' kVA ; Vn = ' + D.sig(b.Vb, 4) + ' V (L-N) ; Isn = ' + D.sig(b.Ib, 4) +
      ' A ; Zb = ' + D.sig(b.Zb, 4) + ' Ω ; Ns = ' + D.sig(b.Nn, 4) + ' rpm ; K = ' + D.sig(b.K, 4) + ' V/A ; couple de base = ' + D.sig(b.Tb, 4) + ' N·m.';
    $('anim-play').textContent = state.anim.playing ? '⏸' : '▶';
    $('anim-speed').style.setProperty('--b', (100 * (state.anim.speed - 0.02) / 0.98).toFixed(1) + '%');
    $('btn-ghost').textContent = state.ghost ? 'Effacer la référence' : 'Mémoriser cet état';
    $('btn-ghost').setAttribute('aria-pressed', state.ghost ? 'true' : 'false');
    $('preset-reload').disabled = state.presetIdx < 0;
  }

  // ------------------------------------------------------------- événements
  function wire() {
    function seg(id, fn) {
      $(id).addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        fn(b.getAttribute('data-v')); invalidate();
      });
    }
    seg('seg-conv', function (v) { state.conv = v; state.refit = true; });
    seg('seg-units', function (v) { state.units = v; });
    seg('seg-rotor', function (v) {
      var m = state.m;
      if (v === 'lisse') m.Xq = m.Xd; else if (!M.isSalient(m)) m.Xq = +(0.6 * m.Xd).toFixed(3);
      state.machineId = 'perso'; state.refit = true; leavePreset();
    });
    seg('loadstate', function (v) { state.inp.load = v; state.refit = true; leavePreset(); });
    $('mode').addEventListener('change', function () {
      var inp = state.inp, was = inp.mode;
      inp.mode = this.value;
      if (M.isBus(inp.mode)) inp.Vs = clamp(inp.Vs, 0.5, 1.2);
      else {
        if (M.isBus(was)) inp.k = 1;
        inp.load = 'charge';
        if (inp.Is < 0.02) { inp.Is = 0.6; inp.Z = 1.5; }
        inp.Vs = clamp(inp.Vs, 0.5, 1.2);
      }
      state.dyn.init = true; state.refit = true; leavePreset(); invalidate();
    });
    $('preset').addEventListener('change', function () { applyPreset(parseInt(this.value, 10)); });
    $('preset-prev').addEventListener('click', function () { applyPreset(Math.max(0, state.presetIdx - 1)); });
    $('preset-next').addEventListener('click', function () { applyPreset(Math.min(MS.presets.list.length - 1, state.presetIdx + 1)); });
    $('machine').addEventListener('change', function () {
      if (this.value === 'perso') { state.machineId = 'perso'; return; }
      state.machineId = this.value; state.m = M.cloneMachine(this.value);
      buildRowsFresh(); state.refit = true; state.dyn.init = true; leavePreset(); invalidate();
    });
    $('overlays').addEventListener('change', function (e) {
      var key = e.target.getAttribute('data-ov'); if (!key) return;
      state.ov[key] = e.target.checked; state.refit = true; invalidate();
    });
    $('phasor-fit').addEventListener('click', function () { state.refit = true; invalidate(); });
    $('preset-reload').addEventListener('click', function () { if (state.presetIdx >= 0) applyPreset(state.presetIdx); });
    // --- déplacement direct de l'extrémité de E sur le diagramme vectoriel (réseau infini)
    var ph = $('svg-phasor'), dragging = false;
    function dragTo(e) {
      var z = MS.phasor.toComplex(ph, e.clientX, e.clientY);
      setFromE(Math.sqrt(z.re * z.re + z.im * z.im), Math.atan2(z.im, z.re));
    }
    ph.addEventListener('pointerdown', function (e) {
      if (!e.target.classList || !e.target.classList.contains('handle')) return;
      dragging = true; e.preventDefault();
      try { ph.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ }
      ph.classList.add('dragging');
    });
    ph.addEventListener('pointermove', function (e) { if (dragging) dragTo(e); });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      ph.addEventListener(t, function () { dragging = false; ph.classList.remove('dragging'); });
    });
    $('btn-ghost').addEventListener('click', function () {
      state.ghost = state.ghost ? null : last.op;
      state.refit = true; invalidate();
    });
    $('dyn-on').addEventListener('change', function () { state.dyn.on = this.checked; state.dyn.init = true; invalidate(); });
    $('dyn-kick').addEventListener('click', function () {
      var d = state.dyn; d.delta = clamp(d.delta + (d.delta >= 0 ? 1 : -1) * 20 * DEG, -Math.PI, Math.PI); invalidate();
    });
    $('dyn-reset').addEventListener('click', function () { state.dyn.init = true; invalidate(); });
    $('anim-play').addEventListener('click', function () { state.anim.playing = !state.anim.playing; invalidate(); });
    $('anim-zero').addEventListener('click', function () { state.anim.theta = 0; });
    $('anim-speed').addEventListener('input', function () { state.anim.speed = parseFloat(this.value); invalidate(); });
    $('btn-theme').addEventListener('click', function () {
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
      try { localStorage.setItem('gen436-theme', dark ? 'light' : 'dark'); } catch (err) { /* stockage indisponible */ }
    });
  }

  // ----------------------------------------------------------------- boucle
  // Une image : fait avancer l'animation et la dynamique de dt secondes, puis met l'affichage à jour.
  function advance(dt) {
    if (state.anim.playing) state.anim.theta = (state.anim.theta + 2 * Math.PI * state.anim.speed * dt) % (4 * Math.PI);
    if (dynActive() && state.anim.playing && dt > 0 && !state.dyn.lost && !state.dyn.init) { stepDynamics(dt); dirty = true; }
    if (dirty) renderAll();
    MS.machine.update($('svg-machine'), last, state.anim.theta);
    if (chartCards.waves) MS.charts.setCursor(chartCards.waves.svg, state.anim.theta);
  }
  var tPrev = null;
  function frame(tNow) {
    var dt = tPrev === null ? 0 : Math.min(0.05, (tNow - tPrev) / 1000);
    tPrev = tNow;
    advance(dt);
    window.requestAnimationFrame(frame);
  }
  // Point d'entrée pour tests/ui_tests.js : avancer le temps sans attendre le navigateur.
  MS.app = { advance: advance };

  function init() {
    var q = {};
    window.location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    var theme = q.theme;
    try { theme = theme || localStorage.getItem('gen436-theme'); } catch (err) { /* stockage indisponible */ }
    if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme);
    buildPresetList();
    buildRows();
    wire();
    var idx = -1;
    if (q.s) MS.presets.list.forEach(function (p, i) { if (p.id === q.s) idx = i; });
    if (idx >= 0) applyPreset(idx);
    else if (!q.libre) applyPreset(MS.presets.list.findIndex(function (p) { return p.id === 'c5-54'; }));
    else refreshPresetUI();
    if (q.conv === 'gen' || q.conv === 'rec') state.conv = q.conv;
    if (q.u === 'pu' || q.u === 'si') state.units = q.u;
    if (q.t !== undefined) state.anim.theta = parseFloat(q.t) * DEG;
    if (q.pause) state.anim.playing = false;
    if (q.ov) q.ov.split(',').forEach(function (key) { if (key in state.ov) state.ov[key] = true; });
    renderAll();
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
