/* Browser glue for the free tools. Uses globals from hebrew.js (same code as the Sheets add-on). */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function toast(t) { var e = $('toast'); if (!e) return; e.textContent = t; e.classList.add('show'); setTimeout(function () { e.classList.remove('show'); }, 1400); }
  function copy(text) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Copied'); }, function () { toast('Copy failed'); }); }
  window.copyFrom = function (id) { var e = $(id); copy(e.value !== undefined ? e.value : e.textContent); };

  var tb = $('theme');
  if (tb) tb.addEventListener('click', function () {
    var d = document.documentElement, cur = d.getAttribute('data-theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), nx = cur === 'dark' ? 'light' : 'dark';
    d.setAttribute('data-theme', nx);
    try { localStorage.setItem('theme', nx); } catch (e) {}
  });
  var menu = document.querySelector('.menu-btn');
  if (menu) menu.addEventListener('click', function () { document.querySelector('nav.main').classList.toggle('open'); });

  var kind = document.body.getAttribute('data-tool');
  if (!kind) return;

  if (kind === 'hebdate') {
    var g = $('g'), h = $('h'), today = new Date();
    g.value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
    var gr = function () {
      var p = g.value.split('-'); if (p.length < 3) { $('g-out').innerHTML = ''; return; }
      var d = new Date(+p[0], +p[1] - 1, +p[2]), hol = HEBHOLIDAY(d, 'en');
      $('g-out').innerHTML = '<small>Hebrew date</small><span class="he">' + GREG2HEB(d, 'he') + '</span><br><span>' + GREG2HEB(d, 'en') + '</span>' + (hol ? '<br><small style="margin-top:8px">Holiday: ' + hol + '</small>' : '');
    };
    var hr = function () {
      var d = HEB2GREG(h.value);
      $('h-out').innerHTML = d ? '<small>Gregorian date</small>' + d.toLocaleDateString('en-GB', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : '<small>Try: ט״ו בניסן תשפ״ד &nbsp;or&nbsp; 15 ניסן 5784</small>—';
    };
    g.addEventListener('input', gr); h.addEventListener('input', hr); gr(); hr();
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
        $('pane-g').hidden = b.dataset.p !== 'g'; $('pane-h').hidden = b.dataset.p !== 'h';
      });
    });
  }

  if (kind === 'gematria') {
    var t = $('t');
    var run = function () {
      var s = t.value, total = GEMATRIA(s), chips = '';
      for (var i = 0; i < s.length; i++) if (s[i] in HEB_LETTERS) chips += '<div class="chip"><b>' + s[i] + '</b><span>' + HEB_LETTERS[s[i]] + '</span></div>';
      $('out').innerHTML = '<small>Gematria value</small>' + total + (total > 0 && total < 1000 ? ' &nbsp;<span class="he" style="font-size:16px;color:var(--muted)">(' + hebNumeral_(total) + ')</span>' : '');
      $('chips').innerHTML = chips;
    };
    t.addEventListener('input', run); run();
  }

  if (kind === 'nikud') {
    var i1 = $('i'), o1 = $('o');
    var r1 = function () { o1.value = STRIPNIKUD(i1.value); $('count').textContent = (i1.value.length - o1.value.length) + ' marks removed'; };
    i1.addEventListener('input', r1); r1();
  }

  if (kind === 'cleaner') {
    var inp = $('i'), out = $('o');
    var run2 = function () {
      var rows = inp.value.split('\n').map(function (l) { return [l]; });
      var o = {trim: $('trim').checked, nikud: $('nikud').checked, numbers: false};
      var v = cleanValues_(rows, o);
      if ($('empty').checked) v = removeEmptyRows_(v);
      if ($('dedupe').checked) v = dedupeRows_(v);
      var c = $('case').value; if (c !== 'none') v = caseValues_(v, c);
      if ($('sort').checked) v = sortRows_(v, 0, false);
      out.value = v.map(function (r) { return r[0]; }).join('\n');
      $('count').textContent = rows.length + ' lines in, ' + v.length + ' out';
    };
    document.querySelectorAll('.opts input,.opts select,#i').forEach(function (e) { e.addEventListener('input', run2); e.addEventListener('change', run2); });
    run2();
  }

  if (kind === 'listcompare') {
    var la = $('a'), lb = $('b');
    var lines = function (e) { return e.value.split('\n').map(function (l) { return [l]; }).filter(function (r) { return r[0].trim() !== ''; }); };
    var lc = function () {
      var A = lines(la), B = lines(lb);
      $('oa').value = missingRows_(A, B, 0, 0).map(function (r) { return r[0]; }).join('\n');
      $('ob').value = missingRows_(B, A, 0, 0).map(function (r) { return r[0]; }).join('\n');
      $('oc').value = commonRows_(A, B, 0, 0).map(function (r) { return r[0]; }).join('\n');
    };
    la.addEventListener('input', lc); lb.addEventListener('input', lc); lc();
  }

  if (kind === 'regex') {
    var rp = $('p'), rr = $('r'), rt = $('t');
    var rx = function () {
      var m = null; try { m = rt.value.match(new RegExp(rp.value, 'g')); } catch (e) { $('out').innerHTML = '<small>Invalid pattern</small>'; $('rep').value = ''; return; }
      $('out').innerHTML = '<small>' + (m ? m.length : 0) + ' matches</small>' + (m ? m.map(function (x) { return '<code>' + x.replace(/</g, '&lt;') + '</code> '; }).join('') : '—');
      $('rep').value = rp.value ? rt.value.replace(new RegExp(rp.value, 'g'), rr.value) : '';
    };
    [rp, rr, rt].forEach(function (e) { e.addEventListener('input', rx); }); rx();
  }

  if (kind === 'idcheck') {
    var ii = $('i');
    var ic = function () {
      var L = ii.value.split('\n').filter(function (l) { return l.trim(); }), ok = 0;
      $('out').textContent = L.map(function (l) { var v = idValid_(l); if (v) ok++; return (v ? '✅ ' : '❌ ') + l.trim(); }).join('\n') + '\n\n' + ok + ' of ' + L.length + ' valid';
    };
    ii.addEventListener('input', ic); ic();
  }

  if (kind === 'kbfix') {
    var ki = $('i'), ko = $('o');
    var kr = function () {
      var m = $('mode').value, f = m === 'heb' ? toHeb_ : m === 'eng' ? toEng_ : function (s) { return KBFIX(s); };
      var v = ki.value.split('\n').map(function (l) { return f(l); }).join('\n');
      ko.value = $('sofit').checked ? FIXSOFIT(v) : v;
    };
    ki.addEventListener('input', kr); $('mode').addEventListener('change', kr); $('sofit').addEventListener('change', kr); kr();
  }

  function pd(v) { var p = (v || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function fd(d) { return d && d.toLocaleDateString('en-GB', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}); }
  if (kind === 'workdays') {
    var ws = $('s'), we = $('e'), wn = $('n'), wk = $('wk'), now = new Date(), pad = function (x) { return ('0' + x).slice(-2); };
    ws.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var e2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30); we.value = e2.getFullYear() + '-' + pad(e2.getMonth() + 1) + '-' + pad(e2.getDate());
    var wr = function () {
      var s = pd(ws.value), e = pd(we.value), w = wk.value, n = parseInt(wn.value, 10);
      $('cnt').innerHTML = s && e ? '<small>Working days (inclusive)</small>' + ILWORKDAYS(s, e, w) : '';
      var a = s && !isNaN(n) ? ILADDWORKDAYS(s, n, w) : null;
      $('add').innerHTML = a ? '<small>' + n + ' workdays after the start date</small>' + fd(a) : '';
    };
    [ws, we, wn, wk].forEach(function (x) { x.addEventListener('input', wr); x.addEventListener('change', wr); }); wr();
  }

  if (kind === 'age') {
    var ab = $('b'), ay = $('y'); ay.value = new Date().getFullYear();
    var ar = function () {
      var b = pd(ab.value); if (!b) { $('out').innerHTML = ''; return; }
      var hb = HEBBIRTHDAY(b, parseInt(ay.value, 10) || new Date().getFullYear());
      $('out').innerHTML = '<small>Exact age today</small>' + AGEYMD(b) + '<br><small style="margin-top:10px">Hebrew birthday in ' + ay.value + '</small>' + (hb ? fd(hb) : '—') + '<br><small style="margin-top:10px">Hebrew birth date</small><span class="he">' + GREG2HEB(b, 'he') + '</span>';
    };
    ab.addEventListener('input', ar); ay.addEventListener('input', ar); ar();
  }

  if (kind === 'shekel') {
    var nn = $('n');
    var sc = function () { var v = parseFloat(nn.value); $('out').textContent = isNaN(v) ? '' : SHEKELWORDS(v); };
    nn.addEventListener('input', sc); sc();
  }
})();
