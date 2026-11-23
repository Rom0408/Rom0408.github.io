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

/** Pure compare/merge helpers on 2D arrays. */
function key_(c) { return String(c === null || c === undefined ? '' : c).trim().toLowerCase(); }

/** Rows of A whose key column value is missing from B's key column. */
function missingRows_(a, b, ka, kb) {
  var set = {}; b.forEach(function (r) { set[key_(r[kb])] = 1; });
  return a.filter(function (r) { return key_(r[ka]) !== '' && !set[key_(r[ka])]; });
}

/** Rows of A whose key also exists in B. */
function commonRows_(a, b, ka, kb) {
  var set = {}; b.forEach(function (r) { set[key_(r[kb])] = 1; });
  return a.filter(function (r) { return key_(r[ka]) !== '' && set[key_(r[ka])]; });
}

/** Left join: append B's other columns to A rows matched on key. width = B column count. */
function leftJoin_(a, b, ka, kb) {
  var map = {}, w = b.length ? b[0].length : 0;
  b.forEach(function (r) { var k = key_(r[kb]); if (!(k in map)) map[k] = r; });
  return a.map(function (r) {
    var m = map[key_(r[ka])], extra = [];
    for (var j = 0; j < w; j++) if (j !== kb) extra.push(m ? m[j] : '');
    return r.concat(extra);
  });
}

/** Cell-by-cell diff of same-shaped ranges: list of {row, col, a, b} (1-based). */
function diffCells_(a, b) {
  var out = [], R = Math.max(a.length, b.length);
  for (var i = 0; i < R; i++) {
    var C = Math.max((a[i] || []).length, (b[i] || []).length);
    for (var j = 0; j < C; j++) {
      var x = a[i] && a[i][j] !== undefined ? a[i][j] : '', y = b[i] && b[i][j] !== undefined ? b[i][j] : '';
      if (String(x) !== String(y)) out.push({row: i + 1, col: j + 1, a: x, b: y});
    }
  }
  return out;
}

/** Stack ranges vertically, padding short rows. */
function stack_(list) {
  var w = 0; list.forEach(function (v) { v.forEach(function (r) { if (r.length > w) w = r.length; }); });
  var out = []; list.forEach(function (v) { v.forEach(function (r) { var c = r.slice(); while (c.length < w) c.push(''); out.push(c); }); });
  return out;
}

/** Levenshtein distance. */
function lev_(a, b) {
  a = String(a); b = String(b);
  var p = [], i, j;
  for (j = 0; j <= b.length; j++) p[j] = j;
  for (i = 1; i <= a.length; i++) {
    var prev = p[0]; p[0] = i;
    for (j = 1; j <= b.length; j++) {
      var t = p[j];
      p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      prev = t;
    }
  }
  return p[b.length];
}

/** Similarity 0..1 between two strings (case-insensitive). @customfunction */
function SIMILARITY(a, b) {
  a = String(a).toLowerCase().trim(); b = String(b).toLowerCase().trim();
  var m = Math.max(a.length, b.length);
  return m === 0 ? 1 : Math.round((1 - lev_(a, b) / m) * 1000) / 1000;
}

/** Best fuzzy match of text within a list (column). Returns the match, or empty under min similarity. @customfunction */
function FUZZYMATCH(text, list, min) {
  min = min === undefined || min === '' ? 0.7 : min;
  var flat = [].concat.apply([], Array.isArray(list) ? list : [[list]]), best = '', bs = -1;
  flat.forEach(function (c) { if (c === '') return; var s = SIMILARITY(text, c); if (s > bs) { bs = s; best = c; } });
  return bs >= min ? best : '';
}

/** Groups of near-duplicate values in column 0: [[indexes...]] with similarity >= min. */
function fuzzyGroups_(values, min) {
  var n = values.length, used = {}, groups = [];
  for (var i = 0; i < n; i++) {
    if (used[i] || key_(values[i][0]) === '') continue;
    var g = [i];
    for (var j = i + 1; j < n; j++) if (!used[j] && SIMILARITY(values[i][0], values[j][0]) >= min) { g.push(j); used[j] = 1; }
    if (g.length > 1) { used[i] = 1; groups.push(g); }
  }
  return groups;
}

if (typeof module !== 'undefined') module.exports = {};

/** Regex & text-extraction pack. Pure functions + custom functions. Offline. */
function mapC_(x, fn) {
  if (Array.isArray(x)) return x.map(function (r) { return Array.isArray(r) ? r.map(function (c) { return mapC_(c, fn); }) : mapC_(r, fn); });
  return fn(x);
}
function re_(p, flags) { try { return new RegExp(p, flags || 'g'); } catch (e) { return null; } }

/** All regex matches joined by a delimiter (default ", "). @customfunction */
function REGEXALL(text, pattern, delim) {
  var r = re_(pattern, 'g'); if (!r) return '#BAD PATTERN';
  return mapC_(text, function (v) { var m = String(v).match(r); return m ? m.join(delim === undefined ? ', ' : delim) : ''; });
}

/** Nth regex match (1-based, default 1), or empty. @customfunction */
function REGEXNTH(text, pattern, n) {
  var r = re_(pattern, 'g'); if (!r) return '#BAD PATTERN';
  n = n || 1;
  return mapC_(text, function (v) { var m = String(v).match(r); return m && m[n - 1] !== undefined ? m[n - 1] : ''; });
}

/** Count of regex matches. @customfunction */
function REGEXCOUNT(text, pattern) {
  var r = re_(pattern, 'g'); if (!r) return '#BAD PATTERN';
  return mapC_(text, function (v) { var m = String(v).match(r); return m ? m.length : 0; });
}

/** Regex replace with $1-style groups. @customfunction */
function REGEXSWAP(text, pattern, repl) {
  var r = re_(pattern, 'g'); if (!r) return '#BAD PATTERN';
  return mapC_(text, function (v) { return String(v).replace(r, repl === undefined ? '' : repl); });
}

/** All numbers in text, joined (default ", "). @customfunction */
function EXTRACTNUMBERS(text, delim) { return REGEXALL(text, '-?\\d+(?:[.,]\\d+)?', delim); }

/** Text between two markers (first occurrence). @customfunction */
function BETWEEN(text, start, end) {
  return mapC_(text, function (v) {
    var s = String(v), i = s.indexOf(start); if (i < 0) return '';
    i += String(start).length; var j = end === undefined || end === '' ? s.length : s.indexOf(end, i);
    return j < 0 ? '' : s.slice(i, j);
  });
}

/** Hashtags / @mentions in text. @customfunction */
function EXTRACTTAGS(text, delim) { return REGEXALL(text, '[#@][\\w\\u05d0-\\u05ea]+', delim); }

/** Word count (Hebrew-safe). @customfunction */
function WORDCOUNT(text) { return mapC_(text, function (v) { var s = String(v).trim(); return s ? s.split(/\s+/).length : 0; }); }

/** Reverse text. @customfunction */
function REVERSETEXT(text) { return mapC_(text, function (v) { return Array.from(String(v)).reverse().join(''); }); }

/** Selection helper: replace by regex across a 2D range. Returns {values, changed}. */
function regexReplaceRange_(values, pattern, repl, flags) {
  var r = re_(pattern, flags || 'g'); if (!r) return null;
  var changed = 0;
  var out = values.map(function (row) { return row.map(function (c) {
    if (typeof c !== 'string') return c;
    var n = c.replace(r, repl); if (n !== c) changed++; return n;
  }); });
  return {values: out, changed: changed};
}

/** Rows (indexes) where any cell matches. */
function regexMatchRows_(values, pattern, flags) {
  var r = re_(pattern, flags || 'i'); if (!r) return null;
  var out = [];
  values.forEach(function (row, i) { if (row.some(function (c) { r.lastIndex = 0; return r.test(String(c)); })) out.push(i); });
  return out;
}
if (typeof module !== 'undefined') module.exports = {};
