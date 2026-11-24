/* Consent banner + consent-gated GA4. Without SYConfig.GA_ID nothing loads and no banner shows. */
(function () {
  var C = window.SYConfig || {}, KEY = 'sy_consent', loaded = false, granted = false;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (C.GA_ID) gtag('consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500});

  function grant() {
    granted = true; if (!C.GA_ID) return;
    gtag('consent', 'update', {analytics_storage: 'granted'});
    if (loaded) return; loaded = true;
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(C.GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', C.GA_ID, {anonymize_ip: true, allow_google_signals: false});
  }
  function deny() { granted = false; if (C.GA_ID && loaded) gtag('consent', 'update', {analytics_storage: 'denied'}); }

  window.SY = window.SY || {};
  SY.track = function (name, params) {
    if (!granted || !C.GA_ID || !name) return;
    try { gtag('event', name, params || {}); } catch (e) {}
  };
  SY.consentReset = function () { set(''); deny(); banner(); };

  function banner() {
    if (!C.GA_ID || document.getElementById('sy-consent')) return;
    var b = document.createElement('div'); b.id = 'sy-consent'; b.className = 'consent'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Analytics consent');
    b.innerHTML = '<p>We use Google Analytics to see which pages and tools are useful, only if you accept. <a href="/privacy.html">Details</a></p><div><button type="button" class="btn small ghost" data-c="denied">Decline</button><button type="button" class="btn small" data-c="granted">Accept</button></div>';
    b.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute('data-c'); if (!v) return;
      set(v); if (v === 'granted') grant(); else deny(); b.remove();
    });
    document.body.appendChild(b);
  }

  function wire() {
    var c = get();
    if (c === 'granted') grant(); else if (c !== 'denied') banner();
    document.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.closest) return;
      var r = t.closest('[data-consent-reset]'); if (r) { e.preventDefault(); SY.consentReset(); return; }
      var a = t.closest('[data-track],a[href*="pay.html"]'); if (!a) return;
      var href = a.getAttribute('href') || '', ev = a.getAttribute('data-track') || (href.indexOf('pay.html') > -1 ? 'buy_click' : '');
      if (ev) SY.track(ev, {link_url: href, product: a.getAttribute('data-product') || (href.match(/[?&]p=([\w-]+)/) || [])[1] || (href.match(/plan=(\w+)/) || [])[1] || '', page: location.pathname});
    }, true);
    /* tool_used: fires after a pause in input on a free tool page, at most once per 10s */
    var tool = document.body.getAttribute('data-tool');
    if (tool) {
      var tm, last = 0, fire = function () { if (Date.now() - last < 10000) return; last = Date.now(); SY.track('tool_used', {tool: tool, page: location.pathname}); };
      ['input', 'change'].forEach(function (n) { document.addEventListener(n, function (e) { if (e.target.closest && e.target.closest('.tool')) { clearTimeout(tm); tm = setTimeout(fire, 1200); } }); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
