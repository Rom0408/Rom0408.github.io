/* Single source of truth for prices. Fills any [data-price="key"] element.
   Static fallback text stays in the HTML for no-JS / SEO. Paddle price IDs live in pay.html. */
(function () {
  var C = window.SYConfig || {};
  var P = {addon: 15, allMonthlyList: 30, allYearlyList: 240, discount: 0.5, refundDays: 14, launchEnd: C.LAUNCH_END || '2026-12-24'};
  var end = Date.parse(P.launchEnd + 'T23:59:59Z');
  P.launchActive = isNaN(end) || Date.now() <= end;
  var f = P.launchActive ? 1 - P.discount : 1;
  P.allMonthly = P.allMonthlyList * f;
  P.allYearly = P.allYearlyList * f;
  P.allYearlyPerMonth = P.allYearly / 12;
  P.allYearlySave = P.allMonthly * 12 - P.allYearly;
  function usd(n) { return '$' + (Math.round(n * 100) / 100); }
  var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], d = new Date(P.launchEnd + 'T00:00:00Z');
  P.fmt = {
    addon: usd(P.addon), allMonthly: usd(P.allMonthly), allYearly: usd(P.allYearly),
    allMonthlyList: usd(P.allMonthlyList), allYearlyList: usd(P.allYearlyList),
    allYearlyPerMonth: usd(P.allYearlyPerMonth), allYearlySave: usd(P.allYearlySave),
    launchEnd: isNaN(d) ? P.launchEnd : M[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(),
    refund: P.refundDays + '-day refund, for any reason'
  };
  P.fill = function (root) {
    (root || document).querySelectorAll('[data-price]').forEach(function (e) {
      var v = P.fmt[e.getAttribute('data-price')]; if (v !== undefined) e.textContent = v;
    });
    (root || document).querySelectorAll('[data-launch]').forEach(function (e) { e.hidden = !P.launchActive; });
  };
  window.SYPrices = P;
  function init() {
    P.fill(document);
    /* Sticky mobile buy bar on product pages (CSS shows it at <=700px only) */
    if (!/^\/(products\/(?!index)[^\/]+\.html|sheets-toolkit\.html)$/.test(location.pathname)) return;
    var b = document.querySelector('a.btn[href*="pay.html?p="]'); if (!b) return;
    var bar = document.createElement('div'); bar.className = 'buybar';
    bar.innerHTML = '<span class="buybar-p"><b data-price="addon">' + P.fmt.addon + '</b> once, lifetime<small>' + P.fmt.refund + '</small></span><a class="btn" data-track="buy_click" href="' + b.getAttribute('href') + '">Buy now</a>';
    document.body.appendChild(bar); document.body.classList.add('has-buybar');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
