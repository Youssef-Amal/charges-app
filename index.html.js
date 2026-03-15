// ── Charges Pro — Google Apps Script ─────────────────────────────────────
// Colle ce code dans Extensions → Apps Script (remplace tout)
// Déployer → Gérer les déploiements → ✏️ → Nouvelle version → Déployer

function doGet(e) { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  const body = e.postData ? JSON.parse(e.postData.contents) : e.parameter;
  let result;
  try {
    if (body.action === "read")  result = readAll();
    else if (body.action === "write") result = writeAll(body);
    else result = { error: "Unknown action" };
  } catch(err) { result = { error: err.toString() }; }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function readAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    charges: readSheet(ss, "Charges", ["id","name","amount","cat","freq","nextDate","alert","notes","paid","lastPaid","lastPaidAmount","realPayments"]),
    credits: readSheet(ss, "Credits", ["id","name","bank","amount","duration","startDate","cat","alert","paidMonths","realPayments"])
  };
}

function readSheet(ss, sheetName, headers) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) { sh = ss.insertSheet(sheetName); sh.appendRow(headers); return []; }
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const h = rows[0];
  return rows.slice(1).map(r => {
    const o = {};
    h.forEach((k, i) => o[k] = r[i] === "" ? null : r[i]);
    if (sheetName === "Charges") {
      o.amount = parseFloat(o.amount) || 0;
      o.alert  = parseInt(o.alert) || 7;
      o.paid   = o.paid === true || o.paid === "TRUE" || o.paid === "true";
      o.lastPaidAmount = parseFloat(o.lastPaidAmount) || null;
      try { o.realPayments = o.realPayments ? JSON.parse(o.realPayments) : {}; } catch(e) { o.realPayments = {}; }
    }
    if (sheetName === "Credits") {
      o.amount   = parseFloat(o.amount) || 0;
      o.duration = parseInt(o.duration) || 0;
      o.alert    = parseInt(o.alert) || 5;
      try { o.paidMonths  = o.paidMonths  ? JSON.parse(o.paidMonths)  : []; } catch(e) { o.paidMonths = []; }
      try { o.realPayments = o.realPayments ? JSON.parse(o.realPayments) : {}; } catch(e) { o.realPayments = {}; }
    }
    return o;
  });
}

function writeAll(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  writeSheet(ss, "Charges",
    ["id","name","amount","cat","freq","nextDate","alert","notes","paid","lastPaid","lastPaidAmount","realPayments"],
    (body.charges || []).map(c => ({...c, realPayments: JSON.stringify(c.realPayments || {})}))
  );
  writeSheet(ss, "Credits",
    ["id","name","bank","amount","duration","startDate","cat","alert","paidMonths","realPayments"],
    (body.credits || []).map(c => ({...c,
      paidMonths: JSON.stringify(c.paidMonths || []),
      realPayments: JSON.stringify(c.realPayments || {})
    }))
  );
  return { ok: true };
}

function writeSheet(ss, sheetName, headers, rows) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  sh.clearContents();
  sh.appendRow(headers);
  rows.forEach(r => sh.appendRow(headers.map(k => r[k] != null ? r[k] : "")));
}
