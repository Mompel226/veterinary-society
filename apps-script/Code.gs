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

   THE NEXT MEETING is the first meeting column that has not finished yet. Add a column (the menu
   does it, or type a date in row 1 of a new column) and the page shows it within a minute, and
   counts down to it. A meeting written with a time runs for MEET_MINUTES from that time; one
   written with a date alone lasts the day. While it is running the page says so; the moment it
   finishes, the page stops calling it next and its column joins the register, ticks and all.
   That is deliberate: the ticks for a meeting held this morning have to show this morning.
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
var CODE_STAMP = '2026-09-16j · a shared name is told apart by the Korean name';
var HEAD = ['Korean name', 'English name', 'Surname', 'Preferred name', 'Email', 'Year', 'Role', 'Joined', 'Would like to do'];
var NOTE = ['', '', '', 'shown on the site', 'never shown — the first part is enough', 'shown',
            'Chair or Secretary — they run it from the website', 'filled in for you', 'in their own words'];
/* Every column of the Register by name. Nothing may count them out on its fingers: adding Role
   moved Joined, the note and every meeting column one to the right, and a number left behind
   would have written a date into somebody's year or a tick into their note. */
var C_KOREAN = 1, C_ENGLISH = 2, C_SURNAME = 3, C_SHOWN = 4, C_EMAIL = 5,
    C_YEAR = 6, C_ROLE = 7, C_JOINED = 8, C_NOTE = 9;
var MEET_COL = HEAD.length + 1;       /* J: the first meeting column */
/* What a member may be, beyond a member. An officer runs the society from the website: the
   chair's desk is theirs, so they can add a meeting and tell the class. Blank is the usual. */
var ROLES = ['', 'Chair', 'Secretary'];
/* How long a meeting lasts, when its column carries a time. It is what tells the site the
   difference between a meeting that has not happened yet, one that is happening now, and one
   that is over and whose ticks belong in the register. A column with a date but no time is a
   whole-day entry and is over when that day is. */
var MEET_MINUTES = 60;
/* Wide enough for the whole of "Wed 16 Sep 15:40" at Arial 10 bold, with room to spare. A date
   that does not fit its column is not clipped by Google Sheets, it is replaced by ####, and the
   chair cannot see the date at all. */
var MEET_WIDTH = 124;
var DATA_ROW = 3;                     /* row 1 headings and dates, row 2 notes and plans */
var SITE = 'https://nlcsbiology.com/veterinary-society/';
var DOMAINS = ['pupils.nlcsjeju.kr', 'nlcsjeju.kr'];
var PUPILS = '@pupils.nlcsjeju.kr';     /* what a bare name in the Email column means */
var S_CLIENT = 'Google Client ID', S_COURSE = 'Classroom course ID',
    S_LAST = 'Last posted', S_SITE = 'The website', S_READ = 'Last read by the website',
    S_CHAIR = 'Chair';
var WANT_POST = 'postWanted';        /* a chair asking for an announcement a teacher will make */
var CACHE_KEY = 'list-v2', CACHE_SECONDS = 600;
var YEARS = ['Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13', 'Teacher'];
/* a teacher is known by a title and a surname, not by a first name: Dr Mompel Riera, not Daniel */
var TITLES = ['Dr', 'Prof', 'Mr', 'Mrs', 'Ms', 'Miss', 'Mx'];
var STAFF_DOMAIN = 'nlcsjeju.kr';       /* a teacher's address has no pupils. in it */
/* the society's own colours, so the sheet looks like the site it feeds */
var INK = '#12262B', CREAM = '#F3E7C9', MOSS = '#7F94A2', AMBER = '#F5A623',
    PAPER = '#FFFFFF', BAND = '#F3F7F8', LINE = '#D6E0E4', CAME = '#DCF5E4', SOFT = '#FFF6E5';
/* MOSS is for tabs and for words on the dark ground. On paper it is too faint to read, so
   anything secondary written on white uses this instead. */
var MUTED = '#54636E', TEXT = '#1B2226';

/* ---------- the menu ---------- */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🐴 Veterinary Society')
    .addItem('🗂  Open the panel', 'panel')
    .addSeparator()
    .addItem('📅  Add a meeting', 'addMeeting')
    .addItem('📣  Tell the class', 'postNow')
    .addItem('👀  Preview that announcement', 'previewAnnouncement')
    .addItem('🎒  Update who is in the class', 'syncClassroom')
    .addItem('🧑‍🏫  Put a teacher on the register', 'addTeachers')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️  Setting up, and checks')
      .addItem('Set the sheet up, or tidy it', 'setup')
      .addItem('Choose the Classroom class', 'chooseCourse')
      .addItem('Who runs it \u2014 chair and secretary', 'officers')
      .addItem('Install the triggers (a teacher, once)', 'installTriggers')
      .addSeparator()
      .addItem('Check the website can read this', 'checkWebApp')
      .addItem('Refresh the website now', 'refreshWebsite')
      .addItem('Test the pop-up window', 'testPopup'))
    .addToUi();
  /* The panel should open with the sheet, but a simple onOpen runs with barely any authority and
     may not open one. Where it is allowed, this does it; everywhere else the trigger installed by
     a teacher (openPanel, below) does, and neither says anything if it cannot. */
  try { panel(true); } catch (e) {}
}

/* a small panel down the side, so the week's work is three buttons rather than a menu hunt */
function panel(quiet) {
  var reg = _register(new Date()), next = _next(reg), tz = reg.tz;
  var when = next ? Utilities.formatDate(next.date, tz, 'EEEE d MMMM') + (_hasTime(next.date) ? ', ' + Utilities.formatDate(next.date, tz, 'HH:mm') : '') : '';
  var members = reg.members.filter(function (p) { return !p.staff; }).length;
  var staff = reg.members.length - members;
  var lastPost = String(_setting(S_LAST) || ''), site = String(_setting(S_SITE) || SITE);
  var body =
    '<p class="eyebrow">Next meeting</p>' +
    (next ? '<p style="font:600 16px/1.3 Georgia,serif;color:#EDF4F8;margin:2px 0 4px">' + when + '</p>' +
            (next.plan ? '<p class="note">' + next.plan + '</p>' : '')
          : '<p class="note">Nothing in the diary. Add one below.</p>') +
    '<p class="note">' + members + ' member' + (members === 1 ? '' : 's') +
      (staff ? ' · ' + staff + ' teacher' + (staff === 1 ? '' : 's') : '') +
      ' · ' + reg.meetings.filter(function (m) { return m.over; }).length + ' meeting(s) so far</p>' +
    '<div class="row" style="margin-top:14px;flex-direction:column;align-items:stretch">' +
    '<button class="btn" data-do="addMeeting">📅  Add a meeting</button>' +
    '<button class="btn" data-do="postNow">📣  Tell the class</button>' +
    '<button class="btn quiet" data-do="checkWebApp">🩺  Check the website</button>' +
    '<button class="btn quiet" data-do="refreshWebsite">🔄  Refresh the website</button>' +
    '<button class="btn quiet" data-do="officers">👥  Who runs it</button>' +
    '<button class="btn quiet" data-do="syncClassroom">🎒  Update the class</button>' +
    '<button class="btn quiet" data-do="setup">✨  Tidy the sheet</button>' +
    '</div><p class="note" id="s" style="margin-top:12px"></p>' +
    '<p class="note" style="margin-top:10px;border-top:1px solid rgba(255,255,255,.10);padding-top:10px">' +
    (lastPost ? 'Last told the class: ' + lastPost + '<br>' : '') +
    '<a href="' + site + '" target="_blank" style="color:#F5A623">open the society\u2019s page \u2197</a></p>' +
    '<script>var s=document.getElementById("s");' +
    'Array.prototype.forEach.call(document.querySelectorAll("[data-do]"),function(b){' +
    'b.addEventListener("click",function(){s.textContent="Working…";' +
    'google.script.run.withSuccessHandler(function(){s.textContent="Done."})' +
    '.withFailureHandler(function(e){s.textContent=e.message})[b.dataset.do]()})});<\/script>';
  try {
    var out = HtmlService.createHtmlOutput(_page('This week', body)).setTitle('Veterinary Society');
    SpreadsheetApp.getUi().showSidebar(out);
  } catch (e) {
    if (quiet) return;          /* opening the sheet must never scold anybody */
    _say('The panel would not open', '<p class="warn">' + (e && e.message || e) + '</p>' +
      '<p>If it says the permissions are not sufficient, the manifest needs replacing — menu ▸ ⚙️ Setting up, and checks ▸ <b>Test the pop-up window</b> says so plainly.</p>', 280);
  }
}

/* Posting straight away: a teacher may. A chair may not — Google only lets a teacher of the
   class announce — so their press leaves a request, and the teacher's timer makes the post a few
   minutes later, under the teacher's name. Nobody has to tick anything. */
function postNow() {
  try {
    announce(_me());
    _say('Posted', '<p class="ok">The announcement is in Google Classroom.</p><p class="note">The class sees it straight away.</p>', 240);
    return 'Posted to Google Classroom.';
  } catch (e) {
    if (_isScopeTrouble(e)) { _say('One permission short', _scopeHelp('post to Google Classroom')); return 'One permission short.'; }
    if (/permission|not allowed|forbidden|403/i.test(e.message)) {
      try { CacheService.getScriptCache().put(WANT_POST, _me() || 'the chair', 21600); } catch (e2) {}
      _log('Announcement asked for by ' + (_me() || 'the chair'), _me());
      _say('Asked for',
        '<p>Only a teacher of the class may announce in Google Classroom, so this has been <b>asked for</b> instead.</p>' +
        '<p class="ok">Dr Mompel\u2019s computer will post it within a few minutes.</p>' +
        '<p class="note">Nothing else to do. You can close this.</p>', 280);
      return 'Asked a teacher to post it.';
    }
    _say('Not posted', '<p class="warn">' + e.message + '</p>', 260);
    return 'Not posted: ' + e.message;
  }
}
/* Opening the sheet opens the panel. This is the installable version of that: it runs with the
   authority of whoever installed it, which a simple onOpen does not have. */
function openPanel() { try { panel(true); } catch (e) {} }

/* the teacher's timer: has anybody asked for an announcement since it last looked? */
function postPending() {
  var cache;
  try { cache = CacheService.getScriptCache(); } catch (e) { return; }
  var who = cache.get(WANT_POST);
  if (!who) return;
  cache.remove(WANT_POST);
  try { announce(who); }
  catch (e) { _log('Could not post the announcement ' + who + ' asked for: ' + e.message, _me()); }
}

/* Setting up and tidying up are the same job: make sure every tab is there and every heading is
   right, fill in what the sheet can know for itself, and put the look back. It changes nothing
   anybody has written, so it is safe to run whenever something looks wrong. */
/* A register built before Role has its Joined column where Role goes now. One column inserted
   there moves Joined, the note and EVERY MEETING COLUMN one to the right, ticks and all, and
   Google Sheets carries the values, the formats, the tick boxes and the widths with them. It has
   to happen before anything reads a row, or a meeting column would be read as somebody's note.
   Done once: afterwards the heading already says Role and this does nothing. */
function _migrateRole(sh) {
  if (!sh || sh.getLastRow() < 1) return false;
  var span = Math.min(Math.max(sh.getLastColumn(), 1), HEAD.length);
  var head = sh.getRange(1, 1, 1, span).getValues()[0].map(function (v) { return String(v || '').trim(); });
  if (head[C_ROLE - 1] === 'Role') return false;         /* already has it */
  if (head[C_ROLE - 1] !== 'Joined') return false;       /* not the old shape — leave it alone */
  sh.insertColumnBefore(C_ROLE);
  sh.getRange(1, C_ROLE).setValue(HEAD[C_ROLE - 1]);
  sh.getRange(2, C_ROLE).setValue(NOTE[C_ROLE - 1]);
  _log('The register gained its Role column; the meetings moved one to the right', _me());
  return true;
}

/* Rows brought in from Google Classroom before this was put right carry the WHOLE NAME in the
   preferred-name column, and that put surnames on a public page. Any pupil row whose preferred
   name still carries its own surname is cut back to the name they go by. Nothing else is
   touched: a teacher is known by a title and a surname there on purpose. */
function _tidyPreferred(sh) {
  if (!sh) return 0;
  var last = sh.getLastRow(); if (last < DATA_ROW) return 0;
  var rows = sh.getRange(DATA_ROW, 1, last - DATA_ROW + 1, HEAD.length).getValues(), fixed = 0;
  rows.forEach(function (r, i) {
    var shown = String(r[C_SHOWN - 1] || '').trim();
    var family = String(r[C_SURNAME - 1] || '').trim();
    var given = String(r[C_ENGLISH - 1] || '').trim();
    var email = _email(r[C_EMAIL - 1]);
    if (!shown || !family || _isStaff(email) || _year(r[C_YEAR - 1]) === 'Teacher') return;
    if (shown.toLowerCase().indexOf(family.toLowerCase()) < 0) return;
    var want = _preferred(given, shown);
    if (!want || want === shown) return;
    sh.getRange(DATA_ROW + i, C_SHOWN).setValue(want);
    fixed++;
  });
  if (fixed) _log(fixed + ' preferred name(s) cut back to the name they go by \u2014 a surname was reaching the website', _me());
  return fixed;
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  var reg = ss.getSheetByName(T_REG) || ss.insertSheet(T_REG, 0);
  if (reg.getLastRow() < 1) { reg.appendRow(HEAD); reg.appendRow(NOTE); }
  _migrateRole(reg);
  reg.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
  _tab(ss, T_VOTES, ['When', 'Email', 'Idea', 'In words']);
  _tab(ss, T_LOG, ['When', 'What', 'By']);
  var st = ss.getSheetByName(T_SET) || ss.insertSheet(T_SET);
  if (st.getLastRow() < 1) st.appendRow(['Setting', 'Type it here \u2192', 'What it is for']);
  var want = [[S_CLIENT, CLIENT_ID], [S_COURSE, ''], [S_CHAIR, ''], [S_LAST, ''], [S_READ, ''], [S_SITE, SITE]];
  want.forEach(function (kv) {
    var row = _settingRow(st, kv[0]);
    if (!row) { st.appendRow(kv); row = st.getLastRow(); }
    if (kv[0] === S_CLIENT && !String(st.getRange(row, 2).getValue()).trim()) st.getRange(row, 2).setValue(CLIENT_ID);
  });
  /* the tick box that used to live here is a button in the panel now */
  var oldBox = _settingRow(st, 'Post the next meeting to Google Classroom');
  if (oldBox) st.deleteRow(oldBox);
  _startHere(ss);
  _stampJoined(reg);
  _tidyPreferred(reg);
  dress(true);
  _flush();
  /* No alert here on purpose. A dialog raised by a script started from the editor waits for a
     click in the spreadsheet window, and the editor simply says "Execution started" for ever. */
  _toast('Tidied. Everything is where it should be.');
}

/* the sheet explains itself: whoever opens it next can follow this without the README */
function _startHere(ss) {
  var sh = ss.getSheetByName(T_START) || ss.insertSheet(T_START, 0);
  sh.clear();
  /* the left column is coloured by what the line is: the society's ink for a heading, its amber
     for a thing to do, paper for the words beside it */
  var lines = [
    ['title', 'Veterinary Society', 'The sheet behind the website'],
    ['note',  'What this sheet is', 'The society\u2019s own register. The website reads it: when the next meeting is, what it will be, and who came to the ones before. It shows preferred names and year groups only \u2014 addresses and surnames stay here.'],
    ['note',  'The panel', 'It opens down the right-hand side whenever you open this sheet, with a button for everything below. If you close it: menu \uD83D\uDC34 Veterinary Society \u25B8 \uD83D\uDDC2 Open the panel.'],
    ['band',  'Every week', ''],
    ['step',  '1.  Add the meeting', 'Panel \u25B8 \uD83D\uDCC5 Add a meeting. Type the date and what you will do. A new column appears on the Register tab, and the website says when the next meeting is.'],
    ['step',  '2.  Tell the class', 'Panel \u25B8 \uD83D\uDCE3 Tell the class. A teacher posts it to Google Classroom there and then; if the chair presses it, the teacher\u2019s computer posts it within five minutes.'],
    ['step',  '3.  After the meeting', 'Register tab \u25B8 tick the box for everyone who came. A ticked box turns green, and the website shows who came to what \u2014 as soon as the meeting has finished, not the next day.'],
    ['band',  'Now and then', ''],
    ['step',  'Who runs it', 'The Role column: choose Chair or Secretary from the drop-down beside somebody\u2019s year. Either of them gets the desk on the website \u2014 add a meeting, tell the class \u2014 which is how a pupil runs the society, because a pupil cannot be given permission to use this menu. Panel \u25B8 \u2699\uFE0F Setting up, and checks \u25B8 Who is the chair? does the same thing, and can name somebody who has not put their name down yet.'],
    ['step',  'A teacher of yours', 'Menu \u25B8 \uD83E\uDDD1\u200D\uD83C\uDFEB Put a teacher on the register. It lists whoever teaches the Google Classroom class and you pick the ones who belong here \u2014 a class often carries a head of department who does not.'],
    ['step',  'Somebody new', 'They sign up on the website themselves, or you type them into the next empty row of the Register \u2014 the row dresses itself.'],
    ['step',  'Keep the class in step', 'Panel \u25B8 \uD83C\uDF92 Update the class. It shows who to invite and who to take out before it does anything. A teacher only.'],
    ['step',  'Something looks wrong', '\u2728 Tidy the sheet puts the look back and changes nothing you wrote. \uD83E\uDE7A Check the website says whether the page and this sheet are talking.'],
    ['band',  'Once, to switch it on', ''],
    ['step',  'The website\u2019s address', 'Script editor \u25B8 Deploy \u25B8 New deployment \u25B8 Web app, execute as Me, access Anyone. Put the /exec address into config.js in the veterinary-society repository.'],
    ['step',  'Which class', 'Menu \u25B8 \uD83C\uDF93 Choose the Classroom class. A teacher only.'],
    ['step',  'Let the chair announce', 'Menu \u25B8 \uD83D\uDD14 Install the triggers, in the teacher\u2019s own account. Only a teacher may announce in Classroom, and an installed trigger runs as whoever installed it.'],
    ['note',  'The website', SITE]
  ];
  sh.getRange(1, 1, lines.length, 2).setValues(lines.map(function (l) { return [l[1], l[2]]; }));
  sh.setTabColor(AMBER);
  sh.getRange(1, 1, lines.length, 2).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('top').setWrap(true);
  sh.setColumnWidth(1, 250); sh.setColumnWidth(2, 760);
  lines.forEach(function (l, i) {
    var r = i + 1, left = sh.getRange(r, 1), right = sh.getRange(r, 2), both = sh.getRange(r, 1, 1, 2);
    if (l[0] === 'title') {
      both.setBackground(INK);
      left.setFontSize(18).setFontWeight('bold').setFontColor(CREAM).setVerticalAlignment('middle');
      right.setFontSize(11).setFontColor(MOSS).setFontStyle('italic').setVerticalAlignment('middle');
      sh.setRowHeight(r, 54);
    } else if (l[0] === 'band') {
      both.setBackground('#1D3B42');
      left.setFontSize(11).setFontWeight('bold').setFontColor(AMBER).setVerticalAlignment('middle');
      sh.setRowHeight(r, 32);
    } else {
      left.setBackground(SOFT).setFontWeight('bold').setFontColor('#1B2226');
      right.setBackground(PAPER).setFontColor('#3B4650');
      sh.setRowHeight(r, l[0] === 'note' ? 62 : 46);
    }
  });
  sh.setFrozenRows(1);
  try { sh.setHiddenGridlines(true); } catch (e) {}
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
  var joined = sh.getRange(DATA_ROW, C_JOINED, rows, 1).getValues();
  var now = new Date(), any = false;
  for (var i = 0; i < rows; i++) {
    var somebody = false;
    for (var c = 0; c < HEAD.length; c++) if (String(names[i][c]).trim()) { somebody = true; break; }
    if (somebody && !String(joined[i][0]).trim()) { joined[i][0] = now; any = true; }
  }
  if (any) sh.getRange(DATA_ROW, C_JOINED, rows, 1).setValues(joined);
}

/* ---------- how the sheet looks ----------
   Run whenever: it only ever sets the look, never the contents, so it is safe after pasting a
   list in from somewhere else (a paste brings its own colours and fonts with it). */
function dress(quiet) {
  var ss = SpreadsheetApp.getActive();
  _dressRegister(ss.getSheetByName(T_REG));
  _dressLedger(ss.getSheetByName(T_VOTES), [150, 260, 170, 230], T_VOTES);
  _dressLedger(ss.getSheetByName(T_LOG), [150, 560, 240]);
  _dressSettings(ss.getSheetByName(T_SET));
  if (!quiet) _toast('Tidied.');
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
/* A meeting column, dressed: the short date format and a column wide enough to show it. Every
   way a column can appear goes through here — the menu, a tidy-up, and a date typed straight
   into row 1 — so none of them can leave a #### behind. */
function _dressMeetingCol(sh, col) {
  var cell = sh.getRange(1, col), d = _asDate(cell.getValue());
  if (d) cell.setNumberFormat(_hasTime(d) ? 'ddd d mmm HH:mm' : 'ddd d mmm');
  cell.setBackground(INK).setFontColor(CREAM).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setColumnWidth(col, MEET_WIDTH);
}
function _dressRegister(sh) {
  if (!sh) return;
  _plain(sh, INK);
  var lastRow = Math.max(sh.getLastRow(), DATA_ROW), lastCol = Math.max(sh.getLastColumn(), HEAD.length);
  _heads(sh, 1, HEAD.length);
  sh.getRange(2, 1, 1, HEAD.length).setBackground('#EDF3F5').setFontColor(MUTED).setFontStyle('italic').setFontSize(9.5).setWrap(true);
  sh.setRowHeight(2, 26);
  [130, 130, 130, 150, 240, 70, 100, 110, 320].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2); sh.setFrozenColumns(4);

  /* the meeting columns: the date above, what the meeting is below, a tick per member */
  if (lastCol >= MEET_COL) {
    var n = lastCol - MEET_COL + 1;
    sh.getRange(1, MEET_COL, 1, n).setBackground(INK).setFontColor(CREAM).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sh.getRange(2, MEET_COL, 1, n).setBackground('#EDF3F5').setFontColor(MUTED).setFontStyle('italic').setFontSize(9.5).setWrap(true).setHorizontalAlignment('center');
    sh.getRange(DATA_ROW, MEET_COL, Math.max(1, lastRow - DATA_ROW + 1), n).setHorizontalAlignment('center');
    for (var c = MEET_COL; c <= lastCol; c++) _dressMeetingCol(sh, c);
  }
  /* The member rows — and only those. An empty sheet painted to row 1000 looks like a form
     nobody filled in; a row is dressed when somebody is in it, and a row added by hand dresses
     itself the moment it is touched (onRegisterEdit below). */
  var last = _lastMember(sh);
  if (last >= DATA_ROW) {
    var rows = last - DATA_ROW + 1, wide = Math.max(HEAD.length, lastCol);
    sh.getRange(DATA_ROW, 1, rows, HEAD.length).setFontColor('#1B2226').setWrap(false);
    sh.getRange(DATA_ROW, C_SHOWN, rows, 1).setFontWeight('bold');
    sh.getRange(DATA_ROW, C_EMAIL, rows, 1).setFontColor(MUTED).setFontSize(9.5);
    sh.getRange(DATA_ROW, C_YEAR, rows, 1).setHorizontalAlignment('center');
    sh.getRange(DATA_ROW, C_ROLE, rows, 1).setHorizontalAlignment('center');
    sh.getRange(DATA_ROW, C_JOINED, rows, 1).setNumberFormat('d mmm yyyy').setHorizontalAlignment('center');
    sh.getRange(DATA_ROW, C_NOTE, rows, 1).setWrap(true);
    /* banded by hand rather than with a banding: a banding is a thing on the sheet that would
       have to be found and replaced every time a row is added */
    var bands = [];
    for (var i = 0; i < rows; i++) { var b = (i % 2) ? BAND : PAPER, line = []; for (var c = 0; c < wide; c++) line.push(b); bands.push(line); }
    sh.getRange(DATA_ROW, 1, rows, wide).setBackgrounds(bands);
    sh.setRowHeights(DATA_ROW, rows, 26);
  }
  _years(sh, last);
  /* Below the last member there is nobody, so there should be nothing: no year lists left over
     from a longer register, no tick boxes, no banding. This is the part that was missing. */
  var firstFree = Math.max(last, DATA_ROW - 1) + 2;
  if (firstFree <= sh.getMaxRows()) {
    var below = sh.getRange(firstFree, 1, sh.getMaxRows() - firstFree + 1, sh.getMaxColumns());
    below.clearDataValidations();
    below.clearFormat();
  }
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
  sh.getRange(DATA_ROW, C_YEAR, rows, 1).setDataValidation(rule);
  /* the role sits beside the year and is not one of them: an officer is in a year like anybody
     else, and a society changes its officers without anybody changing year */
  var roles = SpreadsheetApp.newDataValidation().requireValueInList(ROLES.filter(String), true)
    .setAllowInvalid(true).setHelpText('Chair or Secretary, or leave it empty').build();
  sh.getRange(DATA_ROW, C_ROLE, rows, 1).setDataValidation(roles);
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
function _dressLedger(sh, widths, which) {
  if (!sh) return;
  _plain(sh, MOSS);
  _heads(sh, 1, widths.length);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(1);
  var last = sh.getLastRow();
  if (last > 1) {
    var rows = last - 1;
    sh.getRange(2, 1, rows, 1).setNumberFormat('d mmm yyyy  HH:mm');
    var bands = [];
    for (var i = 0; i < rows; i++) { var b = (i % 2) ? BAND : PAPER, line = []; for (var c = 0; c < widths.length; c++) line.push(b); bands.push(line); }
    sh.getRange(2, 1, rows, widths.length).setBackgrounds(bands);
    if (which === T_VOTES) {
      /* keep the name the page files a vote under, and say it in words beside */
      sh.getRange(2, 3, rows, 1).setFontColor(MUTED).setFontSize(9.5);
      sh.getRange(2, 4, rows, 1).setFontWeight('bold').setFontColor('#1B2226');
      var slugs = sh.getRange(2, 3, rows, 1).getValues(), words = sh.getRange(2, 4, rows, 1).getValues(), any = false;
      for (var r = 0; r < rows; r++) {
        if (String(slugs[r][0]).trim() && !String(words[r][0]).trim()) { words[r][0] = _inWords(slugs[r][0]); any = true; }
      }
      if (any) sh.getRange(2, 4, rows, 1).setValues(words);
    }
  }
}
function _dressSettings(sh) {
  if (!sh) return;
  _plain(sh, AMBER);
  /* a quiet header, not a black band: these are only column names */
  sh.getRange(1, 1, 1, 3).setBackground('#EDF3F5').setFontColor(TEXT).setFontWeight('bold').setFontSize(10)
    .setVerticalAlignment('middle').setBorder(null, null, true, null, null, null, '#9FB3BC', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.setRowHeight(1, 30);
  sh.setFrozenRows(1);
  var help = {};
  help[S_CLIENT] = 'The Google Client ID the Biology labs use. Dr Mompel has it. Without it nobody can sign in.';
  help[S_COURSE] = 'Which class gets the announcement. Menu ▸ Find my Classroom course ID — it is not the number in the Classroom web address.';
  help[S_CHAIR]  = 'The chair\u2019s school address, so the website lets them add a meeting and tell the class. More than one, separated by commas, if there are joint chairs. A teacher may always do both and does not need listing.';
  help[S_LAST]   = 'Filled in by the script.';
  help[S_READ]   = 'Filled in by the script: the last time the website asked for the register, and which version answered. This is the proof that the page and this sheet are talking.';
  help[S_SITE]   = 'Where the page lives.';
  var last = sh.getLastRow();
  for (var r = 2; r <= last; r++) {
    var key = String(sh.getRange(r, 1).getValue()).trim();
    if (help[key] !== undefined) sh.getRange(r, 3).setValue(help[key]);
  }
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 1).setFontWeight('bold').setFontColor(TEXT).setBackground('#FFF4E0');
    sh.getRange(2, 2, last - 1, 1).setBackground(PAPER).setFontColor(TEXT).setFontSize(10.5)
      .setBorder(true, true, true, true, true, null, '#C8D4DA', SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(2, 3, last - 1, 1).setBackground('#FAFCFD').setFontColor(MUTED).setFontSize(10).setWrap(true);
    sh.setRowHeights(2, last - 1, 46);
  }
  sh.setColumnWidth(1, 300); sh.setColumnWidth(2, 380); sh.setColumnWidth(3, 460);
  /* the two that a person fills in are lit; the two the script writes are quieter */
  [S_LAST, S_READ, S_SITE].forEach(function (k) {
    var r = _settingRow(sh, k);
    if (r) { sh.getRange(r, 1).setBackground('#F3F7F8').setFontColor(MUTED); sh.getRange(r, 2).setFontColor(MUTED).setFontSize(10); }
  });
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
/* A fragment, not a whole document: HtmlService wraps and sanitises what it is given, and the
   fewer document-shaped parts it has to take apart, the fewer ways it can refuse. */
function _page(title, bodyHtml) {
  return '<base target="_top"><style>' + PAGE_CSS + '</style><div class="wrap">' +
    '<div class="head">' + MARK_SVG + '<div><div class="eyebrow">Veterinary Society</div><h1>' + title + '</h1></div></div>' +
    bodyHtml + '</div>';
}
/* Say something, prettily if the sheet will let us. Returns true if the drawn page appeared;
   false if it fell back to Google's grey box — and then it says why, because a job that can only
   be done by pressing a button inside a page that never opened is no job at all. */
function _say(title, bodyHtml, height, plain) {
  try {
    var out = HtmlService.createHtmlOutput(_page(title, bodyHtml)).setWidth(520).setHeight(height || 320);
    SpreadsheetApp.getUi().showModalDialog(out, 'Veterinary Society');
    return true;
  } catch (e) {
    var why = String(e && e.message || e);
    try { _log('A pop-up would not open (' + title + '): ' + why, _me()); } catch (e2) {}
    var fix = _isScopeTrouble(why)
      ? '\n\nThe drawn windows need one more permission than this script has been given.' +
        '\n  1. Script editor \u25B8 Project Settings \u25B8 tick "Show appsscript.json manifest file in editor"' +
        '\n  2. Editor \u25B8 appsscript.json \u25B8 replace it with the one in the veterinary-society repository \u25B8 Save' +
        '\n  3. Run this again and press Allow.'
      : '';
    _ui((plain || String(bodyHtml).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) +
        '\n\n(The proper window would not open here: ' + why + ')' + fix);
    return false;
  }
}
/* Why would a drawn window not open? Rather than guess, try it in pieces and say which piece
   failed and in Google's own words. Everything here is reported through the grey box, which
   always works, and written to the Log. */
function testPopup() {
  var steps = [], mini = '<p style="font:14px sans-serif">Hello from the Veterinary Society.</p>';
  try { HtmlService.createHtmlOutput(mini); steps.push('1. a plain page — made'); }
  catch (e) { steps.push('1. a plain page — FAILED: ' + e.message); }
  try { HtmlService.createHtmlOutput(_page('Test', '<p>Hello.</p>')); steps.push('2. the society page — made'); }
  catch (e) { steps.push('2. the society page — FAILED: ' + e.message); }
  var shown = false;
  try {
    /* if it works, show the real thing rather than a bare white box: this is what every other
       window in here looks like, and seeing it is the whole point of the test */
    var page = _page('The windows work', '<p><span class="ok">This is a drawn window.</span> ' +
      'Every message from here looks like this now — the panel, the class list, the checks.</p>' +
      '<p class="note">Close it and try 🗂 Open the panel.</p>');
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(page).setWidth(460).setHeight(280), 'Veterinary Society');
    steps.push('3. showing it — Google accepted it'); shown = true;
  } catch (e) { steps.push('3. showing it — FAILED: ' + e.message); }
  var report = steps.join('\n');
  _log('Pop-up test: ' + steps.join(' | '), _me());
  if (shown) {
    /* the little window is already up; leave it, and put the report where it can be read after */
    SpreadsheetApp.getActive().toast('The pop-up opened. The Log tab has the details.', 'Veterinary Society', 8);
  } else {
    _ui('Why the drawn window will not open here\n\n' + report +
        '\n\nEverything still works without it: the grey boxes ask Yes/No and do the same jobs.\n' +
        'Send these lines to Dr Mompel.');
  }
}

/* a question Google's own box can ask, for when the drawn page cannot be shown */
function _askYesNo(title, text) {
  try {
    var ui = SpreadsheetApp.getUi();
    return ui.alert(title, text, ui.ButtonSet.YES_NO) === ui.Button.YES;
  } catch (e) { return false; }
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
   meetings: [{ col, date, plan, over }]   members: [{ row, name, year, email, marks: [bool per meeting] }] */
function _register(now) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(T_REG), out = { meetings: [], members: [], tz: ss.getSpreadsheetTimeZone() };
  if (!sh) return out;
  var lastCol = sh.getLastColumn(), lastRow = sh.getLastRow();
  /* A register built before Role has its meetings one column to the left, and nothing says the
     tidy-up that moves them will have been run before the website is redeployed. So read the
     sheet that is there, not the one that ought to be: everything before Role sits in the same
     place in both, and the old shape simply has no role to read. */
  var span = Math.min(Math.max(lastCol, 1), HEAD.length);
  var head = sh.getRange(1, 1, 1, span).getValues()[0].map(function (v) { return String(v || '').trim(); });
  var beforeRole = head[C_ROLE - 1] === 'Joined';
  var meetCol = beforeRole ? MEET_COL - 1 : MEET_COL;
  if (lastCol >= meetCol) {
    var heads = sh.getRange(1, meetCol, 2, lastCol - meetCol + 1).getValues();
    for (var c = 0; c < heads[0].length; c++) {
      var d = _asDate(heads[0][c]); if (!d) continue;
      out.meetings.push({ col: meetCol + c, date: d, plan: String(heads[1][c] || '').trim(), over: _isOver(d, now) });
    }
  }
  if (lastRow >= DATA_ROW) {
    var rows = sh.getRange(DATA_ROW, 1, lastRow - DATA_ROW + 1, lastCol).getValues();
    rows.forEach(function (r, i) {
      var given = String(r[C_ENGLISH - 1] || '').trim();
      var family = String(r[C_SURNAME - 1] || '').trim();
      var korean = String(r[C_KOREAN - 1] || '').trim();
      var name = String(r[C_SHOWN - 1] || given || korean || '').trim();
      var email = _email(r[C_EMAIL - 1]);
      if (!name && !email) return;
      var year = _year(r[C_YEAR - 1]), staff = _isStaff(email) || year === 'Teacher';
      /* The guarantee, enforced here rather than trusted: a pupil's name that carries their own
         surname never leaves this script, whatever is in the cell. An import used to write the
         full name into the preferred-name column, and that put surnames on a public page. */
      if (!staff && family && name.toLowerCase().indexOf(family.toLowerCase()) >= 0) {
        name = _preferred(given, name) || name;
      }
      out.members.push({
        row: DATA_ROW + i, name: name, year: staff ? 'Teacher' : year, email: email, staff: staff,
        korean: korean, other: _otherName(given),
        role: beforeRole ? '' : _role(r[C_ROLE - 1]),
        marks: out.meetings.map(function (m) { return _present(r[m.col - 1]); })
      });
    });
  }
  return out;
}
function _asDate(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var s = String(v || '').trim(); if (!s) return null;
  var iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?$/.exec(s);   /* 2026-09-17T15:40 - what the website sends */
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0));
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
/* when a meeting finishes: MEET_MINUTES after it starts, or the end of its day if it was
   written with no time at all */
function _endOf(d) {
  return _hasTime(d) ? new Date(d.getTime() + MEET_MINUTES * 60000)
                     : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}
function _isOver(d, now) { return _endOf(d).getTime() <= (now || new Date()).getTime(); }
function _present(v) {
  if (v === true) return true; if (v === false || v == null) return false;
  return /^(✓|✔|√|1|p|y|yes|present|o|here|came)$/i.test(String(v).trim());
}
/* What somebody wrote in the Role column. "co-chair", "Vice Chair" and "secretery" are all
   meant, so the word inside is what counts; anything else is kept as they typed it, shown on the
   site, and carries no powers — a society may want a Treasurer without that being this script's
   business. */
/* THE NAME THE PAGE IS ALLOWED. The site is promised preferred names only — never a surname,
   never a Korean name of its own. The school writes a given name as "Haoran (Henry)": the name
   they go by is the one in brackets, and if there are no brackets it is the first word. */
function _preferred(given, full) {
  var m = /\(([^)]+)\)/.exec(String(given || '')) || /\(([^)]+)\)/.exec(String(full || ''));
  if (m && m[1].trim()) return m[1].trim();
  var g = String(given || '').trim();
  if (g) return g.split(/\s+/)[0];
  return String(full || '').trim().split(/\s+/)[0] || '';
}
/* The other half of "Haoran (Henry)" — the name they do not go by. It is what tells two members
   called Henry apart, and it is emphatically not the surname. */
function _otherName(given) {
  var m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(String(given || '').trim());
  return m ? m[1].trim() : '';
}
function _role(v) {
  var t = String(v == null ? '' : v).trim();
  if (!t) return '';
  var l = t.toLowerCase();
  if (l.indexOf('chair') >= 0) return 'Chair';
  if (l.indexOf('secret') >= 0) return 'Secretary';     /* secretary, secretery, secretry */
  return t.slice(0, 20);
}
/* the two that run the society: the chair's desk on the website is theirs */
function _officer(role) { return role === 'Chair' || role === 'Secretary'; }
/* The name as the page shows it: theirs alone, or theirs with the one thing that says which.
   Two members who go by Henry are both just "Henry" otherwise, and nobody can tell whose tally
   is whose. Daniel's rule, given twice: it is their REAL NAME in brackets — the Korean name —
   and never the surname. The Korean-name column is it; where a row has none, the given name they
   do not go by ("Haoran" of "Haoran (Henry)") does instead. A name nobody shares is shown alone,
   so nothing extra is disclosed about anybody who does not need telling apart. */
function _apart(p, shared) {
  var name = String(p.name || '');
  if (shared[name.toLowerCase()] < 2) return name;
  var tell = p.korean || p.other || '';
  return tell ? name + ' (' + tell + ')' : name;
}
function _year(v) {
  var s = String(v || '').trim();
  if (/teacher|staff/i.test(s)) return 'Teacher';
  var m = /(\d{1,2})/.exec(s);
  return m ? 'Y' + m[1] : s;
}
function _title(v) {
  var s = String(v || '').trim().replace(/\.$/, '');
  for (var i = 0; i < TITLES.length; i++) if (TITLES[i].toLowerCase() === s.toLowerCase()) return TITLES[i];
  return '';
}
/* Who is a teacher is not a matter of what anybody typed: the school gives teachers an address
   without `pupils.` in it, and Google has already proved the address. A pupil cannot claim it. */
function _isStaff(email) { return (String(email || '').split('@')[1] || '') === STAFF_DOMAIN; }
/* The chair, and anybody else the teacher names in Settings, may run the society from the
   WEBSITE. That is the point of doing it there: the web app runs under the teacher's own
   authority, so the chair signs in and nothing is ever asked of his own Google account - which
   is what stops a school that lets only staff authorise scripts from shutting him out of his own
   society. A teacher is always allowed, whether or not anybody wrote them down. */
function _isOfficer(email) {
  var e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  if (_isStaff(e)) return true;
  /* the register is where it is said: Role = Chair or Secretary */
  var on = _register(new Date()).members.filter(function (p) { return p.email === e; })[0];
  if (on && _officer(on.role)) return true;
  /* and Settings, for an officer who has not put their name down yet */
  return String(_setting(S_CHAIR) || '').toLowerCase().split(/[\s,;]+/).filter(String).indexOf(e) >= 0;
}

/* the next meeting: the first that has not finished yet — so a meeting still counts as next
   while it is going on, and stops the moment it ends */
function _next(reg) {
  var up = reg.meetings.filter(function (m) { return !m.over; });
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
  _noteRead(d.from);
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
      var row = _rowOf(sh, C_EMAIL, who.email);
      if (row) {
        /* already on the register: the year and the note are theirs to change, the names are the chair's */
        if (year) sh.getRange(row, C_YEAR).setValue(year);
        if (note) sh.getRange(row, C_NOTE).setValue(note);
      } else {
        /* the name the site will show: a pupil by their first name, a teacher by title and surname */
        var shown;
        if (year === 'Teacher') {
          var t = _title(d.title);
          shown = ((t ? t + ' ' : '') + (who.family || who.given || who.name || '')).trim() || who.email.split('@')[0];
        } else {
          shown = _preferred(who.given, who.name) || who.email.split('@')[0];
        }
        sh.appendRow(['', who.given || '', who.family || '', shown, who.email, year, '', new Date(), note]);
        _dressRow(sh, sh.getLastRow());
      }
      _flush();
      return _list(who);
    }
    /* The chair's two jobs, done from the website instead of the sheet's menu. Everything here
       runs as the teacher who deployed the web app, so the chair needs no permission of his own:
       the meeting is written by the teacher's hand, and the announcement goes out under the
       teacher's name, which is the only way Google Classroom will carry it anyway. */
    if (action === 'meeting' || action === 'tellClass') {
      if (!_isOfficer(who.email)) return { ok: false, why: 'only the chair, the secretary or a teacher may do that' };

      if (action === 'meeting') {
        var when = _asDate(d.date);
        if (!when) return { ok: false, why: 'that did not read as a date' };
        var plan = String(d.plan || '').trim().slice(0, 200);
        if (!plan) return { ok: false, why: 'say what the meeting will be' };
        /* the same day twice is nearly always a slip, and a stray column cannot be undone from here */
        var already = _register(new Date()).meetings.filter(function (m) {
          return _startOfDay(m.date).getTime() === _startOfDay(when).getTime();
        })[0];
        if (already) return { ok: false, why: 'there is already a meeting that day' };
        _newMeeting(when, plan);
        _log('Meeting added from the website: ' + _stamp(when, SpreadsheetApp.getActive().getSpreadsheetTimeZone()) + ' \u00B7 ' + plan, who.email);
        return _list(who);
      }

      try {
        announce(who.email);
        var out = _list(who); out.said = 'The class has been told.'; return out;
      } catch (e) {
        var out2 = _list(who);
        out2.said = /course ID/i.test(e.message)
          ? 'No Classroom class is chosen yet \u2014 a teacher sets that in the sheet.'
          : 'Could not post to Classroom: ' + e.message;
        return out2;
      }
    }

    if (action === 'vote') {
      var idea = String(d.idea || '').replace(/[^a-z0-9-]/g, '').slice(0, 40);
      if (!idea) return { ok: false, why: 'which idea?' };
      var vs = _tab(ss, T_VOTES, ['When', 'Email', 'Idea', 'In words']);
      var last = vs.getLastRow(), found = 0;
      if (last > 1) {
        var rows = vs.getRange(2, 2, last - 1, 2).getValues();
        for (var i = rows.length - 1; i >= 0; i--) {
          if (String(rows[i][0]).toLowerCase() === who.email && String(rows[i][1]) === idea) { vs.deleteRow(i + 2); found++; }
        }
      }
      if (!found) vs.appendRow([new Date(), who.email, idea, _inWords(idea)]);
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
    sh.getRange(row, C_SHOWN).setFontWeight('bold');
    sh.getRange(row, C_EMAIL).setFontColor(MUTED).setFontSize(9.5);
    sh.getRange(row, C_YEAR).setHorizontalAlignment('center');
    sh.getRange(row, C_ROLE).setHorizontalAlignment('center');
    sh.getRange(row, C_JOINED).setNumberFormat('d mmm yyyy').setHorizontalAlignment('center');
    sh.getRange(row, C_NOTE).setWrap(true);
    sh.setRowHeight(row, 26);
    if (lastCol >= MEET_COL) sh.getRange(row, MEET_COL, 1, lastCol - MEET_COL + 1).insertCheckboxes().setHorizontalAlignment('center');
    if (!String(sh.getRange(row, C_JOINED).getValue()).trim()) sh.getRange(row, C_JOINED).setValue(new Date());
    _years(sh);
  } catch (e) {}
}
function _schoolAccount(email) {
  var at = String(email || '').split('@')[1] || '';
  return DOMAINS.indexOf(at) >= 0;
}

/* A script cannot ask its own address the way a stranger does — Google answers its own
   machinery 404 — so the only honest proof that the website can read this is the website having
   read it. Every request writes the time into Settings, at most once every five minutes. */
function _noteRead(from) {
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get('noted')) return;
    cache.put('noted', '1', 300);
    var when = Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'd MMM HH:mm');
    _putSetting(S_READ, when + '  ·  ' + (String(from || '').slice(0, 60) || 'somewhere') + '  ·  ' + CODE_STAMP);
  } catch (e) {}
}
/* how long ago, in words, from what _noteRead wrote */
function _readAge() {
  var v = String(_setting(S_READ) || '');
  if (!v) return null;
  var m = /^(\d{1,2}) (\w{3}) (\d{2}):(\d{2})/.exec(v);
  if (!m) return { text: v, minutes: -1, stamp: '' };
  var now = new Date(), MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var d = new Date(now.getFullYear(), MON.indexOf(m[2]), Number(m[1]), Number(m[3]), Number(m[4]));
  if (d > now) d = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
  var mins = Math.round((now - d) / 60000);
  var st = /·\s*([^·]+)$/.exec(v);
  return { text: v, minutes: mins, stamp: st ? st[1].trim() : '' };
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
  var past = reg.meetings.filter(function (m) { return m.over; });
  past.sort(function (a, b) { return b.date - a.date; });          /* newest first */
  /* Two members called Henry are both "Henry" on the page, and nobody can tell which tally is
     whose. They are told apart by the Korean name, or by the given name they do not go by — and
     never by the surname, which is the one thing this page must not carry. */
  var shared = {};
  reg.members.forEach(function (p) {
    var k = String(p.name || '').toLowerCase();
    shared[k] = (shared[k] || 0) + 1;
  });
  var next = _next(reg);
  var out = {
    ok: true,
    next: next ? { date: _stamp(next.date, tz), time: _hasTime(next.date), plan: next.plan,
                   ends: _stamp(_endOf(next.date), tz) } : null,
    now: _stamp(new Date(), tz),
    meetings: past.map(function (m) {
      var came = 0; reg.members.forEach(function (p) { if (p.marks[reg.meetings.indexOf(m)]) came++; });
      return { date: _stamp(m.date, tz), time: _hasTime(m.date), plan: m.plan, came: came };
    }),
    members: reg.members.map(function (p) {
      return { name: _apart(p, shared), year: p.year, staff: !!p.staff, role: p.role || '',
               present: past.map(function (m) { return !!p.marks[reg.meetings.indexOf(m)]; }) };
    }),
    votes: {}, mine: [], member: false
  };
  out.stamp = CODE_STAMP;
  if (who) {
    out.name = who.given || who.name;
    out.member = reg.members.some(function (p) { return p.email === who.email; });
    out.officer = _isOfficer(who.email);
    out.chair = out.officer;         /* the old name, so a page and a script deployed minutes apart agree */
    out.staff = _isStaff(who.email);
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
/* meet-a-vet → Meet a vet: a column of slugs reads as a column of ideas */
function _inWords(slug) {
  var w = String(slug || '').replace(/-/g, ' ').trim();
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : '';
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
    .setBackground('#EDF3F5').setFontColor(MUTED).setFontStyle('italic').setFontSize(9.5).setWrap(true).setHorizontalAlignment('center');
  var last = sh.getLastRow();
  if (last >= DATA_ROW) sh.getRange(DATA_ROW, col, last - DATA_ROW + 1, 1).insertCheckboxes().setHorizontalAlignment('center');
  _dressMeetingCol(sh, col);
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

  /* What the website has actually done beats what this script can find out by asking. */
  var read = _readAge();
  var fresh = read && read.minutes >= 0 && read.minutes < 60 * 24 * 3;

  /* 1. what the website is calling, if it says */
  if (theirs) {
    var a = _ask(theirs);
    if (!a.ok && fresh) {
      _say('Working',
        '<p><span class="ok">The website read the register ' + _ago(read.minutes) + '.</span></p>' +
        '<p class="note">That is the proof that matters: the page asked this sheet, and this sheet answered. ' +
        'Google will not let a script ask its own address without signing in — it answers itself 404 — so the check below cannot see it, and that is normal.</p>' +
        '<p class="note">Settings ▸ <i>Last read by the website</i>: ' + read.text + '</p>' +
        _staleNote(read.stamp), 440, 'Working: the website read the register ' + _ago(read.minutes) + '.');
      return;
    }
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

function _ago(mins) {
  if (mins < 2) return 'a moment ago';
  if (mins < 60) return mins + ' minutes ago';
  if (mins < 60 * 36) return Math.round(mins / 60) + ' hours ago';
  return Math.round(mins / 1440) + ' days ago';
}
function _cannotRead(code, theirs, mine) {
  var url = theirs || mine;
  var read = _readAge();
  _say('The website cannot read this yet',
    '<p><span class="warn">Google answered ' + (code || '—') + '</span> to a request carrying no sign-in — which is how the page asks.</p>' +
    (read ? '<p class="note">The last time the website did read this sheet: ' + read.text + '. If that was recent, the page is fine and this check simply cannot see it — a script may not ask its own address without signing in.</p>' : '') +
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
/* Who the chair is, picked off the register rather than typed. It is kept in Settings ▸ Chair,
   which is a plain cell anybody can read or correct by hand; this is only the easy way in. What
   it buys them is the chair's desk on the website — see _isChair. */
/* Make exactly these people the chair, and nobody else. Written on the register, because that
   is where you can see it; Settings carries only the ones with no row to write it in. Every way
   of clearing it comes through here too, so a chair cannot be dropped in one place and left
   behind in the other. A secretary is never touched. */
function _setChair(picked) {
  var sh = SpreadsheetApp.getActive().getSheetByName(T_REG);
  var wanted = {};
  picked.forEach(function (p) { wanted[p.email] = true; });
  if (sh) {
    _register(new Date()).members.forEach(function (p) {
      if (wanted[p.email]) { if (p.role !== 'Chair') sh.getRange(p.row, C_ROLE).setValue('Chair'); }
      else if (p.role === 'Chair') sh.getRange(p.row, C_ROLE).setValue('');
    });
  }
  _putSetting(S_CHAIR, picked.filter(function (p) { return p.onRegister === false; })
                             .map(function (p) { return p.email; }).join(', '));
  _flush();
}

/* Everybody who could be an officer: the society's own members, and the teachers of its
   Google Classroom class who are not on the register yet — which is where a chair or a secretary
   usually is first, because that is how they are given the class. */
function _officerChoices() {
  var out = [], seen = {};
  _register(new Date()).members.forEach(function (p) {
    if (p.staff || !p.email) return;
    seen[p.email] = true;
    out.push({ email: p.email, label: p.name + (p.year ? '  (' + p.year + ')' : ''), role: p.role || '' });
  });
  try {
    var course = _courseOr(false);
    if (course && _classroomReady(false)) {
      _classTeachers(course).forEach(function (t) {
        if (seen[t.email] || _isStaff(t.email)) return;
        seen[t.email] = true;
        out.push({ email: t.email, label: (t.name || t.email) + '  \u2014 teaches the class, not on the register yet', role: '' });
      });
    }
  } catch (e) {}
  return out;
}

/* Make these two the officers and nobody else. Anybody chosen who is not on the register is put
   on it first \u2014 an officer who is not a member cannot be marked present, and being marked
   present is most of what the register is for. Called from the window below and testable on its
   own. */
function setOfficers(chair, secretary) {
  var sh = SpreadsheetApp.getActive().getSheetByName(T_REG);
  if (!sh) return 'There is no Register tab yet. Menu \u25B8 Set the sheet up, or tidy it.';
  chair = String(chair || '').trim() ? _email(chair) : '';
  secretary = String(secretary || '').trim() ? _email(secretary) : '';
  if (chair && !_schoolAccount(chair)) return 'That chair is not a school address.';
  if (secretary && !_schoolAccount(secretary)) return 'That secretary is not a school address.';
  if (chair && chair === secretary) return 'The chair and the secretary cannot be the same person.';

  /* on the register first, so there is a row to write the role on and a box to tick */
  var added = [];
  [chair, secretary].forEach(function (e) {
    if (!e || _rowOf(sh, C_EMAIL, e)) return;
    var t = null;
    try {
      var c = _courseOr(false);
      if (c && _classroomReady(false)) t = _classTeachers(c).filter(function (x) { return x.email === e; })[0];
    } catch (err) {}
    var shown = (t ? _preferred(t.given, t.name) : '') || e.split('@')[0];
    sh.appendRow(['', (t && t.given) || '', (t && t.family) || '', shown, e,
                  _isStaff(e) ? 'Teacher' : '', '', new Date(), '']);
    _dressRow(sh, sh.getLastRow());
    added.push(shown);
  });

  /* exactly these two hold an office; anything else anybody wrote there is left as it is */
  var names = {};
  _register(new Date()).members.forEach(function (p) {
    if (p.email && p.email === chair) { names.chair = p.name; if (p.role !== 'Chair') sh.getRange(p.row, C_ROLE).setValue('Chair'); }
    else if (p.email && p.email === secretary) { names.secretary = p.name; if (p.role !== 'Secretary') sh.getRange(p.row, C_ROLE).setValue('Secretary'); }
    else if (_officer(p.role)) sh.getRange(p.row, C_ROLE).setValue('');
  });
  _putSetting(S_CHAIR, '');            /* the register says it now, so nothing is said twice */
  _years(sh);
  _flush();

  var said = [];
  said.push('Chair: ' + (names.chair || (chair ? chair : 'nobody')));
  said.push('Secretary: ' + (names.secretary || (secretary ? secretary : 'nobody')));
  if (added.length) said.push(added.join(' and ') + ' put on the register, so they can be marked present.');
  _log('Who runs it \u2014 ' + said.join(' \u00B7 '), _me());
  return said.join('. ') + (added.length ? '' : '.');
}

/* The window Daniel asked for: pick the two, press Save. Falls back to the old prompt if no
   drawn window will open on this machine. */
function officers() {
  var choices = _officerChoices();
  var chair = '', secretary = '';
  choices.forEach(function (c) { if (c.role === 'Chair') chair = c.email; if (c.role === 'Secretary') secretary = c.email; });
  var opts = function (sel) {
    return '<option value="">\u2014 nobody \u2014</option>' + choices.map(function (c) {
      return '<option value="' + c.email + '"' + (c.email === sel ? ' selected' : '') + '>' + c.label + '</option>';
    }).join('');
  };
  var body =
    '<p class="note">The chair and the secretary get the desk on the society\u2019s website: they can add a meeting and tell the class from there, without needing any permission of their own. Anybody chosen here who is not on the register is put on it, so they can be marked present like everybody else.</p>' +
    (choices.length ? '' : '<p class="warn">Nobody to choose from yet. Somebody has to put their name down on the website first, or be a teacher of the Classroom class.</p>') +
    '<p class="eyebrow" style="margin-top:14px">Chair</p><select id="c" style="width:100%;box-sizing:border-box;padding:7px 8px;margin-top:4px;font:inherit">' + opts(chair) + '</select>' +
    '<p class="eyebrow" style="margin-top:12px">Secretary</p><select id="t" style="width:100%;box-sizing:border-box;padding:7px 8px;margin-top:4px;font:inherit">' + opts(secretary) + '</select>' +
    '<div class="row" style="margin-top:14px"><button class="btn" id="go">Save</button></div>' +
    '<p class="note" id="s"></p>' +
    '<script>document.getElementById("go").addEventListener("click",function(){' +
    'var s=document.getElementById("s");s.textContent="Working\u2026";this.disabled=true;' +
    'var b=this;google.script.run.withSuccessHandler(function(t){s.textContent=t;b.disabled=false})' +
    '.withFailureHandler(function(e){s.textContent=e.message;b.disabled=false})' +
    '.setOfficers(document.getElementById("c").value,document.getElementById("t").value)});<\/script>';
  if (_say('Who runs the society', body, 420)) return;
  chooseChair();                       /* no window here: the plain list, chair only */
}

function chooseChair() {
  var people = _register(new Date()).members.filter(function (p) { return !p.staff && p.email; });
  var holds = people.filter(function (p) { return p.role === 'Chair'; }).map(function (p) { return p.name; })
                .concat(String(_setting(S_CHAIR) || '').split(/[\s,;]+/).filter(String));
  var ui = SpreadsheetApp.getUi();
  var list = people.map(function (p, i) {
    return (i + 1) + '.  ' + p.name + (p.year ? '  (' + p.year + ')' : '') +
           (p.role ? '  \u2014 ' + p.role : '');
  }).join('\n');
  /* The chair may not have put their name down yet, and a society should not have to wait for
     that before it has a chair. So an address does as well as a number, and whoever holds it is
     named above the list whether or not they are on it. */
  var head = (holds.length ? 'The chair now: ' + holds.join(', ') + '\n\n' : '') +
             (people.length ? list + '\n\nType the number, or their school address if they are not on the list yet.'
                            : 'Nobody on the register has an address against them yet.\n\nType the chair\u2019s school address.');
  var a = ui.prompt('Who is the chair?',
    head + ' Two of them, separated by a comma, if the chair is shared. ' +
    'Leave it empty for no chair at all. (The Secretary is the Role column\u2019s other choice, ' +
    'and this never changes it.)', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;

  var txt = String(a.getResponseText()).trim();
  if (!txt) {
    _setChair([]);
    _log('No chair is named now', _me());
    _toast('Nobody is the chair now. The secretary and the teachers can still run it.');
    return;
  }
  var picked = [], bad = [], seen = {};
  var take = function (who) { if (!seen[who.email]) { seen[who.email] = true; picked.push(who); } };
  txt.split(/[\s,;]+/).filter(String).forEach(function (t) {
    if (/^\d+$/.test(t)) {                                   /* a number must be one on the list */
      var n = +t;
      if (n >= 1 && n <= people.length) take(people[n - 1]); else bad.push(t);
      return;
    }
    var e = _email(t);                                       /* a bare name becomes a pupil address */
    if (!_schoolAccount(e)) { bad.push(t); return; }
    var known = people.filter(function (p) { return p.email === e; })[0];
    take(known || { name: e, email: e, onRegister: false });
  });
  if (bad.length || !picked.length) { _ui('That was not one of the numbers on the list: ' + (bad.join(', ') || txt)); return; }

  _setChair(picked);
  var names = picked.map(function (p) { return p.name; }).join(' and ');
  var strangers = picked.filter(function (p) { return p.onRegister === false; });
  _log('The chair is ' + names, _me());
  _toast(names + ' can now run the society from the website: sign in there and the desk appears.' +
    (strangers.length ? ' They are not on the register yet \u2014 put their name down on the website too, so they show up with everybody else.' : ''));
}

/* The teachers of the Classroom class, offered for the register — the ones you choose, not all
   of them, because a class often carries a head of department or a cover teacher who has nothing
   to do with the society.

   One thing to be careful of: a Classroom "teacher" is not always a member of staff. The chair of
   this society is a teacher of its class, on a pupil account. Such a person is added as the pupil
   they are, with the Year left empty for you to set, rather than being quietly made staff — the
   register decides who is staff by the address, and being staff hides somebody from the members
   list and out of the class roster. */
function addTeachers() {
  if (!_classroomReady(true)) return;
  var course = _courseOr(true); if (!course) return;
  var list;
  try { list = _classTeachers(course); }
  catch (e) {
    if (_isScopeTrouble(e)) { _say('One permission short', _scopeHelp('see who teaches the class'), 560); return; }
    _say('Google would not say', '<p class="warn">' + e.message + '</p>' +
      '<p class="note">Only a teacher of the class may see who teaches it. If you are the chair, ask Dr Mompel to run this.</p>', 300);
    return;
  }
  if (!list.length) { _say('Nobody to add', '<p>Google says this class has no teachers it will tell us about.</p>', 260); return; }

  var sh = SpreadsheetApp.getActive().getSheetByName(T_REG);
  if (!sh) { _ui('There is no Register tab yet. Menu \u25B8 Set the sheet up, or tidy it.'); return; }
  var on = {};
  _register(new Date()).members.forEach(function (p) { if (p.email) on[p.email] = true; });

  var ui = SpreadsheetApp.getUi();
  var lines = list.map(function (t, i) {
    return (i + 1) + '.  ' + (t.name || t.email) + '  ' + t.email +
      (on[t.email] ? '   \u2014 on the register already' : (_isStaff(t.email) ? '' : '   \u2014 a pupil account'));
  }).join('\n');
  var a = ui.prompt('Which of them go on the register?',
    lines + '\n\nType the numbers, separated by commas. Leave it empty to add nobody.',
    ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var txt = String(a.getResponseText()).trim();
  if (!txt) { _toast('Nobody added.'); return; }

  var picked = [], bad = [], seen = {};
  txt.split(/[\s,;]+/).filter(String).forEach(function (t) {
    var n = /^\d+$/.test(t) ? +t : 0;
    if (!(n >= 1 && n <= list.length)) { bad.push(t); return; }
    var who = list[n - 1];
    if (!seen[who.email]) { seen[who.email] = true; picked.push(who); }
  });
  if (bad.length) { _ui('That was not one of the numbers on the list: ' + bad.join(', ')); return; }

  var added = [], already = [], pupils = [];
  picked.forEach(function (t) {
    if (on[t.email]) { already.push(t.name || t.email); return; }
    var staff = _isStaff(t.email);
    var shown = (staff ? (t.name || '') : _preferred(t.given, t.name)) || t.email.split('@')[0];
    sh.appendRow(['', t.given || '', t.family || '', shown, t.email, staff ? 'Teacher' : '', '', new Date(), '']);
    _dressRow(sh, sh.getLastRow());
    on[t.email] = true;
    added.push(shown);
    if (!staff) pupils.push(shown);
  });
  _years(sh);
  _flush();
  _log('From Classroom: ' + (added.length ? added.join(', ') : 'nobody') + ' put on the register', _me());

  var said = added.length ? added.join(', ') + ' added.' : 'Nobody new to add.';
  if (already.length) said += ' ' + already.join(', ') + ' was on the register already.';
  if (pupils.length) said += ' ' + pupils.join(', ') + ' is on a pupil account, so set their year \u2014 they are in the class as a teacher, not a member of staff.';
  _ui(said);
}

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
  "    \"https://www.googleapis.com/auth/script.container.ui\",",
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
/* Who teaches the class, with their names. Used twice: to keep a teacher who is on the register
   from being invited as a student of their own class, and to offer them for the register. */
function _classTeachers(course) {
  var out = [], token = null;
  do {
    var t = Classroom.Courses.Teachers.list(course, { pageSize: 100, pageToken: token }) || {};
    ((t.teachers) || []).forEach(function (te) {
      var pr = te.profile || {}, nm = pr.name || {};
      var e = String(pr.emailAddress || '').toLowerCase();
      if (e) out.push({ id: te.userId, email: e, name: nm.fullName || '', given: nm.givenName || '', family: nm.familyName || '' });
    });
    token = t.nextPageToken;
  } while (token);
  return out;
}

function _classNow(course) {
  var out = { students: [], teachers: {}, teachersKnown: false, invited: {}, pending: [] }, token = null;
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
    ((q.invitations) || []).forEach(function (iv) {
      var who = String(iv.userId || '').toLowerCase();
      out.invited[who] = true;
      out.pending.push({ id: iv.id, who: who });
    });
    token = q.nextPageToken;
  } while (token);
  /* The class's TEACHERS. A member of the society may well be one of them — the chair of this
     one is — and Google will not have the same person as a teacher and a student of the same
     class. Without this they are invisible here, so they look like somebody who is not in the
     class at all, and every sync offers to invite them again. If Google will not list them we
     carry on without: better a sync that works as it used to than one that will not run. */
  try {
    _classTeachers(course).forEach(function (t) { out.teachers[t.email] = true; });
    out.teachersKnown = true;
  } catch (e) { _log('Could not list the class teachers: ' + e.message, ''); }
  return out;
}
/* what would change, without changing anything */
function classroomPlan() {
  var course = _courseOr(false); if (!course || !_classroomReady(false)) return null;
  var reg = _register(new Date());
  var now = _classNow(course);
  var have = {};
  now.students.forEach(function (st) { if (st.email) have[st.email] = st; });
  var want = {}, wantList = [], asTeacher = [], asTeacherWanted = [];
  reg.members.forEach(function (p) {
    if (p.staff || !p.email) return;                    /* teachers are not students of the class */
    if (want[p.email]) return;
    want[p.email] = true;                               /* on the register: never "take out" */
    /* already in the class, on the other side of it: leave them exactly alone */
    if (now.teachers[p.email]) { asTeacher.push({ email: p.email, name: p.name, role: p.role }); return; }
    /* An officer belongs on the TEACHER side of the class: that is how a chair or a secretary
       gets to post in it and see who is there. Offering them a student's invitation would put
       them on the wrong side, and Google will not then let them be moved without being taken
       out of it first. */
    if (_officer(p.role)) {
      asTeacherWanted.push({ email: p.email, name: p.name, role: p.role, wasStudent: !!have[p.email] });
      return;
    }
    wantList.push({ email: p.email, name: p.name });
  });
  var plan = { course: course, invite: [], teachers: asTeacherWanted, remove: [], already: 0,
               pending: 0, pendingList: [], asTeacher: asTeacher, name: '', link: '' };
  wantList.forEach(function (p) {
    if (have[p.email]) { plan.already++; return; }
    if (now.invited[p.email]) { plan.pending++; plan.pendingList.push(p); return; }
    plan.invite.push(p);
  });
  var me = _me().toLowerCase();
  now.students.forEach(function (st) {
    if (st.email && !want[st.email] && st.email !== me) plan.remove.push(st);
  });
  plan.invitations = now.pending;
  try {
    var c = Classroom.Courses.get(course) || {};
    plan.name = c.name || '';
    plan.link = c.alternateLink || '';
  } catch (e) {}
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
  var where = '<p class="eyebrow">This class</p><p style="font:600 15px/1.3 Georgia,serif;color:#EDF4F8;margin:0 0 4px">' +
    (plan.name || 'the class in Settings B3') + '</p>' +
    (plan.link ? '<p class="note"><a href="' + plan.link + '" target="_blank" style="color:#F5A623">open it in Google Classroom \u2197</a> — check it is the right one before you press anything.</p>'
               : '<p class="note">id ' + plan.course + '</p>');
  var body = where +
    '<p style="margin-top:12px"><b>To invite</b> — on the register, not in the class</p>' + list(plan.invite, 'Nobody. Everyone on the register is in the class already.') +
    '<p style="margin-top:12px"><b>To take out</b> — in the class, not on the register</p>' + list(plan.remove, 'Nobody.') +
    (plan.teachers.length ? '<p style="margin-top:12px"><b>To ask to teach it</b> \u2014 the chair and the secretary belong on the teacher side' +
      (plan.teachers.some(function (p) { return p.wasStudent; }) ? ', and one of them has to come off the student list first' : '') +
      '</p>' + list(plan.teachers, '') : '') +
    (plan.asTeacher.length ? '<p style="margin-top:12px"><b>In the class already, as teachers of it</b> \u2014 left alone</p>' + list(plan.asTeacher, '') : '') +
    (plan.pending ? '<p style="margin-top:12px"><b>Invited, not yet accepted</b> — they are in Google Classroom under <i>Invited</i> until they press Join</p>' + list(plan.pendingList, '') : '') +
    '<p class="note">' + plan.already + ' already in · teachers are left alone.</p>' +
    '<div class="row" style="margin-top:12px">' +
    (plan.invite.length ? '<button class="btn" id="inv">Invite the ' + plan.invite.length + ' new one' + (plan.invite.length === 1 ? '' : 's') + '</button>' : '') +
    (plan.remove.length ? '<button class="btn quiet" id="both">Invite, and take out the ' + plan.remove.length + '</button>' : '') +
    (plan.teachers.length ? '<button class="btn" id="tea">Ask the ' + plan.teachers.length + ' to teach it</button>' : '') +
    (plan.pending ? '<button class="btn quiet" id="undo">Take back the ' + plan.pending + ' invitation' + (plan.pending === 1 ? '' : 's') + '</button>' : '') +
    '</div><p class="note" id="s"></p>' +
    '<script>function go(rm){var s=document.getElementById("s");s.textContent="Working\u2026";' +
    'Array.prototype.forEach.call(document.querySelectorAll("button"),function(b){b.disabled=true});' +
    'google.script.run.withSuccessHandler(function(t){s.textContent=t})' +
    '.withFailureHandler(function(e){s.textContent=e.message})' +
    '.classroomApply(rm)}' +
    'var i=document.getElementById("inv"); if(i)i.addEventListener("click",function(){go(false)});' +
    'var b=document.getElementById("both"); if(b)b.addEventListener("click",function(){go(true)});' +
    'var t=document.getElementById("tea"); if(t)t.addEventListener("click",function(){var s=document.getElementById("s");' +
    's.textContent="Working\u2026";Array.prototype.forEach.call(document.querySelectorAll("button"),function(b){b.disabled=true});' +
    'google.script.run.withSuccessHandler(function(x){s.textContent=x})' +
    '.withFailureHandler(function(e){s.textContent=e.message}).classroomApplyTeachers()});' +
    'var u=document.getElementById("undo"); if(u)u.addEventListener("click",function(){var s=document.getElementById("s");' +
    's.textContent="Working\u2026";google.script.run.withSuccessHandler(function(t){s.textContent=t})' +
    '.withFailureHandler(function(e){s.textContent=e.message}).classroomCancel()});<\/script>';
  if (_say('Who is in the class', body, 560)) return;

  /* No drawn page here, so ask it plainly — and be able to do the work either way. */
  var names = function (people) { return people.map(function (p) { return '  \u2022 ' + (p.name ? p.name + '  ' + p.email : p.email); }).join('\n'); };
  var head = 'Class: ' + (plan.name || plan.course) + '\n' + (plan.link ? plan.link + '\n' : '');
  if (plan.invite.length) {
    if (_askYesNo('Invite ' + plan.invite.length + ' to ' + (plan.name || 'the class') + '?',
        head + '\nThey are on the register and not in the class:\n' + names(plan.invite) +
        '\n\nGoogle sends each an invitation; they are in the class once they press Join.')) {
      _ui(classroomApply(false));
    }
  } else {
    _ui(head + '\nNobody to invite: everyone on the register is in the class already' +
        (plan.pending ? ', or has an invitation waiting (' + plan.pending + ').' : '.'));
  }
  if (plan.remove.length) {
    if (_askYesNo('Take ' + plan.remove.length + ' out of ' + (plan.name || 'the class') + '?',
        head + '\nThey are in the class and not on the register:\n' + names(plan.remove) +
        '\n\nThis removes them straight away. It cannot be undone from here.')) {
      _ui(classroomApply(true));
    }
  }
  if (plan.teachers.length) {
    var movers = plan.teachers.filter(function (p) { return p.wasStudent; });
    if (_askYesNo('Ask ' + plan.teachers.length + ' to teach ' + (plan.name || 'the class') + '?',
        head + '\nThe chair and the secretary belong on the teacher side of the class:\n' + names(plan.teachers) +
        (movers.length ? '\n\n' + movers.length + ' of them is on the student list and has to come off it first: ' +
          'Google will not have one person as both.' : '') +
        '\n\nEach is a teacher of it once they press Join.')) {
      _ui(classroomApplyTeachers());
    }
  }
  if (plan.pending && _askYesNo('Take back ' + plan.pending + ' invitation(s)?',
      head + '\nInvited, not yet accepted:\n' + names(plan.pendingList) +
      '\n\nTake those invitations back?')) {
    _ui(classroomCancel());
  }
}
/* the plan is worked out again here: what a dialog was told a minute ago is not authority */
/* Put the society's officers on the teacher side of the class. Google will not have one person
   as both a teacher and a student of the same class, so somebody made an officer after they had
   already joined as a student has to stop being one first — that is the only thing here that
   takes anybody out of anything, and it is why it is its own button with its own words. */
function classroomApplyTeachers() {
  var plan = classroomPlan();
  if (!plan) return 'No class chosen.';
  var course = plan.course, asked = 0, moved = 0, failed = [];
  plan.teachers.forEach(function (p) {
    try {
      if (p.wasStudent) { Classroom.Courses.Students.remove(course, p.email); moved++; }
      Classroom.Invitations.create({ courseId: course, userId: p.email, role: 'TEACHER' });
      asked++;
    } catch (e) { failed.push(p.email + ': ' + e.message); }
  });
  var said = asked + ' asked to teach ' + (plan.name || 'the class') +
    (moved ? ', ' + moved + ' taken off the student list first' : '') +
    (failed.length ? ', ' + failed.length + ' would not' : '') + '.';
  _log('Classroom teachers: ' + said + ' [course ' + course + ']' + (failed.length ? ' (' + failed.join('; ') + ')' : ''), _me());
  return said + (failed.length ? ' See the Log tab.' : ' They are teachers of it once they press Join.');
}

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
  var to = plan.name ? ' to ' + plan.name : '';
  var said = invited + ' invited' + to + (alsoRemove ? ', ' + removed + ' taken out' : '') + (failed.length ? ', ' + failed.length + ' would not' : '') + '.';
  _log('Classroom roster: ' + said + ' [course ' + course + ']' + (failed.length ? ' (' + failed.join('; ') + ')' : ''), _me());
  return said + (failed.length ? ' See the Log tab.' : ' They are in that class under Invited until they press Join.');
}

/* an invitation can be taken back while it is still unanswered */
function classroomCancel() {
  var plan = classroomPlan();
  if (!plan) return 'No class chosen.';
  var want = {};
  plan.pendingList.forEach(function (p) { want[p.email] = true; });
  var gone = 0, failed = 0;
  (plan.invitations || []).forEach(function (iv) {
    if (!want[iv.who]) return;                       /* only the ones this sheet sent */
    try { Classroom.Invitations.remove(iv.id); gone++; } catch (e) { failed++; }
  });
  _log('Classroom roster: ' + gone + ' invitation(s) taken back [course ' + plan.course + ']', _me());
  return gone + ' invitation' + (gone === 1 ? '' : 's') + ' taken back' + (failed ? ', ' + failed + ' would not' : '') + '.';
}

/* ---------- triggers: installed once, by the teacher ----------
   An installable trigger runs as the person who installed it. That is what lets the chair tick
   one box and have the announcement go out under the teacher's name, and what lets any edit of
   the register reach the website at once. */
function installTriggers() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'onRegisterEdit' || f === 'postPending' || f === 'openPanel') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onRegisterEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('postPending').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('openPanel').forSpreadsheet(ss).onOpen().create();
  var who = _me();
  _say('Installed',
    '<p><span class="ok">Done.</span> Two things now work:</p>' +
    '<ul><li>the panel opens by itself whenever the sheet is opened</li>' +
    '<li>every edit reaches the website at once</li>' +
    '<li>when the chair presses <b>Tell the class</b>, the announcement goes out as <b>' + (who || 'you') + '</b> within five minutes</li></ul>' +
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
    /* a date typed straight into row 1 is a new meeting: give it the short format and a column
       wide enough for it, the same as the menu would */
    if (sh.getName() === T_REG && r.getRow() === 1 && r.getColumn() >= MEET_COL) {
      for (var j = 0; j < r.getNumColumns(); j++) _dressMeetingCol(sh, r.getColumn() + j);
      return;
    }
  } catch (err) { _log('Trigger error: ' + err.message, ''); }
}
