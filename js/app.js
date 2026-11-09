/* ============================================================
   RO Task Tracker — UI
   Screens from the approved prototype; login, sync, logins & PINs
   from _template-pwa-sheets. Data comes from Store (js/store.js).
   ============================================================ */
(function () {
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------------------------------------------- helpers */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = () => todayISO();
const toDate = iso => new Date(String(iso).slice(0, 10) + 'T00:00:00');
const fmtISO = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (iso, n) => { const d = toDate(iso); d.setDate(d.getDate() + n); return fmtISO(d); };
const dayDiff = (a, b) => Math.round((toDate(a) - toDate(b)) / 864e5);   // a minus b, in days
const pretty = iso => { if (!iso) return '—'; const d = toDate(iso); return isNaN(d) ? String(iso) : d.getDate() + ' ' + MON[d.getMonth()]; };
const prettyTime = iso => { const dt = new Date(iso); return isNaN(dt) ? '' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' + dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); };
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const digits = m => { const d = String(m || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; };
const HOW = CFG.HOW, SOURCES = CFG.SOURCES;
const SRC_PILL = { ho: ['p-ho', 'HO'], district: ['p-dist', 'District'], audit: ['p-audit', 'Audit'] };
const HIST_TEXT = { given: 'Task given', rem: 'Reminded', ext: 'Due date extended', note: 'Note', done: 'Marked done', reopen: 'Reopened', snooze: 'Reminder snoozed' };

const ICON = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M9 15l2 2 4-4"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5A5 5 0 0 1 22 19"/></svg>',
  branches: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 21V9l8-5 8 5v12M9 21v-6h6v6M9 12h.01M15 12h.01"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.4-.2-2.6.7.7-2.5-.2-.4A8 8 0 0 1 12 4zm-3 4.3c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.2 2.2 3.5 5.4 4.7 2.7 1 3.2.8 3.8.8.6-.1 1.9-.8 2.1-1.5.3-.8.3-1.4.2-1.5-.1-.1-.3-.2-.6-.4l-2.1-1c-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-.9-2.2c-.2-.5-.5-.5-.7-.5h-.8z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4m0 0h12l-2 4 2 4H4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 10h-1.3A7 7 0 1 0 5 16"/><path d="M12 12v9M8 17l4 4 4-4"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 8-8 3 3-3 3-2-2-2 2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>'
};

/* ---------------------------------------------- toast & sheet */
let toastT;
function toast(msg, kind) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast on' + (kind ? ' ' + kind : '');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.className = 'toast', 2600);
}
const layer = $('#layer');
let sheetLocked = false;
function sheet(title, kicker, body, locked) {
  sheetLocked = !!locked;
  layer.innerHTML = '<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>' +
    '<div class="sh-head"><div><h3>' + title + '</h3>' + (kicker ? '<div class="k">' + kicker + '</div>' : '') + '</div>' +
    (locked ? '' : '<button class="close" data-close aria-label="Close">' + ICON.x + '</button>') + '</div>' +
    '<div class="sh-body">' + body + '</div></div></div>';
  document.body.style.overflow = 'hidden';
}
function closeSheet() { if (sheetLocked) return; layer.innerHTML = ''; document.body.style.overflow = ''; }
function forceClose() { sheetLocked = false; closeSheet(); }

/* ============================================================
   DERIVED DATA
   ============================================================ */
const S = { tab: 'today', chase: 'all', q: '', filter: 'open', grp: '', sort: 'overdue', bq: '', expand: {} };
const T = () => Store.tasks;
const settings = () => Store.settings;
const open = t => t.status !== 'done';
const isOver = t => open(t) && t.dueDate && t.dueDate < today();
const isToday = t => open(t) && t.dueDate === today();
const isTomorrow = t => open(t) && t.dueDate === addDays(today(), 1);
const isSoon = t => open(t) && t.dueDate > today() && t.dueDate <= addDays(today(), Number(settings().remindBefore) || 0);
const isReminder = t => (isOver(t) || isToday(t) || isSoon(t)) && !(t.snoozeTill && t.snoozeTill > today());
const daysLate = t => dayDiff(today(), t.dueDate);
const groupOf = cat => { const g = Store.cats.find(g => g.items.includes(cat)); return g ? g.group : 'Other'; };
const allCats = () => Store.cats.flatMap(g => g.items);
const bname = c => { const b = Store.branch(c); return b ? b.name : 'Branch ' + c; };
const whoName = t => {
  if (t.toType === 'staff') { const p = Store.person(t.toId); return p ? p.name : (t.toName || 'Former staff'); }
  if (t.toType === 'branch') { const b = Store.branch(t.toId); return b ? b.name : (t.toName || 'Branch ' + t.toId); }
  const n = (t.toCodes || []).length; return n === Store.branches.length ? 'All ' + n + ' branches' : n + ' branches';
};
const whoRole = t => { if (t.toType === 'staff') { const p = Store.person(t.toId); return p ? p.role : 'left RO'; } return t.toType === 'branch' ? 'Branch · ' + t.toId : 'Circular'; };
const whoClass = t => t.toType === 'staff' ? 'p-staff' : t.toType === 'branch' ? 'p-branch' : 'p-many';
const pendingOf = t => (t.toCodes || []).filter(c => !(t.replied || {})[c]);
const remCount = t => Store.logsFor(t.id).filter(l => l.kind === 'rem').length;
const byUrgency = ts => ts.slice().sort((a, b) => (open(b) - open(a)) || (b.critical ? 1 : 0) - (a.critical ? 1 : 0) || String(a.dueDate).localeCompare(String(b.dueDate)));
const byDue = ts => ts.slice().sort((a, b) => (open(b) - open(a)) || String(a.dueDate).localeCompare(String(b.dueDate)));
const staffTasks = id => T().filter(t => t.toType === 'staff' && t.toId === id);
const branchTasks = code => T().filter(t => t.toType === 'branch' && Number(t.toId) === Number(code));
const oldestDays = ts => ts.length ? Math.max(...ts.map(t => dayDiff(today(), t.givenOn))) : 0;
const subName = p => { const x = p && p.sub ? Store.person(p.sub) : null; return x ? x.name : ''; };
const nodalOf = code => Store.people.find(p => (p.nodal || []).includes(Number(code))) || null;
const nodalHtml = code => { const n = nodalOf(code); return n ? '<button class="link" data-person="' + n.id + '">' + esc(n.name) + '</button>' + (subName(n) ? ' <span class="faint small">(substitute ' + esc(subName(n)) + ')</span>' : '') : '<span class="faint">none set</span>'; };
const mobileOf = t => { if (t.toType === 'staff') { const p = Store.person(t.toId); return p ? p.mobile : ''; } if (t.toType === 'branch') { const b = Store.branch(t.toId); return b ? b.mobile : ''; } return ''; };

/* ============================================================
   ROW RENDERERS
   ============================================================ */
function dueHtml(t) {
  if (!open(t)) return '<span class="due done">Done ' + pretty(t.doneOn) + (t.doneOn && t.dueDate && t.doneOn > t.dueDate ? ' · ' + plural(dayDiff(t.doneOn, t.dueDate), 'day') + ' late' : '') + '</span>';
  if (isOver(t)) return '<span class="due over">Due ' + pretty(t.dueDate) + '</span><span class="late">' + plural(daysLate(t), 'day') + ' late</span>';
  if (isToday(t)) return '<span class="due today">Due today</span>';
  if (isTomorrow(t)) return '<span class="due">Due tomorrow</span>';
  return '<span class="due">Due ' + pretty(t.dueDate) + '</span>';
}
function tagsHtml(t) {
  let s = '';
  if (t.critical && open(t)) s += '<span class="pill p-crit">Critical</span>';
  if (SRC_PILL[t.source]) s += '<span class="pill ' + SRC_PILL[t.source][0] + '">' + SRC_PILL[t.source][1] + '</span>';
  if (t.toType === 'many' && open(t)) s += '<span class="pill p-many">' + pendingOf(t).length + ' pending</span>';
  const rc = open(t) ? remCount(t) : 0;
  if (rc > 1) s += '<span class="pill p-rem">reminded ×' + rc + '</span>';
  return s;
}
function taskRow(t, opts) {
  opts = opts || {};
  const who = opts.hideWho ? '' : '<div class="who ' + whoClass(t) + '"><i></i>' + esc(whoName(t)) + ' <span class="r">' + esc(whoRole(t)) + '</span></div>';
  return '<button class="trow ' + (open(t) ? '' : 'done') + '" data-task="' + esc(t.id) + '">' + who +
    '<div class="tags"' + (opts.hideWho ? ' style="grid-column:1/-1;justify-content:flex-start;max-width:none"' : '') + '>' + tagsHtml(t) + '</div>' +
    '<div class="txt">' + esc(t.text) + '</div>' +
    '<div class="r3">' + dueHtml(t) + (t.category ? '<span class="cat">' + esc(t.category) + '</span>' : '') + '<span class="how">' + esc(t.how) + ' · given ' + pretty(t.givenOn) + '</span></div></button>';
}
function listHtml(ts, opts) { return ts.length ? '<div class="list">' + ts.map(t => taskRow(t, opts)).join('') + '</div>' : '<div class="empty">' + (opts && opts.empty || 'Nothing here') + '</div>'; }
function section(title, count, body, extra) {
  return '<section><div class="sec-row"><h2 class="sec">' + title + (count != null ? ' <span class="muted">' + count + '</span>' : '') + '</h2>' + (extra || '') + '</div>' + body + '</section>';
}
const LIMIT = 5;
function summaryCard(key, title, items, sub) {
  const rows = items.filter(x => x.n).sort((a, b) => b.ov - a.ov || b.n - a.n);
  if (!rows.length) return '';
  const all = !!S.expand[key], shown = all ? rows : rows.slice(0, LIMIT);
  return '<div class="card sum"><div class="hd"><h2>' + title + '</h2><span>' + sub + '</span></div><div class="row">' +
    shown.map(r => '<button class="sp ' + (r.ov ? 'hot' : '') + '" ' + r.attrs + '><span class="n">' + esc(r.label) + '</span><b>' + r.n + '</b>' + (r.ov ? '<span class="l">' + r.ov + '</span>' : '') + '</button>').join('') +
    (rows.length > LIMIT ? '<button class="sp more" data-expand="' + key + '">' + (all ? 'less' : '+' + (rows.length - LIMIT) + ' more') + '</button>' : '') + '</div></div>';
}

/* ============================================================
   TABS
   ============================================================ */
const TABS = [['today', 'Today'], ['people', 'RO staff'], ['branches', 'Branches'], ['tasks', 'All tasks'], ['more', 'More']];

function renderToday() {
  const over = byUrgency(T().filter(isOver)), td = byUrgency(T().filter(isToday)), tm = byUrgency(T().filter(isTomorrow));
  const crit = byUrgency(T().filter(t => open(t) && t.critical));
  const roOpen = T().filter(t => open(t) && t.toType === 'staff').length;
  const brOpen = T().filter(t => open(t) && t.toType !== 'staff').length;
  const hoOpen = T().filter(t => open(t) && t.source === 'ho').length;
  const chip = (k, n, l) => '<button class="hero-chip ' + (S.chase === k ? 'on' : '') + '" data-chase="' + k + '"><b class="num">' + n + '</b><span>' + l + '</span></button>';
  const d = toDate(today());
  let html = '<div class="hero"><div class="label">To chase today</div><div class="value num">' + (over.length + td.length) + '</div>' +
    '<div class="hnote">' + plural(over.length, 'overdue task') + ' and ' + td.length + ' due today · ' + DOW[d.getDay()] + ' ' + pretty(today()) + '</div>' +
    '<div class="hero-row">' + chip('over', over.length, 'Overdue') + chip('today', td.length, 'Due today') + chip('tomorrow', tm.length, 'Due tomorrow') + '</div></div>';
  html += '<div class="stats">' +
    '<button class="stat" style="--h:var(--w-staff)" data-go="people"><b class="num">' + roOpen + '</b><span>open with RO staff</span><small>who has what</small></button>' +
    '<button class="stat" style="--h:var(--w-branch)" data-go="branches"><b class="num">' + brOpen + '</b><span>open with branches</span><small>incl. circulars</small></button>' +
    '<button class="stat ' + (hoOpen ? 'bad' : '') + '" style="--h:var(--ho)" data-go="tasks" data-filter="ho"><b class="num">' + hoOpen + '</b><span>from HO, still open</span><small>what HO will chase</small></button></div>';
  const openT = T().filter(open);
  const stat = (label, ts, attrs) => ({ label, n: ts.length, ov: ts.filter(isOver).length, attrs });
  const ppl = Store.people.map(p => stat(p.name.split(' ')[0], openT.filter(t => t.toType === 'staff' && t.toId === p.id), 'data-person="' + esc(p.id) + '"'));
  const cats = Store.cats.map(g => stat(g.group, openT.filter(t => groupOf(t.category) === g.group), 'data-go="tasks" data-grp="' + esc(g.group) + '" data-filter="open"'));
  const brs = Store.branches.map(b => stat(b.name, openT.filter(t => t.toType === 'branch' && Number(t.toId) === Number(b.code)), 'data-branch="' + b.code + '"'));
  html += summaryCard('ppl', 'By RO staff', ppl, 'open · <span style="color:var(--danger)">late</span> · ' + Store.people.filter(p => !openT.some(t => t.toType === 'staff' && t.toId === p.id)).length + ' with nothing pending');
  html += summaryCard('cats', 'By category', cats, 'open · <span style="color:var(--danger)">late</span>');
  html += summaryCard('brs', 'By branch', brs, (Store.branches.length - brs.filter(x => x.n).length) + ' branches with no task');
  if (crit.length && S.chase === 'all') html += section('Critical', crit.length, listHtml(crit), '<span class="small faint">flagged by you</span>');
  if (S.chase === 'all' || S.chase === 'over') html += section('Overdue', over.length, listHtml(over, { empty: 'Nothing overdue. Good.' }), '<span class="small faint">critical first, then oldest</span>');
  if (S.chase === 'all' || S.chase === 'today') html += section('Due today', td.length, listHtml(td, { empty: 'Nothing due today' }));
  if (S.chase === 'all' || S.chase === 'tomorrow') html += section('Due tomorrow', tm.length, listHtml(tm, { empty: 'Nothing due tomorrow' }));
  if (!T().length) html += '<div class="note">No tasks yet. Tap <b>+</b> after you give someone a task; it comes back here on its due date.</div>';
  return html;
}
function renderPeople() {
  const rows = Store.people.map(p => { const ts = staffTasks(p.id), o = ts.filter(open), ov = o.filter(isOver); return { p, o, ov, old: oldestDays(o) }; });
  const sorters = { overdue: (a, b) => b.ov.length - a.ov.length || b.o.length - a.o.length || b.old - a.old, open: (a, b) => b.o.length - a.o.length || b.ov.length - a.ov.length, name: (a, b) => a.p.name.localeCompare(b.p.name) };
  rows.sort(sorters[S.sort]);
  const withTasks = rows.filter(r => r.o.length), free = rows.filter(r => !r.o.length);
  const row = r => '<button class="prow" data-person="' + esc(r.p.id) + '"><div class="av" style="--h:var(--w-staff)">' + esc(initials(r.p.name)) + '</div>' +
    '<div class="pm"><div class="n">' + esc(r.p.name) + '</div><div class="r">' + esc(r.p.role) + '</div></div>' +
    '<div class="pc">' + (r.ov.length ? '<b class="bad num">' + plural(r.ov.length, 'overdue') + '</b>' : r.o.length ? '<b class="num">' + plural(r.o.length, 'open') + '</b>' : '<b class="ok">nothing pending</b>') +
    (r.o.length ? '<span class="num">' + plural(r.o.length, 'open') + (r.old ? ' · oldest ' + r.old + ' d' : '') + '</span>' : '') + '</div></button>';
  let html = '<div class="note">Who has what in the Regional Office. Tap a name for every task you gave them and what they look after. Add or edit people under <b>More → People</b>.</div>';
  html += '<div class="sort">' + [['overdue', 'Most overdue first'], ['open', 'Most tasks first'], ['name', 'A–Z']].map(([k, l]) => '<button class="chip ' + (S.sort === k ? 'on' : '') + '" data-sort="' + k + '">' + l + '</button>').join('') + '</div>';
  html += section('Carrying tasks', withTasks.length, withTasks.length ? '<div class="list">' + withTasks.map(row).join('') + '</div>' : '<div class="empty">Nobody has an open task</div>');
  if (free.length) html += section('Nothing pending', free.length, '<div class="list">' + free.map(row).join('') + '</div>');
  return html;
}
function renderBranches() {
  const circ = byDue(T().filter(t => t.toType === 'many'));
  const circRow = t => { const n = (t.toCodes || []).length || 1, p = pendingOf(t).length, d = n - p;
    return '<button class="circ" data-task="' + esc(t.id) + '"><div class="sec-row" style="margin:0"><div class="t">' + esc(t.text) + '</div><div class="tags">' + tagsHtml(t) + '</div></div>' +
    '<div class="bar ' + (p === 0 ? 'all' : '') + '"><i style="width:' + Math.round(d / n * 100) + '%"></i></div>' +
    '<div class="m"><span class="num"><b>' + d + ' of ' + n + '</b> branches replied' + (p ? ' · <b style="color:var(--danger)">' + p + ' pending</b>' : '') + '</span>' + dueHtml(t) + '</div></button>'; };
  const per = Store.branches.map(b => { const ts = branchTasks(b.code), o = ts.filter(open); return { b, o, ov: o.filter(isOver) }; }).filter(r => r.o.length).sort((a, b) => b.ov.length - a.ov.length || b.o.length - a.o.length);
  const bRow = r => '<button class="brow" data-branch="' + r.b.code + '"><div><div class="n">' + esc(r.b.name) + ' <span class="code">' + r.b.code + (r.b.bm ? ' · ' + esc(r.b.bm) : '') + '</span></div><div class="small muted">' + esc(r.o[0].text) + (r.o.length > 1 ? ' +' + (r.o.length - 1) + ' more' : '') + '</div></div>' +
    '<div class="pc">' + (r.ov.length ? '<b class="bad num">' + plural(r.ov.length, 'overdue') + '</b>' : '<b class="num">' + plural(r.o.length, 'open') + '</b>') + (r.ov.length && r.o.length > r.ov.length ? '<span class="num">' + plural(r.o.length, 'open') + '</span>' : '') + '</div></button>';
  let html = section('Circulars to many branches', circ.filter(open).length, circ.length ? '<div class="list">' + circ.map(circRow).join('') + '</div>' : '<div class="empty">No circular yet. Use + → Many branches.</div>', '<span class="small faint">tap to tick off replies</span>');
  html += section('Tasks to one branch', per.length + ' branches', (per.length ? '<div class="list">' + per.map(bRow).join('') + '</div>' : '<div class="empty">No branch has an open task</div>') +
    '<p class="small faint" style="margin:10px 2px 0">' + (Store.branches.length - per.length) + ' other branches have no open task. BM names and mobiles are under <b>More → Branch contacts</b>.</p>');
  return html;
}
function renderTasks() {
  const F = { open: t => open(t), over: isOver, crit: t => open(t) && t.critical, ho: t => t.source === 'ho', done: t => !open(t), all: () => true };
  const q = S.q.trim().toLowerCase();
  let ts = T().filter(F[S.filter] || F.open);
  if (S.grp) ts = ts.filter(t => groupOf(t.category) === S.grp);
  if (q) ts = ts.filter(t => (t.text + ' ' + whoName(t) + ' ' + whoRole(t) + ' ' + t.id + ' ' + (t.category || '') + ' ' + Store.logsFor(t.id).map(x => x.note).join(' ')).toLowerCase().includes(q));
  ts = S.filter === 'done' ? ts.slice().sort((a, b) => String(b.doneOn).localeCompare(String(a.doneOn))) : byDue(ts);
  const counts = Object.fromEntries(Object.keys(F).map(k => [k, T().filter(F[k]).filter(t => !S.grp || groupOf(t.category) === S.grp).length]));
  const chips = [['open', 'Open'], ['over', 'Overdue'], ['crit', 'Critical'], ['ho', 'From HO'], ['done', 'Done'], ['all', 'All']];
  const grps = Store.cats.map(g => g.group).filter(g => T().some(t => groupOf(t.category) === g));
  return '<input class="search" id="q" type="search" placeholder="Search a task, a person, a branch, a category…" value="' + esc(S.q) + '" autocomplete="off">' +
    '<div class="chips">' + chips.map(([k, l]) => '<button class="chip ' + (S.filter === k ? 'on' : '') + '" data-filter="' + k + '">' + l + ' <span class="k num">' + counts[k] + '</span></button>').join('') + '</div>' +
    (grps.length ? '<div class="chips"><button class="chip ' + (S.grp ? '' : 'on') + '" data-grp="">All categories</button>' + grps.map(g => '<button class="chip ' + (S.grp === g ? 'on' : '') + '" data-grp="' + esc(g) + '">' + esc(g) + '</button>').join('') + '</div>' : '') +
    listHtml(ts, { empty: q ? 'No task matches "' + esc(S.q) + '"' : 'No tasks' }) +
    '<p class="small faint">Every task you ever gave stays here. When HO asks "what happened to…", search it and read the history.</p>';
}
function renderMore() {
  const u = Store.user || {}, st = settings();
  const mrow = (ic, t, s, act) => '<button class="mrow" data-more="' + act + '"><div class="ic">' + ICON[ic] + '</div><div><b>' + t + '</b><span class="s">' + s + '</span></div><span class="chev">' + ICON.chev + '</span></button>';
  const withMob = Store.people.filter(p => digits(p.mobile)).length, bmMob = Store.branches.filter(b => digits(b.mobile)).length;
  const theme = (() => { try { return localStorage.getItem(LS.THEME) || 'auto'; } catch (e) { return 'auto'; } })();
  return '<div class="card" style="display:flex;align-items:center;gap:14px"><div class="av" style="width:48px;height:48px;font-size:16px">' + esc(initials(u.name)) + '</div><div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:700">' + esc(u.name || '—') + '</div><div class="small muted">' + esc(u.role || 'Staff') + ' · @' + esc(u.username || '') + (Store.lastSync ? ' · synced ' + esc(prettyTime(Store.lastSync)) : '') + '</div></div></div>' +
    '<div class="card"><p class="eyebrow">Lists</p><div class="menu">' +
    mrow('people', 'People', 'RO staff: ' + Store.people.length + ' · ' + withMob + ' with mobile. Add, edit, remove.', 'people') +
    mrow('branches', 'Branch contacts', Store.branches.length + ' branches · ' + bmMob + ' BM mobiles saved. Edit BM name and mobile.', 'branches') +
    mrow('tag', 'Task categories', allCats().length + ' categories in ' + Store.cats.length + ' groups. Add or remove.', 'cats') + '</div></div>' +
    '<div class="card"><p class="eyebrow">Reminders</p><div class="sh-body">' +
    '<label class="f">Show a reminder how many days before the due date?<div class="quick" style="margin-top:4px">' + [0, 1, 2, 3, 7].map(n => '<button data-rb="' + n + '" class="' + (Number(st.remindBefore) === n ? 'on' : '') + '">' + (n === 0 ? 'Only on the day' : n === 1 ? '1 day before' : n + ' days before') + '</button>').join('') + '</div></label>' +
    '<div class="row2"><label class="f">Reminder time<input class="inp" type="time" id="c-time" value="' + esc(st.remindTime) + '"></label><label class="f">Default due date<select class="inp" id="c-gap">' + [0, 1, 2, 3, 5, 7].map(n => '<option value="' + n + '" ' + (Number(st.dueGap) === n ? 'selected' : '') + '>' + (n === 0 ? 'Same day' : n === 1 ? 'Tomorrow' : n + ' days later') + '</option>').join('') + '</select></label></div>' +
    '<div class="note">Reminders show <b>inside the app</b> for now: the bell at the top, and the Today tab. The time is kept for the next step, when each task becomes a <b>Google Tasks</b> entry so the phone buzzes even with the app closed.</div>' +
    '<label class="f">Reminder language<div class="toggle" style="margin-top:4px">' + [['en', 'English'], ['hi', 'हिन्दी']].map(([k, l]) => '<button class="' + (st.lang === k ? 'on' : '') + '" data-lang="' + k + '">' + l + '</button>').join('') + '</div></label>' +
    '<label class="f">Signature on reminders (English)<input class="inp" id="c-sig" value="' + esc(st.sig) + '"></label>' +
    '<label class="f">Signature on reminders (Hindi)<input class="inp" id="c-sighi" value="' + esc(st.sigHi) + '"></label></div></div>' +
    '<div class="card"><p class="eyebrow">Appearance</p><label class="f">Theme<div class="toggle" style="margin-top:4px">' + [['auto', 'Follow phone'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => '<button class="' + (theme === k ? 'on' : '') + '" data-theme="' + k + '">' + l + '</button>').join('') + '</div></label></div>' +
    '<div class="card"><p class="eyebrow">Account</p><div class="menu">' +
    (u.role === 'Admin' ? mrow('people', 'Logins & PINs', Store.users.length + ' login' + (Store.users.length === 1 ? '' : 's') + '. Reset a PIN or add a login.', 'logins') : '') +
    mrow('key', 'Change my PIN', 'Use 4 to 6 digits.', 'pin') + '</div></div>' +
    '<div class="card"><p class="eyebrow">Data</p><div class="menu">' +
    mrow('cloud', 'Sync now', Store.queue.length ? Store.queue.length + ' change(s) waiting to be sent' : 'Everything is up to date', 'sync') +
    mrow('down', 'Export CSV', 'All tasks, as a file for Excel.', 'csv') +
    (u.role === 'Admin' && CFG.SHEET_URL ? mrow('sheet', 'Open the Google Sheet', 'The database behind this app.', 'sheet') : mrow('sheet', 'Where the data lives', 'One Google Sheet, seven tabs.', 'data')) +
    mrow('info', 'What this app does', 'The feature list.', 'about') + '</div>' +
    '<div class="btns" style="margin-top:12px"><button class="btn danger" data-logout>' + ICON.out + ' Sign out</button></div></div>' +
    '<p class="small faint" style="text-align:center">' + esc(CFG.APP_NAME) + ' v' + esc(CFG.VERSION) + ' · server …' + esc(String(Store.apiUrl()).slice(-12, -5)) + '</p>';
}
function syncBanner() {
  if (Store.syncing && !T().length && !Store.people.length) return '<div class="banner sync">' + ICON.cloud + 'Loading… this can take a few seconds.</div>';
  if (Store.lastError) return '<div class="banner offline">' + ICON.cloud + 'Couldn\'t sync: ' + esc(Store.lastError) + ' — ' + (Store.lastSync ? 'showing data saved ' + esc(prettyTime(Store.lastSync)) : 'nothing saved on this phone yet') + '. Tap ↻ to try again.</div>';
  if (Store.queue.length && !navigator.onLine) return '<div class="banner queue">' + ICON.cloud + plural(Store.queue.length, 'change') + ' saved on this phone, sent when back online.</div>';
  return '';
}
function render() {
  if ($('#app').classList.contains('hidden')) return;
  const over = T().filter(isOver).length, rem = T().filter(isReminder).length;
  $('#tabs').innerHTML = TABS.map(([k, l]) => '<button class="tab ' + (S.tab === k ? 'on' : '') + '" data-tab="' + k + '">' + ICON[k] + l + (k === 'today' && over ? '<span class="badge num">' + over + '</span>' : '') + '</button>').join('');
  $('#view').innerHTML = { today: renderToday, people: renderPeople, branches: renderBranches, tasks: renderTasks, more: renderMore }[S.tab]();
  $('#banner').innerHTML = syncBanner();
  $('#subline').textContent = CFG.OFFICE_NAME + ' · ' + plural(T().filter(open).length, 'open task') + (Store.queue.length ? ' · ' + Store.queue.length + ' unsynced' : '');
  const bb = $('#bellBadge'); bb.hidden = !rem; bb.textContent = rem;
  $('#syncBtn').style.opacity = Store.syncing ? '.5' : '';
  if (S.tab === 'tasks') { const q = $('#q'); if (q) q.addEventListener('input', e => { S.q = e.target.value; const list = $('#view').querySelector('.list,.empty'); const tmp = document.createElement('div'); tmp.innerHTML = renderTasks(); const nl = tmp.querySelector('.list,.empty'); if (list && nl) list.replaceWith(nl); }); }
  if (S.tab === 'more') {
    const bind = (id, key, fn) => { const el = $('#' + id); if (el) el.addEventListener('change', e => { const o = {}; o[key] = fn ? fn(e.target.value) : e.target.value; Store.saveSettings(o); toast('Saved', 'ok'); }); };
    bind('c-time', 'remindTime'); bind('c-gap', 'dueGap', Number); bind('c-sig', 'sig'); bind('c-sighi', 'sigHi');
  }
}
Store.on(render);

/* ============================================================
   SHEETS: task, person, branch, circular, remind, reminders
   ============================================================ */
function contactBtns(name, mobile, msg) {
  const d = digits(mobile);
  if (!d) return '<div class="cbtns"><button class="btn off">' + ICON.phone + ' Call</button><button class="btn off">' + ICON.wa + ' WhatsApp</button></div><p class="small faint" style="margin:-4px 0 0">No mobile saved for ' + esc(name) + '. Add it under More.</p>';
  return '<div class="cbtns"><a class="btn" href="tel:+91' + d + '">' + ICON.phone + ' Call</a><a class="btn wa" href="https://wa.me/91' + d + (msg ? '?text=' + encodeURIComponent(msg) : '') + '" target="_blank" rel="noopener">' + ICON.wa + ' WhatsApp</a></div><p class="small faint" style="margin:-4px 0 0;user-select:text">+91 ' + d.slice(0, 5) + ' ' + d.slice(5) + '</p>';
}
function histHtml(t) {
  const rows = Store.logsFor(t.id);
  if (!rows.length) return '<li><span class="d"></span><span>' + HIST_TEXT.given + ' <span class="muted">· ' + esc(t.how) + '</span></span><span class="w">' + pretty(t.givenOn) + '</span></li>';
  return rows.map(x => '<li><span class="d ' + (x.kind === 'done' ? 'ok' : x.kind === 'rem' || x.kind === 'ext' ? 'bad' : '') + '"></span><span>' + (HIST_TEXT[x.kind] || esc(x.kind)) + (x.note ? ' <span class="muted">· ' + esc(x.note) + '</span>' : x.kind === 'given' ? ' <span class="muted">· ' + esc(t.how) + '</span>' : '') + '</span><span class="w">' + pretty(x.date) + '</span></li>').join('');
}
function openTask(id) {
  const t = T().find(x => x.id === id); if (!t) return;
  if (t.toType === 'many') return openCircular(t);
  const p = t.toType === 'staff' ? Store.person(t.toId) : null, b = t.toType === 'branch' ? Store.branch(t.toId) : null;
  const body =
    '<div class="tags" style="justify-content:flex-start"><span class="pill ' + whoClass(t) + '">' + (t.toType === 'staff' ? 'RO staff' : 'Branch') + '</span>' + (t.category ? '<span class="pill p-cat">' + esc(t.category) + '</span>' : '') + tagsHtml(t) + (open(t) ? '' : '<span class="pill p-done">Done</span>') + '</div>' +
    '<div class="kv"><div><div class="l">Given to</div><div class="v">' + esc(whoName(t)) + '</div><div class="small muted">' + esc(whoRole(t)) + (b && b.bm ? ' · BM ' + esc(b.bm) : '') + '</div></div>' +
    '<div><div class="l">' + (open(t) ? 'Due' : 'Done on') + '</div><div class="v">' + (open(t) ? pretty(t.dueDate) : pretty(t.doneOn)) + '</div><div class="small">' + dueHtml(t) + '</div></div>' +
    '<div><div class="l">Given on</div><div class="v">' + pretty(t.givenOn) + '</div><div class="small muted">' + esc(t.how) + ' · ' + plural(dayDiff(today(), t.givenOn), 'day') + ' ago</div></div>' +
    '<div><div class="l">Source · category</div><div class="v">' + esc(SOURCES[t.source] || t.source) + '</div><div class="small muted">' + esc(groupOf(t.category)) + '</div></div>' +
    (b ? '<div style="grid-column:1/-1"><div class="l">Nodal officer at RO</div><div class="v">' + nodalHtml(b.code) + '</div></div>' : '') + '</div>' +
    (b ? contactBtns(b.bm || 'the BM', b.mobile, remindText(t)) : '') +
    (open(t) ? '<div class="cbtns"><button class="btn ok" data-done="' + esc(t.id) + '">' + ICON.tick + ' Mark done</button><button class="btn wa" data-remind="' + esc(t.id) + '">' + ICON.wa + ' Remind</button>' +
      '<button class="btn" data-extend="' + esc(t.id) + '">' + ICON.clock + ' Extend due date</button><button class="btn" data-addnote="' + esc(t.id) + '">Add a note</button></div>'
      : '<div class="btns"><button class="btn" data-reopen="' + esc(t.id) + '">Reopen</button></div>') +
    '<div id="taskform"></div>' +
    '<div class="card"><p class="eyebrow">History</p><ul class="tl">' + histHtml(t) + '</ul></div>' +
    (p ? '<div class="note"><b>' + esc(p.name) + '</b> looks after: ' + esc((p.cats || []).join(', ')) + '.</div>' : '') +
    '<div class="btns" style="justify-content:space-between"><button class="btn sm ghost" data-' + (t.toType === 'staff' ? 'person="' + esc(t.toId) : 'branch="' + esc(t.toId)) + '">All tasks with ' + esc(whoName(t)) + ' →</button><button class="btn sm ghost" style="color:var(--danger)" data-deltask="' + esc(t.id) + '">' + ICON.trash + ' Delete</button></div>' +
    '<p class="small faint" style="margin:0">' + esc(t.id) + ' · added by ' + esc(t.createdBy || '') + '</p>';
  sheet(esc(t.text), 'Task', body);
}
function pendingListText(name, ts) {
  const st = settings();
  const lines = ts.map((t, i) => (i + 1) + '. ' + t.text + ' — due ' + pretty(t.dueDate) + (isOver(t) ? ' (' + plural(daysLate(t), 'day') + ' late)' : ''));
  return st.lang === 'hi'
    ? name + ' जी, आपके पास लंबित कार्य:\n\n' + lines.join('\n') + '\n\nकृपया स्थिति बताएँ।\n— ' + st.sigHi
    : name + ', your pending tasks from the RO:\n\n' + lines.join('\n') + '\n\nPlease update me on each.\n— ' + st.sig;
}
function openPerson(id) {
  const p = Store.person(id); if (!p) return;
  const ts = byDue(staffTasks(id)), o = ts.filter(open), d = ts.filter(t => !open(t));
  const body = '<div class="stats"><div class="stat" style="--h:var(--w-staff)"><b class="num">' + o.length + '</b><span>open</span></div><div class="stat ' + (o.filter(isOver).length ? 'bad' : '') + '" style="--h:var(--danger)"><b class="num">' + o.filter(isOver).length + '</b><span>overdue</span></div><div class="stat" style="--h:var(--ok)"><b class="num">' + d.length + '</b><span>done</span></div></div>' +
    '<div class="note"><b>Looks after:</b> ' + esc((p.cats || []).join(', ') || 'nothing set yet') + '.' +
      (subName(p) ? '<br><b>Substitute:</b> <button class="link" data-person="' + esc(p.sub) + '">' + esc(subName(p)) + '</button>' : '') +
      (p.nodal && p.nodal.length ? '<br><b>Nodal officer for:</b> ' + esc(p.nodal.map(bname).join(', ')) + '.' : '') + '</div>' +
    contactBtns(p.name, p.mobile, o.length ? pendingListText(p.name.split(' ')[0], byUrgency(o)) : '') +
    (o.length ? '<button class="btn full" data-pendlist="' + esc(id) + '">' + ICON.copy + ' Send ' + esc(p.name.split(' ')[0]) + ' the pending list</button>' : '') +
    section('Open', o.length, listHtml(byUrgency(o), { hideWho: true, empty: 'Nothing pending with ' + esc(p.name) })) +
    (d.length ? section('Done', d.length, listHtml(d, { hideWho: true })) : '') +
    '<div class="cbtns"><button class="btn pri" data-give-staff="' + esc(id) + '">' + ICON.plus + ' Give a task</button><button class="btn" data-edit-staff="' + esc(id) + '">' + ICON.pen + ' Edit details</button></div>';
  sheet(esc(p.name), esc(p.role) + ' · Regional Office', body);
}
function openBranch(code) {
  const b = Store.branch(code); if (!b) return;
  const ts = byDue(branchTasks(code)), o = ts.filter(open), d = ts.filter(t => !open(t));
  const circ = T().filter(t => t.toType === 'many' && open(t) && (t.toCodes || []).includes(b.code) && !(t.replied || {})[b.code]);
  const body = '<div class="kv"><div><div class="l">Branch Manager</div><div class="v">' + (b.bm ? esc(b.bm) : '<span class="faint">not saved</span>') + '</div></div><div><div class="l">Open · overdue</div><div class="v num">' + o.length + ' · <span style="color:var(--danger)">' + o.filter(isOver).length + '</span></div></div>' +
    '<div style="grid-column:1/-1"><div class="l">Nodal officer at RO</div><div class="v">' + nodalHtml(b.code) + '</div></div></div>' +
    contactBtns(b.bm || 'the BM', b.mobile, o.length ? pendingListText(b.bm ? b.bm.split(' ')[0] : 'BM ' + b.name, byUrgency(o)) : '') +
    section('Open', o.length, listHtml(byUrgency(o), { hideWho: true, empty: 'No open task for ' + esc(b.name) })) +
    (circ.length ? section('Circulars not yet replied', circ.length, '<div class="list">' + circ.map(t => '<button class="trow" data-task="' + esc(t.id) + '"><div class="tags" style="grid-column:1/-1;justify-content:flex-start;max-width:none">' + tagsHtml(t) + '</div><div class="txt">' + esc(t.text) + '</div><div class="r3">' + dueHtml(t) + '</div></button>').join('') + '</div>') : '') +
    (d.length ? section('Done', d.length, listHtml(d, { hideWho: true })) : '') +
    '<div class="cbtns"><button class="btn pri" data-give-branch="' + b.code + '">' + ICON.plus + ' Give a task</button><button class="btn" data-edit-branch="' + b.code + '">' + ICON.pen + ' Edit contact</button></div>';
  sheet(esc(b.name) + ' <span class="faint" style="font-weight:500">' + b.code + '</span>', 'Branch', body);
}
function openCircular(t) {
  const codes = t.toCodes || [], pend = pendingOf(t), n = codes.length || 1;
  const rows = codes.slice().sort((a, b) => ((t.replied || {})[a] ? 1 : 0) - ((t.replied || {})[b] ? 1 : 0) || bname(a).localeCompare(bname(b)))
    .map(c => '<button class="tick ' + ((t.replied || {})[c] ? 'on' : '') + '" data-tick="' + esc(t.id) + ':' + c + '"><span class="box">' + ((t.replied || {})[c] ? ICON.tick : '') + '</span><span class="nm">' + esc(bname(c)) + ' <span class="faint small">' + c + '</span></span><span class="st">' + ((t.replied || {})[c] ? 'replied' : 'pending') + '</span></button>').join('');
  const body = '<div class="tags" style="justify-content:flex-start"><span class="pill p-many">Circular</span>' + (t.category ? '<span class="pill p-cat">' + esc(t.category) + '</span>' : '') + tagsHtml(t) + (open(t) ? '' : '<span class="pill p-done">Done</span>') + '</div>' +
    '<div class="card"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span class="num"><b>' + (n - pend.length) + ' of ' + n + '</b> replied</span>' + dueHtml(t) + '</div><div class="bar ' + (pend.length ? '' : 'all') + '"><i style="width:' + Math.round((n - pend.length) / n * 100) + '%;background:var(--w-many)"></i></div>' +
    '<div class="small muted" style="margin-top:8px">Given ' + pretty(t.givenOn) + ' by ' + esc(t.how) + ' · ' + esc(SOURCES[t.source] || '') + '</div></div>' +
    (open(t) ? '<div class="cbtns"><button class="btn wa" data-remind="' + esc(t.id) + '" ' + (pend.length ? '' : 'disabled') + '>' + ICON.wa + ' Remind ' + pend.length + ' pending</button><button class="btn ok" data-done="' + esc(t.id) + '">' + ICON.tick + ' Close circular</button></div>' : '<div class="btns"><button class="btn" data-reopen="' + esc(t.id) + '">Reopen</button></div>') +
    '<div class="card"><p class="eyebrow">Tick when a branch replies</p><div class="ticks">' + rows + '</div></div>' +
    '<div class="card"><p class="eyebrow">History</p><ul class="tl">' + histHtml(t) + '</ul></div>' +
    '<div class="btns" style="justify-content:flex-end"><button class="btn sm ghost" style="color:var(--danger)" data-deltask="' + esc(t.id) + '">' + ICON.trash + ' Delete</button></div>';
  sheet(esc(t.text), 'Circular · ' + esc(whoName(t)), body);
}
function remindText(t) {
  const st = settings(), late = isOver(t) ? daysLate(t) : 0;
  if (t.toType === 'many') {
    const pend = pendingOf(t).map(bname).join(', ');
    return st.lang === 'hi'
      ? 'क्षेत्रीय कार्यालय हजारीबाग से अनुस्मारक\n\n"' + t.text + '" की नियत तिथि ' + pretty(t.dueDate) + ' थी' + (late ? ' (' + late + ' दिन विलंब)' : '') + '। निम्न शाखाओं का उत्तर अब तक प्राप्त नहीं हुआ है:\n' + pend + '\n\nकृपया आज ही भेजें।\n— ' + st.sigHi
      : 'Reminder from RO Hazaribag\n\n"' + t.text + '" was due on ' + pretty(t.dueDate) + (late ? ' (' + plural(late, 'day') + ' late)' : '') + '. Reply is still awaited from:\n' + pend + '\n\nPlease send it today.\n— ' + st.sig;
  }
  return st.lang === 'hi'
    ? 'क्षेत्रीय कार्यालय हजारीबाग से अनुस्मारक\n\n"' + t.text + '" (' + pretty(t.givenOn) + ' को दिया गया) की नियत तिथि ' + pretty(t.dueDate) + ' ' + (late ? 'थी (' + late + ' दिन विलंब)' : 'है') + '। कृपया पूर्ण कर आज ही सूचित करें।\n— ' + st.sigHi
    : 'Reminder from RO Hazaribag\n\n"' + t.text + '" (given ' + pretty(t.givenOn) + ') ' + (late ? 'was due on ' + pretty(t.dueDate) + ' and is ' + plural(late, 'day') + ' late' : 'is due on ' + pretty(t.dueDate)) + '. Please complete it and confirm today.\n— ' + st.sig;
}
function openRemind(id) {
  const t = T().find(x => x.id === id); if (!t) return;
  const d = digits(mobileOf(t)), txt = remindText(t);
  const body = '<div class="toggle">' + [['en', 'English'], ['hi', 'हिन्दी']].map(([k, l]) => '<button class="' + (settings().lang === k ? 'on' : '') + '" data-lang-r="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<div class="msg" id="rtext">' + esc(txt) + '</div>' +
    '<div class="cbtns">' + (d ? '<a class="btn wa" id="walink" href="https://wa.me/91' + d + '?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener" data-send="' + esc(t.id) + '">' + ICON.wa + ' Open WhatsApp</a>' : '<button class="btn wa" data-send="' + esc(t.id) + '">' + ICON.wa + ' Mark as reminded</button>') + '<button class="btn" data-copy>' + ICON.copy + ' Copy text</button></div>' +
    '<p class="small faint" style="margin:0">' + (d ? 'Opens WhatsApp to ' + esc(whoName(t)) + ' with the text filled in; you press send there. "Reminded" is written into the history.' : t.toType === 'many' ? 'Copy the text and paste it in the BMs\' WhatsApp group, or save BM mobiles under More to open each chat.' : 'No mobile saved for ' + esc(whoName(t)) + '. Copy the text, or add the mobile under More.') + '</p>' +
    '<div class="btns"><button class="btn sm ghost" data-task="' + esc(t.id) + '">← Back to the task</button></div>';
  sheet('Remind ' + esc(whoName(t)), esc(t.text), body);
}
function openReminders() {
  const over = byUrgency(T().filter(t => isOver(t) && isReminder(t))), td = byUrgency(T().filter(t => isToday(t) && isReminder(t))), soon = byDue(T().filter(t => isSoon(t) && isReminder(t)));
  const snoozed = T().filter(t => open(t) && t.snoozeTill && t.snoozeTill > today());
  const rb = Number(settings().remindBefore) || 0;
  const row = t => '<div class="trow" style="cursor:default"><div class="who ' + whoClass(t) + '"><i></i>' + esc(whoName(t)) + '</div><div class="tags">' + tagsHtml(t) + '</div><div class="txt">' + esc(t.text) + '</div><div class="r3">' + dueHtml(t) + '</div>' +
    '<div class="r3" style="margin-top:6px"><button class="btn sm" data-task="' + esc(t.id) + '">Open</button><button class="btn sm ghost" data-snooze="' + esc(t.id) + '">Snooze till tomorrow</button></div></div>';
  const list = ts => ts.length ? '<div class="list">' + ts.map(row).join('') + '</div>' : '<div class="empty">None</div>';
  const body = (over.length ? section('Overdue', over.length, list(over)) : '') + (td.length ? section('Due today', td.length, list(td)) : '') +
    (rb ? section('Coming up in ' + plural(rb, 'day'), soon.length, list(soon)) : '') +
    (!over.length && !td.length && !soon.length ? '<div class="empty">Nothing to remind you of.</div>' : '') +
    (snoozed.length ? '<p class="small faint" style="margin:0">' + plural(snoozed.length, 'reminder') + ' snoozed till tomorrow.</p>' : '') +
    '<div class="note">Reminders live in the app for now. Next step: Google Tasks in the RM\'s account, so the phone notifies at ' + esc(settings().remindTime) + ' on the due date even when the app is closed.</div>';
  sheet('Reminders', 'Overdue, due today' + (rb ? ', and the next ' + plural(rb, 'day') : ''), body);
}

/* ============================================================
   GIVE A TASK, EXTEND, NOTE, DONE, REMIND, SNOOZE
   ============================================================ */
function catSelect(selId, staffId, current) {
  const p = staffId ? Store.person(staffId) : null;
  let html = '<select class="inp" id="' + selId + '"><option value="">Choose a category</option>';
  if (p && p.cats && p.cats.length) html += '<optgroup label="Allotted to ' + esc(p.name) + '">' + p.cats.map(c => '<option ' + (current === c ? 'selected' : '') + '>' + esc(c) + '</option>').join('') + '</optgroup>';
  html += Store.cats.map(g => '<optgroup label="' + esc(g.group) + '">' + g.items.map(c => '<option ' + (current === c && !(p && p.cats.includes(c)) ? 'selected' : '') + '>' + esc(c) + '</option>').join('') + '</optgroup>').join('');
  html += '<option value="__new">+ New category…</option></select>';
  return html;
}
function openGive(pre) {
  pre = pre || {};
  const type = pre.type || 'staff', gap = Number(settings().dueGap) || 0;
  const body = '<form id="give">' +
    '<label class="f">What is the task<textarea class="inp" id="g-text" rows="2" required placeholder="e.g. Send staff count to HO by Friday"></textarea></label>' +
    '<div class="toggle" style="margin-top:10px">' + [['staff', 'RO staff'], ['branch', 'One branch'], ['many', 'Many branches']].map(([k, l]) => '<button type="button" class="' + (type === k ? 'on' : '') + '" data-gtype="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<div id="g-who" style="margin-top:10px"></div>' +
    '<label class="f" style="margin-top:10px">Category of task<span id="g-catwrap">' + catSelect('g-cat', pre.staff || '', '') + '</span></label>' +
    '<div id="g-newcat" hidden style="margin-top:8px"><div class="row2"><input class="inp" id="g-catname" placeholder="New category name"><select class="inp" id="g-catgrp">' + Store.cats.map(g => '<option>' + esc(g.group) + '</option>').join('') + '</select></div></div>' +
    '<div class="row2" style="margin-top:10px"><label class="f">How did you give it<select class="inp" id="g-how">' + HOW.map(h => '<option>' + h + '</option>').join('') + '</select></label>' +
    '<label class="f">Source<select class="inp" id="g-src">' + Object.entries(SOURCES).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label></div>' +
    '<label class="f" style="margin-top:10px">Due date<input class="inp" type="date" id="g-due" value="' + addDays(today(), gap) + '" min="' + today() + '" required></label>' +
    '<div class="quick" style="margin-top:8px">' + [[0, 'Today'], [1, 'Tomorrow'], [2, 'In 2 days'], [7, 'In a week'], [15, '15 days']].map(([n, l]) => '<button type="button" data-qd="' + n + '" class="' + (n === gap ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
    '<div class="sw" style="margin-top:10px"><div><div class="t">Critical</div><div class="s">Sits on top of Today until done</div></div><button type="button" class="knob" id="g-crit" aria-pressed="false" aria-label="Critical"></button></div>' +
    '<label class="f" style="margin-top:10px">Note (optional)<input class="inp" id="g-note" placeholder="Reference, letter number, who asked…"></label>' +
    '<button class="btn pri full" type="submit" style="margin-top:14px">Save task</button>' +
    '<p class="small faint" style="margin:8px 0 0;text-align:center">About 20 seconds. The reminder is set automatically.</p></form>';
  sheet('Give a task', 'Saved to the Sheet; comes back to you on its due date', body);
  const G = { type, staff: pre.staff || '', branch: pre.branch || '', many: new Set(), crit: false };
  const who = $('#g-who');
  const drawWho = () => {
    if (G.type === 'staff') { const p = G.staff ? Store.person(G.staff) : null;
      who.innerHTML = '<label class="f">To whom</label><div class="quick" style="margin-top:6px">' + Store.people.map(x => '<button type="button" data-gs="' + esc(x.id) + '" class="' + (G.staff === x.id ? 'on' : '') + '" title="' + esc(x.role) + '">' + esc(x.name) + '</button>').join('') + '</div>' + (p ? '<p class="small muted" style="margin:6px 0 0"><b>' + esc(p.role) + '</b> · looks after ' + esc((p.cats || []).slice(0, 4).join(', ')) + ((p.cats || []).length > 4 ? '…' : '') + '</p>' : '');
      const cur = $('#g-cat') ? $('#g-cat').value : ''; $('#g-catwrap').innerHTML = catSelect('g-cat', G.staff, cur); }
    else if (G.type === 'branch') who.innerHTML = '<label class="f">Which branch<select class="inp" id="g-branch"><option value="">Choose a branch</option>' + Store.branches.slice().sort((a, b) => a.name.localeCompare(b.name)).map(b => '<option value="' + b.code + '" ' + (String(G.branch) === String(b.code) ? 'selected' : '') + '>' + esc(b.name) + ' · ' + b.code + (b.bm ? ' · ' + esc(b.bm) : '') + '</option>').join('') + '</select></label>';
    else who.innerHTML = '<label class="f">Which branches <span class="faint">(' + (G.many.size || 'all ' + Store.branches.length) + ')</span></label><div class="quick" style="margin-top:6px"><button type="button" data-gall class="' + (G.many.size ? '' : 'on') + '">All ' + Store.branches.length + '</button>' + Store.branches.map(b => '<button type="button" data-gm="' + b.code + '" class="' + (G.many.has(Number(b.code)) ? 'on' : '') + '">' + esc(b.name) + '</button>').join('') + '</div>';
  };
  drawWho();
  const form = $('#give');
  form.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.gtype) { G.type = b.dataset.gtype; form.querySelectorAll('[data-gtype]').forEach(x => x.classList.toggle('on', x === b)); drawWho(); }
    else if (b.dataset.gs) { G.staff = b.dataset.gs; drawWho(); }
    else if (b.dataset.gm) { const c = +b.dataset.gm; G.many.has(c) ? G.many.delete(c) : G.many.add(c); drawWho(); }
    else if (b.hasAttribute('data-gall')) { G.many.clear(); drawWho(); }
    else if (b.dataset.qd != null) { $('#g-due').value = addDays(today(), +b.dataset.qd); form.querySelectorAll('[data-qd]').forEach(x => x.classList.toggle('on', x === b)); }
    else if (b.id === 'g-crit') { G.crit = !G.crit; b.classList.toggle('on', G.crit); b.setAttribute('aria-pressed', String(G.crit)); }
  });
  form.addEventListener('change', e => {
    if (e.target.id === 'g-branch') G.branch = e.target.value;
    if (e.target.id === 'g-due') form.querySelectorAll('[data-qd]').forEach(x => x.classList.remove('on'));
    if (e.target.id === 'g-cat') { $('#g-newcat').hidden = e.target.value !== '__new'; if (e.target.value === '__new') $('#g-catname').focus(); }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = $('#g-text').value.trim(), due = $('#g-due').value;
    if (!text) { toast('Write what the task is', 'err'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) { toast('Pick a due date', 'err'); return; }
    const t = { toType: G.type, toId: '', toName: '', toCodes: [], replied: {} };
    if (G.type === 'staff') { if (!G.staff) { toast('Pick a person', 'err'); return; } t.toId = G.staff; t.toName = (Store.person(G.staff) || {}).name || ''; }
    else if (G.type === 'branch') { if (!G.branch) { toast('Pick a branch', 'err'); return; } t.toId = String(G.branch); t.toName = (Store.branch(G.branch) || {}).name || ''; }
    else { t.toCodes = G.many.size ? [...G.many] : Store.branches.map(b => Number(b.code)); t.replied = {}; t.toName = t.toCodes.length + ' branches'; }
    let cat = $('#g-cat').value;
    if (cat === '__new') {
      cat = $('#g-catname').value.trim(); if (!cat) { toast('Name the new category', 'err'); return; }
      const cats = JSON.parse(JSON.stringify(Store.cats)); const g = cats.find(x => x.group === $('#g-catgrp').value);
      if (g && !g.items.includes(cat)) { g.items.push(cat); Store.saveCategories(cats); }
    }
    if (!cat) { toast('Choose a category', 'err'); return; }
    const note = $('#g-note').value.trim();
    Object.assign(t, { category: cat, text, how: $('#g-how').value, givenOn: today(), dueDate: due, status: 'open', doneOn: '', source: $('#g-src').value, critical: G.crit, snoozeTill: '' });
    Store.saveTask(t, [{ kind: 'given', note }]);
    forceClose(); S.tab = 'today'; render();
    toast(navigator.onLine ? 'Saved. Reminder on ' + pretty(addDays(due, -(Number(settings().remindBefore) || 0)) < today() ? today() : addDays(due, -(Number(settings().remindBefore) || 0))) : 'Saved on this phone — will sync', 'ok');
  });
}
function extendForm(id) {
  const t = T().find(x => x.id === id);
  $('#taskform').innerHTML = '<form class="card" id="xf"><p class="eyebrow">Extend due date</p><div class="row2"><label class="f">New due date<input class="inp" type="date" id="x-due" value="' + (t.dueDate > today() ? addDays(t.dueDate, 2) : addDays(today(), 1)) + '" min="' + today() + '" required></label><label class="f">Why<input class="inp" id="x-why" placeholder="What they told you" required></label></div><div class="btns" style="margin-top:10px"><button class="btn pri" type="submit">Save new date</button><button class="btn ghost" type="button" data-cancelform>Cancel</button></div></form>';
  $('#xf').addEventListener('submit', e => { e.preventDefault(); const d = $('#x-due').value, why = $('#x-why').value.trim(); if (!d || !why) return;
    Store.saveTask(Object.assign({}, t, { dueDate: d, snoozeTill: '' }), [{ kind: 'ext', note: 'Due date moved from ' + pretty(t.dueDate) + ' to ' + pretty(d) + ': ' + why }]);
    openTask(id); toast('Due date moved to ' + pretty(d), 'ok'); });
}
function noteForm(id) {
  const t = T().find(x => x.id === id);
  $('#taskform').innerHTML = '<form class="card" id="nf"><p class="eyebrow">Add a note</p><label class="f">What happened<textarea class="inp" id="n-x" rows="2" required placeholder="e.g. Says file sent to HO on 6 Nov, awaiting acknowledgement"></textarea></label><div class="btns" style="margin-top:10px"><button class="btn pri" type="submit">Save note</button><button class="btn ghost" type="button" data-cancelform>Cancel</button></div></form>';
  $('#nf').addEventListener('submit', e => { e.preventDefault(); const x = $('#n-x').value.trim(); if (!x) return; Store.saveTask(Object.assign({}, t), [{ kind: 'note', note: x }]); openTask(id); toast('Note saved', 'ok'); });
}
function markDone(id) { const t = T().find(x => x.id === id); Store.saveTask(Object.assign({}, t, { status: 'done', doneOn: today() }), [{ kind: 'done', note: '' }]); forceClose(); render(); toast('Done · ' + whoName(t), 'ok'); }
function reopen(id) { const t = T().find(x => x.id === id); Store.saveTask(Object.assign({}, t, { status: 'open', doneOn: '' }), [{ kind: 'reopen', note: '' }]); openTask(id); }
function sendReminder(id) { const t = T().find(x => x.id === id); Store.saveTask(Object.assign({}, t), [{ kind: 'rem', note: 'Reminded on WhatsApp' }]); forceClose(); render(); toast('"Reminded" written into the history', 'ok'); }
function snooze(id) { const t = T().find(x => x.id === id); const till = addDays(today(), 1); Store.saveTask(Object.assign({}, t, { snoozeTill: till }), [{ kind: 'snooze', note: 'till ' + pretty(till) }]); openReminders(); toast('Snoozed till tomorrow', 'ok'); }
function deleteTask(id) {
  const b = layer.querySelector('[data-deltask="' + id + '"]'); if (!b) return;
  if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ''; b.innerHTML = ICON.trash + ' Delete'; } }, 3000); return; }
  Store.deleteTask(id); forceClose(); render(); toast('Deleted. The row stays in the Sheet, marked deleted.', 'ok');
}

/* ============================================================
   MORE: editors
   ============================================================ */
function openPeopleList() {
  const rows = Store.people.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => '<button class="erow" data-edit-staff="' + esc(p.id) + '"><div><div class="n">' + esc(p.name) + '</div><div class="s">' + esc(p.role) + ' · ' + plural((p.cats || []).length, 'category') + (subName(p) ? ' · substitute ' + esc(subName(p)) : '') + '</div></div><div class="mob ' + (digits(p.mobile) ? 'set' : '') + '">' + (digits(p.mobile) ? '+91 ' + digits(p.mobile) : 'no mobile') + '</div></button>').join('');
  sheet('People', 'RO staff the RM gives tasks to', '<button class="btn pri full" data-edit-staff="">' + ICON.plus + ' Add a person</button><div class="card"><div class="menu">' + (rows || '<div class="empty">No people yet</div>') + '</div></div><p class="small faint" style="margin:0">A person with open tasks cannot be removed; mark their tasks done first. Removed people keep their old tasks.</p>');
}
function openStaffEditor(id) {
  const p = id ? Store.person(id) : { id: '', name: '', role: '', mobile: '', sub: '', nodal: [], cats: [] }; if (!p) return;
  const sel = new Set(p.cats || []); const nod = new Set(p.nodal || []);
  const grpHtml = () => Store.cats.map(g => '<div class="catgrp"><div class="g">' + esc(g.group) + '<span>' + g.items.filter(c => sel.has(c)).length + '/' + g.items.length + '</span></div><div class="quick">' + g.items.map(c => '<button type="button" data-pc="' + esc(c) + '" class="' + (sel.has(c) ? 'on' : '') + '">' + esc(c) + '</button>').join('') + '</div></div>').join('');
  const nodHtml = () => Store.branches.slice().sort((a, b) => a.name.localeCompare(b.name)).map(b => '<button type="button" data-pn="' + b.code + '" class="' + (nod.has(Number(b.code)) ? 'on' : '') + '">' + esc(b.name) + '</button>').join('');
  const openN = id ? staffTasks(id).filter(open).length : 0;
  const body = '<form id="sf"><div class="row2"><label class="f">Name<input class="inp" id="s-name" value="' + esc(p.name) + '" required placeholder="Full name"></label><label class="f">Designation<input class="inp" id="s-role" value="' + esc(p.role) + '" placeholder="e.g. DO HR"></label></div>' +
    '<div class="row2" style="margin-top:10px"><label class="f">Mobile<input class="inp" id="s-mob" inputmode="numeric" value="' + esc(p.mobile) + '" placeholder="10 digits"></label>' +
    '<label class="f">Substitute<select class="inp" id="s-sub"><option value="">None</option>' + Store.people.filter(x => x.id !== p.id).map(x => '<option value="' + esc(x.id) + '" ' + (p.sub === x.id ? 'selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label></div>' +
    '<div class="card" style="margin-top:12px"><p class="eyebrow">Looks after (tap to toggle)</p><div id="s-cats">' + grpHtml() + '</div></div>' +
    '<div class="card" style="margin-top:12px"><p class="eyebrow">Nodal officer for (tap to toggle)</p><div class="quick" id="s-nodal">' + nodHtml() + '</div></div>' +
    '<div class="cbtns" style="margin-top:12px"><button class="btn pri" type="submit">' + (id ? 'Save' : 'Add person') + '</button>' + (id ? '<button class="btn danger" type="button" data-del-staff="' + esc(id) + '" ' + (openN ? 'disabled title="Has open tasks"' : '') + '>Remove' + (openN ? ' (' + openN + ' open)' : '') + '</button>' : '<button class="btn ghost" type="button" data-more="people">Cancel</button>') + '</div></form>';
  sheet(id ? esc(p.name) : 'Add a person', id ? 'Edit details' : 'RO staff', body);
  const f = $('#sf');
  f.addEventListener('click', e => { const b = e.target.closest('[data-pc],[data-pn]'); if (!b) return;
    if (b.dataset.pc) { const c = b.dataset.pc; sel.has(c) ? sel.delete(c) : sel.add(c); $('#s-cats').innerHTML = grpHtml(); }
    else { const c = +b.dataset.pn; nod.has(c) ? nod.delete(c) : nod.add(c); $('#s-nodal').innerHTML = nodHtml(); } });
  f.addEventListener('submit', e => { e.preventDefault(); const name = $('#s-name').value.trim(); if (!name) { toast('Name is needed', 'err'); return; }
    const mob = $('#s-mob').value.trim(); if (mob && !digits(mob)) { toast('Mobile needs 10 digits', 'err'); return; }
    let nid = p.id;
    if (!nid) { nid = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'p'; while (Store.person(nid)) nid += '1'; }
    Store.savePerson({ id: nid, name, role: $('#s-role').value.trim(), mobile: digits(mob), sub: $('#s-sub').value, nodal: [...nod], cats: allCats().filter(c => sel.has(c)) });
    openPeopleList(); toast(id ? 'Saved' : 'Added ' + name, 'ok'); });
}
function openBranchList() {
  const q = S.bq.trim().toLowerCase();
  const rows = Store.branches.slice().sort((a, b) => a.name.localeCompare(b.name)).filter(b => !q || (b.name + ' ' + b.code + ' ' + b.bm).toLowerCase().includes(q))
    .map(b => '<button class="erow" data-edit-branch="' + b.code + '"><div><div class="n">' + esc(b.name) + ' <span class="faint small">' + b.code + '</span></div><div class="s">' + (b.bm ? 'BM ' + esc(b.bm) : '<span class="faint">BM name not saved</span>') + '</div></div><div class="mob ' + (digits(b.mobile) ? 'set' : '') + '">' + (digits(b.mobile) ? '+91 ' + digits(b.mobile) : 'no mobile') + '</div></button>').join('');
  sheet('Branch contacts', Store.branches.length + ' branches · BM name and mobile', '<input class="search" id="bq" type="search" placeholder="Find a branch" value="' + esc(S.bq) + '"><button class="btn full" data-edit-branch="">' + ICON.plus + ' Add a branch</button><div class="card"><div class="menu">' + (rows || '<div class="empty">No branch matches</div>') + '</div></div>');
  $('#bq').addEventListener('input', e => { S.bq = e.target.value; const pos = e.target.selectionStart; openBranchList(); const el = $('#bq'); el.focus(); el.setSelectionRange(pos, pos); });
}
function openBranchEditor(code) {
  const isNew = code === '' || code == null;
  const b = isNew ? { code: '', name: '', bm: '', mobile: '' } : Store.branch(code); if (!b) return;
  const n = isNew ? 0 : branchTasks(b.code).length;
  const body = '<form id="bf"><div class="row2"><label class="f">Branch code<input class="inp" id="b-code" inputmode="numeric" value="' + esc(b.code) + '" ' + (isNew ? 'required' : 'readonly') + ' placeholder="e.g. 444"></label><label class="f">Branch name<input class="inp" id="b-name" value="' + esc(b.name) + '" required></label></div>' +
    '<div class="row2" style="margin-top:10px"><label class="f">Branch Manager<input class="inp" id="b-bm" value="' + esc(b.bm) + '" placeholder="Name"></label><label class="f">BM mobile<input class="inp" id="b-mob" inputmode="numeric" value="' + esc(b.mobile) + '" placeholder="10 digits"></label></div>' +
    '<div class="cbtns" style="margin-top:12px"><button class="btn pri" type="submit">' + (isNew ? 'Add branch' : 'Save') + '</button>' + (isNew ? '<button class="btn ghost" type="button" data-more="branches">Cancel</button>' : '<button class="btn danger" type="button" data-del-branch="' + b.code + '" ' + (n ? 'disabled title="Has tasks"' : '') + '>Remove' + (n ? ' (' + n + ' tasks)' : '') + '</button>') + '</div></form>' +
    (isNew ? '' : '<div class="btns"><button class="btn sm ghost" data-branch="' + b.code + '">Tasks with ' + esc(b.name) + ' →</button></div>');
  sheet(isNew ? 'Add a branch' : esc(b.name) + ' <span class="faint" style="font-weight:500">' + b.code + '</span>', isNew ? 'Branch contacts' : 'Edit contact', body);
  $('#bf').addEventListener('submit', e => { e.preventDefault(); const name = $('#b-name').value.trim(), bm = $('#b-bm').value.trim(), mob = $('#b-mob').value.trim();
    if (!name) { toast('Branch name is needed', 'err'); return; } if (mob && !digits(mob)) { toast('Mobile needs 10 digits', 'err'); return; }
    let c = b.code;
    if (isNew) { c = parseInt($('#b-code').value, 10); if (!c) { toast('Branch code is needed', 'err'); return; } if (Store.branch(c)) { toast('Branch ' + c + ' already exists', 'err'); return; } }
    Store.saveBranch({ code: Number(c), name, bm, mobile: digits(mob) });
    openBranchList(); toast(isNew ? 'Added ' + name : 'Saved', 'ok'); });
}
function openCats() {
  const used = c => T().filter(t => t.category === c).length;
  const body = '<form id="cf" class="card"><p class="eyebrow">Add a category</p><div class="row2"><input class="inp" id="c-name" placeholder="Category name" required><select class="inp" id="c-grp">' + Store.cats.map(g => '<option>' + esc(g.group) + '</option>').join('') + '</select></div><div class="btns" style="margin-top:10px"><button class="btn pri" type="submit">Add</button></div></form>' +
    '<div class="card">' + Store.cats.map(g => '<div class="catgrp"><div class="g">' + esc(g.group) + '<span>' + g.items.length + '</span></div><div class="quick">' + g.items.map(c => '<span class="chip x" style="padding:5px 6px 5px 11px;font-size:12.5px">' + esc(c) + (used(c) ? ' <span class="k">' + used(c) + '</span>' : '') + '<button type="button" class="del" data-del-cat="' + esc(c) + '" aria-label="Remove ' + esc(c) + '" ' + (used(c) ? 'disabled title="In use"' : '') + '>' + ICON.x + '</button></span>').join('') + '</div></div>').join('') + '</div>' +
    '<p class="small faint" style="margin:0">The groups come from the RO work-allotment sheet. A category used by a task cannot be removed. The number shows how many tasks use it.</p>';
  sheet('Task categories', allCats().length + ' categories · ' + Store.cats.length + ' groups', body);
  $('#cf').addEventListener('submit', e => { e.preventDefault(); const n = $('#c-name').value.trim(); if (!n) return; if (allCats().includes(n)) { toast(n + ' already exists', 'err'); return; }
    const cats = JSON.parse(JSON.stringify(Store.cats)); cats.find(g => g.group === $('#c-grp').value).items.push(n); Store.saveCategories(cats); openCats(); toast('Added ' + n, 'ok'); });
}
function openAbout() {
  const feat = (ic, t, p) => '<div class="feat"><div class="ic">' + ICON[ic] + '</div><div><b>' + t + '</b><p>' + p + '</p></div></div>';
  sheet('What this app does', CFG.APP_NAME + ' v' + CFG.VERSION, '<div class="card">' +
    feat('plus', 'Give a task in 20 seconds', 'What, to whom (RO staff or a branch), category, how you gave it, due date. The category list is the RO work-allotment sheet, with the chosen person\'s own areas first.') +
    feat('people', 'Who has what', 'Every RO officer with open and overdue tasks and the oldest one. Tap a name for the full list and a one-tap pending list to send them.') +
    feat('tag', 'By category, by person, by branch', 'Today shows three compact summaries; All tasks filters by status and category group.') +
    feat('bell', 'Reminders in the app', 'The bell shows overdue, due today and upcoming tasks; snooze one till tomorrow. Later: Google Tasks for phone notifications.') +
    feat('flag', 'Critical and HO items on top', 'Mark a task critical, or tag it as from HO or the district administration. Those sit at the top of Today.') +
    feat('branches', 'Branches and circulars', 'A task to one branch, or one circular to many branches with a tick list of who replied. Remind only the pending ones.') +
    feat('clock', 'History on every task', 'Given, reminded, extended, note, done, each with a date, in the TaskLog tab of the Sheet.') +
    feat('search', 'Find anything later', 'Search by a word, a person, a branch or a category across everything, done or not.') +
    feat('gear', 'Your lists, your control', 'People, branch contacts and categories are edited in the app and saved to the Sheet.') +
    feat('sheet', 'Data in a Google Sheet', 'Every task is a row. Works without signal; changes are saved on the phone and sent when back online.') +
    feat('lock', 'Two logins, both Admin', 'rm and anmol. Username and a 4–6 digit PIN. Officers and BMs do not log in.') + '</div>');
}
function openData() {
  sheet('Where the data lives', 'One Google Sheet, seven tabs', '<div class="card"><ul class="tl">' +
    [['Tasks', 'one row per task: who, category, text, how, given, due, status, source, critical'], ['TaskLog', 'one row per history entry: reminded, extended, note, done'], ['People', 'RO staff: name, designation, mobile, substitute, nodal branches, categories'], ['Branches', 'code, name, BM, mobile'], ['Categories', 'group, category'], ['Users', 'rm and anmol, PIN hashes'], ['ActivityLog', 'who changed what, when']]
      .map(([a, b]) => '<li><span class="d"></span><span><b>' + a + '</b> <span class="muted">· ' + b + '</span></span><span></span></li>').join('') + '</ul></div>' +
    '<div class="note">For the trial the Sheet is in <b>Anmol\'s</b> Google account and the script runs from there. Moving to the RM\'s account later means copying the Sheet, redeploying the script from her account, and opening the app once with its new link.</div>');
}
function exportCSV() {
  const rows = T();
  if (!rows.length) { toast('Nothing to export', 'err'); return; }
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['ID', 'Given to', 'Type', 'Category', 'Group', 'Task', 'How', 'Given', 'Due', 'Status', 'Done on', 'Days late', 'Source', 'Critical', 'Reminded times', 'Added by'];
  const body = byDue(rows).map(t => [t.id, whoName(t), t.toType, t.category, groupOf(t.category), t.text, t.how, t.givenOn, t.dueDate, t.status, t.doneOn, isOver(t) ? daysLate(t) : '', SOURCES[t.source] || t.source, t.critical ? 'yes' : '', remCount(t), t.createdBy]);
  const csv = [head].concat(body).map(r => r.map(q).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ro-tasks-' + today() + '.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('CSV downloaded', 'ok');
}
function copyText(txt) {
  const done = () => toast('Copied', 'ok');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => toast('Could not copy. Select the text instead.', 'err'));
  else toast('Could not copy. Select the text instead.', 'err');
}

/* ============================================================
   LOGINS & PINS, CHANGE PIN (template)
   ============================================================ */
function editLogins() {
  const users = JSON.parse(JSON.stringify(Store.users));
  const baseline = users.map(u => u.username);
  const row = (u, isNew) => '<div class="card" style="margin-bottom:10px" data-new="' + (isNew ? 1 : 0) + '"><div class="row2">' +
    '<label class="f">Name<input class="inp" data-n value="' + esc(u.name) + '"></label><label class="f">Username<input class="inp" data-u value="' + esc(u.username) + '" autocapitalize="none" ' + (isNew ? '' : 'readonly') + '></label></div>' +
    '<div class="row2" style="margin-top:8px"><label class="f">' + (isNew ? 'Temporary PIN' : 'Reset PIN') + '<input class="inp" data-p inputmode="numeric" maxlength="6" placeholder="' + (isNew ? '4-6 digits' : 'Leave blank to keep') + '"></label>' +
    '<label class="f">Role<select class="inp" data-r><option' + (u.role !== 'Admin' ? ' selected' : '') + '>Staff</option><option' + (u.role === 'Admin' ? ' selected' : '') + '>Admin</option></select></label></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-top:10px"><span style="font-size:13px;color:var(--text-2);flex:1">Active' + (u.mustChangePin ? ' · <em>has a temporary PIN</em>' : '') + '</span><span class="switch' + (u.active !== false ? ' on' : '') + '"></span><button type="button" class="del36 ldel">' + ICON.trash + '</button></div></div>';
  sheet('Logins & PINs', 'Usernames that can open this app. A PIN set here is temporary: the person picks their own at the next sign-in.',
    '<div id="loginList">' + users.map(u => row(u, false)).join('') + '</div><button class="btn ghost sm" id="addLogin">+ Add login</button><button class="btn pri full" id="saveLogins" style="margin-top:10px">Save logins</button>');
  $('#addLogin').onclick = () => $('#loginList').insertAdjacentHTML('beforeend', row({ username: '', name: '', role: 'Staff', active: true }, true));
  $('#loginList').addEventListener('click', ev => {
    const d = ev.target.closest('.ldel');
    if (d) { const un = d.closest('.card').querySelector('[data-u]').value.trim().toLowerCase(); if (un && un === (Store.user || {}).username) { toast('You cannot remove your own login', 'err'); return; } d.closest('.card').remove(); }
    const sw = ev.target.closest('.switch'); if (sw) sw.classList.toggle('on');
  });
  $('#saveLogins').onclick = () => {
    const out = [];
    for (const c of $$('#loginList .card')) {
      const u = { username: c.querySelector('[data-u]').value.trim().toLowerCase(), name: c.querySelector('[data-n]').value.trim(), pin: c.querySelector('[data-p]').value.trim(), role: c.querySelector('[data-r]').value, active: c.querySelector('.switch').classList.contains('on'), isNew: c.dataset.new === '1' };
      if (!u.username && !u.name) continue;
      if (!u.username || !u.name) { toast('Every login needs a name and a username', 'err'); return; }
      if (!/^[a-z0-9._-]+$/.test(u.username)) { toast('Username "' + u.username + '": letters and numbers only', 'err'); return; }
      if (u.isNew && !u.pin) { toast('Set a temporary PIN for ' + u.name, 'err'); return; }
      if (u.pin && !/^\d{4,6}$/.test(u.pin)) { toast('PIN for ' + u.name + ' must be 4-6 digits', 'err'); return; }
      if (out.some(x => x.username === u.username)) { toast('Username "' + u.username + '" is used twice', 'err'); return; }
      out.push(u);
    }
    if (!out.some(u => u.role === 'Admin' && u.active)) { toast('Keep at least one active Admin', 'err'); return; }
    Store.saveUsers(out, baseline);
    forceClose(); toast('Logins saved', 'ok'); render();
  };
}
function changePin(forcedOld) {
  const forced = typeof forcedOld === 'string';
  sheet(forced ? 'Choose your own PIN' : 'Change PIN', forced ? 'You signed in with a temporary PIN. Pick a new 4 to 6 digit PIN to continue.' : 'Use 4 to 6 digits.',
    (forced ? '' : '<label class="f">Current PIN<input class="inp" id="pOld" inputmode="numeric" type="password"></label>') +
    '<label class="f">New PIN<input class="inp" id="pNew" inputmode="numeric" type="password" maxlength="6"></label>' +
    '<label class="f">Confirm new PIN<input class="inp" id="pNew2" inputmode="numeric" type="password" maxlength="6"></label>' +
    '<button class="btn pri full" id="pSave">Update PIN</button>', forced);
  $('#pSave').onclick = async () => {
    const o = forced ? forcedOld : $('#pOld').value.trim(), n = $('#pNew').value.trim(), n2 = $('#pNew2').value.trim();
    if (!/^\d{4,6}$/.test(n)) { toast('PIN must be 4-6 digits', 'err'); return; }
    if (n !== n2) { toast('New PINs do not match', 'err'); return; }
    if (n === o) { toast('Pick a PIN different from the old one', 'err'); return; }
    try {
      const r = await Store.api('changePin', { oldPin: o, newPin: n });
      if (r.ok) { if (r.token) Store.setSession(r.token, Store.user); forceClose(); toast('PIN updated', 'ok'); }
      else toast(r.message || 'Could not update PIN', 'err');
    } catch (err) {
      if (String(err.message) === 'SESSION_EXPIRED') { forceClose(); showLogin(); toast('Session expired, sign in again', 'err'); }
      else toast('Needs internet connection', 'err');
    }
  };
}

/* ============================================================
   LOGIN
   ============================================================ */
let pin = '';
function renderPinpad() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  $('#pinPad').innerHTML = keys.map(k => k === '' ? '<span></span>' : '<button type="button" data-k="' + k + '">' + k + '</button>').join('');
  $('#pinPad').onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 6) pin += k; drawDots(); if (navigator.vibrate) navigator.vibrate(8); };
  drawDots();
}
function drawDots() { $('#pinDots').innerHTML = Array.from({ length: 6 }, (_, i) => '<span class="pindot' + (i < pin.length ? ' on' : '') + '"></span>').join(''); }
async function doLogin() {
  const u = $('#loginUser').value.trim(), btn = $('#loginBtn');
  $('#loginMsg').textContent = '';
  if (!u) { $('#loginMsg').textContent = 'Enter your username.'; return; }
  if (pin.length < 4) { $('#loginMsg').textContent = 'Enter your PIN (4 to 6 digits).'; return; }
  if (!Store.configured()) { $('#loginMsg').textContent = 'The app is not connected to a Sheet yet (API_URL in js/config.js).'; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const typed = pin;
    const r = await Store.login(u, pin);
    pin = ''; drawDots();
    await enterApp();
    if (r.mustChangePin) changePin(typed);
  } catch (err) {
    const network = err instanceof TypeError || /fetch|load failed|network/i.test(err.message);
    $('#loginMsg').textContent = network ? 'Cannot reach the server (' + err.message + '). Tap "Run connection check" below.' : err.message;
    $('#netCheckBtn').classList.toggle('hidden', !network);
    pin = ''; drawDots();
  } finally { btn.disabled = false; btn.textContent = 'Sign in'; }
}
async function connectionCheck() {
  const out = $('#netCheck'); out.classList.remove('hidden');
  const lines = []; const show = () => { out.textContent = lines.join('\n'); };
  const step = async (label, fn) => { lines.push('… ' + label); show(); const t0 = Date.now();
    try { const r = await fn(); lines[lines.length - 1] = '✔ ' + label + ' — ' + r + ' (' + (Date.now() - t0) + ' ms)'; }
    catch (e) { lines[lines.length - 1] = '✘ ' + label + ' — ' + (e.name || 'Error') + ': ' + e.message + ' (' + (Date.now() - t0) + ' ms)'; } show(); };
  lines.push('App v' + CFG.VERSION + ' · online: ' + navigator.onLine + ' · ' + (matchMedia('(display-mode: standalone)').matches ? 'installed app' : 'browser tab'));
  lines.push('Server: …' + String(Store.apiUrl()).slice(-16));
  await step('Read server (GET)', async () => { const r = await fetch(Store.apiUrl(), { method: 'GET', redirect: 'follow', cache: 'no-store' }); const t = await r.text(); return r.status + ' ' + t.slice(0, 40); });
  await step('Send to server (POST ping)', async () => { const r = await fetch(Store.apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ping' }), redirect: 'follow', cache: 'no-store' }); const t = await r.text(); return r.status + ' ' + t.slice(0, 40); });
  lines.push('', 'Take a screenshot of this box and send it to Anmol.'); show();
}
$('#loginBtn').addEventListener('click', doLogin);
$('#netCheckBtn').addEventListener('click', connectionCheck);
$('#loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.addEventListener('keydown', e => {
  if ($('#login').classList.contains('hidden')) { if (e.key === 'Escape' && layer.innerHTML) closeSheet(); return; }
  if (document.activeElement === $('#loginUser')) return;
  if (/^\d$/.test(e.key) && pin.length < 6) { pin += e.key; drawDots(); }
  if (e.key === 'Backspace') { pin = pin.slice(0, -1); drawDots(); }
  if (e.key === 'Enter') doLogin();
});

/* ============================================================
   SYNC, ENTER, BOOT
   ============================================================ */
async function doSync() {
  const r = await Store.sync({ full: true });
  if (r.offline) toast('You are offline — will sync later');
  else if (r.ok) { if (r.failed && r.failed.length) toast(r.failed[0], 'err'); else toast(r.pushed ? 'Synced ' + plural(r.pushed, 'change') : 'Up to date', 'ok'); }
  else if (r.error === 'SESSION_EXPIRED') { showLogin(); toast('Session expired, sign in again', 'err'); }
  else if (!r.skipped) toast(r.error || 'Sync failed', 'err');
  render();
}
window.addEventListener('online', () => { toast('Back online — syncing'); doSync(); });
window.addEventListener('offline', () => { toast('Offline — changes saved on this phone'); render(); });
function showLogin() { $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); forceClose(); }
async function enterApp() {
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  S.tab = 'today'; render(); window.scrollTo(0, 0);
  const r = await Store.sync({ full: true });
  if (r.error === 'SESSION_EXPIRED') { showLogin(); toast('Session expired, sign in again', 'err'); return; }
  render();
}
function applyTheme(th) { const r = document.documentElement; if (!th || th === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', th); }

/* ============================================================
   EVENTS
   ============================================================ */
document.addEventListener('click', e => {
  const b = e.target.closest('button,a,[data-go]'); if (!b) return;
  const d = b.dataset;
  if (d.tab != null) { S.tab = d.tab; S.chase = 'all'; render(); window.scrollTo(0, 0); return; }
  if (d.go != null) { S.tab = d.go; if (d.filter) S.filter = d.filter; if (d.grp != null) S.grp = d.grp; render(); window.scrollTo(0, 0); return; }
  if (d.chase != null) { S.chase = S.chase === d.chase ? 'all' : d.chase; render(); return; }
  if (d.expand != null) { S.expand[d.expand] = !S.expand[d.expand]; render(); return; }
  if (d.sort != null) { S.sort = d.sort; render(); return; }
  if (d.filter != null && S.tab === 'tasks') { S.filter = d.filter; render(); return; }
  if (d.grp != null && S.tab === 'tasks' && !d.go) { S.grp = d.grp; render(); return; }
  if (b.id === 'fab') { openGive(); return; }
  if (b.id === 'bell') { openReminders(); return; }
  if (b.id === 'syncBtn') { doSync(); return; }
  if (b.hasAttribute('data-close')) { closeSheet(); return; }
  if (d.task != null) { openTask(d.task); return; }
  if (d.person != null) { openPerson(d.person); return; }
  if (d.branch != null) { openBranch(+d.branch); return; }
  if (d.giveStaff != null) { openGive({ type: 'staff', staff: d.giveStaff }); return; }
  if (d.giveBranch != null) { openGive({ type: 'branch', branch: d.giveBranch }); return; }
  if (d.done != null) { markDone(d.done); return; }
  if (d.reopen != null) { reopen(d.reopen); return; }
  if (d.remind != null) { openRemind(d.remind); return; }
  if (d.send != null) { sendReminder(d.send); return; }
  if (d.snooze != null) { snooze(d.snooze); return; }
  if (d.extend != null) { extendForm(d.extend); return; }
  if (d.addnote != null) { noteForm(d.addnote); return; }
  if (d.deltask != null) { deleteTask(d.deltask); return; }
  if (d.pendlist != null) { const p = Store.person(d.pendlist); const o = byUrgency(staffTasks(d.pendlist).filter(open)); const txt = pendingListText(p.name.split(' ')[0], o);
    sheet('Pending list for ' + esc(p.name), plural(o.length, 'open task'), '<div class="msg" id="rtext">' + esc(txt) + '</div><div class="cbtns">' + (digits(p.mobile) ? '<a class="btn wa" href="https://wa.me/91' + digits(p.mobile) + '?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">' + ICON.wa + ' Open WhatsApp</a>' : '<button class="btn wa off">' + ICON.wa + ' No mobile saved</button>') + '<button class="btn" data-copy>' + ICON.copy + ' Copy text</button></div><div class="btns"><button class="btn sm ghost" data-person="' + esc(p.id) + '">← Back</button></div>'); return; }
  if (b.hasAttribute('data-cancelform')) { $('#taskform').innerHTML = ''; return; }
  if (d.tick != null) { const [id, c] = d.tick.split(':'); const t = T().find(x => x.id === id); const rep = Object.assign({}, t.replied || {}); rep[c] = !rep[c]; Store.saveTask(Object.assign({}, t, { replied: rep })); openCircular(T().find(x => x.id === id)); return; }
  if (d.more != null) { ({ people: openPeopleList, branches: openBranchList, cats: openCats, about: openAbout, data: openData, csv: exportCSV, logins: editLogins, pin: () => changePin(), sync: doSync, sheet: () => window.open(CFG.SHEET_URL, '_blank') })[d.more](); return; }
  if (d.editStaff != null) { openStaffEditor(d.editStaff); return; }
  if (d.delStaff != null) { const p = Store.person(d.delStaff); if (staffTasks(p.id).some(open)) { toast('Has open tasks', 'err'); return; } Store.deletePerson(p.id); openPeopleList(); toast('Removed ' + p.name, 'ok'); return; }
  if (d.editBranch != null) { openBranchEditor(d.editBranch === '' ? '' : +d.editBranch); return; }
  if (d.delBranch != null) { const br = Store.branch(d.delBranch); if (branchTasks(br.code).length) { toast('Has tasks', 'err'); return; } Store.deleteBranch(br.code); openBranchList(); toast('Removed ' + br.name, 'ok'); return; }
  if (d.delCat != null) { const cats = JSON.parse(JSON.stringify(Store.cats)); cats.forEach(g => { g.items = g.items.filter(c => c !== d.delCat); }); Store.saveCategories(cats);
    Store.people.filter(p => (p.cats || []).includes(d.delCat)).forEach(p => Store.savePerson(Object.assign({}, p, { cats: p.cats.filter(c => c !== d.delCat) }))); openCats(); toast('Removed ' + d.delCat, 'ok'); return; }
  if (d.rb != null) { Store.saveSettings({ remindBefore: +d.rb }); toast('Saved', 'ok'); return; }
  if (d.theme != null) { try { localStorage.setItem(LS.THEME, d.theme); } catch (err) {} applyTheme(d.theme); render(); return; }
  if (d.lang != null) { Store.saveSettings({ lang: d.lang }); toast('Saved', 'ok'); return; }
  if (d.langR != null) { Store.saveSettings({ lang: d.langR }); layer.querySelectorAll('[data-lang-r]').forEach(x => x.classList.toggle('on', x === b)); const id = layer.querySelector('[data-send]').dataset.send; const t = T().find(x => x.id === id); const txt = remindText(t); $('#rtext').textContent = txt; const wl = $('#walink'); if (wl) wl.href = 'https://wa.me/91' + digits(mobileOf(t)) + '?text=' + encodeURIComponent(txt); return; }
  if (b.hasAttribute('data-copy')) { copyText($('#rtext').textContent); return; }
  if (b.hasAttribute('data-logout')) { if (Store.queue.length && !confirm('You have unsynced changes. Sign out anyway?')) return; Store.clearSession(); showLogin(); return; }
});
document.addEventListener('click', e => { if (e.target.id === 'scrim') closeSheet(); });

(function boot() {
  try { applyTheme(localStorage.getItem(LS.THEME)); } catch (e) {}
  // Opened from a link with ?api=<Apps Script address>: remember the Sheet's address, then clean the address bar
  if (/[?&]api=/.test(location.search)) {
    const m = location.search.match(/[?&]api=([^&\s]+)/);
    const ok = m && Store.setApiUrl(decodeURIComponent(m[1]));
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    if (ok) setTimeout(() => toast('Connected to the Sheet. Sign in with your username and PIN.', 'ok'), 300);
  }
  Store.load();
  renderPinpad();
  if (Store.token && Store.user) enterApp(); else showLogin();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  const bgSync = async () => {
    if (!Store.token || !navigator.onLine || document.hidden) return;
    const r = await Store.sync({ silent: true });
    if (r.error === 'SESSION_EXPIRED') { showLogin(); toast('Session expired, sign in again', 'err'); }
  };
  setInterval(bgSync, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) bgSync(); });
})();

})();
