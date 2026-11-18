/**
 * Nexinote feedback receiver — Google Apps Script.
 *
 * Appends one row per submission to the spreadsheet this script is bound
 * to. Deploy it as a Web app (see feedback/README.md) and put the
 * resulting /exec URL in VITE_FEEDBACK_ENDPOINT.
 *
 * The app posts JSON with Content-Type: text/plain on purpose. A JSON
 * content type would make the browser send a CORS preflight, which Apps
 * Script does not answer; text/plain is a "simple request" and goes
 * straight through. So we parse the body ourselves below.
 */

// Column order. Adding a field: append to the END so existing rows and
// any charts built on them keep their meaning.
var COLUMNS = [
  'submittedAt',
  'category',
  'message',
  'contact',
  'version',
  'theme',
  'boards',
  'cards',
  'connectors',
  'viewport',
  'dpr',
  'platform',
  'language',
  'installed',
  'receivedAt',
];

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    var data = JSON.parse(raw);

    // Refuse empty submissions so the sheet doesn't collect blank rows
    // from bots or double-clicks.
    var message = String(data.message || '').trim();
    if (!message) {
      return reply({ ok: false, error: 'empty message' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    ensureHeader_(sheet);

    data.receivedAt = new Date().toISOString();

    var row = COLUMNS.map(function (key) {
      var v = data[key];
      if (v === undefined || v === null) return '';
      // Long text is fine in a cell, but a leading = or + would be read
      // as a formula. Prefix those so everything stays literal text.
      var s = String(v);
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return s;
    });

    sheet.appendRow(row);
    return reply({ ok: true });
  } catch (err) {
    // Never surface a stack trace to the browser; log it for the owner.
    console.error(err);
    return reply({ ok: false, error: 'server error' });
  }
}

/** Lets you open the /exec URL in a browser to confirm it's deployed. */
function doGet() {
  return reply({ ok: true, service: 'nexinote-feedback' });
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(COLUMNS);
  sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
