/**
 * Hebrew calendar + text helpers. Pure JS, offline (no API = no upkeep).
 * Algorithm: Dershowitz & Reingold, Calendrical Calculations. Months numbered Nisan=1 ... Tishrei=7.
 */
var HEB_EPOCH = -1373427; // R.D. of 1 Tishrei, year 1
var RD_UNIX = 719163; // R.D. of 1970-01-01

var HEB_MONTH_HE = {1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול', 7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳'};
var HEB_MONTH_EN = {1: 'Nisan', 2: 'Iyar', 3: 'Sivan', 4: 'Tammuz', 5: 'Av', 6: 'Elul', 7: 'Tishrei', 8: 'Cheshvan', 9: 'Kislev', 10: 'Tevet', 11: 'Shvat', 12: 'Adar', 13: 'Adar II'};
var HEB_MONTH_PARSE = {'ניסן': 1, 'אייר': 2, 'איר': 2, 'סיוון': 3, 'סיון': 3, 'תמוז': 4, 'אב': 5, 'אלול': 6, 'תשרי': 7, 'חשוון': 8, 'חשון': 8, 'מרחשוון': 8, 'מרחשון': 8, 'כסלו': 9, 'טבת': 10, 'שבט': 11, 'אדר': 12};
var HEB_LETTERS = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400};

function hebLeap_(y) { return (7 * y + 1) % 19 < 7; }
function hebLastMonth_(y) { return hebLeap_(y) ? 13 : 12; }

function hebElapsed_(y) {
  var months = Math.floor((235 * y - 234) / 19);
  var parts = 12084 + 13753 * months;
  var day = 29 * months + Math.floor(parts / 25920);
  return (3 * (day + 1)) % 7 < 3 ? day + 1 : day;
}

function hebNewYear_(y) {
  var ny0 = hebElapsed_(y - 1), ny1 = hebElapsed_(y), ny2 = hebElapsed_(y + 1);
  var corr = ny2 - ny1 === 356 ? 2 : (ny1 - ny0 === 382 ? 1 : 0);
  return HEB_EPOCH + ny1 + corr;
}

function hebYearDays_(y) { return hebNewYear_(y + 1) - hebNewYear_(y); }

function hebMonthLen_(y, m) {
  var yd = hebYearDays_(y);
  if (m === 2 || m === 4 || m === 6 || m === 10 || m === 13) return 29;
  if (m === 12 && !hebLeap_(y)) return 29;
  if (m === 8 && yd % 10 !== 5) return 29;
  if (m === 9 && yd % 10 === 3) return 29;
  return 30;
}

function hebToFixed_(y, m, d) {
  var fixed = hebNewYear_(y) + d - 1, i;
  if (m < 7) {
    for (i = 7; i <= hebLastMonth_(y); i++) fixed += hebMonthLen_(y, i);
    for (i = 1; i < m; i++) fixed += hebMonthLen_(y, i);
  } else {
    for (i = 7; i < m; i++) fixed += hebMonthLen_(y, i);
  }
  return fixed;
}

function hebFromFixed_(fixed) {
  var y = Math.floor((fixed - HEB_EPOCH) / (35975351 / 98496)) - 1;
  while (hebNewYear_(y + 1) <= fixed) y++;
  var m = fixed < hebToFixed_(y, 1, 1) ? 7 : 1;
  while (fixed > hebToFixed_(y, m, hebMonthLen_(y, m))) m++;
  return {y: y, m: m, d: fixed - hebToFixed_(y, m, 1) + 1};
}

function gregToFixed_(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000) + RD_UNIX; }

/** Hebrew numeral for 1..999, e.g. 25 -> כ״ה, 784 -> תשפ״ד */
function hebNumeral_(n) {
  var s = '', ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hund = ['', 'ק', 'ר', 'ש'];
  n = n % 1000;
  while (n >= 400) { s += 'ת'; n -= 400; }
  s += hund[Math.floor(n / 100)]; n = n % 100;
  if (n === 15) s += 'טו';
  else if (n === 16) s += 'טז';
  else s += tens[Math.floor(n / 10)] + ones[n % 10];
  return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳';
}

function hebMonthName_(y, m, lang) {
  if (m === 12 && hebLeap_(y)) return lang === 'en' ? 'Adar I' : 'אדר א׳';
  return (lang === 'en' ? HEB_MONTH_EN : HEB_MONTH_HE)[m];
}

/**
 * Gregorian date to Hebrew date text.
 * @param {Date} date
 * @param {string} lang "he" (default) or "en"
 * @customfunction
 */
function GREG2HEB(date, lang) {
  if (Array.isArray(date)) return date.map(function (r) { return Array.isArray(r) ? r.map(function (c) { return GREG2HEB(c, lang); }) : GREG2HEB(r, lang); });
  if (!(date instanceof Date) || isNaN(date)) return '';
  var h = hebFromFixed_(gregToFixed_(date.getFullYear(), date.getMonth() + 1, date.getDate()));
  var mn = hebMonthName_(h.y, h.m, lang);
  if (lang === 'en') return h.d + ' ' + mn + ' ' + h.y;
  return hebNumeral_(h.d) + ' ב' + mn + ' ' + hebNumeral_(h.y);
}

function hebParseNum_(tok) {
  tok = tok.replace(/[״"׳'`]/g, '');
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  var sum = 0;
  for (var i = 0; i < tok.length; i++) { if (!(tok[i] in HEB_LETTERS)) return NaN; sum += HEB_LETTERS[tok[i]]; }
  return sum;
}

/** Parse "כ״ה בניסן תשפ״ד" / "25 ניסן 5784" / "ג אדר ב תשפ״ד" -> {y,m,d} or null */
function hebParse_(text) {
  var toks = String(text).replace(/[,.]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (toks.length < 3) return null;
  var d = hebParseNum_(toks[0]);
  var y = hebParseNum_(toks[toks.length - 1]);
  if (isNaN(d) || isNaN(y)) return null;
  if (y < 1000) y += 5000;
  var mt = toks[1].replace(/[״"׳']/g, '');
  if (!(mt in HEB_MONTH_PARSE) && mt.charAt(0) === 'ב') mt = mt.slice(1);
  if (!(mt in HEB_MONTH_PARSE)) return null;
  var m = HEB_MONTH_PARSE[mt];
  if (m === 12 && toks.length >= 4) {
    var sfx = toks[2].replace(/[״"׳']/g, '');
    if (sfx === 'א') m = 12; else if (sfx === 'ב') m = 13;
    else if (hebLeap_(y)) m = 13;
  } else if (m === 12 && hebLeap_(y)) m = 13;
  if (m === 13 && !hebLeap_(y)) m = 12;
  if (d < 1 || d > hebMonthLen_(y, m)) return null;
  return {y: y, m: m, d: d};
}

/**
 * Hebrew date text to Gregorian date.
 * @param {string} text e.g. "כ״ה בניסן תשפ״ד" or "25 ניסן 5784"
 * @customfunction
 */
function HEB2GREG(text) {
  if (Array.isArray(text)) return text.map(function (r) { return Array.isArray(r) ? r.map(HEB2GREG) : HEB2GREG(r); });
  var h = hebParse_(text);
  if (!h) return '';
  var t = new Date((hebToFixed_(h.y, h.m, h.d) - RD_UNIX) * 86400000);
  return new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

/**
 * Gematria value of Hebrew text (nikud ignored).
 * @customfunction
 */
function GEMATRIA(text) {
  if (Array.isArray(text)) return text.map(function (r) { return Array.isArray(r) ? r.map(GEMATRIA) : GEMATRIA(r); });
  var s = 0, t = String(text);
  for (var i = 0; i < t.length; i++) if (t[i] in HEB_LETTERS) s += HEB_LETTERS[t[i]];
  return s;
}

var NIKUD_RE = /[֑-ׇֽֿׁׂׅׄ]/g;

/**
 * Remove nikud and cantillation marks.
 * @customfunction
 */
function STRIPNIKUD(text) {
  if (Array.isArray(text)) return text.map(function (r) { return Array.isArray(r) ? r.map(STRIPNIKUD) : STRIPNIKUD(r); });
  return String(text).replace(NIKUD_RE, '');
}

var HEB_HOLIDAYS = {
  '7-1': ['ראש השנה', 'Rosh Hashanah'], '7-10': ['יום כיפור', 'Yom Kippur'], '7-15': ['סוכות', 'Sukkot'], '7-22': ['שמיני עצרת / שמחת תורה', 'Shemini Atzeret / Simchat Torah'],
  '9-25': ['חנוכה', 'Chanukah'], '11-15': ['ט״ו בשבט', 'Tu BiShvat'], '1-15': ['פסח', 'Pesach'], '1-21': ['שביעי של פסח', 'Seventh day of Pesach'],
  '2-5': ['יום העצמאות', 'Yom HaAtzmaut'], '3-6': ['שבועות', 'Shavuot'], '5-9': ['תשעה באב', 'Tisha BAv']
};

/**
 * Jewish holiday name for a Gregorian date (Israel schedule, major days only), or empty.
 * @param {Date} date
 * @param {string} lang "he" (default) or "en"
 * @customfunction
 */
function HEBHOLIDAY(date, lang) {
  if (Array.isArray(date)) return date.map(function (r) { return Array.isArray(r) ? r.map(function (c) { return HEBHOLIDAY(c, lang); }) : HEBHOLIDAY(r, lang); });
  if (!(date instanceof Date) || isNaN(date)) return '';
  var h = hebFromFixed_(gregToFixed_(date.getFullYear(), date.getMonth() + 1, date.getDate()));
  var m = h.m, d = h.d;
  if (m === 13) { if (d === 14) return lang === 'en' ? 'Purim' : 'פורים'; return ''; }
  if (m === 12 && !hebLeap_(h.y) && d === 14) return lang === 'en' ? 'Purim' : 'פורים';
  var e = HEB_HOLIDAYS[m + '-' + d];
  if (m === 9 && d > 25) e = HEB_HOLIDAYS['9-25'];
  if (m === 10 && d <= 2) e = HEB_HOLIDAYS['9-25'];
  if (m === 7 && d >= 16 && d <= 21) e = HEB_HOLIDAYS['7-15'];
  if (m === 1 && d >= 16 && d <= 20) e = HEB_HOLIDAYS['1-15'];
  return e ? e[lang === 'en' ? 1 : 0] : '';
}

/**
 * Number 1-999 to Hebrew numeral text, e.g. 25 -> כ״ה.
 * @customfunction
 */
function HEBNUM(n) {
  if (Array.isArray(n)) return n.map(function (r) { return Array.isArray(r) ? r.map(HEBNUM) : HEBNUM(r); });
  n = Math.floor(Number(n));
  return n >= 1 && n <= 999 ? hebNumeral_(n) : '';
}

if (typeof module !== 'undefined') module.exports = {GREG2HEB: GREG2HEB, HEB2GREG: HEB2GREG, GEMATRIA: GEMATRIA, STRIPNIKUD: STRIPNIKUD, HEBHOLIDAY: HEBHOLIDAY, HEBNUM: HEBNUM, hebNumeral_: hebNumeral_, hebFromFixed_: hebFromFixed_, hebToFixed_: hebToFixed_, gregToFixed_: gregToFixed_};

/** Pure cleaning ops on 2D arrays (testable offline). */

function cleanCell_(v, o) {
  if (typeof v !== 'string') return v;
  var s = v;
  if (o.trim) s = s.replace(/[ ​-‏‪-‮﻿]/g, ' ').replace(/\s+/g, ' ').trim();
  if (o.nikud) s = s.replace(NIKUD_RE, '');
  if (o.numbers) {
    var t = s.replace(/[,\s₪$€]/g, '');
    if (/^-?\d+(\.\d+)?$/.test(t) && s !== '') return parseFloat(t);
  }
  return s;
}

function cleanValues_(values, o) {
  return values.map(function (r) { return r.map(function (c) { return cleanCell_(c, o); }); });
}

function dedupeRows_(values) {
  var seen = {}, out = [];
  values.forEach(function (r) {
    var k = JSON.stringify(r.map(function (c) { return typeof c === 'string' ? c.trim().toLowerCase() : c; }));
    if (!seen[k]) { seen[k] = 1; out.push(r); }
  });
  return out;
}

function removeEmptyRows_(values) {
  return values.filter(function (r) { return r.some(function (c) { return c !== '' && c !== null; }); });
}

function caseValues_(values, mode) {
  return values.map(function (r) { return r.map(function (c) {
    if (typeof c !== 'string') return c;
    if (mode === 'upper') return c.toUpperCase();
    if (mode === 'lower') return c.toLowerCase();
    return c.toLowerCase().replace(/(^|[\s\-'(])([a-z])/g, function (m, p, ch) { return p + ch.toUpperCase(); });
  }); });
}

function fillDown_(values) {
  var last = [];
  return values.map(function (r) { return r.map(function (c, i) {
    if (c === '' || c === null) return last[i] === undefined ? c : last[i];
    last[i] = c; return c;
  }); });
}

/** Split first column of each row on delim into extra columns; pads rows to equal width. */
function splitValues_(values, delim) {
  var rows = values.map(function (r) { return typeof r[0] === 'string' ? r[0].split(delim).map(function (x) { return x.trim(); }) : [r[0]]; });
  var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  return rows.map(function (r) { while (r.length < w) r.push(''); return r; });
}

function sortRows_(values, col, desc) {
  var idx = values.map(function (r, i) { return i; });
  idx.sort(function (a, b) {
    var x = values[a][col], y = values[b][col];
    if (x === y) return a - b;
    if (x === '' || x === null) return 1;
    if (y === '' || y === null) return -1;
    var r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return desc ? -r : r;
  });
  return idx.map(function (i) { return values[i]; });
}

if (typeof module !== 'undefined') module.exports = {cleanValues_: cleanValues_, dedupeRows_: dedupeRows_, removeEmptyRows_: removeEmptyRows_, caseValues_: caseValues_, fillDown_: fillDown_, splitValues_: splitValues_, sortRows_: sortRows_};
