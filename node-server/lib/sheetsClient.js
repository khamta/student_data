const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
if (!SPREADSHEET_ID) {
  throw new Error('Missing GOOGLE_SPREADSHEET_ID in environment (.env)');
}

function loadCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON);
  }
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './service-account.json';
  return require(require('path').resolve(keyFile));
}

const auth = new google.auth.GoogleAuth({
  credentials: loadCredentials(),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheetsPromise = auth.getClient().then((authClient) =>
  google.sheets({ version: 'v4', auth: authClient })
);

let sheetIdCache = null; // { 'Students': 123, ... }

async function getSheets() {
  return sheetsPromise;
}

async function refreshSheetIdCache() {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  sheetIdCache = {};
  meta.data.sheets.forEach((s) => {
    sheetIdCache[s.properties.title] = s.properties.sheetId;
  });
  return sheetIdCache;
}

async function getSheetId(name) {
  if (!sheetIdCache || sheetIdCache[name] === undefined) await refreshSheetIdCache();
  return sheetIdCache[name];
}

async function sheetExists(name) {
  if (!sheetIdCache) await refreshSheetIdCache();
  return sheetIdCache[name] !== undefined;
}

async function createSheet(name) {
  const sheets = await getSheets();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: name } } }] }
  });
  await refreshSheetIdCache();
  return sheetIdCache[name];
}

function colLetter(n) {
  // 1-based column number -> "A", "B", ... "AA"
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function getValues(sheetName, range) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: range ? `'${sheetName}'!${range}` : `'${sheetName}'`
  });
  return res.data.values || [];
}

async function appendRow(sheetName, rowValues) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowValues] }
  });
}

async function appendRows(sheetName, rows) {
  if (rows.length === 0) return;
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows }
  });
}

// rowIndex1Based counts the header row as row 1 (matches Apps Script's getRange(row, ...))
async function updateRow(sheetName, rowIndex1Based, rowValues) {
  const sheets = await getSheets();
  const lastCol = colLetter(rowValues.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A${rowIndex1Based}:${lastCol}${rowIndex1Based}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowValues] }
  });
}

async function updateCell(sheetName, rowIndex1Based, colIndex1Based, value) {
  const sheets = await getSheets();
  const col = colLetter(colIndex1Based);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!${col}${rowIndex1Based}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] }
  });
}

async function deleteRow(sheetName, rowIndex1Based) {
  const sheets = await getSheets();
  const sheetId = await getSheetId(sheetName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex1Based - 1,
            endIndex: rowIndex1Based
          }
        }
      }]
    }
  });
}

async function batchUpdate(requests) {
  if (requests.length === 0) return;
  const sheets = await getSheets();
  return sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests }
  });
}

module.exports = {
  SPREADSHEET_ID,
  getSheets,
  sheetExists,
  createSheet,
  getSheetId,
  refreshSheetIdCache,
  getValues,
  appendRow,
  appendRows,
  updateRow,
  updateCell,
  deleteRow,
  batchUpdate,
  colLetter
};
