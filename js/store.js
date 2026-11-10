/* ============================================================
   RO Task Tracker — data layer
   State, Google Sheets API calls, and the offline write queue.
   (from _template-pwa-sheets, extended for tasks, task log, people, branches, categories)
   ============================================================ */

const CFG = window.APP_CONFIG;
const P = CFG.STORAGE_PREFIX || 'app';
const LS = {
  TOKEN: P + '_token',
  USER:  P + '_user',
  CACHE: P + '_cache',
  QUEUE: P + '_queue',
  THEME: P + '_theme',
  API:   P + '_api'     // a Sheet address given by a ?api= link, kept on this phone
};

const todayISO = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const Store = {
  token: null,
  user: null,
  tasks: [],        // one per task given
  logs: [],         // history entries: given, rem, ext, note, done, reopen, snooze
  people: [],       // RO staff: id, name, role, mobile, sub, nodal[], cats[]
  branches: [],     // code, name, bm, mobile
  cats: [],         // [{group, items[]}]
  repeats: [],      // repeating-task templates: freq, n, anchorDay, leadDays, nextDue
  users: [],
  settings: { remindBefore: 1, dueGap: 2, lang: 'en', remindTime: '09:00', sig: 'Regional Manager, RO Hazaribag', sigHi: 'क्षेत्रीय प्रबंधक, क्षेत्रीय कार्यालय हजारीबाग' },
  queue: [],
  syncing: false,
  lastSync: null,
  lastError: null,
  cursor: null,
  listeners: [],

  /* ---------------- persistence ---------------- */
  on(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },

  load() {
    try { this.token = localStorage.getItem(LS.TOKEN); } catch (e) {}
    try { this.user = JSON.parse(localStorage.getItem(LS.USER) || 'null'); } catch (e) {}
    try {
      const c = JSON.parse(localStorage.getItem(LS.CACHE) || 'null');
      if (c) {
        this.tasks = c.tasks || [];
        this.logs = c.logs || [];
        this.people = c.people || [];
        this.branches = c.branches || [];
        this.cats = c.cats || [];
        this.repeats = c.repeats || [];
        this.users = c.users || [];
        this.settings = Object.assign(this.settings, c.settings || {});
        this.lastSync = c.lastSync || null;
        this.cursor = c.cursor || null;
      }
    } catch (e) {}
    try { this.queue = JSON.parse(localStorage.getItem(LS.QUEUE) || '[]'); } catch (e) { this.queue = []; }
  },

  persist() {
    try {
      localStorage.setItem(LS.CACHE, JSON.stringify({
        tasks: this.tasks, logs: this.logs, people: this.people, branches: this.branches, cats: this.cats, repeats: this.repeats,
        users: this.users, settings: this.settings, lastSync: this.lastSync, cursor: this.cursor
      }));
      localStorage.setItem(LS.QUEUE, JSON.stringify(this.queue));
    } catch (e) { console.warn('cache write failed', e); }
  },

  setSession(token, user) {
    this.token = token; this.user = user;
    try {
      localStorage.setItem(LS.TOKEN, token);
      localStorage.setItem(LS.USER, JSON.stringify(user));
    } catch (e) {}
  },

  clearSession() {
    this.token = null; this.user = null;
    this.tasks = []; this.logs = []; this.people = []; this.branches = []; this.cats = []; this.repeats = []; this.users = []; this.queue = [];
    this.cursor = null; this.lastError = null;
    try { [LS.TOKEN, LS.USER, LS.CACHE, LS.QUEUE].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  },

  /* ---------------- transport ---------------- */
  // A ?api= link can point this phone at another Sheet (the move to the RM's account later).
  apiUrl() {
    let u = '';
    try { u = localStorage.getItem(LS.API) || ''; } catch (e) {}
    return u || CFG.API_URL;
  },
  isApiUrl(u) { return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(u || '').trim()); },
  setApiUrl(u) {
    u = String(u || '').trim();
    if (!this.isApiUrl(u)) return false;
    if (this.apiUrl() !== u) this.clearSession();      // another Sheet: start clean
    try { localStorage.setItem(LS.API, u); } catch (e) { return false; }
    return true;
  },
  configured() {
    const u = this.apiUrl();
    return !!(u && u.indexOf('PASTE_YOUR') === -1);
  },

  async api(action, payload = {}, { timeout = 60000 } = {}) {
    if (!this.configured()) throw new Error('API_URL is not set in js/config.js');

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    let res, data;
    try {
      res = await fetch(this.apiUrl(), {
        method: 'POST',
        // text/plain keeps this a "simple request" so the browser skips the CORS preflight that Apps Script cannot answer.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action, token: this.token }, payload)),
        redirect: 'follow',
        cache: 'no-store',
        signal: ctl.signal
      });
      if (!res.ok) throw new Error('Server responded ' + res.status);
      const text = await res.text();
      try { data = JSON.parse(text); }
      catch (e) { throw new Error('Server sent an unexpected reply — Google may be busy, try again'); }
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('The server took too long to answer');
      throw err;
    } finally {
      clearTimeout(timer);
    }
    if (data && data.error === 'AUTH') { this.clearSession(); throw new Error('SESSION_EXPIRED'); }
    return data;
  },

  async apiRetry(action, payload) {
    try { return await this.api(action, payload); }
    catch (err) {
      if (String(err.message) === 'SESSION_EXPIRED') throw err;
      await new Promise(r => setTimeout(r, 1500));
      return this.api(action, payload);
    }
  },

  /* ---------------- auth ---------------- */
  async login(username, pin) {
    const r = await this.api('login', { username, pin });
    if (!r.ok) throw new Error(r.message || 'Login failed');
    this.setSession(r.token, r.user);
    return r;
  },

  /* ---------------- sync ---------------- */
  async pull({ full = false } = {}) {
    const since = !full && this.cursor && this.tasks.length ? this.cursor : undefined;
    const r = await this.apiRetry('bootstrap', since ? { since } : {});
    if (!r.ok) throw new Error(r.message || 'Could not load data');
    // changes still queued on this phone must not be overwritten by an older server copy
    const queuedTasks = new Set(this.queue.filter(j => j.action === 'saveTask').map(j => j.payload.task.id));
    const queuedLogs = new Set(this.queue.flatMap(j => j.action === 'saveTask' ? (j.payload.logs || []).map(l => l.id) : []));
    const mergeTasks = (base, incoming, gone) => {
      const byId = new Map(base.filter(x => !gone.has(x.id)).map(x => [x.id, x]));
      incoming.forEach(x => { if (!queuedTasks.has(x.id)) byId.set(x.id, x); });
      return Array.from(byId.values());
    };
    if (r.delta) {
      this.tasks = mergeTasks(this.tasks, r.tasks || [], new Set(r.removed || []));
      const byId = new Map(this.logs.map(x => [x.id, x]));
      (r.logs || []).forEach(x => byId.set(x.id, x));
      this.logs = Array.from(byId.values());
    } else {
      const localTasks = this.tasks.filter(t => queuedTasks.has(t.id));
      this.tasks = (r.tasks || []).filter(t => !queuedTasks.has(t.id)).concat(localTasks);
      const localLogs = this.logs.filter(l => queuedLogs.has(l.id));
      this.logs = (r.logs || []).filter(l => !queuedLogs.has(l.id)).concat(localLogs);
    }
    if (r.people) this.people = r.people;
    if (r.branches) this.branches = r.branches;
    if (r.cats) this.cats = r.cats;
    if (r.repeats) {
      const queuedReps = new Set(this.queue.filter(j => j.action === 'saveRepeat').map(j => j.payload.repeat.id));
      this.repeats = r.repeats.filter(x => !queuedReps.has(x.id)).concat(this.repeats.filter(x => queuedReps.has(x.id)));
    }
    this.users = r.users || [];
    this.settings = Object.assign({}, this.settings, r.settings || {});
    if (r.user) this.setSession(this.token, r.user);
    this.cursor = r.serverTime || null;
    this.lastSync = new Date().toISOString();
    this.lastError = null;
    this.persist();
    this.emit();
    return r;
  },

  enqueue(action, payload) {
    this.queue.push({ id: 'q' + Date.now() + Math.random().toString(36).slice(2, 6), action, payload, at: Date.now() });
    this.persist();
    this.emit();
  },

  async sync({ silent = false, full = false } = {}) {
    if (this.syncing || !this.token) return { ok: false, skipped: true };
    if (!navigator.onLine) return { ok: false, offline: true };
    this.syncing = true; this.emit();
    let pushed = 0, failed = [];
    try {
      while (this.queue.length) {
        const job = this.queue[0];
        const r = await this.api(job.action, job.payload);
        if (r && r.ok === false && r.error !== 'AUTH') failed.push(r.message || 'Rejected');
        this.queue.shift(); pushed++;
        this.persist();
      }
      await this.pull({ full });
      return { ok: true, pushed, failed };
    } catch (err) {
      const msg = err.message === 'Failed to fetch' || err.message === 'Load failed' ? 'No connection to the server' : err.message;
      if (msg !== 'SESSION_EXPIRED') this.lastError = msg;
      return { ok: false, error: msg };
    } finally {
      this.syncing = false; this.emit();
    }
  },

  /* ---------------- lookups ---------------- */
  person(id) { return this.people.find(p => p.id === id) || null; },
  branch(code) { return this.branches.find(b => Number(b.code) === Number(code)) || null; },
  repeat(id) { return this.repeats.find(r => r.id === id) || null; },
  logsFor(taskId) {
    return this.logs.filter(l => l.taskId === taskId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt)));
  },

  /* ---------------- mutations (optimistic) ---------------- */
  // Saved on the phone at once, sent to the Sheet in the background (or when back online).
  // newLogs: history entries created by this change; they are stored with the task in one request.
  saveTask(task, newLogs) {
    const now = new Date().toISOString();
    const prev = this.tasks.find(x => x.id === task.id) || null;
    if (!prev) {
      task.id = task.id || ('T' + Date.now() + Math.floor(Math.random() * 1000));
      task.createdAt = now;
      task.createdBy = this.user.name;
    }
    task.updatedAt = now;
    const i = this.tasks.findIndex(x => x.id === task.id);
    if (i >= 0) this.tasks[i] = Object.assign({}, this.tasks[i], task);
    else this.tasks.unshift(task);

    const logs = (newLogs || []).map(l => Object.assign({
      id: 'L' + Date.now() + Math.floor(Math.random() * 100000), taskId: task.id, date: todayISO(),
      createdAt: now, updatedAt: now, createdBy: this.user.name
    }, l));
    this.logs = this.logs.concat(logs);

    this.enqueue('saveTask', { task, logs });
    this.persist();
    this.trySync();
    return task;
  },

  deleteTask(id) {
    this.tasks = this.tasks.filter(x => x.id !== id);
    this.enqueue('deleteTask', { id });
    this.persist(); this.trySync();
  },

  savePerson(p) {
    const i = this.people.findIndex(x => x.id === p.id);
    if (i >= 0) this.people[i] = p; else this.people.push(p);
    this.enqueue('savePerson', { person: p });
    this.persist(); this.trySync();
  },
  deletePerson(id) {
    this.people = this.people.filter(x => x.id !== id);
    this.people.forEach(x => { if (x.sub === id) x.sub = ''; });
    this.enqueue('deletePerson', { id });
    this.persist(); this.trySync();
  },
  saveBranch(b) {
    const i = this.branches.findIndex(x => Number(x.code) === Number(b.code));
    if (i >= 0) this.branches[i] = b; else this.branches.push(b);
    this.enqueue('saveBranch', { branch: b });
    this.persist(); this.trySync();
  },
  deleteBranch(code) {
    this.branches = this.branches.filter(x => Number(x.code) !== Number(code));
    this.enqueue('deleteBranch', { code });
    this.persist(); this.trySync();
  },
  saveRepeat(rp) {
    const now = new Date().toISOString();
    rp.updatedAt = now; if (!rp.createdAt) { rp.createdAt = now; rp.createdBy = this.user.name; }
    const i = this.repeats.findIndex(x => x.id === rp.id);
    if (i >= 0) this.repeats[i] = rp; else this.repeats.push(rp);
    this.enqueue('saveRepeat', { repeat: rp });
    this.persist(); this.trySync();
    return rp;
  },
  deleteRepeat(id) {
    this.repeats = this.repeats.filter(x => x.id !== id);
    this.enqueue('deleteRepeat', { id });
    this.persist(); this.trySync();
  },
  saveCategories(cats) {
    this.cats = cats;
    this.enqueue('saveCategories', { cats });
    this.persist(); this.trySync();
  },

  saveSettings(settings) {
    this.settings = Object.assign({}, this.settings, settings);
    this.enqueue('saveSettings', { settings: this.settings });
    this.persist(); this.trySync();
  },

  saveUsers(users, baseline) {
    this.users = users.map(u => Object.assign({}, u, { pin: undefined }));
    this.enqueue('saveUsers', { users, baseline });
    this.persist(); this.trySync();
  },

  trySync() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.sync({ silent: true }).then(() => this.emit()), 600);
  }
};

window.Store = Store;
window.LS = LS;
