/**
 * GDT Viewer – user interface. Decoding, parsing and checks live in gdt-core.js.
 * Files never leave the browser.
 */

const $ = (id) => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("fileInput");
const browseBtn = $("browseBtn");
const toolbar = $("toolbar");
const summary = $("summary");
const validation = $("validation");
const validationTitle = $("validationTitle");
const validationList = $("validationList");
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
let lastBytes = null;
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
    formatDate(findField(records, "8432")) ||
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

const LEVEL_TEXT = { error: "Fehler", warning: "Warnung", info: "Hinweis" };

function renderValidation(result) {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const i of result.issues) counts[i.level]++;

  let state = "ok";
  let title = `Prüfung nach ${result.standard}: keine Fehler gefunden`;
  if (counts.error) {
    state = "error";
    title = `Prüfung nach ${result.standard}: ${counts.error} Fehler`;
  } else if (counts.warning) {
    state = "warning";
    title = `Prüfung nach ${result.standard}: keine Fehler, ${counts.warning} Warnung${counts.warning > 1 ? "en" : ""}`;
  }
  if (counts.error && counts.warning) title += `, ${counts.warning} Warnung${counts.warning > 1 ? "en" : ""}`;
  if (counts.info) title += ` · ${counts.info} Hinweis${counts.info > 1 ? "e" : ""}`;

  validation.dataset.state = state;
  validationTitle.textContent = title;
  validationList.innerHTML = result.issues
    .map((i) => {
      const where = i.line
        ? `<a href="#zeile-${i.line}" data-line="${i.line}">Zeile ${i.line}${i.field ? ` · ${escapeHtml(i.field)}` : ""}</a>`
        : "Datei";
      return `<li class="issue issue-${i.level}"><span class="issue-level">${LEVEL_TEXT[i.level]}</span><span class="issue-where">${where}</span><span class="issue-text">${escapeHtml(i.message)}</span></li>`;
    })
    .join("");
  validationList.hidden = result.issues.length === 0;
  validation.classList.remove("hidden");
  return counts;
}

function render(parsed, rawContent, fileMeta, decoded) {
  const { records } = parsed;
  lastRecords = records;
  lastRaw = rawContent;
  lastFileName = fileMeta.name || "export.gdt";

  const result = GdtCore.validate(parsed, decoded);
  const worst = new Map();
  const rank = { error: 3, warning: 2, info: 1 };
  for (const i of result.issues) {
    if (i.line && (rank[i.level] || 0) > (rank[worst.get(i.line)] || 0)) worst.set(i.line, i.level);
  }

  fileNameEl.textContent = lastFileName;
  const size = fileMeta.size != null ? fileMeta.size : new Blob([rawContent]).size;
  const kb = (size / 1024).toFixed(size < 1024 ? 2 : 1);
  const extra = fileMeta.extraInfo ? ` · ${fileMeta.extraInfo}` : "";
  const charset = `${GdtCore.CHARSET_NAMES[decoded.charset]} (${decoded.source})`;
  fileInfoEl.textContent = `${kb} KB · ${records.length} Felder · Zeichensatz ${charset}${extra}`;

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
    .map((r) => {
      const level = worst.get(r.line);
      const mark = level ? ` <span class="row-flag row-flag-${level}" title="${LEVEL_TEXT[level]}">${LEVEL_TEXT[level]}</span>` : "";
      return `
      <tr id="zeile-${r.line}"${level ? ` class="row-${level}"` : ""}>
        <td class="col-line"><span class="cell-prefix">Zeile </span>${r.line}${mark}</td>
        <td class="col-id">${escapeHtml(r.fieldId)}</td>
        <td class="col-label">${escapeHtml(r.label)}</td>
        <td class="col-value">${escapeHtml(r.content)}</td>
      </tr>`;
    })
    .join("");

  rawText.textContent = rawContent;

  const counts = renderValidation(result);
  toolbar.classList.remove("hidden");
  summary.classList.remove("hidden");
  results.classList.remove("hidden");
  raw.classList.toggle("hidden", !showRaw.checked);
  dropzone.classList.add("hidden");
  if (downloadBtn) downloadBtn.disabled = false;
  announce(`${lastFileName} geladen · ${records.length} Felder · ${counts.error} Fehler, ${counts.warning} Warnungen`);
}

function downloadBytes(filename, bytes) {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
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
    lastBytes = GdtCore.encode(gen.text, gen.format.encoding);

    const decoded = { charset: gen.format.encoding, source: "erzeugt", declared: gen.format.charset };
    const parsed = GdtCore.parse(gen.text, decoded.charset);
    if (!parsed.records.length) {
      showError("Generator lieferte keine lesbaren Felder.");
      return;
    }

    if (downloadGenBtn) downloadGenBtn.disabled = false;
    formatHint.textContent = `Erzeugt: ${gen.format.label} · Satzart(en) ${gen.satzarten.join(", ")} · ${gen.patient.lastName}, ${gen.patient.firstName}`;

    render(parsed, gen.text, { name: gen.fileName, size: lastBytes.length, extraInfo: gen.format.id }, decoded);
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

function showBytes(bytes, name) {
  const decoded = GdtCore.decode(bytes);
  const parsed = GdtCore.parse(decoded.text, decoded.charset);
  if (!parsed.records.length) {
    showError("Keine GDT-Felder erkannt. Ist die Datei leer oder im falschen Format?");
    return false;
  }
  lastBytes = bytes;
  render(parsed, decoded.text, { name, size: bytes.length }, decoded);
  return true;
}

async function handleFile(file) {
  clearError();
  if (!file) return;
  try {
    if (showBytes(new Uint8Array(await file.arrayBuffer()), file.name)) {
      // The dropzone (and the focused button in it) is now hidden – keep focus on the result
      toolbar.focus();
    }
  } catch (err) {
    showError(`Datei konnte nicht gelesen werden: ${err.message || err}`);
  }
}

/** ?beispiel=<name> opens one of the sample files from beispiele/ (linked from the samples page). */
async function loadSampleFromUrl() {
  const name = new URLSearchParams(location.search).get("beispiel");
  if (!name || !/^[a-z0-9-]+$/.test(name)) return;
  try {
    const res = await fetch(`beispiele/${name}.gdt`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showBytes(new Uint8Array(await res.arrayBuffer()), `${name}.gdt`);
  } catch (err) {
    showError(`Beispieldatei „${name}“ konnte nicht geladen werden (${err.message || err}).`);
  }
}

function reset() {
  lastRecords = [];
  lastRaw = "";
  lastBytes = null;
  lastFileName = "export.gdt";
  lastGenerated = null;
  fileInput.value = "";
  tableBody.innerHTML = "";
  summary.innerHTML = "";
  validationList.innerHTML = "";
  rawText.textContent = "";
  toolbar.classList.add("hidden");
  summary.classList.add("hidden");
  validation.classList.add("hidden");
  results.classList.add("hidden");
  raw.classList.add("hidden");
  dropzone.classList.remove("hidden");
  if (downloadGenBtn) downloadGenBtn.disabled = !lastGenerated;
  if (downloadBtn) downloadBtn.disabled = true;
  clearError();
  updateFormatHint();
  if (location.search) history.replaceState(null, "", location.pathname);
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

// Issue links jump to the table row and give it focus for keyboard and screen reader users
validationList.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-line]");
  if (!link) return;
  e.preventDefault();
  const row = $(`zeile-${link.dataset.line}`);
  if (!row) return;
  row.tabIndex = -1;
  row.scrollIntoView({ block: "center" });
  row.focus({ preventScroll: true });
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
    if (!lastBytes) return;
    // Loaded files are saved byte for byte, so the download is identical to the original
    downloadBytes(lastFileName.endsWith(".gdt") ? lastFileName : `${lastFileName}.gdt`, lastBytes);
  });
}

if (generateBtn) {
  generateBtn.addEventListener("click", runGenerate);
}

if (downloadGenBtn) {
  downloadGenBtn.addEventListener("click", () => {
    if (!lastGenerated) return;
    downloadBytes(lastGenerated.fileName, GdtCore.encode(lastGenerated.text, lastGenerated.format.encoding));
  });
}

if (formatSelect) {
  formatSelect.addEventListener("change", updateFormatHint);
}

initFormatSelect();
loadSampleFromUrl();

// Prevent browser from opening dropped files outside the zone
["dragover", "drop"].forEach((evt) => {
  window.addEventListener(evt, (e) => e.preventDefault());
});
