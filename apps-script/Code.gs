/* ============================================================
   Veterinary Society — who is interested, and what they voted for
   ------------------------------------------------------------
   This lives in the society's OWN Google Sheet (Extensions ▸ Apps Script), deployed as a web
   app. The page at mompel226.github.io/veterinary-society/ posts to it. It keeps two tabs:
     Interested   when · name · email · year · what they would like to do
     Votes        when · email · idea
   and answers with the list of people (names and years only — never an address), the vote
   count for each idea, and, for a signed-in caller, which ideas are theirs.

   SETTING IT UP (the README says the same in more words):
     1. Paste the Client ID below — the same one the labs use.
     2. Run ▸ setup, once, and accept the permissions.
     3. Deploy ▸ New deployment ▸ Web app ▸ execute as Me, access Anyone ▸ Deploy.
     4. Put the /exec address into config.js on the site.
   ============================================================ */
var CLIENT_ID = '';                 /* EDIT: the Google Client ID, e.g. 7490…ddf.apps.googleusercontent.com */
var T_PEOPLE = 'Interested', T_VOTES = 'Votes';

function setup() {
  var ss = SpreadsheetApp.getActive();
  _tab(ss, T_PEOPLE, ['When', 'Name', 'Email', 'Year', 'What they would like to do']);
  _tab(ss, T_VOTES,  ['When', 'Email', 'Idea']);
  SpreadsheetApp.getUi().alert('Ready. Now Deploy ▸ New deployment ▸ Web app.');
}
function _tab(ss, name, head) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.appendRow(head);
  sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  return sh;
}

function doPost(e) {
  try { return _json(_handle(JSON.parse((e.postData && e.postData.contents) || '{}'))); }
  catch (err) { return _json({ ok: false, why: String(err) }); }
}
function doGet(e) { return _json(_handle({ action: ((e && e.parameter) || {}).action || 'list' })); }

function _handle(d) {
  var action = String(d.action || 'list');
  if (action === 'list') return _list(null);
  if (!CLIENT_ID) return { ok: false, why: 'sign-in is not set up' };
  var who = _whoIs(d.token);
  if (!who) return { ok: false, why: 'not signed in' };
  if (action === 'me') return _list(who);

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, why: 'busy — try again' }; }
  try {
    var ss = SpreadsheetApp.getActive();
    if (action === 'interest') {
      var sh = _tab(ss, T_PEOPLE, ['When', 'Name', 'Email', 'Year', 'What they would like to do']);
      var row = _rowOf(sh, 3, who.email);
      var vals = [new Date(), who.name, who.email, String(d.year || '').slice(0, 12), String(d.note || '').slice(0, 300)];
      if (row) sh.getRange(row, 1, 1, vals.length).setValues([vals]); else sh.appendRow(vals);
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
      if (!found) vs.appendRow([new Date(), who.email, idea]);     /* a second press takes the vote back */
      return _list(who);
    }
    return { ok: false, why: 'unknown action' };
  } finally { lock.releaseLock(); }
}

/* names and years only; addresses stay in the sheet */
function _list(who) {
  var ss = SpreadsheetApp.getActive(), out = { ok: true, people: [], votes: {}, mine: [], interested: false };
  var sh = ss.getSheetByName(T_PEOPLE);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(function (r) {
      if (!r[1]) return;
      out.people.push({ name: String(r[1]), year: String(r[3] || ''), note: String(r[4] || ''), when: r[0] instanceof Date ? r[0].toISOString() : '' });
      if (who && String(r[2]).toLowerCase() === who.email) out.interested = true;
    });
  }
  var vs = ss.getSheetByName(T_VOTES);
  if (vs && vs.getLastRow() > 1) {
    vs.getRange(2, 2, vs.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var idea = String(r[1]); if (!idea) return;
      out.votes[idea] = (out.votes[idea] || 0) + 1;
      if (who && String(r[0]).toLowerCase() === who.email && out.mine.indexOf(idea) < 0) out.mine.push(idea);
    });
  }
  if (who) out.name = who.name;
  return out;
}
function _rowOf(sh, col, email) {
  var last = sh.getLastRow(); if (last < 2) return 0;
  var v = sh.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim().toLowerCase() === email) return i + 2;
  return 0;
}

/* Google signed the token; Google is asked to check its own signature. */
function _whoIs(idToken) {
  if (!CLIENT_ID || !idToken) return null;
  var res;
  try { res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true }); }
  catch (e) { return null; }
  if (res.getResponseCode() !== 200) return null;
  var t; try { t = JSON.parse(res.getContentText()); } catch (e) { return null; }
  if (String(t.aud) !== CLIENT_ID) return null;
  if (Number(t.exp) * 1000 < Date.now()) return null;
  if (String(t.email_verified) !== 'true') return null;
  return { email: String(t.email || '').trim().toLowerCase(), name: String(t.name || '') };
}
function _json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
