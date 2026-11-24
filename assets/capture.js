/* Renders email-capture forms ([data-capture]) and tool upsell blocks ([data-upsell]). */
(function () {
  var C = window.SYConfig || {}, P = window.SYPrices;
  var PRODUCTS = {
    'hebrew-text-pack': ['Hebrew Text Pack', '/products/hebrew-text-pack.html'],
    'israel-pack': ['Israel Business Pack', '/products/israel-pack.html'],
    'workdays-pack': ['Israeli Workdays & Dates Pack', '/products/workdays-pack.html'],
    'compare-merge': ['Compare & Merge', '/products/compare-merge.html'],
    'regex-pack': ['Regex Pack', '/products/regex-pack.html'],
    'data-parser': ['Messy Data Parser', '/products/data-parser.html'],
    'calendar-pack': ['Fiscal & Business Calendar', '/products/calendar-pack.html'],
    'sheets-toolkit': ['Sheets Cleanup & Hebrew Toolkit', '/sheets-toolkit.html']
  };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function track(n, p) { if (window.SY && SY.track) SY.track(n, p); }

  function upsell(el) {
    var slug = el.getAttribute('data-upsell'), p = PRODUCTS[slug]; if (!p) return;
    el.innerHTML = '<div class="card upsell"><span class="tag">Google Sheets add-on</span><h3>Do this automatically in Google Sheets</h3>' +
      '<p>Run this on whole columns with a formula. <b>' + esc(p[0]) + '</b> is <span data-price="addon">$15</span> once, lifetime access.</p>' +
      '<p><a class="btn" href="' + p[1] + '" data-track="upsell_click" data-product="' + slug + '">See ' + esc(p[0]) + ' &rsaquo;</a></p>' +
      '<p class="muted small-note">Want every add-on? <a href="/pricing.html" data-track="upsell_click" data-product="all-access">All Access</a> from <span data-price="allYearlyPerMonth">$10</span>/month billed yearly.</p></div>';
    if (P) P.fill(el);
  }

  function capture(el) {
    var src = el.getAttribute('data-source') || el.getAttribute('data-capture'), kind = el.getAttribute('data-capture');
    var uid = 'cap' + Math.random().toString(36).slice(2, 7);
    el.innerHTML = '<form class="capture capture-' + esc(kind) + '" novalidate><h3>Free Hebrew-in-Sheets cheat sheet</h3>' +
      '<p class="muted">Get the free Hebrew-in-Sheets cheat sheet + tips. No spam, unsubscribe anytime.</p>' +
      '<div class="cap-row"><label class="sr" for="' + uid + '">Email</label><input id="' + uid + '" type="email" name="email" placeholder="you@example.com" autocomplete="email" required>' +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" type="submit">Send it</button></div>' +
      '<p class="cap-msg small-note" role="status" aria-live="polite"></p>' +
      '<p class="muted small-note">We use your email only for this list. <a href="/privacy.html">Privacy</a></p></form>';
    var f = el.querySelector('form'), msg = el.querySelector('.cap-msg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Please enter a valid email.'; return; }
      if (f.website.value) { msg.textContent = 'Thanks! Check your inbox.'; return; } /* honeypot: bots */
      if (C.BREVO_FORM_URL) {
        var body = new URLSearchParams({EMAIL: email, email: email, source: src, email_address_check: '', locale: 'en'});
        var btn = f.querySelector('button'); btn.disabled = true;
        fetch(C.BREVO_FORM_URL, {method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: body.toString()})
          .then(function () { msg.textContent = 'Thanks! Check your inbox to confirm.'; f.email.value = ''; track('email_signup', {source: src}); })
          .catch(function () { msg.textContent = 'Something went wrong. Please try again.'; btn.disabled = false; });
      } else {
        var to = C.SUPPORT_EMAIL || 'hello@grid-smith.com';
        var href = 'mailto:' + to + '?subject=' + encodeURIComponent('Send me the Hebrew-in-Sheets cheat sheet') + '&body=' + encodeURIComponent('Please add ' + email + ' to the list (source: ' + src + ').');
        msg.innerHTML = 'Almost there: <a href="' + esc(href) + '">email us to get the cheat sheet</a>.';
        track('email_signup', {source: src, method: 'mailto'}); window.location.href = href;
      }
    });
  }
  function init() {
    document.querySelectorAll('[data-upsell]').forEach(upsell);
    document.querySelectorAll('[data-capture]').forEach(capture);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
