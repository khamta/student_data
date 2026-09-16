#!/usr/bin/env node
/**
 * เซิร์ฟเวอร์จำลอง (mock) สำหรับทดสอบหน้าตาและการทำงานของแอปบนเครื่องตัวเอง
 * ก่อนนำไปดีพลอยจริงบน Google Apps Script
 *
 * ใช้เฉพาะโมดูลมาตรฐานของ Node.js (ไม่ต้อง npm install) — รันด้วย:
 *   node local-dev/server.js
 * แล้วเปิดเบราว์เซอร์ไปที่ http://localhost:8080
 *
 * ข้อมูลที่กรอกที่นี่จะถูกเก็บไว้ใน local-dev/data.json บนเครื่องเท่านั้น
 * ไม่มีการเชื่อมต่อกับ Google Sheets/Drive จริงแต่อย่างใด — เอาไว้ทดสอบ
 * การใช้งานหน้าตา (add/edit/delete, หมวดหมู่, ตั้งค่า, พิมพ์รายงาน) เท่านั้น
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(__dirname, 'data.json');

const DEFAULT_SETTINGS = {
  OrgLine1: 'ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ',
  OrgLine2: 'ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ',
  OrgLine3: 'ກະຊວງສຶກສາທິການ ແລະ ກີລາ',
  OrgLine4: 'ກົມສະຫງວນສຶກສາ',
  OrgLine5: 'ພະແນກສຶກສາທິການ ແລະ ກີລາແຂວງ',
  OrgLine6: 'ວິທະຍາໄລ ຄຳໝັ້ນ ບໍລິຫານທຸລະກິດ ຄຳມ່ວນ',
  OrgLine7: 'ໂທລະສັບ: 020 55994488',
  ReportTitle: 'ບັນຊີລາຍຊື່ນັກສຶກສາທີ່ຈະໄດ້ຮັບໃບປະກາດສະນີຍະບັດ ສົກຮຽນ 2024-2025',
  ReportSubtitle: 'ຈັດຮຽງຕາມສາຂາວິຊາ, ພາກຮຽນ ແລະ ໄວທິ',
  ApprovalLeft: 'ຄຳມ່ວນ, ວັນທີ .......................',
  ApprovalRightTitle: 'ຫົວໜ້າພະແນກສຶກສາທິການ ແລະ ກີລາແຂວງ',
  ApprovalLeftTitle: 'ຜູ້ອຳນວຍການວິທະຍາໄລ'
};

const DEFAULT_DATA = {
  students: [],
  categories: [
    { ID: 'cat-1', Name: 'I. ສາຂາບໍລິຫານທຸລະກິດ', SortOrder: 1 },
    { ID: 'cat-2', Name: 'II. ສາຂາວິທະຍາສາດຄອມພິວເຕີ ແລະ ສິ່ງແວດລ້ອມ', SortOrder: 2 }
  ],
  settings: DEFAULT_SETTINGS
};

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    saveData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function randomId() {
  return crypto.randomUUID();
}

/* ---------------- Mock of Code.gs's public functions ---------------- */

function getAllData() {
  const d = loadData();
  return {
    students: d.students,
    categories: d.categories.slice().sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0)),
    settings: d.settings
  };
}

function nextOrder(students) {
  let max = 0;
  students.forEach((s) => {
    const n = Number(s.Order);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function upsertStudent(student) {
  const d = loadData();
  const now = new Date().toISOString();
  if (student.ID) {
    const idx = d.students.findIndex((s) => s.ID === student.ID);
    if (idx === -1) throw new Error('ไม่พบข้อมูลนักศึกษาที่ต้องการแก้ไข');
    const createdAt = d.students[idx].CreatedAt;
    d.students[idx] = Object.assign({}, student, { CreatedAt: createdAt, UpdatedAt: now });
  } else {
    student = Object.assign({}, student);
    student.ID = 'stu-' + randomId();
    student.CreatedAt = now;
    student.UpdatedAt = now;
    if (!student.Order) student.Order = nextOrder(d.students);
    d.students.push(student);
  }
  saveData(d);
  return getAllData();
}

function deleteStudent(id) {
  const d = loadData();
  const idx = d.students.findIndex((s) => s.ID === id);
  if (idx === -1) throw new Error('ไม่พบข้อมูลนักศึกษา');
  d.students.splice(idx, 1);
  saveData(d);
  return getAllData();
}

function upsertCategory(category) {
  const d = loadData();
  if (category.ID) {
    const idx = d.categories.findIndex((c) => c.ID === category.ID);
    if (idx === -1) throw new Error('ไม่พบหมวดหมู่');
    d.categories[idx] = Object.assign({}, d.categories[idx], category);
  } else {
    category = Object.assign({}, category);
    category.ID = 'cat-' + randomId();
    if (!category.SortOrder) category.SortOrder = d.categories.length + 1;
    d.categories.push(category);
  }
  saveData(d);
  return getAllData();
}

function deleteCategory(id) {
  const d = loadData();
  const inUse = d.students.some((s) => s.CategoryId === id);
  if (inUse) throw new Error('ไม่สามารถลบหมวดหมู่นี้ได้: ยังมีนักศึกษาอยู่ในหมวดนี้');
  const idx = d.categories.findIndex((c) => c.ID === id);
  if (idx === -1) throw new Error('ไม่พบหมวดหมู่');
  d.categories.splice(idx, 1);
  saveData(d);
  return getAllData();
}

function saveSettings(settingsObj) {
  const d = loadData();
  Object.assign(d.settings, settingsObj);
  saveData(d);
  return d.settings;
}

function uploadPhoto(base64Data, mimeType) {
  // ไม่มี Google Drive จริงตอนทดสอบในเครื่อง จึงฝังรูปเป็น data URL แทน
  return 'data:' + mimeType + ';base64,' + base64Data;
}

function getReportData() {
  const data = getAllData();
  const byCategory = {};
  data.categories.forEach((c) => { byCategory[c.ID] = { category: c, students: [] }; });

  data.students
    .slice()
    .sort((a, b) => (Number(a.Order) || 0) - (Number(b.Order) || 0))
    .forEach((st) => {
      if (!byCategory[st.CategoryId]) {
        byCategory[st.CategoryId] = { category: { ID: st.CategoryId, Name: '(ไม่ระบุหมวดหมู่)', SortOrder: 999 }, students: [] };
      }
      byCategory[st.CategoryId].students.push(st);
    });

  const groups = Object.keys(byCategory)
    .map((k) => byCategory[k])
    .sort((a, b) => (a.category.SortOrder || 0) - (b.category.SortOrder || 0));

  const summary = groups.map((g) => {
    const male = g.students.filter((s) => s.Gender === 'M').length;
    const female = g.students.filter((s) => s.Gender === 'F').length;
    return { name: g.category.Name, male, female, total: g.students.length };
  });

  const grandTotal = {
    male: summary.reduce((a, s) => a + s.male, 0),
    female: summary.reduce((a, s) => a + s.female, 0),
    total: summary.reduce((a, s) => a + s.total, 0)
  };

  return { groups, summary, grandTotal, settings: data.settings };
}

const HANDLERS = {
  getAllData, upsertStudent, deleteStudent,
  upsertCategory, deleteCategory,
  saveSettings, uploadPhoto, getReportData
};

/* ---------------- google.script.run shim injected into Index.html ---------------- */

const SHIM_SCRIPT = `
<script>
  // ชิมจำลอง google.script.run ให้เรียก API ในเครื่องแทนของจริงบน Apps Script
  window.google = {
    script: {
      run: (function () {
        function chain(successFn, failureFn) {
          return new Proxy({}, {
            get(_, prop) {
              if (prop === 'withSuccessHandler') return (fn) => chain(fn, failureFn);
              if (prop === 'withFailureHandler') return (fn) => chain(successFn, fn);
              return function (...args) {
                fetch('/api/' + prop, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(args)
                })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.__error) { if (failureFn) failureFn({ message: data.__error }); }
                    else if (successFn) successFn(data.result);
                  })
                  .catch((err) => { if (failureFn) failureFn(err); });
              };
            }
          });
        }
        return chain(null, null);
      })()
    }
  };
</script>
`;

function servePatchedIndex(res) {
  const indexPath = path.join(ROOT_DIR, 'Index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const patched = html.replace('<body>', '<body>\n' + SHIM_SCRIPT);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(patched);
}

function handleApi(req, res, fnName) {
  const fn = HANDLERS[fnName];
  if (!fn) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ __error: 'ไม่พบฟังก์ชัน: ' + fnName }));
    return;
  }
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const args = body ? JSON.parse(body) : [];
      const result = fn.apply(null, args);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ __error: err.message }));
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    servePatchedIndex(res);
  } else if (req.method === 'POST' && req.url.startsWith('/api/')) {
    handleApi(req, res, req.url.slice('/api/'.length));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ไม่พบหน้านี้');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('เซิร์ฟเวอร์ทดสอบพร้อมใช้งานแล้ว (ข้อมูลจำลอง ไม่ใช่ Google ชีตจริง)');
  console.log('เปิดเบราว์เซอร์ไปที่ -> http://localhost:' + PORT);
  console.log('ข้อมูลที่กรอกจะถูกเก็บไว้ที่ local-dev/data.json บนเครื่องนี้เท่านั้น');
  console.log('กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์');
  console.log('');
});
