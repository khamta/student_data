// Ports Code.gs's updatePrintReportSheet() to the Sheets API v4 batchUpdate
// request format. Same row/column math as the Apps Script version (validated
// there with a mock-merge test) — just expressed as GridRange requests
// instead of Range.merge()/setValue()/setFontFamily() calls.

const sheetsClient = require('./sheetsClient');
const { SHEET_PRINT_REPORT } = require('./defaults');

const REPORT_COLS = 17;
const FONT_LAO = 'Phetsarath';
const FONT_ENG = 'Times New Roman';
const COL_WIDTHS = [40, 40, 50, 60, 90, 90, 150, 80, 90, 100, 80, 170, 90, 90, 90, 45, 45];
const LEFT_ALIGN_COLS0 = [4, 5, 6]; // GivenName, Surname, EnglishName (0-based)
const ENG_COLS0 = [6, 11, 13]; // EnglishName, Major, CertNoEnglish (0-based)

function cellValue(v) {
  if (typeof v === 'number') return { userEnteredValue: { numberValue: v } };
  return { userEnteredValue: { stringValue: v === undefined || v === null ? '' : String(v) } };
}

function textFormat(opts) {
  opts = opts || {};
  return {
    fontFamily: opts.font || FONT_LAO,
    bold: !!opts.bold,
    underline: !!opts.underline,
    fontSize: opts.fontSize || 10
  };
}

function gridRange(sheetId, r0, c0, numRows, numCols) {
  return { sheetId, startRowIndex: r0, endRowIndex: r0 + numRows, startColumnIndex: c0, endColumnIndex: c0 + numCols };
}

async function updatePrintReportSheet() {
  const { getReportData } = require('./data'); // lazy to avoid circular require
  const report = await getReportData();
  const st = report.settings;

  let sheetId = await sheetsClient.getSheetId(SHEET_PRINT_REPORT);
  if (sheetId === undefined) {
    sheetId = await sheetsClient.createSheet(SHEET_PRINT_REPORT);
  }

  const requests = [];

  // ---- Clear everything (values, formatting, merges) first ----
  requests.push({ updateCells: { range: { sheetId }, fields: '*' } });
  requests.push({ unmergeCells: { range: { sheetId } } });

  COL_WIDTHS.forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: 'pixelSize'
      }
    });
  });

  let row = 0; // 0-based cursor

  function mergedLine(text, opts) {
    opts = opts || {};
    const range = gridRange(sheetId, row, 0, 1, REPORT_COLS);
    requests.push({ mergeCells: { range, mergeType: 'MERGE_ALL' } });
    requests.push({
      updateCells: {
        range,
        rows: [{ values: [{
          ...cellValue(text || ''),
          userEnteredFormat: {
            textFormat: textFormat(opts),
            horizontalAlignment: (opts.align || 'center').toUpperCase(),
            verticalAlignment: 'MIDDLE'
          }
        }] }],
        fields: 'userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)'
      }
    });
    row++;
  }

  mergedLine(st.OrgLine1, { bold: true });
  mergedLine(st.OrgLine2);
  ['OrgLine3', 'OrgLine4', 'OrgLine5', 'OrgLine6', 'OrgLine7', 'OrgLine8'].forEach((k) => {
    if (st[k]) mergedLine(st[k], { align: 'left' });
  });

  row++; // spacer
  mergedLine(st.ReportTitle, { bold: true, underline: true, fontSize: 12 });
  if (st.ReportSubtitle) mergedLine(st.ReportSubtitle, { underline: true });
  row++; // spacer

  // ---- Table header (2 rows, with merges matching the printed report) ----
  const h1 = row;
  const h2 = row + 1;

  function headerCell(colStart0, colSpan, rowSpan, text) {
    const range = gridRange(sheetId, h1, colStart0, rowSpan, colSpan);
    requests.push({ mergeCells: { range, mergeType: 'MERGE_ALL' } });
    requests.push({
      updateCells: {
        range,
        rows: [{ values: [{ ...cellValue(text) }] }],
        fields: 'userEnteredValue'
      }
    });
  }

  headerCell(0, 1, 2, 'ລ/ດ');
  headerCell(1, 2, 1, 'ເລກທະບຽນນັກສຶກສາ');
  headerCell(3, 1, 2, 'ຮູບຖ່າຍ');
  headerCell(4, 1, 2, 'ຊື່');
  headerCell(5, 1, 2, 'ນາມສະກຸນ');
  headerCell(6, 1, 2, 'ຊື່ແລະນາມສະກຸນ\n(ພາສາອັງກິດ)');
  headerCell(7, 1, 2, 'ວັນເດືອນປີເກີດ');
  headerCell(8, 1, 2, 'ບ້ານ');
  headerCell(9, 1, 2, 'ເມືອງ/ນະຄອນ');
  headerCell(10, 1, 2, 'ແຂວງ');
  headerCell(11, 1, 2, 'ລະຫັດວິຊາທີ່ຮຽນ\n(ຖ້າມີແມ່ນໃສ່ຊື່ວິຊາ)');
  headerCell(12, 2, 1, 'ທະບຽນທາງວິທະຍາໄລ');
  headerCell(14, 1, 2, 'ທະບຽນກົມການ\nສຶກສາຊັ້ນສູງ');
  headerCell(15, 2, 1, 'ໃບປະກາດມ.ປາຍ');

  requests.push({
    updateCells: {
      range: gridRange(sheetId, h2, 12, 1, 1),
      rows: [{ values: [cellValue('ພາສາລາວ')] }],
      fields: 'userEnteredValue'
    }
  });
  requests.push({
    updateCells: {
      range: gridRange(sheetId, h2, 13, 1, 1),
      rows: [{ values: [cellValue('ພາສາອັງກິດ')] }],
      fields: 'userEnteredValue'
    }
  });
  requests.push({
    updateCells: {
      range: gridRange(sheetId, h2, 15, 1, 1),
      rows: [{ values: [cellValue('ມ.6')] }],
      fields: 'userEnteredValue'
    }
  });
  requests.push({
    updateCells: {
      range: gridRange(sheetId, h2, 16, 1, 1),
      rows: [{ values: [cellValue('ມ.7')] }],
      fields: 'userEnteredValue'
    }
  });

  // Header block formatting (bold, centered, wrapped, bordered) in one pass
  const headerRange = gridRange(sheetId, h1, 0, 2, REPORT_COLS);
  requests.push({
    repeatCell: {
      range: headerRange,
      cell: {
        userEnteredFormat: {
          textFormat: textFormat({ bold: true, fontSize: 9 }),
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          wrapStrategy: 'WRAP'
        }
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
    }
  });
  requests.push({
    updateBorders: {
      range: headerRange,
      top: { style: 'SOLID' }, bottom: { style: 'SOLID' },
      left: { style: 'SOLID' }, right: { style: 'SOLID' },
      innerHorizontal: { style: 'SOLID' }, innerVertical: { style: 'SOLID' }
    }
  });

  row = h2 + 1;

  // ---- Category groups + student rows ----
  report.groups.forEach((g) => {
    if (g.students.length === 0 && report.groups.length > 1) return;

    const catRange = gridRange(sheetId, row, 0, 1, REPORT_COLS);
    requests.push({ mergeCells: { range: catRange, mergeType: 'MERGE_ALL' } });
    requests.push({
      updateCells: {
        range: catRange,
        rows: [{ values: [{
          ...cellValue(g.category.Name),
          userEnteredFormat: {
            textFormat: textFormat({ bold: true, underline: true }),
            horizontalAlignment: 'LEFT'
          }
        }] }],
        fields: 'userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)'
      }
    });
    row++;

    g.students
      .slice()
      .sort((a, b) => (Number(a.Order) || 0) - (Number(b.Order) || 0))
      .forEach((s) => {
        const values = [
          s.Order, s.Order, s.BatchNo, '', s.GivenName, s.Surname, s.EnglishName,
          s.DOB, s.Village, s.District, s.Province, s.Major,
          s.CertNoLao, s.CertNoEnglish, s.DeptRegNo, s.DiplomaM6, s.DiplomaM7
        ];
        const rowRange = gridRange(sheetId, row, 0, 1, REPORT_COLS);
        const cellValues = values.map((v, i) => {
          const base = i === 3 && s.PhotoUrl
            ? { userEnteredValue: { formulaValue: '=IMAGE("' + s.PhotoUrl + '",4,36,36)' } }
            : cellValue(v);
          return {
            ...base,
            userEnteredFormat: {
              textFormat: textFormat({ font: ENG_COLS0.indexOf(i) !== -1 ? FONT_ENG : FONT_LAO, fontSize: 10 }),
              horizontalAlignment: LEFT_ALIGN_COLS0.indexOf(i) !== -1 ? 'LEFT' : 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          };
        });
        requests.push({
          updateCells: {
            range: rowRange,
            rows: [{ values: cellValues }],
            fields: 'userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)'
          }
        });
        requests.push({
          updateBorders: {
            range: rowRange,
            top: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerVertical: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } }
          }
        });
        row++;
      });
  });

  row++; // spacer

  // ---- Summary rows ----
  function summaryLine(label, total, female, bold) {
    const labelRange = gridRange(sheetId, row, 0, 1, 5);
    requests.push({ mergeCells: { range: labelRange, mergeType: 'MERGE_ALL' } });
    const midRange = gridRange(sheetId, row, 6, 1, 3);
    requests.push({ mergeCells: { range: midRange, mergeType: 'MERGE_ALL' } });

    const fmt = { textFormat: textFormat({ bold }) };
    requests.push({
      updateCells: {
        range: gridRange(sheetId, row, 0, 1, 11),
        rows: [{
          values: [
            { ...cellValue(label), userEnteredFormat: fmt },
            {}, {}, {}, {},
            { ...cellValue(total), userEnteredFormat: { ...fmt, horizontalAlignment: 'CENTER' } },
            { ...cellValue('ຄົນ, ຍິງ :'), userEnteredFormat: fmt },
            {}, {},
            { ...cellValue(female), userEnteredFormat: { ...fmt, horizontalAlignment: 'CENTER' } },
            { ...cellValue('ຄົນ'), userEnteredFormat: fmt }
          ]
        }],
        fields: 'userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)'
      }
    });
    row++;
  }

  report.summary.forEach((s) => summaryLine(s.label, s.total, s.female, false));
  summaryLine(st.GrandTotalLabel, report.grandTotal.total, report.grandTotal.female, true);

  row++; // spacer

  // ---- Signature block ----
  const dateRange = gridRange(sheetId, row, 0, 1, REPORT_COLS);
  requests.push({ mergeCells: { range: dateRange, mergeType: 'MERGE_ALL' } });
  requests.push({
    updateCells: {
      range: dateRange,
      rows: [{ values: [{ ...cellValue(st.ApprovalDateLine || ''), userEnteredFormat: { textFormat: textFormat(), horizontalAlignment: 'RIGHT' } }] }],
      fields: 'userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)'
    }
  });
  row += 2;

  const leftRange = gridRange(sheetId, row, 0, 1, 8);
  requests.push({ mergeCells: { range: leftRange, mergeType: 'MERGE_ALL' } });
  requests.push({
    updateCells: {
      range: leftRange,
      rows: [{ values: [{ ...cellValue(st.ApprovalLeftTitle || ''), userEnteredFormat: { textFormat: textFormat(), horizontalAlignment: 'CENTER' } }] }],
      fields: 'userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)'
    }
  });

  const rightRange = gridRange(sheetId, row, 8, 1, 9);
  requests.push({ mergeCells: { range: rightRange, mergeType: 'MERGE_ALL' } });
  requests.push({
    updateCells: {
      range: rightRange,
      rows: [{ values: [{ ...cellValue(st.ApprovalRightTitle || ''), userEnteredFormat: { textFormat: textFormat(), horizontalAlignment: 'CENTER' } }] }],
      fields: 'userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment)'
    }
  });

  await sheetsClient.batchUpdate(requests);
  return { rows: row, sheetName: SHEET_PRINT_REPORT };
}

module.exports = { updatePrintReportSheet };
