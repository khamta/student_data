require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');

const data = require('./lib/data');
const { updatePrintReportSheet } = require('./lib/reportSheet');
const { uploadPhoto } = require('./lib/imageUpload');

const PORT = process.env.PORT || 8080;
const INDEX_HTML_PATH = path.join(__dirname, '..', 'Index.html');

// Every function the client calls through google.script.run in Index.html.
// Keeping this as one dispatch table (instead of one REST route per action)
// means Index.html itself needs zero changes between the Apps Script and
// Node.js deployment paths.
const RPC_FUNCTIONS = {
  getAllData: () => data.getAllData(),
  upsertStudent: (student) => data.upsertStudent(student),
  deleteStudent: (id) => data.deleteStudent(id),
  saveSettings: (settingsObj) => data.saveSettings(settingsObj),
  getReportData: () => data.getReportData(),
  updatePrintReportSheet: () => updatePrintReportSheet(),
  uploadPhoto: (base64Data, mimeType, fileName) => uploadPhoto(base64Data, mimeType, fileName)
};

// Replaces google.script.run (only available inside real Apps Script
// HtmlService pages) with a fetch()-based shim that calls our own
// /api/rpc/<fn> endpoint instead. This lets Index.html run completely
// unmodified between the Apps Script and Node.js deployment paths.
const SHIM_SCRIPT = `
<script>
  window.google = {
    script: {
      run: (function () {
        function chain(successFn, failureFn) {
          return new Proxy({}, {
            get(_, prop) {
              if (prop === 'withSuccessHandler') return (fn) => chain(fn, failureFn);
              if (prop === 'withFailureHandler') return (fn) => chain(successFn, fn);
              return function (...args) {
                fetch('/api/rpc/' + prop, {
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

const app = express();
app.use(express.json({ limit: '15mb' })); // photo uploads arrive as base64 JSON

app.get('/', (req, res) => {
  let html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  html = html.replace('</head>', SHIM_SCRIPT + '<title>ລະບົບຈັດການຂໍ້ມູນນັກສຶກສາ</title></head>');
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.post('/api/rpc/:fn', async (req, res) => {
  const fn = RPC_FUNCTIONS[req.params.fn];
  if (!fn) {
    res.json({ __error: 'ບໍ່ຮູ້ຈັກຟັງຊັນ: ' + req.params.fn });
    return;
  }
  try {
    const args = Array.isArray(req.body) ? req.body : [];
    const result = await fn(...args);
    res.json({ result });
  } catch (err) {
    res.json({ __error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log('Student registry (Node.js) running at http://localhost:' + PORT);
});
