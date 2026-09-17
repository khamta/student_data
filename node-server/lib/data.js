const crypto = require('crypto');
const sheetsClient = require('./sheetsClient');
const {
  SHEET_STUDENTS, SHEET_CATEGORIES, SHEET_SETTINGS,
  STUDENT_HEADERS, CATEGORY_HEADERS, SETTINGS_HEADERS,
  DEFAULT_SETTINGS, DEFAULT_CATEGORIES, DEFAULT_STUDENTS
} = require('./defaults');

/* ---------------- Sheet bootstrap ---------------- */

async function ensureSheets() {
  const isFirstRun = !(await sheetsClient.sheetExists(SHEET_STUDENTS));

  if (!(await sheetsClient.sheetExists(SHEET_CATEGORIES))) {
    await sheetsClient.createSheet(SHEET_CATEGORIES);
    await sheetsClient.appendRow(SHEET_CATEGORIES, CATEGORY_HEADERS);
    await sheetsClient.appendRows(SHEET_CATEGORIES, DEFAULT_CATEGORIES);
  }

  if (!(await sheetsClient.sheetExists(SHEET_STUDENTS))) {
    await sheetsClient.createSheet(SHEET_STUDENTS);
    await sheetsClient.appendRow(SHEET_STUDENTS, STUDENT_HEADERS);
    const now = new Date().toISOString();
    const rows = DEFAULT_STUDENTS.map((row) => {
      const student = {
        Order: row[0], BatchNo: row[1], CategoryId: row[2],
        GivenName: row[3], Surname: row[4], EnglishName: row[5],
        DOB: row[6], Village: row[7], District: row[8], Province: row[9],
        Major: row[10], CertNoLao: row[11], CertNoEnglish: row[12], DeptRegNo: row[13],
        DiplomaM6: row[14], DiplomaM7: row[15], Gender: row[16],
        ID: 'stu-' + crypto.randomUUID(),
        CreatedAt: now,
        UpdatedAt: now
      };
      return STUDENT_HEADERS.map((h) => (student[h] !== undefined ? student[h] : ''));
    });
    await sheetsClient.appendRows(SHEET_STUDENTS, rows);
  }

  if (!(await sheetsClient.sheetExists(SHEET_SETTINGS))) {
    await sheetsClient.createSheet(SHEET_SETTINGS);
    await sheetsClient.appendRow(SHEET_SETTINGS, SETTINGS_HEADERS);
    await sheetsClient.appendRows(SHEET_SETTINGS, DEFAULT_SETTINGS);
  }

  if (isFirstRun) {
    const { updatePrintReportSheet } = require('./reportSheet');
    await updatePrintReportSheet();
  }
}

/* ---------------- Generic sheet <-> object helpers ---------------- */

async function sheetToObjects(sheetName, headers) {
  const values = await sheetsClient.getValues(sheetName);
  const out = [];
  for (let i = 1; i < values.length; i++) { // skip header row
    const row = values[i] || [];
    if (row.join('') === '') continue;
    const obj = { _row: i + 1 }; // 1-based sheet row (header is row 1)
    headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
    out.push(obj);
  }
  return out;
}

function findRowById(objects, id) {
  const found = objects.find((o) => String(o.ID) === String(id));
  return found ? found._row : -1;
}

/* ---------------- Public API (mirrors Code.gs 1:1) ---------------- */

async function getAllData() {
  await ensureSheets();
  const [students, categoriesRaw, settingsRows] = await Promise.all([
    sheetToObjects(SHEET_STUDENTS, STUDENT_HEADERS),
    sheetToObjects(SHEET_CATEGORIES, CATEGORY_HEADERS),
    sheetToObjects(SHEET_SETTINGS, SETTINGS_HEADERS)
  ]);
  const categories = categoriesRaw.sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
  const settings = {};
  settingsRows.forEach((r) => { settings[r.Key] = r.Value; });
  return { students, categories, settings };
}

async function saveSettings(settingsObj) {
  await ensureSheets();
  const existing = await sheetToObjects(SHEET_SETTINGS, SETTINGS_HEADERS);
  const keyToRow = {};
  existing.forEach((r) => { keyToRow[r.Key] = r._row; });

  for (const key of Object.keys(settingsObj)) {
    if (keyToRow[key]) {
      await sheetsClient.updateCell(SHEET_SETTINGS, keyToRow[key], 2, settingsObj[key]);
    } else {
      await sheetsClient.appendRow(SHEET_SETTINGS, [key, settingsObj[key]]);
    }
  }

  const { updatePrintReportSheet } = require('./reportSheet');
  await updatePrintReportSheet();

  const rows = await sheetToObjects(SHEET_SETTINGS, SETTINGS_HEADERS);
  const map = {};
  rows.forEach((r) => { map[r.Key] = r.Value; });
  return map;
}

/* ---- Students ---- */

function currentYearSuffix() {
  const yy = new Date().getFullYear() % 100;
  return (yy < 10 ? '0' : '') + yy;
}

function pad3(n) {
  n = Number(n) || 0;
  let str = String(n);
  while (str.length < 3) str = '0' + str;
  return str;
}

function computeCertNoLao(order, batchNo) {
  return pad3(order) + '/ວຄທ/ຄມ.' + (batchNo || '');
}

function computeCertNoEnglish(order, batchNo) {
  return pad3(order) + '/KBAC/KM.' + (batchNo || '');
}

async function upsertStudent(student) {
  await ensureSheets();
  const existing = await sheetToObjects(SHEET_STUDENTS, STUDENT_HEADERS);
  const now = new Date().toISOString();

  if (student.ID) {
    const row = findRowById(existing, student.ID);
    if (row === -1) throw new Error('ไม่พบข้อมูลนักศึกษาที่ต้องการแก้ไข');
    const current = existing.find((o) => o._row === row);
    student.UpdatedAt = now;
    const values = STUDENT_HEADERS.map((h) => {
      if (h === 'CreatedAt') return current.CreatedAt;
      return student[h] !== undefined ? student[h] : '';
    });
    await sheetsClient.updateRow(SHEET_STUDENTS, row, values);
  } else {
    student.ID = 'stu-' + crypto.randomUUID();
    student.CreatedAt = now;
    student.UpdatedAt = now;
    if (!student.Order) {
      const max = existing.reduce((m, s) => Math.max(m, Number(s.Order) || 0), 0);
      student.Order = max + 1;
    }
    if (!student.BatchNo) student.BatchNo = currentYearSuffix();
    const values = STUDENT_HEADERS.map((h) => (student[h] !== undefined ? student[h] : ''));
    await sheetsClient.appendRow(SHEET_STUDENTS, values);
  }

  await renumberStudents();
  const { updatePrintReportSheet } = require('./reportSheet');
  await updatePrintReportSheet();
  return getAllData();
}

async function deleteStudent(id) {
  await ensureSheets();
  const existing = await sheetToObjects(SHEET_STUDENTS, STUDENT_HEADERS);
  const row = findRowById(existing, id);
  if (row === -1) throw new Error('ไม่พบข้อมูลนักศึกษา');
  await sheetsClient.deleteRow(SHEET_STUDENTS, row);
  await renumberStudents();
  const { updatePrintReportSheet } = require('./reportSheet');
  await updatePrintReportSheet();
  return getAllData();
}

/**
 * ຮຽງເລກລຳດັບ (ລ/ດ) ໃໝ່ໃຫ້ຕໍ່ເນື່ອງ 1..N ສະເໝີ ຫຼັງຈາກເພີ່ມ/ລຶບ/ແກ້ໄຂ —
 * ports Code.gs's renumberStudents_() 1:1 (same sort key, same cert recompute).
 */
async function renumberStudents() {
  const [students, categories] = await Promise.all([
    sheetToObjects(SHEET_STUDENTS, STUDENT_HEADERS),
    sheetToObjects(SHEET_CATEGORIES, CATEGORY_HEADERS)
  ]);
  if (students.length === 0) return;

  const categorySortOrder = {};
  categories.forEach((c) => { categorySortOrder[c.ID] = c.SortOrder || 0; });

  students.sort((a, b) => {
    const ca = categorySortOrder[a.CategoryId] !== undefined ? categorySortOrder[a.CategoryId] : 999;
    const cb = categorySortOrder[b.CategoryId] !== undefined ? categorySortOrder[b.CategoryId] : 999;
    if (ca !== cb) return ca - cb;
    const oa = Number(a.Order) || 0;
    const ob = Number(b.Order) || 0;
    if (oa !== ob) return oa - ob;
    return a._row - b._row;
  });

  const orderCol = STUDENT_HEADERS.indexOf('Order') + 1;
  const certLaoCol = STUDENT_HEADERS.indexOf('CertNoLao') + 1;
  const certEngCol = STUDENT_HEADERS.indexOf('CertNoEnglish') + 1;

  for (let idx = 0; idx < students.length; idx++) {
    const st = students[idx];
    const newOrder = idx + 1;
    if (Number(st.Order) !== newOrder) {
      await sheetsClient.updateCell(SHEET_STUDENTS, st._row, orderCol, newOrder);
    }
    const expectedCertLao = computeCertNoLao(newOrder, st.BatchNo);
    const expectedCertEng = computeCertNoEnglish(newOrder, st.BatchNo);
    if (st.CertNoLao !== expectedCertLao) {
      await sheetsClient.updateCell(SHEET_STUDENTS, st._row, certLaoCol, expectedCertLao);
    }
    if (st.CertNoEnglish !== expectedCertEng) {
      await sheetsClient.updateCell(SHEET_STUDENTS, st._row, certEngCol, expectedCertEng);
    }
  }
}

/* ---- Report data (grouped + summary counts) ---- */

async function getReportData() {
  const data = await getAllData();
  const byCategory = {};
  data.categories.forEach((c) => { byCategory[c.ID] = { category: c, students: [] }; });

  data.students
    .slice()
    .sort((a, b) => (Number(a.Order) || 0) - (Number(b.Order) || 0))
    .forEach((st) => {
      if (!byCategory[st.CategoryId]) {
        byCategory[st.CategoryId] = {
          category: { ID: st.CategoryId, Name: '(ບໍ່ລະບຸ)', SortOrder: 999, SummaryLabel: '(ບໍ່ລະບຸ)' },
          students: []
        };
      }
      byCategory[st.CategoryId].students.push(st);
    });

  const groups = Object.keys(byCategory)
    .map((k) => byCategory[k])
    .sort((a, b) => (a.category.SortOrder || 0) - (b.category.SortOrder || 0));

  const summary = groups.map((g) => {
    const female = g.students.filter((s) => s.Gender === 'F').length;
    return { label: g.category.SummaryLabel || g.category.Name, total: g.students.length, female };
  });

  const grandTotal = {
    total: summary.reduce((a, s) => a + s.total, 0),
    female: summary.reduce((a, s) => a + s.female, 0)
  };

  return { groups, summary, grandTotal, settings: data.settings };
}

module.exports = {
  ensureSheets,
  sheetToObjects,
  getAllData,
  saveSettings,
  upsertStudent,
  deleteStudent,
  renumberStudents,
  getReportData,
  currentYearSuffix,
  pad3,
  computeCertNoLao,
  computeCertNoEnglish
};
