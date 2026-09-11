/* ============================================================
   Veterinary Society — the register, the sign-ups, the votes, and the next meeting
   ------------------------------------------------------------
   This lives in the society's OWN Google Sheet (Extensions ▸ Apps Script), the one the chair is
   given, and is deployed as a web app that the page at nlcsbiology.com/veterinary-society/
   talks to. The sheet has four tabs:

     Register   one row per member, one column per meeting.
                A Korean name · B English name · C Surname · D Preferred name · E Email · F Year
                · G Joined · H Would like to do · then a column per meeting, from I onwards.
                Row 1 holds the headings and, over each meeting column, THE DATE of that meeting
                (a date cell, with a time if there is one). Row 2 holds, under each date, what
                the meeting is: "Suturing on practice pads · B12". Members start on row 3.
                Tick the box under a meeting for everyone who came.
                The Email column takes the whole address or just the first part of it: ghong31
                and ghong31@pupils.nlcsjeju.kr are the same person. A bare name is a pupil's;
                write a teacher's address out in full — no `pupils.` in it is what makes them
                staff, and the website lists them apart from the members.
     Votes      when · email · idea            (a second vote on the same idea takes it back)
     Settings   three columns: the name of the setting, THE BOX YOU TYPE IN, and a line saying
                what it is for. The Google Client ID, the Classroom course, and the "post" box.
     Log        what was posted to Classroom, and when

   WHAT THE PAGE IS TOLD, AND WHAT IT IS NOT. The page shows preferred names, year groups, the
   ticks, the meeting dates and plans, and the vote counts. It is never sent an email address, a
   surname or a Korean name: those stay in this sheet, which is the school's information.

   THE NEXT MEETING is the first meeting column whose date is today or later. Add a column (the
   menu does it, or type a date in row 1 of a new column) and the page shows it within a minute.
   Tick "Post the next meeting to Google Classroom" in Settings and it is announced there too.

   SETTING IT UP — the Start here tab says the same, and so does the README:
     1. Extensions ▸ Apps Script, paste this whole file, Save.
     2. Go back to the spreadsheet and RELOAD it. A "Veterinary Society" menu appears.
     3. Menu ▸ Set up the tabs. Allow the permissions it asks for. (Run it from the menu, not
        from the script editor: a script run from the editor that asks you something waits for
        an answer in the spreadsheet window, which looks like it has hung.)
     4. Menu ▸ Choose the Classroom class, to say where announcements go.
     5. Deploy ▸ New deployment ▸ Web app ▸ execute as Me, access Anyone ▸ copy the /exec address
        into config.js on the site.
     6. Dr Mompel, in his own account: Veterinary Society ▸ Install the triggers (once). The
        Classroom post is made by whoever installed them, so it must be a teacher of the class.
   ============================================================ */
/* The Google Client ID the school's Biology pages sign in with. It is not a secret — it is
   written in config.js on the website too — so it is filled in for you. If the school ever
   changes it, change it here, or type the new one into the Settings tab, which wins. */
var CLIENT_ID = '749068441640-jgh9s0rbg8ed9hl14mtv6kdhg5jg6ddf.apps.googleusercontent.com';

var T_REG = 'Register', T_VOTES = 'Votes', T_SET = 'Settings', T_LOG = 'Log', T_START = 'Start here';
/* Bumped whenever this file changes in a way the website can see. The menu always runs the code
   you have just saved; the WEBSITE runs the code of the deployed version, which is a different
   thing and a common way to be fooled. The check compares the two and says so. */
var CODE_STAMP = '2026-09-11 · teachers, register, roster';
var HEAD = ['Korean name', 'English name', 'Surname', 'Preferred name', 'Email', 'Year', 'Joined', 'Would like to do'];
var NOTE = ['', '', '', 'shown on the site', 'never shown — the first part is enough', 'shown',
            'filled in for you', 'in their own words'];
var MEET_COL = HEAD.length + 1;       /* I: the first meeting column */
var DATA_ROW = 3;                     /* row 1 headings and dates, row 2 notes and plans */
var SITE = 'https://nlcsbiology.com/veterinary-society/';
var DOMAINS = ['pupils.nlcsjeju.kr', 'nlcsjeju.kr'];
var PUPILS = '@pupils.nlcsjeju.kr';     /* what a bare name in the Email column means */
var S_CLIENT = 'Google Client ID', S_COURSE = 'Classroom course ID', S_POST = 'Post the next meeting to Google Classroom',
    S_LAST = 'Last posted', S_SITE = 'The website';
var CACHE_KEY = 'list-v2', CACHE_SECONDS = 600;
var YEARS = ['Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13', 'Teacher'];
var STAFF_DOMAIN = 'nlcsjeju.kr';       /* a teacher's address has no pupils. in it */
/* the society's own colours, so the sheet looks like the site it feeds */
var INK = '#12262B', CREAM = '#F3E7C9', MOSS = '#7F94A2', AMBER = '#F5A623',
    PAPER = '#FFFFFF', BAND = '#F3F7F8', LINE = '#D6E0E4', CAME = '#DCF5E4', SOFT = '#FFF6E5';

/* ---------- the menu ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🐴 Veterinary Society')
    .addItem('🗂  Open the panel', 'panel')
    .addSeparator()
    .addItem('📅  Add the next meeting', 'addMeeting')
    .addItem('📣  Post the next meeting now', 'postNow')
    .addItem('👀  Preview that announcement', 'previewAnnouncement')
    .addSeparator()
    .addItem('🔄  Refresh the website now', 'refreshWebsite')
    .addItem('🩺  Check the website can read this', 'checkWebApp')
    .addItem('✨  Tidy the sheet up', 'dress')
    .addSeparator()
    .addItem('⚙️  Set up the tabs', 'setup')
    .addItem('🎓  Choose the Classroom class', 'chooseCourse')
    .addItem('🎒  Update who is in the class', 'syncClassroom')
    .addItem('🔔  Install the triggers (a teacher, once)', 'installTriggers')
    .addToUi();
}

/* a small panel down the side, so the week's work is three buttons rather than a menu hunt */
function panel() {
  var reg = _register(new Date()), next = _next(reg), tz = reg.tz;
  var when = next ? Utilities.formatDate(next.date, tz, 'EEEE d MMMM') + (_hasTime(next.date) ? ', ' + Utilities.formatDate(next.date, tz, 'HH:mm') : '') : '';
  var members = reg.members.filter(function (p) { return !p.staff; }).length;
  var staff = reg.members.length - members;
  var body =
    '<p class="eyebrow">Next meeting</p>' +
    (next ? '<p style="font:600 16px/1.3 Georgia,serif;color:#EDF4F8;margin:2px 0 4px">' + when + '</p>' +
            (next.plan ? '<p class="note">' + next.plan + '</p>' : '')
          : '<p class="note">Nothing in the diary. Add one below.</p>') +
    '<p class="note">' + members + ' member' + (members === 1 ? '' : 's') +
      (staff ? ' · ' + staff + ' teacher' + (staff === 1 ? '' : 's') : '') +
      ' · ' + reg.meetings.filter(function (m) { return m.past; }).length + ' meeting(s) so far</p>' +
    '<div class="row" style="margin-top:14px;flex-direction:column;align-items:stretch">' +
    '<button class="btn" data-do="addMeeting">📅  Add a meeting</button>' +
    '<button class="btn" data-do="postNow">📣  Tell the class</button>' +
    '<button class="btn quiet" data-do="checkWebApp">🩺  Check the website</button>' +
    '<button class="btn quiet" data-do="refreshWebsite">🔄  Refresh the website</button>' +
    '<button class="btn quiet" data-do="syncClassroom">🎒  Update the class</button>' +
    '<button class="btn quiet" data-do="dress">✨  Tidy the sheet</button>' +
    '</div><p class="note" id="s" style="margin-top:12px"></p>' +
    '<script>var s=document.getElementById("s");' +
    'Array.prototype.forEach.call(document.querySelectorAll("[data-do]"),function(b){' +
    'b.addEventListener("click",function(){s.textContent="Working…";' +
    'google.script.run.withSuccessHandler(function(){s.textContent="Done."})' +
    '.withFailureHandler(function(e){s.textContent=e.message})[b.dataset.do]()})});<\/script>';
  try {
    var out = HtmlService.createHtmlOutput(_page('This week', body)).setTitle('Veterinary Society');
    SpreadsheetApp.getUi().showSidebar(out);
  } catch (e) { _ui('The panel needs the spreadsheet open in front of you.'); }
}

/* posting straight away — a teacher may; the chair ticks the box in Settings and the teacher's
   trigger does it for them */
function postNow() {
  try { announce(_me()); _say('Posted', '<p class="ok">The announcement is in Google Classroom.</p>' +
    '<p class="note">Google Classroom shows it to the class straight away.</p>', 240); }
  catch (e) {
    if (_isScopeTrouble(e)) { _say('One permission short', _scopeHelp('post to Google Classroom'), 560); return; }
    _say('Not posted', '<p class="warn">' + e.message + '</p>' +
      '<p>If it says you may not post: only a teacher of the class can announce. Tick <b>Post the next meeting to Google Classroom</b> in the <b>Settings</b> tab (cell B4) instead — the teacher who installed the triggers posts it for you.</p>', 300);
  }
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  var reg = ss.getSheetByName(T_REG) || ss.insertSheet(T_REG, 0);
  if (reg.getLastRow() < 1) { reg.appendRow(HEAD); reg.appendRow(NOTE); }
  _tab(ss, T_VOTES, ['When', 'Email', 'Idea']);
  _tab(ss, T_LOG, ['When', 'What', 'By']);
  var st = ss.getSheetByName(T_SET) || ss.insertSheet(T_SET);
  if (st.getLastRow() < 1) st.appendRow(['Setting', 'Type it here \u2192', 'What it is for']);
  var want = [[S_CLIENT, CLIENT_ID], [S_COURSE, ''], [S_POST, false], [S_LAST, ''], [S_SITE, SITE]];
  want.forEach(function (kv) {
    var row = _settingRow(st, kv[0]);
    if (!row) { st.appendRow(kv); row = st.getLastRow(); }
    if (kv[0] === S_POST) st.getRange(row, 2).insertCheckboxes();
    if (kv[0] === S_CLIENT && !String(st.getRange(row, 2).getValue()).trim()) st.getRange(row, 2).setValue(CLIENT_ID);
  });
  _startHere(ss);
  _stampJoined(reg);
  dress();
  _flush();
  /* No alert here on purpose. A dialog raised by a script started from the editor waits for a
     click in the spreadsheet window, and the editor simply says "Execution started" for ever. */
  _toast('Ready. The Start here tab says what is left to do.');
}

/* the sheet explains itself: whoever opens it next can follow this without the README */
function _startHere(ss) {
  var sh = ss.getSheetByName(T_START) || ss.insertSheet(T_START, 0);
  sh.clear();
  var lines = [
    ['Veterinary Society — the sheet behind the website', ''],
    ['', ''],
    ['What this sheet is', 'The society\u2019s own register. The website reads it: when the next meeting is, what it will be, and who came to the ones before. It shows first names and year groups only — addresses and surnames stay here.'],
    ['', ''],
    ['Every week', ''],
    ['1. Add the meeting', 'Menu ▸ Veterinary Society ▸ Add the next meeting. Type the date and what you will do. A new column appears on the Register tab.'],
    ['2. Tell the class', 'Settings tab ▸ tick "Post the next meeting to Google Classroom". It posts, then unticks itself.'],
    ['3. After the meeting', 'Register tab ▸ tick the box for everyone who came. A ticked box turns green.'],
    ['', ''],
    ['Once, to switch it on', ''],
    ['4. Say where announcements go', 'Menu ▸ Choose the Classroom class.'],
    ['5. Put the website in touch', 'In the script editor: Deploy ▸ New deployment ▸ Web app ▸ execute as Me, access Anyone. Copy the address ending /exec into config.js in the veterinary-society repository.'],
    ['6. Let the chair post', 'Dr Mompel, in his own Google account: Menu ▸ Install the triggers. Only a teacher may announce in Classroom, and an installed trigger runs as whoever installed it.'],
    ['', ''],
    ['If something looks wrong', 'Menu ▸ Tidy the sheet up puts the look back and changes nothing you wrote. Menu ▸ Refresh the website now makes the site read the sheet again at once.'],
    ['The website', SITE]
  ];
  sh.getRange(1, 1, lines.length, 2).setValues(lines);
  sh.setTabColor(AMBER);
  sh.getRange(1, 1, lines.length, 2).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('top').setWrap(true);
  sh.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor(INK);
  ['Every week', 'Once, to switch it on'].forEach(function (t) {
    for (var r = 1; r <= lines.length; r++) if (String(sh.getRange(r, 1).getValue()) === t) {
      sh.getRange(r, 1, 1, 2).setBackground(INK).setFontColor(CREAM).setFontWeight('bold');
      sh.setRowHeight(r, 28);
    }
  });
  sh.getRange(3, 1, lines.length - 2, 1).setFontWeight('bold').setFontColor('#1B2226');
  sh.getRange(3, 2, lines.length - 2, 1).setFontColor('#3B4650');
  sh.setColumnWidth(1, 300); sh.setColumnWidth(2, 700);
  sh.setFrozenRows(1);
  try { sh.activate(); } catch (e) {}
  return sh;
}

/* Whoever was put on the register before this ran has no joining date; today is the day the
   sheet learned about them, which is the honest answer and the useful one. */
function _stampJoined(sh) {
  if (!sh) return;
  var last = _lastMember(sh); if (last < DATA_ROW) return;
  var rows = last - DATA_ROW + 1;
  var names = sh.getRange(DATA_ROW, 1, rows, HEAD.length).getValues();
  var joined = sh.getRange(DATA_ROW, 7, rows, 1).getValues();
  var now = new Date(), any = false;
  for (var i = 0; i < rows; i++) {
    var somebody = false;
    for (var c = 0; c < HEAD.length; c++) if (String(names[i][c]).trim()) { somebody = true; break; }
    if (somebody && !String(joined[i][0]).trim()) { joined[i][0] = now; any = true; }
  }
  if (any) sh.getRange(DATA_ROW, 7, rows, 1).setValues(joined);
}

/* ---------- how the sheet looks ----------
   Run whenever: it only ever sets the look, never the contents, so it is safe after pasting a
   list in from somewhere else (a paste brings its own colours and fonts with it). */
function dress() {
  var ss = SpreadsheetApp.getActive();
  _dressRegister(ss.getSheetByName(T_REG));
  _dressLedger(ss.getSheetByName(T_VOTES), [150, 260, 180]);
  _dressLedger(ss.getSheetByName(T_LOG), [150, 560, 240]);
  _dressSettings(ss.getSheetByName(T_SET));
  _toast('Tidied.');
}
function _plain(sh, tab) {
  if (!sh) return;
  sh.setTabColor(tab);
  var rows = sh.getMaxRows(), cols = sh.getMaxColumns();
  sh.getRange(1, 1, rows, cols).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle').setBorder(false, false, false, false, false, false);
  (sh.getBandings() || []).forEach(function (b) { b.remove(); });
}
function _heads(sh, row, n, align) {
  sh.getRange(row, 1, 1, n).setBackground(INK).setFontColor(CREAM).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment(align || 'left').setVerticalAlignment('middle');
  sh.setRowHeight(row, 34);
}
function _dressRegister(sh) {
  if (!sh) return;
  _plain(sh, INK);
  var lastRow = Math.max(sh.getLastRow(), DATA_ROW), lastCol = Math.max(sh.getLastColumn(), HEAD.length);
  _heads(sh, 1, HEAD.length);
  sh.getRange(2, 1, 1, HEAD.length).setBackground('#F7FAFB').setFontColor(MOSS).setFontStyle('italic').setFontSize(9).setWrap(true);
  sh.setRowHeight(2, 26);
  [130, 130, 130, 150, 240, 70, 110, 320].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2); sh.setFrozenColumns(4);

  /* the meeting columns: the date above, what the meeting is below, a tick per member */
  if (lastCol >= MEET_COL) {
    var n = lastCol - MEET_COL + 1;
    sh.getRange(1, MEET_COL, 1, n).setBackground(INK).setFontColor(CREAM).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sh.getRange(2, MEET_COL, 1, n).setBackground('#F7FAFB').setFontColor(MOSS).setFontStyle('italic').setFontSize(9).setWrap(true).setHorizontalAlignment('center');
    sh.getRange(DATA_ROW, MEET_COL, Math.max(1, lastRow - DATA_ROW + 1), n).setHorizontalAlignment('center');
    for (var c = MEET_COL; c <= lastCol; c++) sh.setColumnWidth(c, 110);
  }
  /* The member rows — and only those. An empty sheet painted to row 1000 looks like a form
     nobody filled in; a row is dressed when somebody is in it, and a row added by hand dresses
     itself the moment it is touched (onRegisterEdit below). */
  var last = _lastMember(sh);
  if (last >= DATA_ROW) {
    var rows = last - DATA_ROW + 1, wide = Math.max(HEAD.length, lastCol);
    sh.getRange(DATA_ROW, 1, rows, HEAD.length).setFontColor('#1B2226').setWrap(false);
    sh.getRange(DATA_ROW, 4, rows, 1).setFontWeight('bold');
    sh.getRange(DATA_ROW, 5, rows, 1).setFontColor('#5C6C77').setFontSize(9.5);
    sh.getRange(DATA_ROW, 6, rows, 1).setHorizontalAlignment('center');
    sh.getRange(DATA_ROW, 7, rows, 1).setNumberFormat('d mmm yyyy').setHorizontalAlignment('center');
    sh.getRange(DATA_ROW, 8, rows, 1).setWrap(true);
    /* banded by hand rather than with a banding: a banding is a thing on the sheet that would
       have to be found and replaced every time a row is added */
    var bands = [];
    for (var i = 0; i < rows; i++) { var b = (i % 2) ? BAND : PAPER, line = []; for (var c = 0; c < wide; c++) line.push(b); bands.push(line); }
    sh.getRange(DATA_ROW, 1, rows, wide).setBackgrounds(bands);
    sh.setRowHeights(DATA_ROW, rows, 26);
  }
  _years(sh, last);
  /* room for a year of meetings, so a new column rarely has to widen the sheet */
  var want = MEET_COL + 39;
  if (sh.getMaxColumns() < want) sh.insertColumnsAfter(sh.getMaxColumns(), want - sh.getMaxColumns());
  /* a ticked box turns its cell green, so a row of green is a row of people who came */
  var span = sh.getMaxColumns() - MEET_COL + 1;
  var deep = Math.max(last, DATA_ROW) - DATA_ROW + 1;
  var marks = sh.getRange(DATA_ROW, MEET_COL, deep, span);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=' + marks.getA1Notation().split(':')[0] + '=TRUE')
      .setBackground(CAME).setRanges([marks]).build()
  ]);
}
/* the Year column is a list, Y7 to Y13 and Teacher, so nobody types "year 7 " and wonders why.
   It reaches the rows that hold somebody, and one more, ready for the next. */
function _years(sh, last) {
  if (!sh) return;
  if (last == null) last = _lastMember(sh);
  var rows = Math.min(Math.max(last, DATA_ROW - 1) + 1, sh.getMaxRows()) - DATA_ROW + 1;
  if (rows < 1) rows = 1;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(YEARS, true)
    .setAllowInvalid(false).setHelpText('Y7 to Y13, or Teacher').build();
  sh.getRange(DATA_ROW, 6, rows, 1).setDataValidation(rule);
}
/* the last row with a person on it — not the last row Sheets happens to have touched */
function _lastMember(sh) {
  var last = sh.getLastRow();
  if (last < DATA_ROW) return DATA_ROW - 1;
  var v = sh.getRange(DATA_ROW, 1, last - DATA_ROW + 1, HEAD.length).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    for (var c = 0; c < HEAD.length; c++) if (String(v[i][c]).trim()) return DATA_ROW + i;
  }
  return DATA_ROW - 1;
}
function _hasSomebody(sh, row) {
  if (row < DATA_ROW) return false;
  var v = sh.getRange(row, 1, 1, HEAD.length).getValues()[0];
  for (var c = 0; c < HEAD.length; c++) if (String(v[c]).trim()) return true;
  return false;
}
function _dressLedger(sh, widths) {
  if (!sh) return;
  _plain(sh, MOSS);
  _heads(sh, 1, widths.length);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(1);
  var last = sh.getLastRow();
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 1).setNumberFormat('d mmm yyyy  HH:mm');
    sh.getRange(2, 1, last - 1, widths.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  }
}
function _dressSettings(sh) {
  if (!sh) return;
  _plain(sh, AMBER);
  _heads(sh, 1, 3);
  sh.setFrozenRows(1);
  var help = {};
  help[S_CLIENT] = 'The Google Client ID the Biology labs use. Dr Mompel has it. Without it nobody can sign in.';
  help[S_COURSE] = 'Which class gets the announcement. Menu ▸ Find my Classroom course ID — it is not the number in the Classroom web address.';
  help[S_POST]   = 'Tick this to announce the next meeting in Google Classroom. It unticks itself once it has posted.';
  help[S_LAST]   = 'Filled in by the script.';
  help[S_SITE]   = 'Where the page lives.';
  var last = sh.getLastRow();
  for (var r = 2; r <= last; r++) {
    var key = String(sh.getRange(r, 1).getValue()).trim();
    if (help[key] !== undefined) sh.getRange(r, 3).setValue(help[key]);
  }
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 1).setFontWeight('bold').setFontColor('#1B2226').setBackground('#FFF9EF');
    sh.getRange(2, 2, last - 1, 1).setBackground(PAPER).setFontColor('#1B2226').setBorder(true, true, true, true, false, false);
    sh.getRange(2, 3, last - 1, 1).setFontColor(MOSS).setFontSize(9).setWrap(true).setFontStyle('italic');
    sh.setRowHeights(2, last - 1, 44);
  }
  sh.setColumnWidth(1, 300); sh.setColumnWidth(2, 380); sh.setColumnWidth(3, 460);
  var post = _settingRow(sh, S_POST);
  if (post) sh.getRange(post, 1, 1, 3).setBackground(SOFT);
}
function _tab(ss, name, head) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.appendRow(head);
  sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  return sh;
}
function _ui(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }

/* ---------- how the script speaks ----------
   A plain grey alert box is a poor way to explain anything. These are small pages in the
   society's own colours, with the horse at the top; they fall back to the grey box wherever
   HtmlService is not there to draw them. */
var MARK_SVG =
  '<svg viewBox="0 0 420 440" width="54" height="56" aria-hidden="true">' +
  '<g transform="translate(6 26) scale(.92)" fill="none" stroke="#F3E7C9" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M 230 74 C 214 48 200 20 196 -8 C 214 10 234 40 244 68"/>' +
  '<path d="M 266 70 C 276 38 290 14 304 -4 C 306 24 292 52 276 74"/>' +
  '<path d="M 248 72 C 238 108 198 148 160 190 C 128 226 94 254 66 282 C 44 304 38 330 56 344 C 76 358 104 352 124 338 C 150 330 196 338 240 334 C 290 330 326 296 322 246 C 318 210 288 178 246 164"/>' +
  '<path d="M 292 68 C 348 100 384 180 390 300" stroke="#9DB7AE" stroke-width="7"/>' +
  '<path d="M 314 122 C 348 160 362 214 362 280" stroke="#9DB7AE" stroke-width="6"/>' +
  '<path d="M 64 298 C 74 292 84 294 90 302" stroke-width="7"/>' +
  '</g><circle cx="210" cy="170" r="14" fill="#F5A623"/></svg>';
var PAGE_CSS =
  'body{margin:0;background:#12262B;color:#EDF4F8;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
  '.wrap{padding:18px 22px 22px}' +
  'h1{margin:0 0 2px;font:600 19px/1.2 Georgia,"Times New Roman",serif;color:#F3E7C9;letter-spacing:.2px}' +
  '.eyebrow{font:500 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#9DB7AE}' +
  '.head{display:flex;gap:14px;align-items:center;border-bottom:1px solid rgba(255,255,255,.10);padding-bottom:14px;margin-bottom:14px}' +
  'p{margin:0 0 10px;color:#D7E3EA} b{color:#F5A623;font-weight:600}' +
  'ol,ul{margin:0 0 10px;padding-left:20px;color:#D7E3EA} li{margin:4px 0}' +
  'code,.url{font:12px/1.5 ui-monospace,Menlo,monospace;background:rgba(0,0,0,.30);border:1px solid rgba(255,255,255,.12);' +
  'border-radius:5px;padding:9px 11px;display:block;word-break:break-all;color:#EDF4F8;margin:0 0 10px}' +
  '.ok{color:#4ADE80;font-weight:600} .warn{color:#F5A623;font-weight:600}' +
  '.btn{display:inline-block;font:600 12px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;' +
  'color:#1B1206;background:#F5A623;border:0;border-radius:4px;padding:10px 12px;cursor:pointer;text-align:left}' +
  '.row>.btn{margin-bottom:7px}' +
  '.btn:hover{background:#FFB742} .btn.quiet{background:transparent;color:#9DB7AE;border:1px solid rgba(157,183,174,.45)}' +
  '.btn.quiet:hover{color:#EDF4F8;border-color:#EDF4F8} .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}' +
  '.note{font-size:12.5px;color:#9DB7AE}';
function _page(title, bodyHtml) {
  return '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"><style>' + PAGE_CSS + '</style></head><body><div class="wrap">' +
    '<div class="head">' + MARK_SVG + '<div><div class="eyebrow">Veterinary Society</div><h1>' + title + '</h1></div></div>' +
    bodyHtml + '</div></body></html>';
}
/* say something, prettily if the sheet will let us */
function _say(title, bodyHtml, height, plain) {
  try {
    var out = HtmlService.createHtmlOutput(_page(title, bodyHtml)).setWidth(520).setHeight(height || 320);
    SpreadsheetApp.getUi().showModalDialog(out, 'Veterinary Society');
  } catch (e) {
    _ui(plain || String(bodyHtml).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
}
/* a copyable box with the address in it */
function _urlBox(url) {
  return '<div class="url" id="u">' + url + '</div>' +
    '<div class="row"><button class="btn" id="c">Copy the address</button></div>' +
    '<script>document.getElementById("c").addEventListener("click",function(){' +
    'var t=document.getElementById("u").textContent;' +
    'navigator.clipboard.writeText(t).then(function(){var b=document.getElementById("c");b.textContent="Copied";' +
    'setTimeout(function(){b.textContent="Copy the address"},1600)},function(){' +
    'var r=document.createRange();r.selectNode(document.getElementById("u"));' +
    'window.getSelection().removeAllRanges();window.getSelection().addRange(r)})});<\/script>';
}
/* Google will not always say who is running this — an old authorisation may not carry the
   permission — and no real work here depends on knowing, so never let the asking stop it. */
function _me() { try { return Session.getEffectiveUser().getEmail() || ''; } catch (e) { return ''; } }
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
function _clientId() { return String(_setting(S_CLIENT) || CLIENT_ID || ''); }

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
      var year = _year(r[5]), staff = _isStaff(email) || year === 'Teacher';
      out.members.push({
        row: DATA_ROW + i, name: name, year: staff ? 'Teacher' : year, email: email, staff: staff,
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
  var s = String(v || '').trim();
  if (/teacher|staff/i.test(s)) return 'Teacher';
  var m = /(\d{1,2})/.exec(s);
  return m ? 'Y' + m[1] : s;
}
/* Who is a teacher is not a matter of what anybody typed: the school gives teachers an address
   without `pupils.` in it, and Google has already proved the address. A pupil cannot claim it. */
function _isStaff(email) { return (String(email || '').split('@')[1] || '') === STAFF_DOMAIN; }
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
      /* a teacher is a teacher because of their address; a pupil who picks Teacher is not one */
      var year = _isStaff(who.email) ? 'Teacher' : (_year(d.year) === 'Teacher' ? '' : _year(d.year));
      var note = String(d.note || '').slice(0, 300);
      var row = _rowOf(sh, 5, who.email);
      if (row) {
        /* already on the register: the year and the note are theirs to change, the names are the chair's */
        if (year) sh.getRange(row, 6).setValue(year);
        if (note) sh.getRange(row, 8).setValue(note);
      } else {
        sh.appendRow(['', who.given || '', who.family || '', who.given || who.name || who.email.split('@')[0], who.email, year, new Date(), note]);
        _dressRow(sh, sh.getLastRow());
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
/* One row, dressed like the rest: a student who signed up, or a row somebody typed in by hand.
   Also the moment to fill in what the sheet can know for itself — when they arrived. */
function _dressRow(sh, row) {
  try {
    if (!_hasSomebody(sh, row)) return;
    var lastCol = sh.getLastColumn(), wide = Math.max(HEAD.length, lastCol);
    var band = ((row - DATA_ROW) % 2) ? BAND : PAPER, line = [];
    for (var c = 0; c < wide; c++) line.push(band);
    sh.getRange(row, 1, 1, wide).setBackgrounds([line]);
    sh.getRange(row, 1, 1, HEAD.length).setFontColor('#1B2226');
    sh.getRange(row, 4).setFontWeight('bold');
    sh.getRange(row, 5).setFontColor('#5C6C77').setFontSize(9.5);
    sh.getRange(row, 6).setHorizontalAlignment('center');
    sh.getRange(row, 7).setNumberFormat('d mmm yyyy').setHorizontalAlignment('center');
    sh.getRange(row, 8).setWrap(true);
    sh.setRowHeight(row, 26);
    if (lastCol >= MEET_COL) sh.getRange(row, MEET_COL, 1, lastCol - MEET_COL + 1).insertCheckboxes().setHorizontalAlignment('center');
    if (!String(sh.getRange(row, 7).getValue()).trim()) sh.getRange(row, 7).setValue(new Date());
    _years(sh);
  } catch (e) {}
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
      return { name: p.name, year: p.year, staff: !!p.staff,
               present: past.map(function (m) { return !!p.marks[reg.meetings.indexOf(m)]; }) };
    }),
    votes: {}, mine: [], member: false
  };
  out.stamp = CODE_STAMP;
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
  sh.getRange(1, col).setValue(date).setNumberFormat(_hasTime(date) ? 'ddd d mmm HH:mm' : 'ddd d mmm')
    .setBackground(INK).setFontColor(CREAM).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange(2, col).setValue(String(plan || '').trim())
    .setBackground('#F7FAFB').setFontColor(MOSS).setFontStyle('italic').setFontSize(9).setWrap(true).setHorizontalAlignment('center');
  var last = sh.getLastRow();
  if (last >= DATA_ROW) sh.getRange(DATA_ROW, col, last - DATA_ROW + 1, 1).insertCheckboxes().setHorizontalAlignment('center');
  sh.setColumnWidth(col, 110);
  _flush();
  return sh.getRange(1, col).getA1Notation().replace(/\d+$/, '');
}
function refreshWebsite() { _flush(); _toast('Done. The website reads the register afresh from now.'); }

/* ---------- can the website read this? ----------
   The honest question is not "is this script deployed" but "does the address the website is
   calling answer a stranger". So this asks the website for its own config.js, takes the address
   out of it, and tries that — then tries this script's current deployment, which may be a
   different one entirely. Every `Deploy ▸ New deployment` mints a new address; setting one of
   them to Anyone does nothing for the others. */
function _ask(url) {
  if (!url) return { code: 0, ok: false, stamp: '' };
  try {
    var r = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'action=list',
                              { muteHttpExceptions: true, followRedirects: true });
    var c = r.getResponseCode(), b = r.getContentText();
    var m = /"stamp"\s*:\s*"([^"]*)"/.exec(b);
    return { code: c, ok: c === 200 && b.indexOf('"ok"') >= 0, stamp: m ? m[1] : '' };
  } catch (e) { return { code: 0, ok: false, stamp: '', why: String(e) }; }
}
/* the website is answered by the deployed version, not by what is saved in the editor */
function _staleNote(stamp) {
  if (stamp === CODE_STAMP) return '';
  return '<p class="warn" style="margin-top:12px">It is answering with older code.</p>' +
    '<p>Saving the editor does not change what the website is given: that comes from the deployed version.</p>' +
    '<ol><li><b>Deploy ▸ Manage deployments</b></li><li>the ✏️ pencil</li>' +
    '<li>Version: <b>New version</b></li><li><b>Deploy</b> — the address does not change</li></ol>' +
    '<p class="note">Deployed: <i>' + (stamp || 'from before this was recorded') + '</i><br>Saved here: <i>' + CODE_STAMP + '</i></p>';
}
function _siteScriptUrl() {
  var site = String(_setting(S_SITE) || SITE);
  if (site.slice(-1) !== '/') site += '/';
  try {
    var r = UrlFetchApp.fetch(site + 'config.js', { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return '';
    var m = /scriptUrl\s*:\s*'([^']*)'/.exec(r.getContentText());
    return m ? m[1].trim() : '';
  } catch (e) { return ''; }
}
function _idOf(url) { var m = /\/s\/([^\/]+)\//.exec(String(url)); return m ? m[1] : ''; }
function _shortId(url) { var id = _idOf(url); return id ? id.slice(0, 10) + '…' + id.slice(-6) : '—'; }

function checkWebApp() {
  var mine = ''; try { mine = _plainUrl(ScriptApp.getService().getUrl() || ''); } catch (e) {}
  var theirs = _plainUrl(_siteScriptUrl());
  var site = String(_setting(S_SITE) || SITE);

  /* 1. what the website is calling, if it says */
  if (theirs) {
    var a = _ask(theirs);
    if (a.ok) {
      _say(a.stamp === CODE_STAMP ? 'Working' : 'Working, but a version behind',
        '<p><span class="ok">The website is reading the register.</span></p>' +
        '<p class="note">It calls <code style="display:inline;padding:2px 6px">' + _shortId(theirs) + '</code>, and that answers a visitor who has not signed in — which is what matters.</p>' +
        _staleNote(a.stamp) +
        (mine && _idOf(mine) !== _idOf(theirs)
          ? '<p class="note">(This script\u2019s newest deployment is a different one, <code style="display:inline;padding:2px 6px">' + _shortId(mine) + '</code>. Leave it be, or archive it: Deploy ▸ Manage deployments ▸ ⋮ ▸ Archive.)</p>' : ''),
        a.stamp === CODE_STAMP ? 340 : 520, 'Working: the website can read the register.');
      return;
    }
    /* the website's address does not answer — does this script's own? */
    var b = mine ? _ask(mine) : { ok: false, code: 0 };
    if (b.ok) {
      _say('Two different deployments',
        '<p>The website is calling <code style="display:inline;padding:2px 6px">' + _shortId(theirs) + '</code>, and Google answers <span class="warn">' + (a.code || '—') + '</span> to a visitor who has not signed in.</p>' +
        '<p>This script\u2019s own deployment, <code style="display:inline;padding:2px 6px">' + _shortId(mine) + '</code>, <span class="ok">does answer</span>. Every <b>New deployment</b> makes a new address, and only one of them was opened to everyone.</p>' +
        '<p>Put this address into <b>config.js</b> instead:</p>' + _urlBox(mine) +
        '<p class="note">Then archive the other: Deploy ▸ Manage deployments ▸ ⋮ ▸ Archive.</p>',
        480, 'config.js points at a deployment that is not public. Use ' + mine);
      return;
    }
    _cannotRead(a.code || b.code, theirs, mine);
    return;
  }

  /* 2. the website did not say — fall back to this script's own deployment */
  if (!mine) {
    _say('Not deployed yet',
      '<p>The website has nothing to read yet. In the script editor:</p>' +
      '<ol><li><b>Deploy ▸ New deployment ▸ Web app</b></li>' +
      '<li>Execute as: <b>Me</b></li><li>Who has access: <b>Anyone</b></li></ol>' +
      '<p class="note">Then run this check again.</p>', 320);
    return;
  }
  var c = _ask(mine);
  if (c.ok) {
    _say('Working',
      '<p><span class="ok">This deployment answers a visitor who has not signed in.</span></p>' +
      _staleNote(c.stamp) +
      '<p>Put the address in <b>config.js</b> in the veterinary-society repository, after <code style="display:inline;padding:2px 5px">scriptUrl</code>:</p>' +
      _urlBox(mine) +
      '<p class="note">I could not read <code style="display:inline;padding:2px 5px">' + site + 'config.js</code> to check what the website is calling — that is all right, it may simply not be published yet.</p>',
      440, 'Working. Paste this into config.js: ' + mine);
    return;
  }
  _cannotRead(c.code, '', mine);
}

function _cannotRead(code, theirs, mine) {
  var url = theirs || mine;
  _say('The website cannot read this yet',
    '<p><span class="warn">Google answered ' + (code || '—') + '</span> to a request carrying no sign-in — which is how the page asks.</p>' +
    '<p>The deployment being asked is <code style="display:inline;padding:2px 6px">' + _shortId(url) + '</code>. In <b>Deploy ▸ Manage deployments</b>, is that the one you set to <b>Anyone</b>?</p>' +
    '<ul><li>If there is <b>more than one</b> deployment, archive the ones you are not using (⋮ ▸ Archive) — only one of them was opened, and the address in config.js may be another.</li>' +
    '<li>If it <b>is</b> the right one and it still says Anyone, the school is refusing anonymous access. That is a Workspace setting, not yours.</li></ul>' +
    '<p class="note">Tell Dr Mompel either way. If the school will not allow it, the page can be changed to sign people in before it asks for anything.</p>' +
    _urlBox(url), 560,
    'The website cannot read this yet (Google answered ' + code + ') for deployment ' + _shortId(url));
}
/* The editor shows a school account one of two school-shaped addresses —
     script.google.com/a/macros/<school>/s/…      and
     script.google.com/a/<school>/macros/s/…
   both the same deployment as the plain script.google.com/macros/s/… , but both make a visitor
   sign in to the school first, and this page asks for the register before anybody has. */
function _plainUrl(url) {
  return String(url).replace(/^https:\/\/script\.google\.com\/a\/(?:macros\/)?[^\/]+\/(?:macros\/)?s\//, 'https://script.google.com/macros/s/');
}

/* ---------- Google Classroom ---------- */
function _announcement(reg) {
  var next = _next(reg); if (!next) return null;
  var when = Utilities.formatDate(next.date, reg.tz, 'EEEE d MMMM') + (_hasTime(next.date) ? ', ' + Utilities.formatDate(next.date, reg.tz, 'HH:mm') : '');
  var lines = ['🐴 Veterinary Society — next meeting', '', '📅 ' + when];
  if (next.plan) lines.push('🩺 ' + next.plan);
  lines.push('', 'Who came last time, and what is coming: ' + SITE + '#register');
  return { text: lines.join('\n'), when: when, plan: next.plan };
}
/* The course ID is not the number in the Classroom web address, so nobody should have to find
   it: this asks Google which classes you teach and writes the one you pick into Settings. */
function chooseCourse() {
  if (typeof Classroom === 'undefined') {
    _say('One thing is missing', '<p>The Classroom service is not switched on in this script yet.</p>' +
      '<ol><li>Script editor ▸ <b>Services</b></li><li>press <b>+</b></li><li><b>Google Classroom API</b> ▸ Add</li></ol>', 300);
    return;
  }
  var cs;
  try { cs = (Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'], pageSize: 50 }) || {}).courses || []; }
  catch (e) {
    if (_isScopeTrouble(e)) { _say('One permission short', _scopeHelp('read your list of classes'), 560); return; }
    _say('Google would not list your classes', '<p class="warn">' + e.message + '</p>', 260); return;
  }
  if (!cs.length) {
    _say('No classes', '<p>Google says you teach no active class in Classroom.</p>' +
      '<p class="note">The announcement is posted by whoever installs the triggers, so that person has to be a teacher of the class it is for.</p>', 260);
    return;
  }
  var ui = SpreadsheetApp.getUi();
  var list = cs.map(function (c, i) { return (i + 1) + '.  ' + c.name; }).join('\n');
  var a = ui.prompt('Which class gets the announcements?', list + '\n\nType its number:', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var n = parseInt(String(a.getResponseText()).trim(), 10);
  if (!(n >= 1 && n <= cs.length)) { _ui('That was not one of the numbers on the list.'); return; }
  _putSetting(S_COURSE, cs[n - 1].id);
  _log('Announcements will go to ' + cs[n - 1].name, _me());
  _toast('Announcements will go to ' + cs[n - 1].name + '.');
}
function previewAnnouncement() {
  var a = _announcement(_register(new Date()));
  if (!a) { _say('Nothing to announce', '<p>There is no meeting in the diary that is today or later.</p><p class="note">Add one first: 📅 Add the next meeting.</p>', 240); return; }
  _say('This is what the class will see',
    '<div class="url" style="white-space:pre-wrap;word-break:normal">' + a.text.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</div>' +
    '<p class="note">Post it with 📣 Tell the class, or by ticking the box in Settings B4.</p>', 420, a.text);
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

/* ---------- when Google says the permissions are not enough ----------
   Apps Script works out what a script may do from its manifest. This project lists its
   permissions there on purpose, so that a reader can see exactly what it asks for — the cost is
   that adding a new one (the Classroom roster, say) means editing the manifest and letting
   Google ask again. This is that message, with the manifest to paste. It is the same file as
   apps-script/appsscript.json in the repository; tools/gastest.js fails if the two drift. */
var MANIFEST = [
  "{",
  "  \"timeZone\": \"Asia/Seoul\",",
  "  \"exceptionLogging\": \"STACKDRIVER\",",
  "  \"runtimeVersion\": \"V8\",",
  "  \"dependencies\": {",
  "    \"enabledAdvancedServices\": [",
  "      {",
  "        \"userSymbol\": \"Classroom\",",
  "        \"serviceId\": \"classroom\",",
  "        \"version\": \"v1\"",
  "      }",
  "    ]",
  "  },",
  "  \"oauthScopes\": [",
  "    \"https://www.googleapis.com/auth/spreadsheets.currentonly\",",
  "    \"https://www.googleapis.com/auth/script.external_request\",",
  "    \"https://www.googleapis.com/auth/userinfo.email\",",
  "    \"https://www.googleapis.com/auth/script.scriptapp\",",
  "    \"https://www.googleapis.com/auth/classroom.courses.readonly\",",
  "    \"https://www.googleapis.com/auth/classroom.announcements\",",
  "    \"https://www.googleapis.com/auth/classroom.rosters\",",
  "    \"https://www.googleapis.com/auth/classroom.profile.emails\"",
  "  ]",
  "}"
].join('\n');
function _isScopeTrouble(e) {
  return /permissions are not sufficient|Required permissions|insufficient authentication|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(String(e && e.message || e));
}
function _scopeHelp(what) {
  return '<p>Google will not let this script ' + what + ' yet: the permission is not in its manifest, so it was never asked for.</p>' +
    '<ol><li>Script editor ▸ <b>⚙ Project Settings</b></li>' +
    '<li>tick <b>Show "appsscript.json" manifest file in editor</b></li>' +
    '<li>Editor ▸ <b>appsscript.json</b> ▸ replace all of it with this ▸ <b>Save</b></li>' +
    '<li>run the same thing again — Google will ask you to <b>Review permissions</b>, and this time the list will include what it needs. Allow it.</li></ol>' +
    '<div class="url" style="max-height:150px;overflow:auto" id="u">' + MANIFEST.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</div>' +
    '<div class="row"><button class="btn" id="c">Copy the manifest</button></div>' +
    '<script>document.getElementById("c").addEventListener("click",function(){' +
    'var t=document.getElementById("u").textContent;' +
    'navigator.clipboard.writeText(t).then(function(){var b=document.getElementById("c");b.textContent="Copied";' +
    'setTimeout(function(){b.textContent="Copy the manifest"},1600)},function(){' +
    'var r=document.createRange();r.selectNode(document.getElementById("u"));' +
    'window.getSelection().removeAllRanges();window.getSelection().addRange(r)})});<\/script>';
}

/* ---------- the Classroom roster ----------
   The register in this sheet is who the society is. Google Classroom should say the same, and
   keeping the two the same by hand is the sort of job nobody does twice. So: invite whoever is
   on the register and not in the class, and — only when asked, and only after the names have
   been read — take out whoever is in the class and not on the register.

   Google will not let a script simply add somebody to a class: it invites them, and they accept.
   Removing needs no permission from them, which is exactly why it is never done without asking
   here. Teachers on the register are left alone; they belong in the class as teachers, and this
   only ever touches students. */
function _courseOr(sayIt) {
  var id = String(_setting(S_COURSE) || '').trim();
  if (!id && sayIt) _say('No class chosen yet', '<p>Tell it which class first: menu ▸ 🎓 <b>Choose the Classroom class</b>.</p>', 220);
  return id;
}
function _classroomReady(sayIt) {
  if (typeof Classroom !== 'undefined') return true;
  if (sayIt) _say('One thing is missing', '<p>The Classroom service is not switched on in this script yet.</p>' +
    '<ol><li>Script editor ▸ <b>Services</b></li><li>press <b>+</b></li><li><b>Google Classroom API</b> ▸ Add</li></ol>', 300);
  return false;
}
/* everyone Google thinks is a student of the class, and everyone already invited */
function _classNow(course) {
  var out = { students: [], invited: {} }, token = null;
  do {
    var r = Classroom.Courses.Students.list(course, { pageSize: 100, pageToken: token }) || {};
    ((r.students) || []).forEach(function (st) {
      var p = st.profile || {};
      out.students.push({ id: st.userId, email: String((p.emailAddress || '')).toLowerCase(), name: ((p.name || {}).fullName) || '' });
    });
    token = r.nextPageToken;
  } while (token);
  token = null;
  do {
    var q = Classroom.Invitations.list({ courseId: course, pageSize: 100, pageToken: token }) || {};
    ((q.invitations) || []).forEach(function (iv) { out.invited[String(iv.userId || '').toLowerCase()] = true; });
    token = q.nextPageToken;
  } while (token);
  return out;
}
/* what would change, without changing anything */
function classroomPlan() {
  var course = _courseOr(false); if (!course || !_classroomReady(false)) return null;
  var reg = _register(new Date());
  var want = {}, wantList = [];
  reg.members.forEach(function (p) {
    if (p.staff || !p.email) return;                    /* teachers are not students of the class */
    if (want[p.email]) return;
    want[p.email] = true; wantList.push({ email: p.email, name: p.name });
  });
  var now = _classNow(course);
  var have = {};
  now.students.forEach(function (st) { if (st.email) have[st.email] = st; });
  var plan = { course: course, invite: [], remove: [], already: 0, pending: 0 };
  wantList.forEach(function (p) {
    if (have[p.email]) { plan.already++; return; }
    if (now.invited[p.email]) { plan.pending++; return; }
    plan.invite.push(p);
  });
  var me = _me().toLowerCase();
  now.students.forEach(function (st) {
    if (st.email && !want[st.email] && st.email !== me) plan.remove.push(st);
  });
  try { plan.name = (Classroom.Courses.get(course) || {}).name || ''; } catch (e) { plan.name = ''; }
  return plan;
}
function syncClassroom() {
  if (!_classroomReady(true)) return;
  if (!_courseOr(true)) return;
  var plan;
  try { plan = classroomPlan(); }
  catch (e) {
    if (_isScopeTrouble(e)) { _say('One permission short', _scopeHelp('see who is in the class'), 560); return; }
    _say('Google would not say', '<p class="warn">' + e.message + '</p>' +
      '<p class="note">Only a teacher of the class may see or change who is in it. If you are the chair, ask Dr Mompel to run this.</p>', 300); return;
  }
  if (!plan) return;
  var list = function (people, none) {
    if (!people.length) return '<p class="note">' + none + '</p>';
    return '<ul>' + people.map(function (p) { return '<li>' + (p.name ? p.name + ' <span class="note">' + p.email + '</span>' : p.email) + '</li>'; }).join('') + '</ul>';
  };
  var body =
    '<p class="eyebrow">' + (plan.name || 'the class') + '</p>' +
    '<p><b>To invite</b> — on the register, not in the class</p>' + list(plan.invite, 'Nobody. Everyone on the register is in the class already.') +
    '<p style="margin-top:12px"><b>To take out</b> — in the class, not on the register</p>' + list(plan.remove, 'Nobody.') +
    '<p class="note">' + plan.already + ' already in · ' + plan.pending + ' invited and not yet accepted · teachers are left alone.</p>' +
    '<div class="row" style="margin-top:12px">' +
    (plan.invite.length ? '<button class="btn" id="inv">Invite the ' + plan.invite.length + ' new one' + (plan.invite.length === 1 ? '' : 's') + '</button>' : '') +
    (plan.remove.length ? '<button class="btn quiet" id="both">Invite, and take out the ' + plan.remove.length + '</button>' : '') +
    '</div><p class="note" id="s"></p>' +
    '<script>function go(rm){var s=document.getElementById("s");s.textContent="Working\u2026";' +
    'Array.prototype.forEach.call(document.querySelectorAll("button"),function(b){b.disabled=true});' +
    'google.script.run.withSuccessHandler(function(t){s.textContent=t})' +
    '.withFailureHandler(function(e){s.textContent=e.message})' +
    '.classroomApply(rm)}' +
    'var i=document.getElementById("inv"); if(i)i.addEventListener("click",function(){go(false)});' +
    'var b=document.getElementById("both"); if(b)b.addEventListener("click",function(){go(true)});<\/script>';
  _say('Who is in the class', body, 560, 'To invite: ' + plan.invite.length + '. To take out: ' + plan.remove.length + '.');
}
/* the plan is worked out again here: what a dialog was told a minute ago is not authority */
function classroomApply(alsoRemove) {
  var plan = classroomPlan();
  if (!plan) return 'No class chosen.';
  var course = plan.course, invited = 0, removed = 0, failed = [];
  plan.invite.forEach(function (p) {
    try { Classroom.Invitations.create({ courseId: course, userId: p.email, role: 'STUDENT' }); invited++; }
    catch (e) { failed.push(p.email + ': ' + e.message); }
  });
  if (alsoRemove) {
    plan.remove.forEach(function (st) {
      try { Classroom.Courses.Students.remove(course, st.id || st.email); removed++; }
      catch (e) { failed.push(st.email + ': ' + e.message); }
    });
  }
  var said = invited + ' invited' + (alsoRemove ? ', ' + removed + ' taken out' : '') + (failed.length ? ', ' + failed.length + ' would not' : '') + '.';
  _log('Classroom roster: ' + said + (failed.length ? ' (' + failed.join('; ') + ')' : ''), _me());
  return said + (failed.length ? ' See the Log tab.' : ' They have an invitation to accept.');
}

/* ---------- triggers: installed once, by the teacher ----------
   An installable trigger runs as the person who installed it. That is what lets the chair tick
   one box and have the announcement go out under the teacher's name, and what lets any edit of
   the register reach the website at once. */
function installTriggers() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'onRegisterEdit') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onRegisterEdit').forSpreadsheet(ss).onEdit().create();
  var who = _me();
  _say('Installed',
    '<p><span class="ok">Done.</span> Two things now work:</p>' +
    '<ul><li>every edit reaches the website at once</li>' +
    '<li>the tick box in <b>Settings B4</b> posts to Google Classroom as <b>' + (who || 'you') + '</b></li></ul>' +
    '<p class="note">That is what lets the chair announce a meeting without being a teacher.</p>', 320);
}
function onRegisterEdit(e) {
  _flush();
  try {
    var r = e && e.range; if (!r) return;
    var sh = r.getSheet();
    /* a row somebody has just written in dresses itself, and is stamped with the day it arrived */
    if (sh.getName() === T_REG && r.getRow() >= DATA_ROW && r.getColumn() <= HEAD.length) {
      for (var i = 0; i < r.getNumRows(); i++) _dressRow(sh, r.getRow() + i);
      return;
    }
    if (sh.getName() !== T_SET || r.getColumn() !== 2) return;
    var key = String(sh.getRange(r.getRow(), 1).getValue()).trim();
    if (key !== S_POST || r.getValue() !== true) return;
    var by = (e.user && e.user.getEmail && e.user.getEmail()) || '';
    try { announce(by); _toast('Posted to Google Classroom.'); }
    catch (err) { _log('Could not post: ' + err.message, by); _toast('Not posted: ' + err.message); }
    r.setValue(false);
  } catch (err) { _log('Trigger error: ' + err.message, ''); }
}
