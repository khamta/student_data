/**
 * ระบบจัดการທຳນຽບຜູ້ສຳເລັດການສຶກສາ (Graduate Registry Manager)
 * Google Apps Script web app bound to a Google Sheet.
 *
 * Sheets used (auto-created on first run):
 *   - Students   : one row per student
 *   - Categories : the "I. ..." / "II. ..." group headings (majors)
 *   - Settings   : header text shown on the printed report
 */

var SHEET_STUDENTS = 'Students';
var SHEET_CATEGORIES = 'Categories';
var SHEET_SETTINGS = 'Settings';
var PHOTO_FOLDER_NAME = 'StudentPhotos_DoNotDelete';

var STUDENT_HEADERS = [
  'ID', 'Order', 'CategoryId', 'StudentCode', 'Rank', 'LaoName', 'EnglishName',
  'DOB', 'Village', 'District', 'Province', 'Major',
  'CertNoLao', 'CertNoEnglish', 'DiplomaM6', 'DiplomaM7', 'Gender', 'PhotoUrl',
  'CreatedAt', 'UpdatedAt'
];

var CATEGORY_HEADERS = ['ID', 'Name', 'SortOrder'];
var SETTINGS_HEADERS = ['Key', 'Value'];

var DEFAULT_SETTINGS = [
  ['OrgLine1', 'ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ'],
  ['OrgLine2', 'ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ'],
  ['OrgLine3', 'ກະຊວງສຶກສາທິການ ແລະ ກີລາ'],
  ['OrgLine4', 'ກົມສະຫງວນສຶກສາ'],
  ['OrgLine5', 'ພະແນກສຶກສາທິການ ແລະ ກີລາແຂວງ'],
  ['OrgLine6', 'ວິທະຍາໄລ ຄຳໝັ້ນ ບໍລິຫານທຸລະກິດ ຄຳມ່ວນ'],
  ['OrgLine7', 'ໂທລະສັບ: 020 55994488'],
  ['ReportTitle', 'ບັນຊີລາຍຊື່ນັກສຶກສາທີ່ຈະໄດ້ຮັບໃບປະກາດສະນີຍະບັດ ສົກຮຽນ 2024-2025'],
  ['ReportSubtitle', 'ຈັດຮຽງຕາມສາຂາວິຊາ, ພາກຮຽນ ແລະ ໄວທິ'],
  ['ApprovalLeft', 'ຄຳມ່ວນ, ວັນທີ .......................'],
  ['ApprovalRightTitle', 'ຫົວໜ້າພະແນກສຶກສາທິການ ແລະ ກີລາແຂວງ'],
  ['ApprovalLeftTitle', 'ຜູ້ອຳນວຍການວິທະຍາໄລ']
];

/* ---------------- Web app entry point ---------------- */

function doGet(e) {
  ensureSheets_();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ລະບົບຈັດການທຳນຽບນັກສຶກສາ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Optional: adds a menu inside the spreadsheet itself so the owner
 * can jump straight to the deployed web app without hunting for the URL.
 */
function onOpen() {
  ensureSheets_();
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('ລະບົບຈັດການນັກສຶກສາ')
    .addItem('ເປີດຄູ່ມືການນຳໃຊ້', 'showHelp_')
    .addToUi();
}

function showHelp_() {
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">ໃຫ້ໄປທີ່ <b>Deploy &gt; Manage deployments</b> ' +
    'ໃນ Apps Script Editor ເພື່ອເອົາລິ້ງເວັບແອັບ (Web app URL) ຂອງທ່ານ.</p>'
  ).setWidth(400).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, 'ວິທີເປີດໃຊ້ງານ');
}

/* ---------------- Sheet bootstrap ---------------- */

function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var studentsSheet = ss.getSheetByName(SHEET_STUDENTS);
  if (!studentsSheet) {
    studentsSheet = ss.insertSheet(SHEET_STUDENTS);
    studentsSheet.appendRow(STUDENT_HEADERS);
    studentsSheet.setFrozenRows(1);
  }

  var categoriesSheet = ss.getSheetByName(SHEET_CATEGORIES);
  if (!categoriesSheet) {
    categoriesSheet = ss.insertSheet(SHEET_CATEGORIES);
    categoriesSheet.appendRow(CATEGORY_HEADERS);
    categoriesSheet.setFrozenRows(1);
    categoriesSheet.appendRow(['cat-1', 'I. ສາຂາບໍລິຫານທຸລະກິດ', 1]);
    categoriesSheet.appendRow(['cat-2', 'II. ສາຂາວິທະຍາສາດຄອມພິວເຕີ ແລະ ສິ່ງແວດລ້ອມ', 2]);
  }

  var settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(SETTINGS_HEADERS);
    settingsSheet.setFrozenRows(1);
    DEFAULT_SETTINGS.forEach(function (row) {
      settingsSheet.appendRow(row);
    });
  }

  // Remove the default empty "Sheet1" if it is still blank and unused.
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 3 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }

  return { studentsSheet: studentsSheet, categoriesSheet: categoriesSheet, settingsSheet: settingsSheet };
}

/* ---------------- Generic sheet <-> object helpers ---------------- */

function sheetToObjects_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (row.join('') === '') continue; // skip fully blank rows
    var obj = { _row: i + 2 };
    headers.forEach(function (h, idx) {
      var v = row[idx];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      obj[h] = v;
    });
    out.push(obj);
  }
  return out;
}

function findRowById_(sheet, headers, id) {
  var idCol = headers.indexOf('ID') + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

/* ---------------- Public API used by the client (google.script.run) ---------------- */

function getAllData() {
  var s = ensureSheets_();
  return {
    students: sheetToObjects_(s.studentsSheet, STUDENT_HEADERS),
    categories: sheetToObjects_(s.categoriesSheet, CATEGORY_HEADERS)
      .sort(function (a, b) { return (a.SortOrder || 0) - (b.SortOrder || 0); }),
    settings: settingsToMap_(s.settingsSheet)
  };
}

function settingsToMap_(settingsSheet) {
  var rows = sheetToObjects_(settingsSheet, SETTINGS_HEADERS);
  var map = {};
  rows.forEach(function (r) { map[r.Key] = r.Value; });
  return map;
}

function saveSettings(settingsObj) {
  var s = ensureSheets_();
  var sheet = s.settingsSheet;
  var existing = sheetToObjects_(sheet, SETTINGS_HEADERS);
  var keyToRow = {};
  existing.forEach(function (r) { keyToRow[r.Key] = r._row; });

  Object.keys(settingsObj).forEach(function (key) {
    if (keyToRow[key]) {
      sheet.getRange(keyToRow[key], 2).setValue(settingsObj[key]);
    } else {
      sheet.appendRow([key, settingsObj[key]]);
    }
  });
  return settingsToMap_(sheet);
}

/* ---- Students ---- */

function upsertStudent(student) {
  var s = ensureSheets_();
  var sheet = s.studentsSheet;
  var now = new Date();

  if (student.ID) {
    var row = findRowById_(sheet, STUDENT_HEADERS, student.ID);
    if (row === -1) throw new Error('ไม่พบข้อมูลนักศึกษาที่ต้องการแก้ไข');
    student.UpdatedAt = now;
    var values = STUDENT_HEADERS.map(function (h) {
      return h === 'CreatedAt' ? undefined : (student[h] !== undefined ? student[h] : '');
    });
    // Preserve CreatedAt
    var createdAtCol = STUDENT_HEADERS.indexOf('CreatedAt') + 1;
    var currentCreatedAt = sheet.getRange(row, createdAtCol).getValue();
    values[createdAtCol - 1] = currentCreatedAt;
    sheet.getRange(row, 1, 1, STUDENT_HEADERS.length).setValues([values]);
  } else {
    student.ID = 'stu-' + Utilities.getUuid();
    student.CreatedAt = now;
    student.UpdatedAt = now;
    if (!student.Order) student.Order = getNextOrder_(sheet);
    var newRow = STUDENT_HEADERS.map(function (h) {
      return student[h] !== undefined ? student[h] : '';
    });
    sheet.appendRow(newRow);
  }
  return getAllData();
}

function getNextOrder_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  var orderCol = STUDENT_HEADERS.indexOf('Order') + 1;
  var values = sheet.getRange(2, orderCol, lastRow - 1, 1).getValues();
  var max = 0;
  values.forEach(function (v) {
    var n = Number(v[0]);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function deleteStudent(id) {
  var s = ensureSheets_();
  var row = findRowById_(s.studentsSheet, STUDENT_HEADERS, id);
  if (row === -1) throw new Error('ไม่พบข้อมูลนักศึกษา');
  s.studentsSheet.deleteRow(row);
  return getAllData();
}

/* ---- Categories ---- */

function upsertCategory(category) {
  var s = ensureSheets_();
  var sheet = s.categoriesSheet;
  if (category.ID) {
    var row = findRowById_(sheet, CATEGORY_HEADERS, category.ID);
    if (row === -1) throw new Error('ไม่พบหมวดหมู่');
    sheet.getRange(row, 1, 1, CATEGORY_HEADERS.length)
      .setValues([[category.ID, category.Name, category.SortOrder || 0]]);
  } else {
    category.ID = 'cat-' + Utilities.getUuid();
    if (!category.SortOrder) {
      var existing = sheetToObjects_(sheet, CATEGORY_HEADERS);
      category.SortOrder = existing.length + 1;
    }
    sheet.appendRow([category.ID, category.Name, category.SortOrder]);
  }
  return getAllData();
}

function deleteCategory(id) {
  var s = ensureSheets_();
  var inUse = sheetToObjects_(s.studentsSheet, STUDENT_HEADERS)
    .some(function (st) { return st.CategoryId === id; });
  if (inUse) {
    throw new Error('ไม่สามารถลบໝວດໝູ່ນີ້ໄດ້: ຍັງມີນັກສຶກສາຢູ່ໃນໝວດນີ້');
  }
  var row = findRowById_(s.categoriesSheet, CATEGORY_HEADERS, id);
  if (row === -1) throw new Error('ไม่พบหมวดหมู่');
  s.categoriesSheet.deleteRow(row);
  return getAllData();
}

/* ---- Photo upload to Google Drive ---- */

function uploadPhoto(base64Data, mimeType, fileName) {
  var folder = getOrCreatePhotoFolder_();
  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType, fileName || ('photo-' + Date.now()));
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function getOrCreatePhotoFolder_() {
  var iter = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  if (iter.hasNext()) return iter.next();
  return DriveApp.createFolder(PHOTO_FOLDER_NAME);
}

/* ---- Report data (grouped + summary counts) ---- */

function getReportData() {
  var data = getAllData();
  var byCategory = {};
  data.categories.forEach(function (c) { byCategory[c.ID] = { category: c, students: [] }; });

  data.students
    .sort(function (a, b) { return (Number(a.Order) || 0) - (Number(b.Order) || 0); })
    .forEach(function (st) {
      if (!byCategory[st.CategoryId]) {
        byCategory[st.CategoryId] = { category: { ID: st.CategoryId, Name: '(ไม่ระบุหมวดหมู่)', SortOrder: 999 }, students: [] };
      }
      byCategory[st.CategoryId].students.push(st);
    });

  var groups = Object.keys(byCategory)
    .map(function (k) { return byCategory[k]; })
    .sort(function (a, b) { return (a.category.SortOrder || 0) - (b.category.SortOrder || 0); });

  var summary = groups.map(function (g) {
    var male = g.students.filter(function (s) { return s.Gender === 'M'; }).length;
    var female = g.students.filter(function (s) { return s.Gender === 'F'; }).length;
    return { name: g.category.Name, male: male, female: female, total: g.students.length };
  });

  var grandTotal = {
    male: summary.reduce(function (a, s) { return a + s.male; }, 0),
    female: summary.reduce(function (a, s) { return a + s.female; }, 0),
    total: summary.reduce(function (a, s) { return a + s.total; }, 0)
  };

  return { groups: groups, summary: summary, grandTotal: grandTotal, settings: data.settings };
}
