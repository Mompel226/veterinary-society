/* The society's script, driven on a fake Google.        node tools/gastest.js
   Apps Script cannot be run from here, and the chair cannot debug it, so every rule this script
   is supposed to keep is checked against a spreadsheet that behaves like a real one: real rows
   and columns, real dates, a real cache, a real Classroom that records what it was sent.
   The rule that matters most is the last one: what leaves this script must never carry an
   address, a surname or a Korean name. */
'use strict';
const fs = require('fs');

/* ---------- a sheet that behaves like a sheet ---------- */
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sh._get(this.r + i, this.c + j));
      out.push(row);
    }
    return out;
  }
  getValue() { return this.sh._get(this.r, this.c); }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sh._set(this.r + i, this.c + j, x))); return this; }
  setValue(x) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh._set(this.r + i, this.c + j, x); return this; }
  insertCheckboxes() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) { const v = this.sh._get(this.r + i, this.c + j); if (v === '' || v == null) this.sh._set(this.r + i, this.c + j, false); } this.sh.boxes++; return this; }
  getSheet() { return this.sh; }
  getRow() { return this.r; }
  getColumn() { return this.c; }
  getA1Notation() { let c = this.c, s = ''; while (c > 0) { s = String.fromCharCode(65 + (c - 1) % 26) + s; c = Math.floor((c - 1) / 26); } return s + this.r; }
  setNote() { return this; } setFontWeight() { return this; } setFontColor() { return this; } setFontStyle() { return this; }
  setNumberFormat(f) { this.sh.formats[this.r + ',' + this.c] = f; return this; } setWrap() { return this; }
}
class Sheet {
  constructor(name) { this.name = name; this.cells = new Map(); this.maxRows = 1000; this.maxCols = 26; this.boxes = 0; this.formats = {}; this.widths = {}; this.frozen = [0, 0]; }
  _k(r, c) { return r + ',' + c; }
  _get(r, c) { const v = this.cells.get(this._k(r, c)); return v === undefined ? '' : v; }
  _set(r, c, v) { this.cells.set(this._k(r, c), v); }
  getName() { return this.name; }
  getRange(r, c, nr = 1, nc = 1) {
    if (r < 1 || c < 1) throw new Error('bad range ' + [r, c, nr, nc]);
    if (c + nc - 1 > this.maxCols) throw new Error(`range past the last column (${c + nc - 1} > ${this.maxCols}) on ${this.name}`);
    return new Range(this, r, c, nr, nc);
  }
  getLastRow() { let m = 0; for (const [k, v] of this.cells) if (v !== '' && v != null) m = Math.max(m, +k.split(',')[0]); return m; }
  getLastColumn() { let m = 0; for (const [k, v] of this.cells) if (v !== '' && v != null) m = Math.max(m, +k.split(',')[1]); return m; }
  getMaxColumns() { return this.maxCols; }
  getMaxRows() { return this.maxRows; }
  insertColumnsAfter(after, n) { this.maxCols += n; return this; }
  appendRow(vals) { const r = this.getLastRow() + 1; vals.forEach((v, i) => this._set(r, i + 1, v)); return this; }
  deleteRow(r) {
    const last = this.getLastRow(), lastC = this.getLastColumn();
    for (let i = r; i < last; i++) for (let c = 1; c <= lastC; c++) this._set(i, c, this._get(i + 1, c));
    for (let c = 1; c <= lastC; c++) this.cells.delete(this._k(last, c));
    return this;
  }
  setFrozenRows(n) { this.frozen[0] = n; return this; } setFrozenColumns(n) { this.frozen[1] = n; return this; }
  setColumnWidth(c, w) { this.widths[c] = w; return this; }
}
class Spreadsheet {
  constructor() { this.sheets = []; this.toasts = []; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  getSpreadsheetTimeZone() { return 'Asia/Seoul'; }
  toast(m) { this.toasts.push(m); }
}

/* ---------- the rest of Google, as much as this script touches ---------- */
function makeGlobals(now) {
  const ss = new Spreadsheet();
  const G = {
    __ss: ss, __alerts: [], __cache: new Map(), __classroom: [], __triggers: [], __fetches: [], __tokens: {},
    SpreadsheetApp: {
      getActive: () => ss,
      getUi: () => ({
        alert: m => G.__alerts.push(m),
        prompt: () => ({ getSelectedButton: () => 'ok', getResponseText: () => G.__answer.shift() }),
        ButtonSet: { OK_CANCEL: 'okc' }, Button: { OK: 'ok' },
        createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => m }; return m; }
      })
    },
    CacheService: { getScriptCache: () => ({ get: k => G.__cache.get(k) || null, put: (k, v) => G.__cache.set(k, v), remove: k => G.__cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => true, releaseLock: () => true }) },
    UrlFetchApp: { fetch: (url) => { G.__fetches.push(url); const m = /id_token=([^&]+)/.exec(url); const t = G.__tokens[decodeURIComponent(m ? m[1] : '')];
      return { getResponseCode: () => (t ? 200 : 400), getContentText: () => JSON.stringify(t || {}) }; } },
    Utilities: { formatDate: (d, tz, fmt) => fmtDate(d, fmt) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'dmompelriera@nlcsjeju.kr' }) },
    ScriptApp: {
      getProjectTriggers: () => G.__triggers,
      newTrigger: (fn) => ({ forSpreadsheet: () => ({ onEdit: () => ({ create: () => { G.__triggers.push({ getHandlerFunction: () => fn }); } }) }) }),
      deleteTrigger: t => { G.__triggers = G.__triggers.filter(x => x !== t); }
    },
    Classroom: { Courses: { Announcements: { create: (res, course) => { G.__classroom.push({ res, course }); return { id: 'a' + G.__classroom.length }; } } } },
    Logger: { log: () => {} },
    __answer: []
  };
  /* a Date that answers "now" with the test's now, while every real date still passes
     `instanceof Date` inside the script — a subclass would not */
  const Real = Date;
  function FakeDate(...a) { return a.length ? new Real(...a) : new Real(now.getTime()); }
  FakeDate.prototype = Real.prototype;
  FakeDate.now = () => now.getTime();
  FakeDate.parse = Real.parse; FakeDate.UTC = Real.UTC;
  G.Date = FakeDate;
  return G;
}
/* only the patterns the script asks for */
function fmtDate(d, fmt) {
  const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const p = n => ('0' + n).slice(-2);
  if (fmt === "yyyy-MM-dd'T'HH:mm") return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  if (fmt === 'EEEE d MMMM') return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  if (fmt === 'HH:mm') return `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (fmt === 'd MMM HH:mm') return `${d.getDate()} ${MON[d.getMonth()].slice(0, 3)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  throw new Error('the harness does not know the format ' + fmt);
}

const vm = require('vm');
const SRC = fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8');
function load(now = new Date(2026, 8, 14, 9, 0)) {          /* Monday 14 September 2026 */
  const G = makeGlobals(now);
  const ctx = vm.createContext(G);
  vm.runInContext(SRC, ctx, { filename: 'Code.gs' });
  return { G, api: G };
}

/* ---------- the tests ---------- */
let pass = 0, fail = 0;
function ok(what, cond, extra) { if (cond) { pass++; } else { fail++; console.log('  FAIL  ' + what + (extra ? '  —  ' + extra : '')); } }
function eq(what, got, want) { ok(what, JSON.stringify(got) === JSON.stringify(want), 'got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want)); }
function section(t) { console.log('\n' + t); }

/* a society with a register, three meetings (two past, one to come) and two members */
function seeded(now = new Date(2026, 8, 14, 9, 0)) {
  const { G, api } = load(now);
  api.setup();
  const reg = G.__ss.getSheetByName('Register');
  const st = G.__ss.getSheetByName('Settings');
  st.getRange(api._settingRow(st, 'Google Client ID'), 2).setValue('CID');
  st.getRange(api._settingRow(st, 'Classroom course ID'), 2).setValue('COURSE1');
  reg.appendRow(['지은', 'Jieun', 'Kim', 'Jieun', 'jekim29@pupils.nlcsjeju.kr', 'Y11', new Date(2026, 8, 1), 'suturing']);
  reg.appendRow(['현우', 'Hyunwoo', 'Yang', 'Hyunwoo', 'hwyang29@pupils.nlcsjeju.kr', 'Year 11', new Date(2026, 8, 1), '']);
  api._newMeeting(new Date(2026, 8, 3, 15, 40), 'Clinical case: the lame horse · B12');
  api._newMeeting(new Date(2026, 8, 10, 15, 40), 'Suturing on practice pads · B12');
  api._newMeeting(new Date(2026, 8, 17, 15, 40), 'Taking blood from the mould · B12');
  /* who came: Jieun both, Hyunwoo the second only, in the two past columns (I and J) */
  reg.getRange(3, 9).setValue(true); reg.getRange(3, 10).setValue('✓');
  reg.getRange(4, 9).setValue(false); reg.getRange(4, 10).setValue('y');
  G.__tokens['TOK-JIEUN'] = { aud: 'CID', exp: Math.floor(now.getTime() / 1000) + 3600, email_verified: 'true', email: 'jekim29@pupils.nlcsjeju.kr', name: 'Jieun Kim', given_name: 'Jieun', family_name: 'Kim' };
  G.__tokens['TOK-NEW'] = { aud: 'CID', exp: Math.floor(now.getTime() / 1000) + 3600, email_verified: 'true', email: 'sy4kim31@pupils.nlcsjeju.kr', name: 'Sungyoon Kim', given_name: 'Sungyoon', family_name: 'Kim' };
  G.__tokens['TOK-OUTSIDE'] = { aud: 'CID', exp: Math.floor(now.getTime() / 1000) + 3600, email_verified: 'true', email: 'someone@gmail.com', name: 'Someone Else', given_name: 'Someone', family_name: 'Else' };
  G.__tokens['TOK-OLD'] = { aud: 'CID', exp: Math.floor(now.getTime() / 1000) - 60, email_verified: 'true', email: 'jekim29@pupils.nlcsjeju.kr', name: 'Jieun Kim' };
  G.__tokens['TOK-OTHERAPP'] = { aud: 'SOMEONE-ELSE', exp: Math.floor(now.getTime() / 1000) + 3600, email_verified: 'true', email: 'jekim29@pupils.nlcsjeju.kr', name: 'Jieun Kim' };
  return { G, api, reg, st };
}

section('the sheet is set up');
{
  const { G, api } = load();
  api.setup();
  const reg = G.__ss.getSheetByName('Register');
  eq('headings', reg.getRange(1, 1, 1, 8).getValues()[0],
     ['Korean name', 'English name', 'Surname', 'Preferred name', 'Email', 'Year', 'Joined', 'Would like to do']);
  ok('the email column is marked as never shown', reg.getRange(2, 5).getValue() === 'never shown');
  ok('Votes, Settings and Log exist', !!G.__ss.getSheetByName('Votes') && !!G.__ss.getSheetByName('Settings') && !!G.__ss.getSheetByName('Log'));
  api.setup();      /* twice must not double anything */
  eq('setup run twice leaves one heading row', reg.getRange(1, 1).getValue(), 'Korean name');
  eq('setup run twice leaves one settings row per key', G.__ss.getSheetByName('Settings').getLastRow(), 5);
}

section('dates, however the chair types them');
{
  const { api } = load();
  const d = api._asDate('17/9/2026 15:40');
  ok('day first, with a time', d && d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 17 && d.getHours() === 15 && d.getMinutes() === 40, String(d));
  const e = api._asDate('3/10/2026');
  ok('day first, no time → 3 October', e && e.getMonth() === 9 && e.getDate() === 3, String(e));
  ok('a real date cell passes through', api._asDate(new Date(2026, 0, 5)).getDate() === 5);
  ok('a heading that is not a date is not a meeting', api._asDate('Notes') === null);
  ok('empty is not a meeting', api._asDate('') === null);
}

section('the register is read');
{
  const { api } = seeded();
  const reg = api._register(new Date(2026, 8, 14, 9, 0));
  eq('three meetings', reg.meetings.length, 3);
  eq('two of them are past', reg.meetings.filter(m => m.past).length, 2);
  eq('the plan is read from row 2', reg.meetings[1].plan, 'Suturing on practice pads · B12');
  eq('two members', reg.members.length, 2);
  eq('a tick, a ✓ and a "y" all count as present', [reg.members[0].marks[0], reg.members[0].marks[1], reg.members[1].marks[1]], [true, true, true]);
  eq('a false is an absence', reg.members[1].marks[0], false);
  eq('"Year 11" and "Y11" are the same year', [reg.members[0].year, reg.members[1].year], ['Y11', 'Y11']);
}

section('what the website is told — and what it is not');
{
  const { api } = seeded();
  const out = api._list(null);
  const text = JSON.stringify(out);
  ok('no email address anywhere in the answer', !/@/.test(text), text.slice(0, 400));
  ok('no surname', !/Kim|Yang/.test(text.replace(/"name":"[^"]*"/g, '')) && !/"name":"[^"]*Kim"/.test(text), text.slice(0, 400));
  ok('no Korean name', !/[가-힣]/.test(text));
  eq('members are first name and year only', Object.keys(out.members[0]).sort(), ['name', 'present', 'year']);
  eq('the first member', [out.members[0].name, out.members[0].year], ['Jieun', 'Y11']);
  eq('the next meeting is the one to come', out.next.date, '2026-09-17T15:40');
  eq('its plan travels with it', out.next.plan, 'Taking blood from the mould · B12');
  eq('past meetings come newest first', out.meetings.map(m => m.date), ['2026-09-10T15:40', '2026-09-03T15:40']);
  eq('how many came, per meeting', out.meetings.map(m => m.came), [2, 1]);
  eq('the ticks line up with those columns', out.members[1].present, [true, false]);
  eq('nobody is signed in, so no name and no votes of mine', [out.name, out.mine.length, out.member], [undefined, 0, false]);
}

section('the next meeting');
{
  /* on the morning of a meeting it is still the next one */
  const { api } = seeded(new Date(2026, 8, 17, 9, 0));
  eq('a meeting today is still to come', api._list(null).next.date, '2026-09-17T15:40');
}
{
  /* after the last one there is none, and the card disappears */
  const { api } = seeded(new Date(2026, 8, 18, 9, 0));
  const out = api._list(null);
  eq('no meeting in the diary', out.next, null);
  eq('all three are past', out.meetings.length, 3);
}
{
  /* a column added out of order is still found */
  const { api } = seeded();
  api._newMeeting(new Date(2026, 8, 15, 15, 40), 'An earlier one, added later');
  eq('the soonest to come wins', api._list(null).next.date, '2026-09-15T15:40');
}

section('a student signs in');
{
  const { G, api, reg } = seeded();
  const out = api._handle({ action: 'join', token: 'TOK-NEW', year: 'Year 9', note: 'I want to learn to suture' });
  ok('the answer is good', out.ok);
  eq('a row was added', reg.getLastRow(), 5);
  eq('their row carries the address, out of sight of the page', reg.getRange(5, 5).getValue(), 'sy4kim31@pupils.nlcsjeju.kr');
  eq('the preferred name is their first name', reg.getRange(5, 4).getValue(), 'Sungyoon');
  eq('the year is tidied', reg.getRange(5, 6).getValue(), 'Y9');
  eq('the page sees them as a member', out.member, true);
  eq('and by first name only', out.members.map(p => p.name), ['Jieun', 'Hyunwoo', 'Sungyoon']);

  const again = api._handle({ action: 'join', token: 'TOK-NEW', year: 'Year 10', note: 'or write for issue 2' });
  eq('signing up twice does not add a second row', reg.getLastRow(), 5);
  eq('but the year is theirs to correct', reg.getRange(5, 6).getValue(), 'Y10');
  eq('and so is what they wrote', reg.getRange(5, 8).getValue(), 'or write for issue 2');

  const known = api._handle({ action: 'join', token: 'TOK-JIEUN', year: 'Year 11', note: '' });
  eq('a member already on the register is not duplicated', reg.getLastRow(), 5);
  eq('the chair’s spelling of their name is left alone', reg.getRange(3, 4).getValue(), 'Jieun');
  ok('and their ticks are untouched', reg.getRange(3, 9).getValue() === true);
}

section('who may write');
{
  const { api } = seeded();
  eq('an expired sign-in', api._handle({ action: 'join', token: 'TOK-OLD' }).why, 'not signed in');
  eq('a token for another app', api._handle({ action: 'join', token: 'TOK-OTHERAPP' }).why, 'not signed in');
  eq('no token at all', api._handle({ action: 'vote', token: '' }).why, 'not signed in');
  eq('a personal Google account', api._handle({ action: 'join', token: 'TOK-OUTSIDE' }).why, 'not a school account');
  ok('but anyone may read the register', api._handle({ action: 'list' }).ok);
}
{
  const { G, api } = load();
  api.setup();
  eq('with no Client ID, nothing can be written', api._handle({ action: 'join', token: 'X' }).why, 'sign-in is not set up');
}

section('votes');
{
  const { api } = seeded();
  api._handle({ action: 'vote', token: 'TOK-JIEUN', idea: 'meet-a-vet' });
  api._handle({ action: 'vote', token: 'TOK-NEW', idea: 'meet-a-vet' });
  let out = api._handle({ action: 'vote', token: 'TOK-NEW', idea: 'wild-jeju' });
  eq('counted', out.votes, { 'meet-a-vet': 2, 'wild-jeju': 1 });
  eq('mine are mine', out.mine.sort(), ['meet-a-vet', 'wild-jeju']);
  out = api._handle({ action: 'vote', token: 'TOK-NEW', idea: 'meet-a-vet' });
  eq('a second press takes it back', out.votes, { 'meet-a-vet': 1, 'wild-jeju': 1 });
  eq('and only mine', out.mine, ['wild-jeju']);
  eq('a made-up idea is refused', api._handle({ action: 'vote', token: 'TOK-NEW', idea: '' }).why, 'which idea?');
  eq('an idea name is cleaned', api._handle({ action: 'vote', token: 'TOK-NEW', idea: '<script>x</script>' }).ok, true);
  ok('nothing dangerous was stored', !JSON.stringify(api._list(null).votes).includes('<'));
}

section('a new meeting column');
{
  const { G, api, reg } = seeded();
  const before = reg.getLastColumn();
  G.__answer = ['24/9/2026 15:40', 'Animal behaviour: reading a dog'];
  api.addMeeting();
  eq('one column more', reg.getLastColumn(), before + 1);
  eq('the date is in row 1', api._asDate(reg.getRange(1, before + 1).getValue()).getDate(), 24);
  eq('the plan is in row 2', reg.getRange(2, before + 1).getValue(), 'Animal behaviour: reading a dog');
  eq('every member gets a box, unticked', [reg.getRange(3, before + 1).getValue(), reg.getRange(4, before + 1).getValue()], [false, false]);
  eq('the website now names it as next', api._list(null).next.date, '2026-09-17T15:40');
  ok('the date cell is formatted with its time', reg.formats['1,' + (before + 1)].includes('HH:mm'));
}
{
  /* a column added past the sheet's width must widen the sheet, not throw */
  const { G, api, reg } = seeded();
  reg.maxCols = reg.getLastColumn();
  api._newMeeting(new Date(2026, 9, 1, 15, 40), 'October');
  ok('the sheet was widened', reg.getMaxColumns() > reg.getLastColumn() - 1);
  eq('and the meeting is there', api._register(new Date(2026, 8, 14)).meetings.length, 4);
}

section('the ten-minute cache');
{
  const { G, api, reg } = seeded();
  api._handle({ action: 'list' });
  ok('the public answer is kept', G.__cache.size === 1);
  reg.appendRow(['', 'Anna', 'Wise', 'Anna', 'anwise28@pupils.nlcsjeju.kr', 'Y12', new Date(), '']);
  eq('a stale answer is still served', api._handle({ action: 'list' }).members.length, 2);
  api.onRegisterEdit({ range: reg.getRange(5, 4) });
  eq('an edit throws it away', api._handle({ action: 'list' }).members.length, 3);
  api._handle({ action: 'list' });
  api.refreshWebsite();
  eq('and so does the menu', G.__cache.size, 0);
  api._handle({ action: 'vote', token: 'TOK-JIEUN', idea: 'inside' });
  eq('so does a vote', G.__cache.size, 0);
}

section('the Classroom announcement');
{
  const { G, api, st } = seeded();
  const text = api._announcement(api._register(new Date(2026, 8, 14))).text;
  ok('it names the day', text.includes('Thursday 17 September'), text);
  ok('it gives the time', text.includes('15:40'), text);
  ok('it says what the meeting is', text.includes('Taking blood from the mould'), text);
  ok('it links to the register', text.includes('#register'), text);

  api.announce('chair@pupils.nlcsjeju.kr');
  eq('one announcement was posted', G.__classroom.length, 1);
  eq('to the course in Settings', G.__classroom[0].course, 'COURSE1');
  eq('published, not a draft', G.__classroom[0].res.state, 'PUBLISHED');
  ok('with the site attached', JSON.stringify(G.__classroom[0].res.materials).includes('veterinary-society'));
  ok('Settings remembers when', String(st.getRange(api._settingRow(st, 'Last posted'), 2).getValue()).includes('17 September'));
  ok('and the Log says who asked', G.__ss.getSheetByName('Log').getRange(2, 3).getValue() === 'chair@pupils.nlcsjeju.kr');
}
{
  const { G, api, st } = seeded();
  st.getRange(api._settingRow(st, 'Classroom course ID'), 2).setValue('');
  let why = ''; try { api.announce(''); } catch (e) { why = e.message; }
  ok('without a course ID it says so plainly', /course ID/.test(why), why);
  eq('and nothing was posted', G.__classroom.length, 0);
}
{
  const { G, api } = seeded(new Date(2026, 8, 18, 9, 0));
  let why = ''; try { api.announce(''); } catch (e) { why = e.message; }
  ok('with no meeting to come it refuses', /diary/.test(why), why);
}

section('the tick box that posts');
{
  const { G, api, st } = seeded();
  const row = api._settingRow(st, 'Post the next meeting to Google Classroom');
  const cell = st.getRange(row, 2);
  cell.setValue(true);
  api.onRegisterEdit({ range: cell, user: { getEmail: () => 'chair@pupils.nlcsjeju.kr' } });
  eq('it posted', G.__classroom.length, 1);
  eq('and untticked itself, ready for next time', cell.getValue(), false);
  cell.setValue(false);
  api.onRegisterEdit({ range: cell, user: { getEmail: () => 'chair@pupils.nlcsjeju.kr' } });
  eq('unticking posts nothing', G.__classroom.length, 1);
  api.onRegisterEdit({ range: G.__ss.getSheetByName('Register').getRange(3, 9) });
  eq('and neither does ticking a register box', G.__classroom.length, 1);
}
{
  const { G, api, st } = seeded(new Date(2026, 8, 18, 9, 0));
  const cell = st.getRange(api._settingRow(st, 'Post the next meeting to Google Classroom'), 2);
  cell.setValue(true);
  api.onRegisterEdit({ range: cell, user: { getEmail: () => 'chair@pupils.nlcsjeju.kr' } });
  eq('with nothing in the diary it posts nothing', G.__classroom.length, 0);
  ok('the Log says why', String(G.__ss.getSheetByName('Log').getRange(2, 2).getValue()).includes('Could not post'));
  eq('and the box is cleared anyway', cell.getValue(), false);
}

section('finding the Classroom course');
{
  const { G, api } = seeded();
  G.Classroom.Courses.list = () => ({ courses: [{ id: '742100123456', name: 'Y10 Biology' }, { id: '742100999999', name: 'Veterinary Society' }] });
  api.listCourses();
  const said = G.__alerts.join('\n');
  ok('it lists the classes with their IDs', said.includes('Veterinary Society') && said.includes('742100999999'), said);
}

section('the triggers');
{
  const { G, api } = seeded();
  api.installTriggers(); api.installTriggers();
  eq('installing twice leaves one', G.__triggers.length, 1);
  ok('it is told who will post', G.__alerts.join(' ').includes('dmompelriera@nlcsjeju.kr'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
