/* ============================================================
   RO Task Tracker — configuration
   ------------------------------------------------------------
   After you deploy the Apps Script web app, paste its /exec URL
   into API_URL below. That is the ONLY thing you must change.
   (Opening the app once with ?api=<url> also works and is remembered
   on that phone; it is how the app moves to the RM's own Sheet later.)
   ============================================================ */

window.APP_CONFIG = {

  // 👇 PASTE YOUR APPS SCRIPT WEB APP URL HERE
  API_URL: 'https://script.google.com/macros/s/AKfycbxYF4xOuGmf4JhNcy7QLXuy65SPmrbeMYvj5wgHZxHDEQT_i2e7gq8K78UG-bKwHElq/exec',

  APP_NAME: 'RO Task Tracker',
  VERSION: '0.4.0',          // bump together with CACHE in sw.js on every release

  // Short prefix for this app's browser storage, so two apps on the same
  // GitHub Pages domain never read each other's login or cache.
  STORAGE_PREFIX: 'ro-task-tracker',

  OFFICE_NAME: 'RO Hazaribag',
  BANK_NAME: 'Jharkhand Rajya Gramin Bank',

  // Fixed lists that change only with a release. Lists an Admin may change live in the Sheet.
  HOW: ['Phone', 'WhatsApp', 'In person', 'Letter', 'Email'],
  SOURCES: { own: 'My own', ho: 'HO letter / mail', district: 'District administration', audit: 'Audit / inspection' },

  // Google Sheet used as the database (for the "Open Sheet" link in More)
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1DD1QLuJw2lUwwIFtolhnagwRpKfIrwN46Ql1aNIyMJA/edit'
};
