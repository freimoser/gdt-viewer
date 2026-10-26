/**
 * GDT Viewer – client-side parser for German Gerätedatentransfer files.
 * Files never leave the browser.
 */

const FIELD_LABELS = {
  "8000": "Satzidentifikation",
  "8001": "Version GDT",
  "8004": "Satzlänge (GDT 3.x)",
  "8100": "Satzlänge (GDT 2.x)",
  "8315": "GDT-ID Empfänger",
  "8316": "GDT-ID Sender",
  "9206": "Zeichensatz",
  "9218": "GDT-Version",
  "3000": "Patientennummer / ID",
  "3100": "Namenszusatz",
  "3101": "Name (Nachname)",
  "3102": "Vorname",
  "3103": "Geburtsdatum",
  "3104": "Titel",
  "3105": "Versichertennummer",
  "3106": "Wohnort (PLZ + Ort)",
  "3107": "Straße",
  "3108": "Versichertenart",
  "3110": "Geschlecht",
  "3112": "PLZ",
  "3113": "Wohnort",
  "3618": "Mobiltelefon",
  "3619": "E-Mail-Adresse",
  "3622": "Größe (cm)",
  "3623": "Gewicht (kg)",
  "2002": "Tag der Erhebung",
  "2003": "Uhrzeit der Erhebung",
  "6200": "Tag der Untersuchung",
  "6201": "Uhrzeit der Untersuchung",
  "6220": "Ergebnis-Text / Kommentar",
  "6227": "Dateiinhalt / Anhang",
  "6302": "Dateiformat",
  "6303": "Dateiname",
  "6304": "Dateiinhaltsbeschreibung",
  "6305": "Dateigröße",
  "8402": "Art der Untersuchung",
  "8410": "Test-Ident / Kennung",
  "8411": "Testbezeichnung",
  "8420": "Ergebnis-Wert",
  "8421": "Einheit",
  "8432": "Probenmaterial",
  "8480": "Ergebnis-Text",
  "8490": "Normalwert-Text",
  "8501": "Befundart",
  "8504": "Ergebnis-Status",
};

const $ = (id) => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("fileInput");
const browseBtn = $("browseBtn");
const toolbar = $("toolbar");
const summary = $("summary");
const results = $("results");
const tableBody = $("tableBody");
const raw = $("raw");
const rawText = $("rawText");
const errorBox = $("error");
const fileNameEl = $("fileName");
const fileInfoEl = $("fileInfo");
const showRaw = $("showRaw");
const copyBtn = $("copyBtn");
const downloadBtn = $("downloadBtn");
const clearBtn = $("clearBtn");
const formatSelect = $("formatSelect");
const generateBtn = $("generateBtn");
const downloadGenBtn = $("downloadGenBtn");
const formatHint = $("formatHint");
const statusEl = $("status");

let lastRecords = [];
let lastRaw = "";
let lastFileName = "export.gdt";
let lastGenerated = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function announce(message) {
  statusEl.textContent = "";
  // Re-set on the next frame so repeated identical messages are announced again
  requestAnimationFrame(() => {
    statusEl.textContent = message;
  });
}

/**
 * Parse a single GDT line.
 * Standard: first 3 digits = total line length (incl. CR/LF), next 4 = field ID.
 * Also accepts bare "FFFFcontent" lines without length prefix.
 */
function parseLine(line, lineNumber) {
  const cleaned = line.replace(/\r$/, "");
  if (!cleaned.trim()) return null;

  // Full form: LLLffffcontent
  if (/^\d{7}/.test(cleaned)) {
    const declaredLen = parseInt(cleaned.slice(0, 3), 10);
    const fieldId = cleaned.slice(3, 7);
    const content = cleaned.slice(7);
    return {
      line: lineNumber,
      fieldId,
      content,
      label: FIELD_LABELS[fieldId] || "Unbekanntes Feld",
      declaredLen,
      raw: cleaned,
    };
  }

  // Fallback: ffffcontent
  if (/^\d{4}/.test(cleaned)) {
    const fieldId = cleaned.slice(0, 4);
    const content = cleaned.slice(4);
    return {
      line: lineNumber,
      fieldId,
      content,
      label: FIELD_LABELS[fieldId] || "Unbekanntes Feld",
      declaredLen: null,
      raw: cleaned,
    };
  }

  return {
    line: lineNumber,
    fieldId: "—",
    content: cleaned,
    label: "Freitext / nicht erkannt",
    declaredLen: null,
    raw: cleaned,
  };
}

function parseGdt(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r\n|\n|\r/);
  const records = [];

  lines.forEach((line, idx) => {
    const rec = parseLine(line, idx + 1);
    if (rec) records.push(rec);
  });

  return { records, raw: normalized };
}

function findField(records, id) {
  const hit = records.find((r) => r.fieldId === id && r.content.trim());
  return hit ? hit.content.trim() : null;
}

function formatDate(value) {
  if (!value) return null;
  // DDMMYYYY (GDT 2.x) or YYYYMMDD (GDT 3.x) – only one reading can be a valid date
  if (/^\d{8}$/.test(value)) {
    const valid = (y, m, d) => y >= 1800 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
    const num = (from, to) => parseInt(value.slice(from, to), 10);
    if (valid(num(0, 4), num(4, 6), num(6, 8))) {
      return `${value.slice(6, 8)}.${value.slice(4, 6)}.${value.slice(0, 4)}`;
    }
    if (valid(num(4, 8), num(2, 4), num(0, 2))) {
      return `${value.slice(0, 2)}.${value.slice(2, 4)}.${value.slice(4, 8)}`;
    }
  }
  return value;
}

function buildSummary(records) {
  const lastName = findField(records, "3101");
  const firstName = findField(records, "3102");
  const patient =
    [lastName, firstName].filter(Boolean).join(", ") ||
    findField(records, "3000") ||
    "—";

  const birth = formatDate(findField(records, "3103")) || "—";
  const sexRaw = findField(records, "3110");
  const sexMap = {
    "1": "männlich",
    "2": "weiblich",
    M: "männlich",
    W: "weiblich",
    m: "männlich",
    w: "weiblich",
    D: "divers",
    X: "unbestimmt",
    U: "unbekannt",
  };
  const sex = (sexRaw && (sexMap[sexRaw] || sexRaw)) || "—";
  const date =
    formatDate(findField(records, "6200")) ||
    formatDate(findField(records, "2002")) ||
    "—";
  const satz = findField(records, "8000") || "—";
  const version = findField(records, "9218") || "—";

  return [
    { label: "Patient", value: patient, wide: true },
    { label: "Geburtsdatum", value: birth },
    { label: "Geschlecht", value: sex },
    { label: "Untersuchungsdatum", value: date },
    { label: "Satzart", value: satz },
    { label: "GDT-Version", value: version },
    { label: "Felder", value: String(records.length) },
  ];
}

function render(records, rawContent, fileMeta) {
  lastRecords = records;
  lastRaw = rawContent;
  lastFileName = fileMeta.name || "export.gdt";

  fileNameEl.textContent = lastFileName;
  const size = fileMeta.size != null ? fileMeta.size : new Blob([rawContent]).size;
  const kb = (size / 1024).toFixed(size < 1024 ? 2 : 1);
  const extra = fileMeta.extraInfo ? ` · ${fileMeta.extraInfo}` : "";
  fileInfoEl.textContent = `${kb} KB · ${records.length} Felder${extra}`;

  const cards = buildSummary(records);
  summary.innerHTML = cards
    .map(
      (c) => `
      <div class="summary-card${c.wide ? " summary-card-wide" : ""}">
        <span class="label">${escapeHtml(c.label)}</span>
        <span class="value">${escapeHtml(c.value)}</span>
      </div>`
    )
    .join("");

  tableBody.innerHTML = records
    .map(
      (r) => `
      <tr>
        <td class="col-line"><span class="cell-prefix">Zeile </span>${r.line}</td>
        <td class="col-id">${escapeHtml(r.fieldId)}</td>
        <td class="col-label">${escapeHtml(r.label)}</td>
        <td class="col-value">${escapeHtml(r.content)}</td>
      </tr>`
    )
    .join("");

  rawText.textContent = rawContent;

  toolbar.classList.remove("hidden");
  summary.classList.remove("hidden");
  results.classList.remove("hidden");
  raw.classList.toggle("hidden", !showRaw.checked);
  dropzone.classList.add("hidden");
  if (downloadBtn) downloadBtn.disabled = false;
  announce(`${lastFileName} geladen · ${records.length} Felder`);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function initFormatSelect() {
  if (!formatSelect || typeof listGdtFormats !== "function") return;
  for (const fmt of listGdtFormats()) {
    const opt = document.createElement("option");
    opt.value = fmt.id;
    opt.textContent = fmt.label;
    formatSelect.appendChild(opt);
  }
  updateFormatHint();
}

function updateFormatHint() {
  if (!formatHint || typeof GDT_FORMATS === "undefined") return;
  const id = formatSelect?.value;
  if (!id || id === "random") {
    formatHint.textContent =
      "Wählt zufällig eines der Formate und eine Satzart (6301 / 6302 / 6310).";
    return;
  }
  const fmt = GDT_FORMATS[id];
  formatHint.textContent = fmt ? fmt.description : "";
}

function runGenerate() {
  clearError();
  if (typeof generateRandomGdt !== "function") {
    showError("Generator nicht geladen (generator.js).");
    return;
  }
  try {
    const formatId = formatSelect?.value || "random";
    const gen = generateRandomGdt(formatId);
    lastGenerated = gen;

    const { records, raw: rawContent } = parseGdt(gen.text);
    if (!records.length) {
      showError("Generator lieferte keine lesbaren Felder.");
      return;
    }

    if (downloadGenBtn) downloadGenBtn.disabled = false;
    formatHint.textContent = `Erzeugt: ${gen.format.label} · Satzart(en) ${gen.satzarten.join(", ")} · ${gen.patient.lastName}, ${gen.patient.firstName}`;

    render(records, rawContent, {
      name: gen.fileName,
      size: new Blob([gen.text]).size,
      extraInfo: gen.format.id,
    });
  } catch (err) {
    showError(`Generator-Fehler: ${err.message || err}`);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function handleFile(file) {
  clearError();
  if (!file) return;

  const name = file.name.toLowerCase();
  if (!name.endsWith(".gdt") && !name.endsWith(".txt") && file.type && !file.type.startsWith("text")) {
    // still try – many GDT files have empty MIME
  }

  try {
    const text = decodeGdt(await file.arrayBuffer());

    const { records, raw: rawContent } = parseGdt(text);
    if (!records.length) {
      showError("Keine GDT-Felder erkannt. Ist die Datei leer oder im falschen Format?");
      return;
    }
    render(records, rawContent, file);
    // The dropzone (and the focused button in it) is now hidden – keep focus on the result
    toolbar.focus();
  } catch (err) {
    showError(`Datei konnte nicht gelesen werden: ${err.message || err}`);
  }
}

/**
 * German GDT exports are usually Windows-1252 / ISO 8859-1 (field 9206 = 3), newer ones UTF-8.
 * Strict UTF-8 decoding fails on CP1252 umlauts, so it cleanly tells the two apart.
 */
function decodeGdt(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function reset() {
  lastRecords = [];
  lastRaw = "";
  lastFileName = "export.gdt";
  lastGenerated = null;
  fileInput.value = "";
  tableBody.innerHTML = "";
  summary.innerHTML = "";
  rawText.textContent = "";
  toolbar.classList.add("hidden");
  summary.classList.add("hidden");
  results.classList.add("hidden");
  raw.classList.add("hidden");
  dropzone.classList.remove("hidden");
  if (downloadGenBtn) downloadGenBtn.disabled = !lastGenerated;
  if (downloadBtn) downloadBtn.disabled = true;
  clearError();
  updateFormatHint();
  browseBtn.focus();
}

// Events
browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

// Mouse users can click anywhere in the zone; keyboard users use the button
dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
});

["dragenter", "dragover"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

showRaw.addEventListener("change", () => {
  if (!lastRaw) return;
  raw.classList.toggle("hidden", !showRaw.checked);
});

clearBtn.addEventListener("click", reset);

copyBtn.addEventListener("click", async () => {
  if (!lastRecords.length) return;
  const tsv = [
    "Zeile\tFeld\tBedeutung\tInhalt",
    ...lastRecords.map((r) => `${r.line}\t${r.fieldId}\t${r.label}\t${r.content.replace(/\t/g, " ")}`),
  ].join("\n");
  try {
    await navigator.clipboard.writeText(tsv);
    copyBtn.textContent = "Kopiert!";
    announce("Tabelle in die Zwischenablage kopiert");
    setTimeout(() => {
      copyBtn.textContent = "Kopieren";
    }, 1500);
  } catch {
    showError("Zwischenablage nicht verfügbar.");
  }
});

if (downloadBtn) {
  downloadBtn.disabled = true;
  downloadBtn.addEventListener("click", () => {
    if (!lastRaw) return;
    downloadText(lastFileName.endsWith(".gdt") ? lastFileName : `${lastFileName}.gdt`, lastRaw);
  });
}

if (generateBtn) {
  generateBtn.addEventListener("click", runGenerate);
}

if (downloadGenBtn) {
  downloadGenBtn.addEventListener("click", () => {
    if (!lastGenerated) return;
    downloadText(lastGenerated.fileName, lastGenerated.text);
  });
}

if (formatSelect) {
  formatSelect.addEventListener("change", updateFormatHint);
}

initFormatSelect();

// Prevent browser from opening dropped files outside the zone
["dragover", "drop"].forEach((evt) => {
  window.addEventListener(evt, (e) => e.preventDefault());
});
