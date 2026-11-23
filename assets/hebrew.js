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

/** Israeli business helpers: ID/company check, amount in Hebrew words, VAT, IBAN. Offline. */
function mapI_(x, fn) {
  if (Array.isArray(x)) return x.map(function (r) { return Array.isArray(r) ? r.map(function (c) { return mapI_(c, fn); }) : mapI_(r, fn); });
  return fn(x);
}

function idValid_(v) {
  var s = String(v).replace(/\D/g, '');
  if (!s || s.length > 9) return false;
  while (s.length < 9) s = '0' + s;
  if (/^0+$/.test(s)) return false;
  var sum = 0;
  for (var i = 0; i < 9; i++) { var n = +s.charAt(i) * (i % 2 === 0 ? 1 : 2); sum += n > 9 ? n - 9 : n; }
  return sum % 10 === 0;
}
/** TRUE if a valid Israeli ID (teudat zehut) or company number (check digit). @customfunction */
function ISRAELID(id) { return mapI_(id, idValid_); }

/** Pad an Israeli ID to 9 digits. @customfunction */
function PADID(id) { return mapI_(id, function (v) { var s = String(v).replace(/\D/g, ''); return s ? ('000000000' + s).slice(-9) : ''; }); }

function ibanValid_(v) {
  var s = String(v).replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  var r = s.slice(4) + s.slice(0, 4), rem = 0;
  var d = r.replace(/[A-Z]/g, function (c) { return c.charCodeAt(0) - 55; });
  for (var i = 0; i < d.length; i++) rem = (rem * 10 + +d.charAt(i)) % 97;
  return rem === 1;
}
/** TRUE if the IBAN checksum is valid. @customfunction */
function ISIBAN(iban) { return mapI_(iban, ibanValid_); }

/** Add VAT (default 18%). @customfunction */
function VATADD(net, rate) { rate = rate === undefined || rate === '' ? 0.18 : rate; return mapI_(net, function (v) { return typeof v === 'number' ? Math.round(v * (1 + rate) * 100) / 100 : v; }); }
/** Strip VAT from a gross amount (default 18%). @customfunction */
function VATSTRIP(gross, rate) { rate = rate === undefined || rate === '' ? 0.18 : rate; return mapI_(gross, function (v) { return typeof v === 'number' ? Math.round(v / (1 + rate) * 100) / 100 : v; }); }
/** VAT part of a gross amount. @customfunction */
function VATPART(gross, rate) { rate = rate === undefined || rate === '' ? 0.18 : rate; return mapI_(gross, function (v) { return typeof v === 'number' ? Math.round((v - v / (1 + rate)) * 100) / 100 : v; }); }

var HW_ONES = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה'];
var HW_ONES_F = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
var HW_TENS = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
var HW_TEENS_M = ['עשרה', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר', 'חמישה עשר', 'שישה עשר', 'שבעה עשר', 'שמונה עשר', 'תשעה עשר'];
var HW_TEENS_F = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
var HW_HUND = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות'];

function hw3_(n, fem) { // 1..999 -> list of word groups
  var out = [], h = Math.floor(n / 100), r = n % 100;
  if (h) out.push(HW_HUND[h]);
  if (r >= 10 && r < 20) out.push((fem ? HW_TEENS_F : HW_TEENS_M)[r - 10]);
  else {
    if (r >= 20) out.push(HW_TENS[Math.floor(r / 10)]);
    var o = r % 10; if (o) out.push((fem ? HW_ONES_F : HW_ONES)[o]);
    if (r === 10) out.push(fem ? 'עשר' : 'עשרה');
  }
  return out;
}

function hebWords_(n, fem) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'אפס';
  if (n >= 1e9) return String(n);
  var segs = [], mil = Math.floor(n / 1e6), th = Math.floor((n % 1e6) / 1000), rest = n % 1000;
  function seg(words, suffix, one) { // one: words already complete
    var w = words.slice(), inner = false;
    if (!one && w.length > 1) { w[w.length - 1] = 'ו' + w[w.length - 1]; inner = true; }
    segs.push({w: w.concat(suffix || []), inner: inner});
  }
  if (mil) { if (mil === 1) seg(['מיליון'], 0, true); else if (mil === 2) seg(['שני מיליון'], 0, true); else seg(hw3_(mil, false), ['מיליון']); }
  if (th) {
    var T = {4: 'ארבעת', 5: 'חמשת', 6: 'ששת', 7: 'שבעת', 8: 'שמונת', 9: 'תשעת', 10: 'עשרת', 3: 'שלושת'};
    if (th === 1) seg(['אלף'], 0, true); else if (th === 2) seg(['אלפיים'], 0, true);
    else if (th <= 10) seg([T[th] + ' אלפים'], 0, true);
    else seg(hw3_(th, false), ['אלף']);
  }
  if (rest) seg(hw3_(rest, fem));
  var last = segs[segs.length - 1];
  if (segs.length > 1 && !last.inner) last.w[0] = 'ו' + last.w[0];
  return segs.map(function (x) { return x.w.join(' '); }).join(' ');
}
/** Whole number in Hebrew words. fem=TRUE for feminine nouns. @customfunction */
function HEBWORDS(n, fem) { return mapI_(n, function (v) { return typeof v === 'number' ? (v < 0 ? 'מינוס ' : '') + hebWords_(v, !!fem) : ''; }); }

/** Shekel amount in Hebrew words, e.g. מאה ועשרים שקלים וחמישים אגורות. @customfunction */
function SHEKELWORDS(amount) {
  return mapI_(amount, function (v) {
    if (typeof v !== 'number') return '';
    var tot = Math.round(Math.abs(v) * 100), sh = Math.floor(tot / 100), ag = tot % 100, out;
    out = sh === 1 ? 'שקל אחד' : sh === 2 ? 'שני שקלים' : hebWords_(sh, false) + ' שקלים';
    if (ag) out += ' ו' + (ag === 1 ? 'אגורה אחת' : hebWords_(ag, true) + ' אגורות');
    return (v < 0 ? 'מינוס ' : '') + out;
  });
}

function invalidIdRows_(values, col) { var bad = []; values.forEach(function (r, i) { if (String(r[col]).trim() !== '' && !idValid_(r[col])) bad.push(i); }); return bad; }
if (typeof module !== 'undefined') module.exports = {};

/** Hebrew text fixers: wrong-keyboard repair, final letters, bidi marks. Offline. */
var KB_EN = "qwertyuiopasdfghjkl;'zxcvbnm,./";
var KB_HE = "/'קראטוןםפשדגכעיחלךף,זסבהנמצתץ.";
var HEB_RANGE = /[א-ת]/;

function mapT_(x, fn) {
  if (Array.isArray(x)) return x.map(function (r) { return Array.isArray(r) ? r.map(function (c) { return mapT_(c, fn); }) : mapT_(r, fn); });
  return fn(x);
}
function toHeb_(s) { return s.replace(/[A-Za-z;',./]/g, function (c) { var i = KB_EN.indexOf(c.toLowerCase()); return i < 0 ? c : KB_HE.charAt(i); }); }
function toEng_(s) { return s.replace(/[א-ת,.';\/]/g, function (c) { var i = KB_HE.indexOf(c); return i < 0 ? c : KB_EN.charAt(i); }); }

/** Text typed on an English keyboard while meaning Hebrew -> Hebrew. @customfunction */
function KBTOHEB(text) { return mapT_(text, function (v) { return toHeb_(String(v)); }); }
/** Text typed on a Hebrew keyboard while meaning English -> English. @customfunction */
function KBTOENG(text) { return mapT_(text, function (v) { return toEng_(String(v)); }); }
/** Auto: Latin-only text becomes Hebrew, Hebrew-only text becomes English. @customfunction */
function KBFIX(text) {
  return mapT_(text, function (v) {
    var s = String(v), he = HEB_RANGE.test(s), en = /[A-Za-z]/.test(s);
    return he && !en ? toEng_(s) : en && !he ? toHeb_(s) : s;
  });
}

var SOFIT = {'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ'}, UNSOFIT = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'};
/** Fix final letters (sofit) at word ends and remove them mid-word. @customfunction */
function FIXSOFIT(text) {
  return mapT_(text, function (v) {
    return String(v).replace(/[א-ת]+/g, function (w) {
      var a = w.split('');
      for (var i = 0; i < a.length; i++) {
        var last = i === a.length - 1;
        if (last && SOFIT[a[i]]) a[i] = SOFIT[a[i]];
        else if (!last && UNSOFIT[a[i]]) a[i] = UNSOFIT[a[i]];
      }
      return a.join('');
    });
  });
}
/** Remove invisible bidi control marks (LRM, RLM, embeddings). @customfunction */
function STRIPBIDI(text) { return mapT_(text, function (v) { return String(v).replace(/[‎‏‪-‮⁦-⁩]/g, ''); }); }
/** TRUE if the text contains Hebrew letters. @customfunction */
function ISHEBREW(text) { return mapT_(text, function (v) { return HEB_RANGE.test(String(v)); }); }
/** Share of letters that are Hebrew (0-1). @customfunction */
function HEBSHARE(text) {
  return mapT_(text, function (v) {
    var s = String(v), h = (s.match(/[א-ת]/g) || []).length, l = (s.match(/[A-Za-zא-ת]/g) || []).length;
    return l ? Math.round(h / l * 1000) / 1000 : 0;
  });
}
/** Hebrew letters only, nikud removed. @customfunction */
function HEBONLY(text) { return mapT_(text, function (v) { return String(v).replace(/[^א-ת\s]/g, '').replace(/\s+/g, ' ').trim(); }); }
if (typeof module !== 'undefined') module.exports = {};

/* Israeli workdays & dates. Week = Sun-Thu (weekend Fri-Sat) by default; weekend "intl" = Sat-Sun. Uses Hebrew.gs. */
var WD_OFF_ = {'7-1': 1, '7-10': 1, '7-15': 1, '7-22': 1, '1-15': 1, '1-21': 1, '2-5': 1, '3-6': 1};

function mapW_(v, f) { return Array.isArray(v) ? v.map(function (r) { return Array.isArray(r) ? r.map(function (c) { return mapW_(c, f); }) : mapW_(r, f); }) : f(v); }
function dOk_(d) { return d instanceof Date && !isNaN(d); }
function dayOff_(d) { // Israeli public holiday (full day off)
  var h = hebFromFixed_(gregToFixed_(d.getFullYear(), d.getMonth() + 1, d.getDate())), k = h.m + '-' + h.d;
  if (WD_OFF_[k]) return true;
  if (h.m === 7 && h.d >= 16 && h.d <= 21) return true; // chol hamoed Sukkot
  if (h.m === 1 && h.d >= 16 && h.d <= 20) return true; // chol hamoed Pesach
  return false;
}
function weekendDay_(d, wk) { var w = d.getDay(); return wk === 'intl' ? (w === 0 || w === 6) : (w === 5 || w === 6); }
function isWork_(d, wk, hol) { return !weekendDay_(d, wk) && !(hol !== false && dayOff_(d)); }
function dayAdd_(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function dayKey_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/**
 * TRUE if the date is a working day in Israel (Sun-Thu, not a public holiday).
 * @param {Date} date
 * @param {string} weekend "il" (Fri-Sat, default) or "intl" (Sat-Sun)
 * @customfunction
 */
function ILISWORKDAY(date, weekend) { return mapW_(date, function (d) { return dOk_(d) ? isWork_(d, weekend) : ''; }); }

/**
 * Number of working days between two dates, inclusive.
 * @customfunction
 */
function ILWORKDAYS(start, end, weekend) {
  if (!dOk_(start) || !dOk_(end)) return '';
  var a = dayKey_(start), b = dayKey_(end), sign = 1, n = 0;
  if (a > b) { var t = a; a = b; b = t; sign = -1; }
  for (var d = a; d <= b; d = dayAdd_(d, 1)) if (isWork_(d, weekend)) n++;
  return sign * n;
}

/**
 * Date after adding N working days (negative goes back).
 * @customfunction
 */
function ILADDWORKDAYS(date, days, weekend) {
  if (!dOk_(date) || isNaN(Number(days))) return '';
  var n = Math.trunc(Number(days)), step = n < 0 ? -1 : 1, d = dayKey_(date);
  while (n !== 0) { d = dayAdd_(d, step); if (isWork_(d, weekend)) n -= step; }
  return d;
}

/**
 * Next working day strictly after the date.
 * @customfunction
 */
function ILNEXTWORKDAY(date, weekend) { return ILADDWORKDAYS(date, 1, weekend); }

/**
 * Whole years between birth date and today (or as-of date).
 * @customfunction
 */
function AGEYEARS(birth, asOf) { return mapW_(birth, function (b) { return ageParts_(b, asOf) ? ageParts_(b, asOf).y : ''; }); }

/**
 * Age as "34y 2m 5d".
 * @customfunction
 */
function AGEYMD(birth, asOf) { return mapW_(birth, function (b) { var p = ageParts_(b, asOf); return p ? p.y + 'y ' + p.m + 'm ' + p.d + 'd' : ''; }); }

function ageParts_(b, asOf) {
  var e = asOf === undefined || asOf === '' ? new Date() : asOf;
  if (!dOk_(b) || !dOk_(e) || dayKey_(b) > dayKey_(e)) return null;
  var tm = (e.getFullYear() - b.getFullYear()) * 12 + e.getMonth() - b.getMonth();
  function at(k) { var t = b.getMonth() + k, yy = b.getFullYear() + Math.floor(t / 12), mm = ((t % 12) + 12) % 12; return new Date(yy, mm, Math.min(b.getDate(), new Date(yy, mm + 1, 0).getDate())); }
  if (at(tm) > dayKey_(e)) tm--;
  var d = Math.round((dayKey_(e) - at(tm)) / 86400000), y = Math.floor(tm / 12), m = tm % 12;
  return {y: y, m: m, d: d};
}

/**
 * Gregorian date of the Hebrew birthday in a given Gregorian year (the Hebrew date that year's Hebrew-year contains).
 * @param {Date} birth
 * @param {number} year Gregorian year (default: this year)
 * @customfunction
 */
function HEBBIRTHDAY(birth, year) {
  if (!dOk_(birth)) return '';
  var h = hebFromFixed_(gregToFixed_(birth.getFullYear(), birth.getMonth() + 1, birth.getDate()));
  var y = Number(year) || new Date().getFullYear(), best = null;
  for (var hy = y + 3760; hy <= y + 3761; hy++) {
    var m = h.m, d = h.d;
    if (m === 13 && !hebLeap_(hy)) m = 12;
    if (m === 12 && hebLeap_(hy) && h.m === 12 && !hebLeap_(h.y)) m = 13;
    if (d > hebMonthLen_(hy, m)) d = hebMonthLen_(hy, m);
    var f = hebToFixed_(hy, m, d), g = new Date((f - RD_UNIX) * 86400000), dt = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
    if (dt.getFullYear() === y) best = dt;
  }
  return best || '';
}
