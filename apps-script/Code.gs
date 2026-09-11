/* ============================================================
   Veterinary Society — the register, the sign-ups, the votes, and the next meeting
   ------------------------------------------------------------
   This lives in the society's OWN Google Sheet (Extensions ▸ Apps Script), the one the chair is
   given, and is deployed as a web app that the page at mompel226.github.io/veterinary-society/
   talks to. The sheet has four tabs:

     Register   one row per member, one column per meeting.
                A Korean name · B English name · C Surname · D Preferred name · E Email · F Year
                · G Joined · H Would like to do · then a column per meeting, from I onwards.
                Row 1 holds the headings and, over each meeting column, THE DATE of that meeting
                (a date cell, with a time if there is one). Row 2 holds, under each date, what
                the meeting is: "Suturing on practice pads · B12". Members start on row 3.
                Tick the box under a meeting for everyone who came.
                The Email column takes the whole address or just the first part of it: ghong31
                and ghong31@pupils.nlcsjeju.kr are the same person.
     Votes      when · email · idea            (a second vote on the same idea takes it back)
     Settings   the Google Client ID, the Classroom course, and the "post" box
     Log        what was posted to Classroom, and when

   WHAT THE PAGE IS TOLD, AND WHAT IT IS NOT. The page shows preferred names, year groups, the
   ticks, the meeting dates and plans, and the vote counts. It is never sent an email address, a
   surname or a Korean name: those stay in this sheet, which is the school's information.

   THE NEXT MEETING is the first meeting column whose date is today or later. Add a column (the
   menu does it, or type a date in row 1 of a new column) and the page shows it within a minute.
   Tick "Post the next meeting to Google Classroom" in Settings and it is announced there too.

   SETTING IT UP — the README says the same in more words:
     1. Extensions ▸ Apps Script, paste this whole file, Run ▸ setup, allow it.
     2. In Settings, paste the Google Client ID the labs use, and the Classroom course ID.
     3. Deploy ▸ New deployment ▸ Web app ▸ execute as Me, access Anyone ▸ copy the /exec address
        into config.js on the site.
     4. Dr Mompel, in his own account: Veterinary Society ▸ Install the triggers (once). The
        Classroom post is made by whoever installed them, so it must be a teacher of the class.
   ============================================================ */
var T_REG = 'Register', T_VOTES = 'Votes', T_SET = 'Settings', T_LOG = 'Log';
var HEAD = ['Korean name', 'English name', 'Surname', 'Preferred name', 'Email', 'Year', 'Joined', 'Would like to do'];
var NOTE = ['', '', '', 'shown on the site', 'never shown — the first part is enough', 'shown', '', ''];
var MEET_COL = HEAD.length + 1;       /* I: the first meeting column */
var DATA_ROW = 3;                     /* row 1 headings and dates, row 2 notes and plans */
var SITE = 'https://mompel226.github.io/veterinary-society/';
var DOMAINS = ['pupils.nlcsjeju.kr', 'nlcsjeju.kr'];
var PUPILS = '@pupils.nlcsjeju.kr';     /* what a bare name in the Email column means */
var S_CLIENT = 'Google Client ID', S_COURSE = 'Classroom course ID', S_POST = 'Post the next meeting to Google Classroom',
    S_LAST = 'Last posted', S_SITE = 'The website';
var CACHE_KEY = 'list-v2', CACHE_SECONDS = 600;

/* ---------- the menu ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Veterinary Society')
    .addItem('Add the next meeting', 'addMeeting')
    .addItem('Preview the Classroom announcement', 'previewAnnouncement')
    .addItem('Find my Classroom course ID', 'listCourses')
    .addItem('Refresh the website now', 'refreshWebsite')
    .addSeparator()
    .addItem('Install the triggers (Dr Mompel, once)', 'installTriggers')
    .addItem('Set up the tabs', 'setup')
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  var reg = ss.getSheetByName(T_REG) || ss.insertSheet(T_REG, 0);
  if (reg.getLastRow() < 1) { reg.appendRow(HEAD); reg.appendRow(NOTE); }
  reg.setFrozenRows(2); reg.setFrozenColumns(4);
  reg.getRange(1, 1, 1, HEAD.length).setFontWeight('bold');
  reg.getRange(2, 1, 1, HEAD.length).setFontColor('#7F94A2').setFontStyle('italic');
  reg.getRange(1, MEET_COL, 2, Math.max(1, reg.getMaxColumns() - MEET_COL + 1)).setNote(null);
  _tab(ss, T_VOTES, ['When', 'Email', 'Idea']);
  _tab(ss, T_LOG, ['When', 'What', 'By']);
  var st = ss.getSheetByName(T_SET) || ss.insertSheet(T_SET);
  var want = [[S_CLIENT, ''], [S_COURSE, ''], [S_POST, false], [S_LAST, ''], [S_SITE, SITE]];
  want.forEach(function (kv, i) {
    var row = _settingRow(st, kv[0]);
    if (!row) { st.appendRow(kv); row = st.getLastRow(); }
    if (kv[0] === S_POST) st.getRange(row, 2).insertCheckboxes();
  });
  st.getRange(1, 1, st.getLastRow(), 1).setFontWeight('bold'); st.setColumnWidth(1, 320); st.setColumnWidth(2, 420);
  _flush();
  _ui('Ready. Paste the Client ID and the Classroom course ID into Settings, then Deploy ▸ New deployment ▸ Web app.');
}
function _tab(ss, name, head) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.appendRow(head);
  sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  return sh;
}
function _ui(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
function _toast(msg) { try { SpreadsheetApp.getActive().toast(msg, 'Veterinary Society', 6); } catch (e) { Logger.log(msg); } }

/* ---------- settings, by their name in column A ---------- */
function _settingRow(st, key) {
  var last = st.getLastRow(); if (last < 1) return 0;
  var v = st.getRange(1, 1, last, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === key) return i + 1;
  return 0;
}
function _setting(key) {
  var st = SpreadsheetApp.getActive().getSheetByName(T_SET); if (!st) return '';
  var row = _settingRow(st, key); if (!row) return '';
  var v = st.getRange(row, 2).getValue();
  return v === true || v === false ? v : String(v || '').trim();
}
function _putSetting(key, value) {
  var st = SpreadsheetApp.getActive().getSheetByName(T_SET); if (!st) return;
  var row = _settingRow(st, key); if (!row) { st.appendRow([key, value]); return; }
  st.getRange(row, 2).setValue(value);
}
function _clientId() { return String(_setting(S_CLIENT) || ''); }

/* ---------- the register, read once ----------
   meetings: [{ col, date, plan, past }]   members: [{ row, name, year, email, marks: [bool per meeting] }] */
function _register(now) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(T_REG), out = { meetings: [], members: [], tz: ss.getSpreadsheetTimeZone() };
  if (!sh) return out;
  var lastCol = sh.getLastColumn(), lastRow = sh.getLastRow();
  if (lastCol >= MEET_COL) {
    var heads = sh.getRange(1, MEET_COL, 2, lastCol - MEET_COL + 1).getValues();
    for (var c = 0; c < heads[0].length; c++) {
      var d = _asDate(heads[0][c]); if (!d) continue;
      out.meetings.push({ col: MEET_COL + c, date: d, plan: String(heads[1][c] || '').trim(), past: d.getTime() < _startOfDay(now || new Date()).getTime() });
    }
  }
  if (lastRow >= DATA_ROW) {
    var rows = sh.getRange(DATA_ROW, 1, lastRow - DATA_ROW + 1, lastCol).getValues();
    rows.forEach(function (r, i) {
      var name = String(r[3] || r[1] || r[0] || '').trim();
      var email = _email(r[4]);
      if (!name && !email) return;
      out.members.push({
        row: DATA_ROW + i, name: name, year: _year(r[5]), email: email,
        marks: out.meetings.map(function (m) { return _present(r[m.col - 1]); })
      });
    });
  }
  return out;
}
function _asDate(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var s = String(v || '').trim(); if (!s) return null;
  var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(s);     /* 17/9/2026 15:40 — day first */
  if (m) { var y = Number(m[3]); if (y < 100) y += 2000; return new Date(y, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0)); }
  var d = new Date(s); return isNaN(d.getTime()) ? null : d;
}
/* the school writes its addresses as a first part plus one domain, and the chair's own list is
   kept that way, so a bare name in the Email column is completed rather than ignored */
function _email(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s) return '';
  return s.indexOf('@') >= 0 ? s : s + PUPILS;
}
function _startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function _hasTime(d) { return d.getHours() !== 0 || d.getMinutes() !== 0; }
function _present(v) {
  if (v === true) return true; if (v === false || v == null) return false;
  return /^(✓|✔|√|1|p|y|yes|present|o|here|came)$/i.test(String(v).trim());
}
function _year(v) {
  var s = String(v || '').trim(), m = /(\d{1,2})/.exec(s);
  return m ? 'Y' + m[1] : s;
}
/* the next meeting: the first whose date is today or later */
function _next(reg) {
  var up = reg.meetings.filter(function (m) { return !m.past; });
  up.sort(function (a, b) { return a.date - b.date; });
  return up[0] || null;
}
function _stamp(d, tz) {   /* an unambiguous local stamp the page can format its own way */
  return Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm");
}

/* ---------- the web app ---------- */
function doPost(e) {
  try { return _json(_handle(JSON.parse((e.postData && e.postData.contents) || '{}'))); }
  catch (err) { return _json({ ok: false, why: String(err) }); }
}
function doGet(e) { return _json(_handle({ action: ((e && e.parameter) || {}).action || 'list' })); }

function _handle(d) {
  var action = String(d.action || 'list');
  if (action === 'list') return _cachedList();
  if (!_clientId()) return { ok: false, why: 'sign-in is not set up' };
  var who = _whoIs(d.token);
  if (!who) return { ok: false, why: 'not signed in' };
  if (action === 'me') return _list(who);
  if (!_schoolAccount(who.email)) return { ok: false, why: 'not a school account' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, why: 'busy — try again' }; }
  try {
    var ss = SpreadsheetApp.getActive();
    if (action === 'join') {
      var sh = ss.getSheetByName(T_REG); if (!sh) return { ok: false, why: 'no register yet' };
      var year = _year(d.year), note = String(d.note || '').slice(0, 300);
      var row = _rowOf(sh, 5, who.email);
      if (row) {
        /* already on the register: the year and the note are theirs to change, the names are the chair's */
        if (year) sh.getRange(row, 6).setValue(year);
        if (note) sh.getRange(row, 8).setValue(note);
      } else {
        sh.appendRow(['', who.given || '', who.family || '', who.given || who.name || who.email.split('@')[0], who.email, year, new Date(), note]);
      }
      _flush();
      return _list(who);
    }
    if (action === 'vote') {
      var idea = String(d.idea || '').replace(/[^a-z0-9-]/g, '').slice(0, 40);
      if (!idea) return { ok: false, why: 'which idea?' };
      var vs = _tab(ss, T_VOTES, ['When', 'Email', 'Idea']);
      var last = vs.getLastRow(), found = 0;
      if (last > 1) {
        var rows = vs.getRange(2, 2, last - 1, 2).getValues();
        for (var i = rows.length - 1; i >= 0; i--) {
          if (String(rows[i][0]).toLowerCase() === who.email && String(rows[i][1]) === idea) { vs.deleteRow(i + 2); found++; }
        }
      }
      if (!found) vs.appendRow([new Date(), who.email, idea]);
      _flush();
      return _list(who);
    }
    return { ok: false, why: 'unknown action' };
  } finally { lock.releaseLock(); }
}
function _schoolAccount(email) {
  var at = String(email || '').split('@')[1] || '';
  return DOMAINS.indexOf(at) >= 0;
}

/* the public answer, kept for ten minutes and thrown away the moment the sheet is edited */
function _cachedList() {
  var cache = CacheService.getScriptCache(), hit = cache.get(CACHE_KEY);
  if (hit) return JSON.parse(hit);
  var out = _list(null);
  try { cache.put(CACHE_KEY, JSON.stringify(out), CACHE_SECONDS); } catch (e) {}
  return out;
}
function _flush() { try { CacheService.getScriptCache().remove(CACHE_KEY); } catch (e) {} }

/* preferred names, years, ticks, dates and plans, vote counts. Never an address, a surname or a Korean name. */
function _list(who) {
  var reg = _register(new Date()), tz = reg.tz;
  var past = reg.meetings.filter(function (m) { return m.past; });
  past.sort(function (a, b) { return b.date - a.date; });          /* newest first */
  var next = _next(reg);
  var out = {
    ok: true,
    next: next ? { date: _stamp(next.date, tz), time: _hasTime(next.date), plan: next.plan } : null,
    meetings: past.map(function (m) {
      var came = 0; reg.members.forEach(function (p) { if (p.marks[reg.meetings.indexOf(m)]) came++; });
      return { date: _stamp(m.date, tz), time: _hasTime(m.date), plan: m.plan, came: came };
    }),
    members: reg.members.map(function (p) {
      return { name: p.name, year: p.year, present: past.map(function (m) { return !!p.marks[reg.meetings.indexOf(m)]; }) };
    }),
    votes: {}, mine: [], member: false
  };
  if (who) {
    out.name = who.given || who.name;
    out.member = reg.members.some(function (p) { return p.email === who.email; });
  }
  var vs = SpreadsheetApp.getActive().getSheetByName(T_VOTES);
  if (vs && vs.getLastRow() > 1) {
    vs.getRange(2, 2, vs.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var idea = String(r[1]); if (!idea) return;
      out.votes[idea] = (out.votes[idea] || 0) + 1;
      if (who && String(r[0]).toLowerCase() === who.email && out.mine.indexOf(idea) < 0) out.mine.push(idea);
    });
  }
  return out;
}
function _rowOf(sh, col, email) {
  var last = sh.getLastRow(); if (last < DATA_ROW) return 0;
  var v = sh.getRange(DATA_ROW, col, last - DATA_ROW + 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (_email(v[i][0]) === email) return i + DATA_ROW;
  return 0;
}

/* Google signed the token; Google is asked to check its own signature. */
function _whoIs(idToken) {
  var cid = _clientId();
  if (!cid || !idToken) return null;
  var res;
  try { res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true }); }
  catch (e) { return null; }
  if (res.getResponseCode() !== 200) return null;
  var t; try { t = JSON.parse(res.getContentText()); } catch (e) { return null; }
  if (String(t.aud) !== cid) return null;
  if (Number(t.exp) * 1000 < Date.now()) return null;
  if (String(t.email_verified) !== 'true') return null;
  return { email: String(t.email || '').trim().toLowerCase(), name: String(t.name || ''),
           given: String(t.given_name || ''), family: String(t.family_name || '') };
}
function _json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- the menu's work ---------- */
/* a new meeting column at the right: the date in row 1, the plan in row 2, a tick box on every member's row */
function addMeeting() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt('The next meeting', 'Date, and the time if you like — for example 17/9/2026 15:40', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var date = _asDate(a.getResponseText()); if (!date) { ui.alert('That did not read as a date. Try 17/9/2026 15:40.'); return; }
  var b = ui.prompt('What will you do, and where?', 'For example: Suturing on practice pads · B12', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  var col = _newMeeting(date, b.getResponseText());
  _toast('Meeting added in column ' + col + '. The website shows it within a minute.');
}
function _newMeeting(date, plan) {
  var sh = SpreadsheetApp.getActive().getSheetByName(T_REG);
  var col = Math.max(MEET_COL, sh.getLastColumn() + 1);
  if (col > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), col - sh.getMaxColumns());
  sh.getRange(1, col).setValue(date).setNumberFormat(_hasTime(date) ? 'ddd d mmm HH:mm' : 'ddd d mmm').setFontWeight('bold');
  sh.getRange(2, col).setValue(String(plan || '').trim()).setFontColor('#7F94A2').setFontStyle('italic').setWrap(true);
  var last = sh.getLastRow();
  if (last >= DATA_ROW) sh.getRange(DATA_ROW, col, last - DATA_ROW + 1, 1).insertCheckboxes();
  sh.setColumnWidth(col, 110);
  _flush();
  return sh.getRange(1, col).getA1Notation().replace(/\d+$/, '');
}
function refreshWebsite() { _flush(); _toast('Done. The website reads the register afresh from now.'); }

/* ---------- Google Classroom ---------- */
function _announcement(reg) {
  var next = _next(reg); if (!next) return null;
  var when = Utilities.formatDate(next.date, reg.tz, 'EEEE d MMMM') + (_hasTime(next.date) ? ', ' + Utilities.formatDate(next.date, reg.tz, 'HH:mm') : '');
  var lines = ['🐴 Veterinary Society — next meeting', '', '📅 ' + when];
  if (next.plan) lines.push('🩺 ' + next.plan);
  lines.push('', 'Who came last time, and what is coming: ' + SITE + '#register');
  return { text: lines.join('\n'), when: when, plan: next.plan };
}
/* the course ID is not the number in the Classroom address; this asks Google for it */
function listCourses() {
  if (typeof Classroom === 'undefined') { _ui('The Classroom service is not switched on in this script yet: Services ▸ + ▸ Google Classroom API ▸ Add.'); return; }
  var res = Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'], pageSize: 50 });
  var cs = (res && res.courses) || [];
  if (!cs.length) { _ui('Google says you do not teach any active class. The announcement is posted by whoever installs the triggers, so that person must be a teacher of the class.'); return; }
  _ui('Your classes, and the ID to paste into Settings:\n\n' + cs.map(function (c) { return c.name + '\n    ' + c.id; }).join('\n\n'));
}
function previewAnnouncement() {
  var a = _announcement(_register(new Date()));
  _ui(a ? a.text : 'There is no meeting in the diary that is today or later. Add one first (Veterinary Society ▸ Add the next meeting).');
}
/* posts the next meeting to the class; runs as whoever installed the triggers, so that is the teacher */
function announce(by) {
  var reg = _register(new Date()), a = _announcement(reg);
  if (!a) throw new Error('no meeting is in the diary that is today or later');
  var course = String(_setting(S_COURSE) || '').trim();
  if (!course) throw new Error('the Classroom course ID is not in Settings');
  if (typeof Classroom === 'undefined') throw new Error('the Classroom API service is not enabled in the script (Services ▸ + ▸ Google Classroom API)');
  var res = Classroom.Courses.Announcements.create({ text: a.text, state: 'PUBLISHED', materials: [{ link: { url: SITE + '#register' } }] }, course);
  var when = Utilities.formatDate(new Date(), reg.tz, 'd MMM HH:mm');
  _putSetting(S_LAST, when + ' — ' + a.when);
  _log('Posted to Classroom: ' + a.when + (a.plan ? ' · ' + a.plan : ''), by);
  return res && res.id;
}
function _log(what, by) {
  var sh = _tab(SpreadsheetApp.getActive(), T_LOG, ['When', 'What', 'By']);
  sh.appendRow([new Date(), what, String(by || '')]);
}

/* ---------- triggers: installed once, by the teacher ----------
   An installable trigger runs as the person who installed it. That is what lets the chair tick
   one box and have the announcement go out under the teacher's name, and what lets any edit of
   the register reach the website at once. */
function installTriggers() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'onRegisterEdit') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onRegisterEdit').forSpreadsheet(ss).onEdit().create();
  _ui('Installed. Edits reach the website at once, and the "post" box in Settings posts to Classroom as ' + Session.getEffectiveUser().getEmail() + '.');
}
function onRegisterEdit(e) {
  _flush();
  try {
    var r = e && e.range; if (!r) return;
    var sh = r.getSheet(); if (sh.getName() !== T_SET || r.getColumn() !== 2) return;
    var key = String(sh.getRange(r.getRow(), 1).getValue()).trim();
    if (key !== S_POST || r.getValue() !== true) return;
    var by = (e.user && e.user.getEmail && e.user.getEmail()) || '';
    try { announce(by); _toast('Posted to Google Classroom.'); }
    catch (err) { _log('Could not post: ' + err.message, by); _toast('Not posted: ' + err.message); }
    r.setValue(false);
  } catch (err) { _log('Trigger error: ' + err.message, ''); }
}
