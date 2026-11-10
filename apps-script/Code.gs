/**
 * RO Task Tracker — Google Apps Script backend
 * (from _template-pwa-sheets; auth, sync and setup are the proven Loan CRM code)
 * Database: Google Sheets
 *
 * SETUP
 * 1. Open your Google Sheet -> Extensions -> Apps Script
 * 2. Delete everything, paste this file, Save. (Also paste appsscript.json: Project Settings ->
 *    tick "Show appsscript.json", then replace its contents.)
 * 3. Run the function `setup` once and approve permissions.
 *    It creates the tabs, preloads People / Branches / Categories, and the `rm` and `anmol`
 *    logins with random temporary PINs written in the Users tab. Each person picks their own
 *    PIN at first sign-in.
 * 4. Paste ImportContacts.gs (kept out of the public repo) as a second file and run
 *    `importContacts` once: it fills the mobile numbers in People and Branches.
 * 5. Deploy -> New deployment -> type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 *    Copy the /exec URL into js/config.js of the web app (or open the app with ?api=<url>).
 *
 * PINs: a PIN typed into the Users tab by hand (plain digits) is treated as
 * temporary — it works once and the person must then pick their own, which
 * is stored only as a salted hash.
 */

// ============================================================ CONFIG
var SHEET_ID = '';              // blank = the Sheet this script is bound to
var TOKEN_TTL_DAYS = 30;
var MAX_PIN_TRIES = 5;          // wrong PINs in a row before a login is locked
var LOCK_MINUTES = 15;          // ...for this long

var TABS = {
  TASKS: 'Tasks',
  LOG: 'TaskLog',
  PEOPLE: 'People',
  BRANCHES: 'Branches',
  CATS: 'Categories',
  USERS: 'Users',
  SETTINGS: 'Settings',
  ALOG: 'ActivityLog',
  REPEATS: 'Repeats'
};

// One column per field so the Sheet stays readable and filterable.
// toType: staff | branch | many. toId: person id or branch code. toCodes / replied: JSON, circulars only.
// Dates are kept as yyyy-mm-dd text so the phone and the Sheet never disagree about time zones.
var TASK_COLS = ['id', 'createdAt', 'updatedAt', 'toType', 'toId', 'toName', 'toCodes', 'replied', 'category', 'text', 'how',
  'givenOn', 'dueDate', 'status', 'doneOn', 'source', 'critical', 'snoozeTill', 'createdBy', 'deleted', 'repeatId'];
var TASK_TEXT_COLS = ['givenOn', 'dueDate', 'doneOn', 'snoozeTill', 'toId'];
// One row per history entry on a task: given, rem (reminded), ext (extended), note, done, reopen, snooze.
var LOG_COLS = ['id', 'createdAt', 'updatedAt', 'taskId', 'date', 'kind', 'note', 'createdBy', 'deleted'];
// nodal = branch codes this officer is nodal officer for (comma separated); categories = comma separated.
var PEOPLE_COLS = ['id', 'name', 'role', 'mobile', 'substitute', 'nodal', 'categories', 'active'];
var BRANCH_COLS = ['code', 'name', 'bmName', 'bmMobile', 'active'];
var CAT_COLS = ['group', 'category'];
// Repeating tasks: a template that creates a task every interval. freq: days | weeks | months | years, every n.
// anchorDay keeps the day of month for monthly / yearly repeats; leadDays = how many days before the due date the task appears.
var REPEAT_COLS = ['id', 'createdAt', 'updatedAt', 'toType', 'toId', 'toName', 'toCodes', 'category', 'text', 'how', 'source', 'critical',
  'freq', 'n', 'anchorDay', 'leadDays', 'nextDue', 'lastDue', 'active', 'createdBy', 'deleted'];

var USER_COLS = ['username', 'name', 'pin', 'role', 'mobile', 'active'];
var SETTING_COLS = ['key', 'value'];
var ALOG_COLS = ['at', 'by', 'action', 'entity', 'entityId', 'detail'];

// ============================================================ DEFAULTS
function defaultSettings_() {
  return {
    remindBefore: 1,                 // show a reminder this many days before the due date
    dueGap: 2,                       // default due date when giving a task: today + dueGap
    lang: 'en',                      // reminder text language: en | hi
    remindTime: '09:00',             // kept for the Google Tasks step
    sig: 'Regional Manager, RO Hazaribag',
    sigHi: 'क्षेत्रीय प्रबंधक, क्षेत्रीय कार्यालय हजारीबाग'
  };
}

function defaultUsers_() {
  var pin = function () { return String(100000 + Math.floor(Math.random() * 900000)); };
  return [
    ['rm', 'Regional Manager', "'" + pin(), 'Admin', '', 'TRUE'],
    ['anmol', 'Anmol', "'" + pin(), 'Admin', '', 'TRUE']
  ];
}

// The 40 branches of RO Hazaribag (staff list as on 30.09.2026). BM name and mobile come from ImportContacts.gs.
var BRANCH_LIST = [[313,'Bahera'],[314,'Chatra'],[315,'Gidhour'],[316,'Hunterganj'],[317,'Itkhori'],[318,'Mayurhand'],
  [319,'Mishrol'],[320,'Pandepura'],[321,'Pitiz'],[322,'Pratappur'],[323,'Shila'],[403,'Barhi'],[404,'Barkagaon'],
  [405,'Barkattha'],[406,'Bishnugarh'],[407,'Bishrampur (H)'],[408,'Chalkusha'],[409,'Chouparan'],[410,'Choutha'],
  [411,'Gorbanda'],[412,'Hazaribag'],[413,'Ichak'],[414,'Katkamdag'],[415,'Korrah Chowk'],[416,'Surajpura'],
  [417,'Turkabad'],[418,'Urimari'],[428,'Bariadih'],[429,'Khutta'],[430,'Koderma'],[431,'Parsabad'],
  [439,'Chattarmandu'],[440,'Gola'],[441,'Mandu Bazar'],[442,'Patratu'],[443,'Ramgarh Cantt'],[552,'Daru'],
  [556,'Dadpur'],[557,'Korambey'],[559,'Rampur']];

// RO staff from the work-allotment sheet; substitute and nodal branches from the nodal-officer list.
// [id, name, role, substitute id, nodal branch codes, categories]
var PEOPLE_LIST = [
  ['nahid','Nahid Iqbal','DO Compliance & Audit','ajit','430,313,323,316,320,405','STR,OTMS,CKYC,Nomination,Signature scanning,RMMC report,Re-KYC,GL reconciliation,Sundry / suspense,BRCL,e-VVR,Aadhaar-PAN de-dup,EDD,DEAF,RADAR,Audit compliance,WEBCAS'],
  ['vidya','Vidya Rani Tirkey','DO HR / Accounts','nahid','411,413,443,410,442,319','Staff data,Bills,LFC / LTC,Leave data,Casual labour bill,GST,TDS,CVS,Charges return to HO,Deceased claim,TA / HA,Staff account scrutiny'],
  ['pyali','Piyali Ghosh Roy','DO IT','pallavi','321,315,440,407,416,322','Digital,IT,ID modification,BCB,Charges return of branches,Duplicate STDR,Cyber mail'],
  ['shashi','Shashi Shekhar Kumar','DO CVE / FI','padma','412,415,403,314,414,439','Deposit,CVE,FI,FLC bill,Bank Sakhi incentive'],
  ['nivesh','Nivesh Kumar Upadhyay','Office Assistant','','','Deposit,NPS,SIP / lump sum,VKYC'],
  ['neha','Neha Gupta','Office Assistant','','','Cash management,Postage,Digital,RO transactions,DSE payment'],
  ['pallavi','Pallavi Kumari Saha','Credit-Compliance','','','Audit compliance,CPA,BMDP,BMMC,Review / renewal,Portal in-charge'],
  ['niraj','Niraj Kumar','DO NPA','vidya','408,417,428,317,406,418','Interest rate,EWS,KCC renewal,NPA,AUCA'],
  ['mahesh','Mahesh Kumar Labh','SM Admin','','','Lease agreement,Face-lifting,Branch shifting,RTI,Complaints'],
  ['aditya','Aditya Agarwal','PO · SME','','','SME loan,CGTMSE,PMEGP,PMFME,Review / renewal'],
  ['padma','Padma Upadhyay','PO · P-Segment','shashi','404,409,431,441,429,318','P-segment loan,CERSAI,RMDP return,GSCC'],
  ['ajit','Ajit Kumar','PO · Agri','kirti','559,556,557,552','Agri loan,PM Vishwakarma,CGFMU,AIF,SME Insta,Udyami / Lakhpati Didi,Agri portal'],
  ['kirti','Kirti Singh','Processing Officer','','','Bank Sakhi incentive,WSHG,KCC renewal'],
  ['mani','Mani Shankar Kumar','AMH Head','','','Review / renewal,Proposal TAT,BMDP'],
  ['deepak','Deepak Kumar Pathak','SM (Business)','','','Budget achievement,CVE,GSS,KCC renewal,NRLM renewal,Sourcing,NPA,BMDP,Portal monitoring'],
  ['mahipal','Mahipal Nayak','OSD','','','DEAF,HBTL sourcing,Soil note,Inoperative to operative'],
  ['binod','Binod Kumar Paswan','OSD','','','DEAF,HBTL sourcing,Soil note,Inoperative to operative']
];

// Categories of work, grouped as on the RO work-allotment sheet. Editable from the app afterwards.
var CAT_LIST = [
  ['Compliance & Audit', ['STR','OTMS','CKYC','Re-KYC','Nomination','Signature scanning','RMMC report','GL reconciliation','Sundry / suspense','BRCL','e-VVR','Aadhaar-PAN de-dup','EDD','DEAF','RADAR','Audit compliance','WEBCAS']],
  ['HR', ['Staff data','Leave data','LFC / LTC','TA / HA','Staff account scrutiny','Deceased claim','Casual labour bill']],
  ['Accounts', ['Bills','GST','TDS','CVS','Charges return to HO','Charges return of branches']],
  ['IT & Digital', ['Digital','IT','ID modification','BCB','Duplicate STDR','Cyber mail']],
  ['Deposit & FI', ['Deposit','CVE','FI','FLC bill','Bank Sakhi incentive','NPS','SIP / lump sum','VKYC','Inoperative to operative']],
  ['Cash & Office', ['Cash management','Postage','RO transactions','DSE payment']],
  ['Credit & AMH', ['SME loan','P-segment loan','Agri loan','Review / renewal','Proposal TAT','BMDP','BMMC','CPA','CERSAI','RMDP return','KCC renewal','NRLM renewal','WSHG','Interest rate']],
  ['Portals', ['CGTMSE','PMEGP','PMFME','GSCC','PM Vishwakarma','CGFMU','AIF','SME Insta','Agri portal','Portal in-charge','Portal monitoring']],
  ['NPA & Recovery', ['NPA','AUCA','EWS','Soil note']],
  ['Admin & Premises', ['Lease agreement','Face-lifting','Branch shifting','RTI','Complaints','Gifts & hospitality']],
  ['Business', ['Budget achievement','GSS','Sourcing','HBTL sourcing','Udyami / Lakhpati Didi']],
  ['Meetings & HO', ['Meeting','HO letter reply','Other']]
];

// ============================================================ SETUP
function setup() {
  var ss = ss_();
  var t = ensureTab_(ss, TABS.TASKS, TASK_COLS);
  TASK_TEXT_COLS.forEach(function (c) { t.getRange(2, TASK_COLS.indexOf(c) + 1, 2000, 1).setNumberFormat('@'); });
  var lg = ensureTab_(ss, TABS.LOG, LOG_COLS);
  lg.getRange(2, LOG_COLS.indexOf('date') + 1, 5000, 1).setNumberFormat('@');

  var pp = ensureTab_(ss, TABS.PEOPLE, PEOPLE_COLS);
  if (pp.getLastRow() < 2) {
    pp.getRange(2, 1, PEOPLE_LIST.length, PEOPLE_COLS.length).setValues(PEOPLE_LIST.map(function (p) {
      return [p[0], p[1], p[2], '', p[3], p[4], p[5], 'TRUE'];
    }));
  }
  pp.getRange(2, PEOPLE_COLS.indexOf('mobile') + 1, 200, 1).setNumberFormat('@');
  pp.getRange(2, PEOPLE_COLS.indexOf('nodal') + 1, 200, 1).setNumberFormat('@');

  var br = ensureTab_(ss, TABS.BRANCHES, BRANCH_COLS);
  if (br.getLastRow() < 2) {
    br.getRange(2, 1, BRANCH_LIST.length, BRANCH_COLS.length).setValues(BRANCH_LIST.map(function (b) { return [b[0], b[1], '', '', 'TRUE']; }));
  }
  br.getRange(2, BRANCH_COLS.indexOf('bmMobile') + 1, 200, 1).setNumberFormat('@');

  var ct = ensureTab_(ss, TABS.CATS, CAT_COLS);
  if (ct.getLastRow() < 2) writeCats_(CAT_LIST.map(function (g) { return { group: g[0], items: g[1] }; }));

  ensureTab_(ss, TABS.ALOG, ALOG_COLS);
  ensureRepeatsTab_(ss);

  var users = ensureTab_(ss, TABS.USERS, USER_COLS);
  var pins = null;
  if (users.getLastRow() < 2) {
    var first = defaultUsers_();
    users.getRange(2, 1, first.length, USER_COLS.length).setValues(first);
    pins = first.map(function (u) { return u[0] + ': ' + String(u[2]).replace("'", ''); });
    Logger.log('Logins created with temporary PINs — ' + pins.join('   '));
  }

  var settings = ensureTab_(ss, TABS.SETTINGS, SETTING_COLS);
  if (settings.getLastRow() < 2) writeSettings_(defaultSettings_());

  var s1 = ss.getSheetByName('Sheet1');
  if (s1 && ss.getSheets().length > 1 && s1.getLastRow() === 0) ss.deleteSheet(s1);

  if (!props_().getProperty('SECRET')) {
    props_().setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  props_().setProperty('SETUP_DONE', '1');
  props_().setProperty('MIGRATION', String(MIGRATIONS.length));
  Logger.log('Setup complete. Temporary PINs are in the Users tab. Run importContacts (ImportContacts.gs), then deploy as a Web app.');
  return { pins: pins, message: 'Setup complete.' };
}

// Runs setup automatically the first time the web app is called, in case it was skipped.
function ensureSetup_() {
  if (props_().getProperty('SETUP_DONE') === '1') return;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { if (props_().getProperty('SETUP_DONE') !== '1') setup(); }
  finally { lock.releaseLock(); }
}

// One-time changes to an existing Sheet, run in order on the next request after an update.
// A fresh setup already has them, so setup() marks them all as done. Never reorder or remove.
var MIGRATIONS = [
  // 1: repeating tasks (2026-11-10): repeatId column on Tasks, Repeats tab
  function () { var ss = ss_(); ensureTab_(ss, TABS.TASKS, TASK_COLS); ensureRepeatsTab_(ss); }
];
function ensureRepeatsTab_(ss) {
  var r = ensureTab_(ss, TABS.REPEATS, REPEAT_COLS);
  ['toId', 'nextDue', 'lastDue'].forEach(function (c) { r.getRange(2, REPEAT_COLS.indexOf(c) + 1, 500, 1).setNumberFormat('@'); });
  return r;
}
function runMigrations_() {
  var done = Number(props_().getProperty('MIGRATION') || 0);
  if (done >= MIGRATIONS.length) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    done = Number(props_().getProperty('MIGRATION') || 0);
    for (var i = done; i < MIGRATIONS.length; i++) {
      MIGRATIONS[i]();
      props_().setProperty('MIGRATION', String(i + 1));
    }
  } finally { lock.releaseLock(); }
}

function ensureTab_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var head = sh.getRange(1, 1, 1, cols.length).getValues()[0];
  if (head.join('|') !== cols.join('|')) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  }
  sh.getRange(1, 1, 1, cols.length)
    .setFontWeight('bold').setBackground('#3b0a45').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}

function props_() { return PropertiesService.getScriptProperties(); }
var SS_ = null;
function ss_() {
  return SS_ || (SS_ = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet());
}

// ============================================================ ROUTING
function doGet(e) {
  // Public health check. Counts only — never names or numbers.
  var n = 0;
  try { n = Math.max(0, ss_().getSheetByName(TABS.TASKS).getLastRow() - 1); } catch (err) {}
  return json_({ ok: true, service: 'RO Task Tracker API', version: 1, tasks: n });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    var action = req.action;
    ensureSetup_();
    runMigrations_();

    if (action === 'ping') return json_({ ok: true, time: new Date().toISOString() });
    if (action === 'login') return json_(login_(req));

    var user = verifyToken_(req.token);
    if (!user) return json_({ ok: false, error: 'AUTH', message: 'Session expired. Please log in again.' });

    switch (action) {
      case 'bootstrap':       return json_(bootstrap_(user, req.since));
      case 'saveTask':        lock.waitLock(20000); return json_(saveTask_(user, req.task, req.logs));
      case 'deleteTask':      lock.waitLock(20000); return json_(deleteTask_(user, req.id));
      case 'savePerson':      lock.waitLock(20000); return json_(savePerson_(user, req.person));
      case 'deletePerson':    lock.waitLock(20000); return json_(deletePerson_(user, req.id));
      case 'saveBranch':      lock.waitLock(20000); return json_(saveBranch_(user, req.branch));
      case 'deleteBranch':    lock.waitLock(20000); return json_(deleteBranch_(user, req.code));
      case 'saveCategories':  lock.waitLock(20000); return json_(saveCategories_(user, req.cats));
      case 'saveRepeat':      lock.waitLock(20000); return json_(saveRepeat_(user, req.repeat));
      case 'deleteRepeat':    lock.waitLock(20000); return json_(deleteRepeat_(user, req.id));
      case 'saveSettings':    lock.waitLock(20000); return json_(saveSettings_(user, req.settings));
      case 'saveUsers':       lock.waitLock(20000); return json_(saveUsers_(user, req.users, req.baseline));
      case 'changePin':       lock.waitLock(20000); return json_(changePin_(user, req.oldPin, req.newPin));
      default: return json_({ ok: false, error: 'UNKNOWN_ACTION', message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: 'SERVER', message: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================ AUTH
function hashPin_(pin, salt) {
  var secret = props_().getProperty('SECRET') || 'change-me';
  var raw = Utilities.computeHmacSha256Signature(salt + ':' + String(pin), secret);
  return raw.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function makePinHash_(pin) {
  var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  return 'h1$' + salt + '$' + hashPin_(pin, salt);
}
function isTempPin_(stored) { return String(stored || '').indexOf('h1$') !== 0; }
function pinMatches_(stored, pin) {
  stored = String(stored == null ? '' : stored).trim();
  pin = String(pin == null ? '' : pin).trim();
  if (!stored || !pin) return false;
  if (isTempPin_(stored)) return stored === pin;
  var parts = stored.split('$');
  return parts.length === 3 && hashPin_(pin, parts[1]) === parts[2];
}
function pinVersion_(stored) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(stored || ''));
  return Utilities.base64EncodeWebSafe(raw).slice(0, 10);
}

function findUser_(username) {
  username = String(username || '').trim().toLowerCase();
  var rows = readTab_(TABS.USERS, USER_COLS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].username).trim().toLowerCase() === username) return { row: i + 2, u: rows[i] };
  }
  return null;
}
function publicUser_(u) {
  return { username: String(u.username).trim().toLowerCase(), name: String(u.name || ''), role: u.role === 'Admin' ? 'Admin' : 'Staff' };
}

function login_(req) {
  var username = String(req.username || '').trim().toLowerCase();
  var pin = String(req.pin || '').trim();
  if (!username || !pin) return { ok: false, error: 'BAD_INPUT', message: 'Enter username and PIN.' };

  var cache = CacheService.getScriptCache();
  var key = 'fails_' + username;
  var fails = Number(cache.get(key) || 0);
  if (fails >= MAX_PIN_TRIES) {
    return { ok: false, error: 'LOCKED', message: 'Too many wrong PINs. Try again in ' + LOCK_MINUTES + ' minutes.' };
  }

  var found = findUser_(username);
  if (!found) return { ok: false, error: 'BAD_LOGIN', message: 'Wrong username or PIN.' };
  var u = found.u;
  if (String(u.active).toUpperCase() === 'FALSE') return { ok: false, error: 'DISABLED', message: 'This account is disabled.' };
  if (!pinMatches_(u.pin, pin)) {
    cache.put(key, String(fails + 1), LOCK_MINUTES * 60);
    log_(username, 'login-failed', 'user', username, '');
    var left = MAX_PIN_TRIES - fails - 1;
    return { ok: false, error: 'BAD_LOGIN', message: left > 0 ? 'Wrong username or PIN. ' + left + ' tries left.' : 'Too many wrong PINs. Try again in ' + LOCK_MINUTES + ' minutes.' };
  }
  cache.remove(key);
  var safe = publicUser_(u);
  log_(safe.name, 'login', 'user', safe.username, '');
  return { ok: true, token: makeToken_(safe.username, u.pin), user: safe, mustChangePin: isTempPin_(u.pin) };
}

function makeToken_(username, storedPin) {
  var exp = Date.now() + TOKEN_TTL_DAYS * 86400000;
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify({ n: username, v: pinVersion_(storedPin), e: exp }));
  return payload + '.' + sign_(payload);
}
function sign_(text) {
  var secret = props_().getProperty('SECRET') || 'change-me';
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, secret));
}
function verifyToken_(token) {
  if (!token) return null;
  var parts = String(token).split('.');
  if (parts.length !== 2) return null;
  if (sign_(parts[0]) !== parts[1]) return null;
  var data;
  try { data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); }
  catch (err) { return null; }
  if (!data || !data.n || !data.e || data.e < Date.now()) return null;
  var found = findUser_(data.n);
  if (!found || String(found.u.active).toUpperCase() === 'FALSE') return null;
  if (pinVersion_(found.u.pin) !== data.v) return null;
  return publicUser_(found.u);
}

function changePin_(user, oldPin, newPin) {
  newPin = String(newPin || '').trim();
  if (!/^\d{4,6}$/.test(newPin)) return { ok: false, message: 'PIN must be 4 to 6 digits.' };
  var found = findUser_(user.username);
  if (!found) return { ok: false, message: 'User not found.' };
  if (!pinMatches_(found.u.pin, oldPin)) return { ok: false, message: 'Current PIN is incorrect.' };
  if (String(oldPin).trim() === newPin) return { ok: false, message: 'Pick a PIN different from the old one.' };
  var stored = makePinHash_(newPin);
  ss_().getSheetByName(TABS.USERS).getRange(found.row, USER_COLS.indexOf('pin') + 1).setValue(stored);
  log_(user.name, 'change-pin', 'user', user.username, '');
  return { ok: true, message: 'PIN updated.', token: makeToken_(user.username, stored) };
}

// ============================================================ READ
// since: send only tasks and log rows changed after it (plus deleted task ids). Lists are always sent whole.
function bootstrap_(user, since) {
  spawnDueRepeats_();   // repeating tasks whose next due date is within reach become real tasks
  var cutoff = since ? new Date(since).getTime() - 2 * 60000 : NaN;   // 2 min overlap for clock skew
  var delta = !isNaN(cutoff);
  var changed = function (v) { var t = v instanceof Date ? v.getTime() : new Date(v).getTime(); return isNaN(t) || t >= cutoff; };

  var tasks = [], removed = [];
  readTab_(TABS.TASKS, TASK_COLS).forEach(function (r) {
    if (!r.id) return;
    if (delta && !changed(r.updatedAt)) return;
    if (String(r.deleted).toUpperCase() === 'TRUE') { if (delta) removed.push(String(r.id)); return; }
    tasks.push(normalizeTask_(r));
  });
  var logs = [];
  readTab_(TABS.LOG, LOG_COLS).forEach(function (r) {
    if (!r.id || String(r.deleted).toUpperCase() === 'TRUE') return;
    if (delta && !changed(r.updatedAt)) return;
    logs.push(normalizeLog_(r));
  });

  var users = readTab_(TABS.USERS, USER_COLS)
    .filter(function (u) { return u.username; })
    .map(function (u) {
      var o = { username: String(u.username).trim().toLowerCase(), name: u.name, role: u.role === 'Admin' ? 'Admin' : 'Staff', mobile: String(u.mobile || ''), active: String(u.active).toUpperCase() !== 'FALSE' };
      if (user.role === 'Admin') o.mustChangePin = isTempPin_(u.pin);
      return o;
    });

  return { ok: true, delta: delta, user: user, tasks: tasks, removed: removed, logs: logs,
    people: readPeople_(), branches: readBranches_(), cats: readCats_(), repeats: readRepeats_(),
    users: users, settings: readSettings_(), serverTime: new Date().toISOString() };
}

function normalizeTask_(r) {
  var out = {};
  TASK_COLS.forEach(function (c) { out[c] = r[c] == null ? '' : r[c]; });
  ['givenOn', 'dueDate', 'doneOn', 'snoozeTill'].forEach(function (c) { out[c] = toDateStr_(r[c]); });
  out.toId = String(r.toId == null ? '' : r.toId);
  out.critical = String(r.critical).toUpperCase() === 'TRUE';
  out.status = r.status === 'done' ? 'done' : 'open';
  try { out.toCodes = r.toCodes ? JSON.parse(r.toCodes) : []; } catch (e) { out.toCodes = []; }
  try { out.replied = r.replied ? JSON.parse(r.replied) : {}; } catch (e) { out.replied = {}; }
  out.repeatId = String(r.repeatId == null ? '' : r.repeatId);
  out.createdAt = toIso_(r.createdAt);
  out.updatedAt = toIso_(r.updatedAt);
  delete out.deleted;
  return out;
}
function normalizeLog_(r) {
  return { id: String(r.id), taskId: String(r.taskId), date: toDateStr_(r.date), kind: String(r.kind || ''), note: String(r.note || ''),
    createdBy: String(r.createdBy || ''), createdAt: toIso_(r.createdAt), updatedAt: toIso_(r.updatedAt) };
}
function readPeople_() {
  return readTab_(TABS.PEOPLE, PEOPLE_COLS).filter(function (p) { return p.id && String(p.active).toUpperCase() !== 'FALSE'; })
    .map(function (p) { return { id: String(p.id), name: String(p.name || ''), role: String(p.role || ''), mobile: String(p.mobile || ''),
      sub: String(p.substitute || ''), nodal: splitList_(p.nodal).map(Number).filter(Boolean), cats: splitList_(p.categories) }; });
}
function readBranches_() {
  return readTab_(TABS.BRANCHES, BRANCH_COLS).filter(function (b) { return b.code && String(b.active).toUpperCase() !== 'FALSE'; })
    .map(function (b) { return { code: Number(b.code), name: String(b.name || ''), bm: String(b.bmName || ''), mobile: String(b.bmMobile || '') }; });
}
function readCats_() {
  var groups = [], by = {};
  readTab_(TABS.CATS, CAT_COLS).forEach(function (r) {
    if (!r.group || !r.category) return;
    var g = String(r.group);
    if (!by[g]) { by[g] = { group: g, items: [] }; groups.push(by[g]); }
    by[g].items.push(String(r.category));
  });
  return groups;
}
function readRepeats_() {
  return readTab_(TABS.REPEATS, REPEAT_COLS).filter(function (r) { return r.id && String(r.deleted).toUpperCase() !== 'TRUE'; }).map(normalizeRepeat_);
}
function normalizeRepeat_(r) {
  var out = {};
  REPEAT_COLS.forEach(function (c) { out[c] = r[c] == null ? '' : r[c]; });
  out.toId = String(r.toId == null ? '' : r.toId);
  try { out.toCodes = r.toCodes ? JSON.parse(r.toCodes) : []; } catch (e) { out.toCodes = []; }
  out.critical = String(r.critical).toUpperCase() === 'TRUE';
  out.active = String(r.active).toUpperCase() !== 'FALSE';
  out.n = Number(r.n) || 1; out.anchorDay = Number(r.anchorDay) || 0; out.leadDays = Number(r.leadDays) || 0;
  out.nextDue = toDateStr_(r.nextDue); out.lastDue = toDateStr_(r.lastDue);
  out.createdAt = toIso_(r.createdAt); out.updatedAt = toIso_(r.updatedAt);
  delete out.deleted;
  return out;
}
function splitList_(v) { return String(v == null ? '' : v).split(',').map(function (s) { return s.trim(); }).filter(String); }

function readSettings_() {
  var rows = readTab_(TABS.SETTINGS, SETTING_COLS);
  var out = {};
  rows.forEach(function (r) {
    if (!r.key) return;
    try { out[r.key] = JSON.parse(r.value); } catch (e) { out[r.key] = r.value; }
  });
  var d = defaultSettings_();
  Object.keys(d).forEach(function (k) { if (out[k] == null) out[k] = d[k]; });
  return out;
}

function readTab_(name, cols) {
  var sh = ss_().getSheetByName(name);
  if (!sh) { setup(); sh = ss_().getSheetByName(name); }
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, cols.length).getValues();
  return values.map(function (row) {
    var o = {};
    cols.forEach(function (c, i) { o[c] = row[i]; });
    return o;
  });
}

function toDateStr_(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}
function toIso_(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

// ============================================================ WRITE
// Upsert by id. The phone creates the id, so a save retried after a dropped
// connection updates the same row instead of adding a duplicate.
function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}
function upsert_(sh, cols, rec, row) {
  var values = [cols.map(function (c) { return rec[c] == null ? '' : rec[c]; })];
  if (row < 0) sh.appendRow(values[0]); else sh.getRange(row, 1, 1, cols.length).setValues(values);
}

function saveTask_(user, task, logs) {
  if (!task || !task.id) return { ok: false, message: 'Missing task.' };
  var sh = ss_().getSheetByName(TABS.TASKS);
  var row = findRow_(sh, task.id);
  var now = new Date().toISOString();
  var rec = {};
  TASK_COLS.forEach(function (c) { rec[c] = task[c] == null ? '' : task[c]; });
  rec.toCodes = task.toCodes && task.toCodes.length ? JSON.stringify(task.toCodes) : '';
  rec.replied = task.replied && Object.keys(task.replied).length ? JSON.stringify(task.replied) : '';
  rec.critical = task.critical ? 'TRUE' : '';
  rec.status = task.status === 'done' ? 'done' : 'open';
  rec.updatedAt = now;
  rec.deleted = '';
  if (row < 0) { rec.createdAt = task.createdAt || now; rec.createdBy = user.name; }
  else {
    var prev = sh.getRange(row, 1, 1, TASK_COLS.length).getValues()[0];
    rec.createdAt = prev[TASK_COLS.indexOf('createdAt')] || now;
    rec.createdBy = prev[TASK_COLS.indexOf('createdBy')] || user.name;
  }
  upsert_(sh, TASK_COLS, rec, row);
  log_(user.name, row < 0 ? 'create' : 'update', 'task', rec.id, String(rec.text).slice(0, 80));

  var saved = [];
  (logs || []).forEach(function (l) {
    if (!l || !l.id) return;
    var ls = ss_().getSheetByName(TABS.LOG);
    var lrow = findRow_(ls, l.id);
    var lrec = { id: l.id, createdAt: l.createdAt || now, updatedAt: now, taskId: task.id, date: String(l.date || '').slice(0, 10),
      kind: String(l.kind || 'note'), note: String(l.note || '').slice(0, 500), createdBy: l.createdBy || user.name, deleted: '' };
    upsert_(ls, LOG_COLS, lrec, lrow);
    saved.push(lrec.id);
  });
  return { ok: true, task: normalizeTask_(rec), logs: saved };
}

// Soft delete: the row stays in the Sheet with deleted=TRUE, so nothing is lost by a mis-tap.
function deleteTask_(user, id) {
  var sh = ss_().getSheetByName(TABS.TASKS);
  var row = findRow_(sh, id);
  if (row > 0) {
    sh.getRange(row, TASK_COLS.indexOf('deleted') + 1).setValue('TRUE');
    sh.getRange(row, TASK_COLS.indexOf('updatedAt') + 1).setValue(new Date().toISOString());
    log_(user.name, 'delete', 'task', id, '');
  }
  return { ok: true };
}

function savePerson_(user, p) {
  if (!p || !p.id || !p.name) return { ok: false, message: 'Missing person.' };
  var sh = ss_().getSheetByName(TABS.PEOPLE);
  var row = findRow_(sh, p.id);
  var rec = { id: String(p.id), name: String(p.name), role: String(p.role || ''), mobile: "'" + String(p.mobile || '').replace(/\D/g, '').slice(-10),
    substitute: String(p.sub || ''), nodal: "'" + (p.nodal || []).join(','), categories: (p.cats || []).join(','), active: 'TRUE' };
  upsert_(sh, PEOPLE_COLS, rec, row);
  log_(user.name, row < 0 ? 'create' : 'update', 'person', rec.id, rec.name);
  return { ok: true };
}
function deletePerson_(user, id) {
  var sh = ss_().getSheetByName(TABS.PEOPLE);
  var row = findRow_(sh, id);
  if (row > 0) { sh.getRange(row, PEOPLE_COLS.indexOf('active') + 1).setValue('FALSE'); log_(user.name, 'delete', 'person', id, ''); }
  return { ok: true };
}
function saveBranch_(user, b) {
  if (!b || !b.code || !b.name) return { ok: false, message: 'Missing branch.' };
  var sh = ss_().getSheetByName(TABS.BRANCHES);
  var row = findRow_(sh, b.code);
  var rec = { code: Number(b.code), name: String(b.name), bmName: String(b.bm || ''), bmMobile: "'" + String(b.mobile || '').replace(/\D/g, '').slice(-10), active: 'TRUE' };
  upsert_(sh, BRANCH_COLS, rec, row);
  log_(user.name, row < 0 ? 'create' : 'update', 'branch', String(rec.code), rec.name);
  return { ok: true };
}
function deleteBranch_(user, code) {
  var sh = ss_().getSheetByName(TABS.BRANCHES);
  var row = findRow_(sh, code);
  if (row > 0) { sh.getRange(row, BRANCH_COLS.indexOf('active') + 1).setValue('FALSE'); log_(user.name, 'delete', 'branch', String(code), ''); }
  return { ok: true };
}
function saveCategories_(user, cats) {
  if (!Array.isArray(cats)) return { ok: false, message: 'Missing categories.' };
  writeCats_(cats);
  log_(user.name, 'update', 'categories', '', cats.length + ' groups');
  return { ok: true, cats: readCats_() };
}
function writeCats_(cats) {
  var sh = ss_().getSheetByName(TABS.CATS);
  var rows = [];
  cats.forEach(function (g) { (g.items || []).forEach(function (c) { rows.push([String(g.group), String(c)]); }); });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, CAT_COLS.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, CAT_COLS.length).setValues(rows);
}

// ============================================================ REPEATING TASKS
function parseIso_(s) { var p = String(s).split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
function fmtIso_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function todayIso_() { return fmtIso_(new Date()); }
function addDaysIso_(iso, n) { var d = parseIso_(iso); d.setDate(d.getDate() + n); return fmtIso_(d); }
// The due date after `due` for a repeat. Monthly and yearly keep the anchor day of month, clamped to the month's length.
function nextDueIso_(due, freq, n, anchorDay) {
  var d = parseIso_(due); n = Number(n) || 1;
  if (freq === 'days') d.setDate(d.getDate() + n);
  else if (freq === 'weeks') d.setDate(d.getDate() + 7 * n);
  else {
    var day = anchorDay || d.getDate();
    d.setDate(1);
    if (freq === 'years') d.setFullYear(d.getFullYear() + n); else d.setMonth(d.getMonth() + n);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return fmtIso_(d);
}
function saveRepeat_(user, rp) {
  if (!rp || !rp.id || !rp.text) return { ok: false, message: 'Missing repeat.' };
  var sh = ss_().getSheetByName(TABS.REPEATS);
  var row = findRow_(sh, rp.id);
  var now = new Date().toISOString();
  var rec = {};
  REPEAT_COLS.forEach(function (c) { rec[c] = rp[c] == null ? '' : rp[c]; });
  rec.toCodes = rp.toCodes && rp.toCodes.length ? JSON.stringify(rp.toCodes) : '';
  rec.critical = rp.critical ? 'TRUE' : '';
  rec.active = rp.active === false ? 'FALSE' : 'TRUE';
  rec.n = Number(rp.n) || 1; rec.anchorDay = Number(rp.anchorDay) || ''; rec.leadDays = Number(rp.leadDays) || 0;
  rec.nextDue = String(rp.nextDue || '').slice(0, 10); rec.lastDue = String(rp.lastDue || '').slice(0, 10);
  rec.updatedAt = now; rec.deleted = '';
  if (row < 0) { rec.createdAt = rp.createdAt || now; rec.createdBy = user.name; }
  else { var prev = sh.getRange(row, 1, 1, REPEAT_COLS.length).getValues()[0]; rec.createdAt = prev[REPEAT_COLS.indexOf('createdAt')] || now; rec.createdBy = prev[REPEAT_COLS.indexOf('createdBy')] || user.name; }
  upsert_(sh, REPEAT_COLS, rec, row);
  log_(user.name, row < 0 ? 'create' : 'update', 'repeat', rec.id, String(rec.text).slice(0, 80));
  return { ok: true, repeat: normalizeRepeat_(rec) };
}
function deleteRepeat_(user, id) {
  var sh = ss_().getSheetByName(TABS.REPEATS);
  var row = findRow_(sh, id);
  if (row > 0) {
    sh.getRange(row, REPEAT_COLS.indexOf('deleted') + 1).setValue('TRUE');
    sh.getRange(row, REPEAT_COLS.indexOf('updatedAt') + 1).setValue(new Date().toISOString());
    log_(user.name, 'delete', 'repeat', id, '');
  }
  return { ok: true };
}
// Creates the real task for every active repeat whose next due date minus leadDays has arrived.
// If several due dates were missed (the app was not opened for weeks), only the latest one becomes
// a task; the schedule then continues from the next future date. Runs on every bootstrap and from
// the optional daily trigger (spawnDueRepeats). Guarded by a lock so two phones never spawn twice.
function spawnDueRepeats_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 0;
  try {
    var ss = ss_(), sh = ss.getSheetByName(TABS.REPEATS);
    if (!sh) return 0;
    var today = todayIso_(), made = 0;
    var rows = readTab_(TABS.REPEATS, REPEAT_COLS);
    rows.forEach(function (r, i) {
      if (!r.id || String(r.deleted).toUpperCase() === 'TRUE' || String(r.active).toUpperCase() === 'FALSE') return;
      var rp = normalizeRepeat_(r);
      if (!rp.nextDue) return;
      var due = rp.nextDue, lastDue = '', guard = 0;
      while (due && addDaysIso_(due, -rp.leadDays) <= today && guard++ < 120) { lastDue = due; due = nextDueIso_(due, rp.freq, rp.n, rp.anchorDay); }
      if (!lastDue) return;
      var now = new Date().toISOString();
      var id = 'R' + Date.now() + String(Math.floor(Math.random() * 1000));
      var replied = {};
      if (rp.toType === 'many') (rp.toCodes || []).forEach(function (c) { replied[c] = false; });
      var task = { id: id, createdAt: now, updatedAt: now, toType: rp.toType, toId: rp.toId, toName: rp.toName,
        toCodes: rp.toCodes && rp.toCodes.length ? JSON.stringify(rp.toCodes) : '',
        replied: rp.toType === 'many' ? JSON.stringify(replied) : '',
        category: rp.category, text: rp.text, how: rp.how || 'In person', givenOn: today, dueDate: lastDue, status: 'open', doneOn: '',
        source: rp.source || 'own', critical: rp.critical ? 'TRUE' : '', snoozeTill: '', createdBy: 'Repeat', deleted: '', repeatId: rp.id };
      upsert_(ss.getSheetByName(TABS.TASKS), TASK_COLS, task, -1);
      upsert_(ss.getSheetByName(TABS.LOG), LOG_COLS, { id: 'L' + Date.now() + String(Math.floor(Math.random() * 100000)), createdAt: now, updatedAt: now, taskId: id, date: today,
        kind: 'given', note: 'Repeating task, due ' + lastDue, createdBy: 'Repeat', deleted: '' }, -1);
      sh.getRange(i + 2, REPEAT_COLS.indexOf('nextDue') + 1).setValue(due);
      sh.getRange(i + 2, REPEAT_COLS.indexOf('lastDue') + 1).setValue(lastDue);
      sh.getRange(i + 2, REPEAT_COLS.indexOf('updatedAt') + 1).setValue(now);
      log_('Repeat', 'create', 'task', id, String(rp.text).slice(0, 80));
      made++;
    });
    return made;
  } finally { lock.releaseLock(); }
}
// For a daily time trigger (Triggers -> Add -> spawnDueRepeats, day timer). Not required: every app open does the same.
function spawnDueRepeats() { var n = spawnDueRepeats_(); Logger.log('Created ' + n + ' repeating task(s).'); return n; }

function saveSettings_(user, settings) {
  if (user.role !== 'Admin') return { ok: false, message: 'Only an Admin can change settings.' };
  writeSettings_(settings);
  log_(user.name, 'update', 'settings', '', '');
  return { ok: true, settings: readSettings_() };
}
function writeSettings_(settings) {
  var sh = ss_().getSheetByName(TABS.SETTINGS);
  sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).clearContent();
  var out = Object.keys(settings).map(function (k) { return [k, JSON.stringify(settings[k])]; });
  if (out.length) sh.getRange(2, 1, out.length, 2).setValues(out);
}

// Merges the Admin's edits into the Users tab (template code; see _template-pwa-sheets for the rules).
function saveUsers_(user, users, baseline) {
  if (user.role !== 'Admin') return { ok: false, message: 'Only an Admin can manage logins.' };
  users = (users || []).filter(function (u) { return u && u.username; });
  var sh = ss_().getSheetByName(TABS.USERS);
  var current = readTab_(TABS.USERS, USER_COLS).filter(function (u) { return u.username; });
  var byName = {};
  current.forEach(function (u) { byName[String(u.username).trim().toLowerCase()] = u; });

  var submitted = {};
  users.forEach(function (u) {
    var un = String(u.username).trim().toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(un)) return;
    var pin = String(u.pin || '').trim();
    if (pin && !/^\d{4,6}$/.test(pin)) return;
    var prev = byName[un];
    submitted[un] = {
      username: un,
      name: String(u.name || (prev && prev.name) || un),
      pin: pin ? "'" + pin : (prev ? (isTempPin_(prev.pin) ? "'" + String(prev.pin) : String(prev.pin)) : ''),
      role: u.role === 'Admin' ? 'Admin' : 'Staff',
      mobile: "'" + String(u.mobile != null ? u.mobile : (prev && prev.mobile) || ''),
      active: u.active === false ? 'FALSE' : 'TRUE'
    };
  });

  var removed = {};
  (baseline || []).forEach(function (b) {
    var un = String(b || '').trim().toLowerCase();
    if (un && !submitted[un] && un !== user.username) removed[un] = true;
  });

  var out = [];
  current.forEach(function (u) {
    var un = String(u.username).trim().toLowerCase();
    if (removed[un]) return;
    if (submitted[un]) { out.push(submitted[un]); delete submitted[un]; return; }
    out.push({ username: un, name: u.name, pin: isTempPin_(u.pin) ? "'" + String(u.pin) : String(u.pin), role: u.role, mobile: "'" + String(u.mobile || ''), active: String(u.active).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE' });
  });
  Object.keys(submitted).forEach(function (un) {
    if (!submitted[un].pin) return; // a new login needs a PIN
    out.push(submitted[un]);
  });

  if (!out.some(function (u) { return u.role === 'Admin' && u.active === 'TRUE'; })) {
    return { ok: false, message: 'Keep at least one active Admin.' };
  }
  var rows = out.map(function (u) { return USER_COLS.map(function (c) { return u[c]; }); });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, USER_COLS.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, USER_COLS.length).setValues(rows);
  log_(user.name, 'update', 'users', '', rows.length + ' logins');
  return { ok: true };
}

function log_(by, action, entity, entityId, detail) {
  try {
    ss_().getSheetByName(TABS.ALOG)
      .appendRow([new Date().toISOString(), by, action, entity, entityId, String(detail || '').slice(0, 200)]);
  } catch (e) { /* logging must never break a request */ }
}
