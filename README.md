# RO Task Tracker

The Regional Manager, RO Hazaribag, logs every task she gives out (to an RO officer, a branch, or
many branches at once) in about 20 seconds on her phone. Each morning the **Today** tab shows what
is overdue, due today and due tomorrow, by person; **RO staff** shows who has what; **Branches**
tracks circulars with a tick list of who replied; every task keeps a history of reminders,
extensions and notes. Live at **https://anmolbage.github.io/ro-task-tracker/**.

Two logins, both Admin: `rm` (the RM) and `anmol` (technical support). Officers and BMs do not log in.

**User manual:** https://claude.ai/artifact/RgE1XDM3bH1gdu6kWjh1M6 · **Training deck:** https://claude.ai/artifact/QhNZhbY4Xk1HPh2MF7fEpB (shared by Anmol on request).

---

## The three pieces, and what each one does

| Piece | What it is | Where it lives |
|---|---|---|
| **The Google Sheet** | The database. Tabs: `Tasks`, `TaskLog` (history), `People`, `Branches`, `Categories`, `Users`, `Settings`, `ActivityLog`. Open it any time and read it like a spreadsheet. | Anmol's Google Drive for the trial; the RM's later |
| **The Apps Script** | A small program inside the Sheet. The app talks to it; it reads and writes the Sheet and checks username + PIN on every request. | Inside the Sheet (Extensions → Apps Script) |
| **The app** | The screens. A folder of files GitHub hosts for free. Phones "install" it from that web page. | GitHub Pages, repo `anmolbage/ro-task-tracker` |

The app needs one thing: the web address of the Apps Script. That is the single line in `js/config.js`.

---

## Setup — about 20 minutes, once

### Step 1 — Put the script inside a new Sheet

1. Go to **[sheets.new](https://sheets.new)** and name the Sheet `RO Task Tracker Database`.
2. **Extensions → Apps Script**. A code editor opens with a file `Code.gs`.
3. Delete everything in it, paste the contents of `apps-script/Code.gs`, click **Save** (💾).
4. **Project Settings** (gear, left) → tick **Show "appsscript.json" manifest file in editor**. Back in
   **Editor**, open `appsscript.json`, replace its contents with `apps-script/appsscript.json`, Save.
5. In the function dropdown choose **`setup`** and click **▶ Run**. Google asks for permission:
   **Review permissions → your account → Advanced → Go to … (unsafe) → Allow**. This is normal: you
   are allowing your own script to edit your own Sheet.
6. The **Execution log** shows the two logins and their **temporary PINs**:
   `rm: 123456   anmol: 654321`. They are also in the **Users** tab, column C, until each person
   picks their own PIN at first sign-in.
7. Back in the Sheet you now see all eight tabs, with People (17 RO staff), Branches (40) and
   Categories (12 groups) already filled. Mobiles are still blank.

### Step 2 — Add the mobile numbers (kept out of the public repo)

1. In the Apps Script editor: **Files +** → **Script**, name it `ImportContacts`.
2. Paste the contents of `apps-script/ImportContacts.gs` (this file is on your PC only, git ignores it).
3. Choose **`importContacts`** in the dropdown and **▶ Run**. The log says
   `Imported 17 staff mobiles and 40 BM contacts.`

### Step 3 — Publish the script as a web address

1. **Deploy → New deployment**. Gear ⚙ next to "Select type" → **Web app**.
2. Description `RO Task Tracker API` · **Execute as: Me** · **Who has access: Anyone** (not "Anyone with Google account").
3. **Deploy**, then **Copy** the **Web app URL** (ends in `/exec`).

> "Anyone" only means the address is reachable. Every request without a valid username and PIN is refused.

### Step 4 — Tell the app where the script is

1. Open `js/config.js`, replace `PASTE_YOUR_APPS_SCRIPT_URL_HERE` with the URL. Optionally put the
   Sheet's address in `SHEET_URL` so More shows an "Open the Google Sheet" row.
2. Commit and push (`git add -A && git commit -m "Connect to the Sheet" && git push`). GitHub Pages
   updates within a minute or two.

### Step 5 — On the phones

1. Open **https://anmolbage.github.io/ro-task-tracker/** → browser menu → **Add to Home screen**.
2. Sign in with `rm` (or `anmol`) and the temporary PIN; the app asks for a new 4–6 digit PIN.
   Let the RM do her own first sign-in: the first sign-in replaces the temporary PIN.

---

## Daily use (the RM)

- After giving a task, by phone, WhatsApp, in person or letter: **+** → what, to whom, category, how, due date. Save.
- Each morning: **Today**. The bell at the top lists reminders; snooze one till tomorrow if needed.
- On a task: **Mark done**, **Remind** (opens WhatsApp with the text filled in), **Extend due date** (with the reason), **Add a note**.
- **RO staff** → a person → **Send the pending list** puts all their open tasks in one WhatsApp message.
- **Branches** → a circular → tick each branch as it replies; **Remind N pending** sends one message naming them.
- **More** → People, Branch contacts and Categories are edited there and saved to the Sheet.

Works without signal: changes are saved on the phone and sent when the network returns.

## Updating later

- Changed **`Code.gs`**: paste it into the editor again, then **Deploy → Manage deployments → ✏ Edit →
  Version: New version → Deploy**. Same URL. (Never "New deployment": that gives a new URL and breaks the phones.)
- Changed **app files**: bump `VERSION` in `js/config.js` **and** `CACHE` in `sw.js` together, commit, push.
- Changing a live Sheet (new column, new default): add a `MIGRATIONS` entry in `Code.gs`.

## Moving the data to the RM's account later

Copy the Sheet to her Drive (File → Make a copy), open its Apps Script, redeploy as a web app from
her account, then open the app once with `https://anmolbage.github.io/ro-task-tracker/?api=<her /exec URL>`.
The phone remembers that address; the public code never changes.

## Local test without a Sheet

`dev-mock/` pretends to be the script in the browser. Start a local server in the project folder
(`python -m http.server 8744`) and open `http://127.0.0.1:8744/dev-mock/index.html`. Login `rm` / `1234`.
Data stays in that browser only.
