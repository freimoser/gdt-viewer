/**
 * Random GDT file generator – Gerätedatentransfer test data in several variants.
 *
 * GDT 2.1 (normgerecht nach QMS-Schnittstellenbeschreibung 2.1): Satzlänge 8100 (5 Ziffern),
 *   Version 02.10, Zeichensatz 9206 = 3 (ISO 8859-1 / CP1252), Zeilenende CR+LF,
 *   Untersuchungsdatum 6200 als TTMMJJJJ, Uhrzeit 6201 als HHMMSS, 8402 in Satzart 6310.
 * Variants marked "Abweichung" deliberately break one rule to test how robust an importer is.
 * GDT 3.x: Satzlänge in Feld 8004, Version 03.00 / 03.10 (layout as used by 3.x exports;
 *   the 3.x specification is not part of the checked data).
 * Line and record lengths are counted in bytes of the file's encoding (format.encoding).
 */

const GDT_FORMATS = {
  gdt21_crlf: {
    id: "gdt21_crlf",
    label: "GDT 2.1 (normgerecht)",
    description: "Nach Spezifikation 2.1: CR+LF · Satzlänge 8100 · Version 02.10 · Zeichensatz 9206 = 3 (ISO 8859-1)",
    lineEnding: "\r\n",
    withLength: true,
    charset: "3",
    encoding: "cp1252",
    version: "02.10",
    major: 2,
    satzlaengeField: "8100",
  },
  gdt21_lf: {
    id: "gdt21_lf",
    label: "GDT 2.1 – Abweichung: nur LF",
    description: "Robustheitstest: Unix-Zeilenenden (LF) statt des vorgeschriebenen CR+LF",
    lineEnding: "\n",
    withLength: true,
    charset: "3",
    encoding: "cp1252",
    version: "02.10",
    major: 2,
    satzlaengeField: "8100",
  },
  gdt21_utf8: {
    id: "gdt21_utf8",
    label: "GDT 2.1 – Abweichung: UTF-8 mit Umlauten",
    description: "Robustheitstest: UTF-8-kodiert (in GDT 2.1 nicht vorgesehen), Namen mit Umlauten, ohne Feld 9206",
    lineEnding: "\r\n",
    withLength: true,
    charset: null,
    encoding: "utf8",
    version: "02.10",
    major: 2,
    satzlaengeField: "8100",
    preferUmlauts: true,
  },
  gdt30_crlf: {
    id: "gdt30_crlf",
    label: "GDT 3.0 (CRLF)",
    description: "Version 03.00 · Satzlänge Feld 8004 · variable Feldlängen",
    lineEnding: "\r\n",
    withLength: true,
    charset: null,
    encoding: "cp1252",
    version: "03.00",
    major: 3,
    satzlaengeField: "8004",
    variableIds: true,
    examDateYmd: true,
  },
  gdt31_crlf: {
    id: "gdt31_crlf",
    label: "GDT 3.1 (CRLF)",
    description: "Version 03.10 · Feld 8004 · E-Mail/Mobil (3618/3619) · 6200 als YYYYMMDD",
    lineEnding: "\r\n",
    withLength: true,
    charset: null,
    encoding: "cp1252",
    version: "03.10",
    major: 3,
    satzlaengeField: "8004",
    variableIds: true,
    examDateYmd: true,
    contactFields: true,
    diversSex: true,
  },
  gdt31_lf: {
    id: "gdt31_lf",
    label: "GDT 3.1 (LF)",
    description: "GDT 3.1 mit Unix-Zeilenenden · Satzlänge Feld 8004",
    lineEnding: "\n",
    withLength: true,
    charset: null,
    encoding: "cp1252",
    version: "03.10",
    major: 3,
    satzlaengeField: "8004",
    variableIds: true,
    examDateYmd: true,
    contactFields: true,
    diversSex: true,
  },
  gdt31_utf8: {
    id: "gdt31_utf8",
    label: "GDT 3.1 (UTF-8 / Umlaute)",
    description: "GDT 3.1 mit Umlauten und Kontaktdaten · Version 03.10",
    lineEnding: "\r\n",
    withLength: true,
    charset: null,
    encoding: "utf8",
    version: "03.10",
    major: 3,
    satzlaengeField: "8004",
    variableIds: true,
    examDateYmd: true,
    contactFields: true,
    diversSex: true,
    preferUmlauts: true,
  },
  gdt31_multi: {
    id: "gdt31_multi",
    label: "GDT 3.1 Mehrere Sätze (6301 + 6310)",
    description: "Zwei Sätze in einer Datei, jeweils mit Feld 8004",
    lineEnding: "\r\n",
    withLength: true,
    charset: null,
    encoding: "cp1252",
    version: "03.10",
    major: 3,
    satzlaengeField: "8004",
    variableIds: true,
    examDateYmd: true,
    contactFields: true,
    multiSatz: true,
  },
  gdt_bare: {
    id: "gdt_bare",
    label: "GDT 2.1 – Abweichung: ohne Längenpräfix",
    description: "Robustheitstest: nur 4-stellige Feldkennung + Inhalt, ohne die vorgeschriebene Zeilenlänge",
    lineEnding: "\r\n",
    withLength: false,
    charset: "3",
    encoding: "cp1252",
    version: "02.10",
    major: 2,
    satzlaengeField: "8100",
  },
  gdt_multi: {
    id: "gdt_multi",
    label: "GDT 2.1 Mehrere Sätze (6301 + 6310, normgerecht)",
    description: "Stammdaten und Messergebnis in einer Datei, jeder Satz mit eigener Satzlänge 8100",
    lineEnding: "\r\n",
    withLength: true,
    charset: "3",
    encoding: "cp1252",
    version: "02.10",
    major: 2,
    satzlaengeField: "8100",
    multiSatz: true,
  },
  gdt_no_8100: {
    id: "gdt_no_8100",
    label: "GDT 2.1 – Abweichung: ohne Satzlänge 8100",
    description: "Robustheitstest: das Pflichtfeld 8100 (Satzlänge) fehlt",
    lineEnding: "\r\n",
    withLength: true,
    charset: "3",
    encoding: "cp1252",
    version: "02.10",
    major: 2,
    satzlaengeField: "8100",
    omitSatzlaenge: true,
  },
};

const LAST_NAMES = [
  "Mueller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner",
  "Becker", "Schulz", "Hoffmann", "Koch", "Richter", "Klein", "Wolf",
  "Neumann", "Schwarz", "Zimmermann", "Braun", "Krueger", "Hofmann",
];

const LAST_NAMES_UMLAUT = [
  "Müller", "Schröder", "Böhm", "Gärtner", "Kühn", "Jäger", "Bäcker",
  "Händler", "König", "Groß", "Weiß", "Strauß", "Fröhlich", "Döring",
];

const FIRST_M = ["Max", "Paul", "Leon", "Felix", "Jonas", "Lukas", "Tim", "Noah", "Ben", "Elias"];
const FIRST_W = ["Anna", "Emma", "Mia", "Sophia", "Hannah", "Lina", "Marie", "Lea", "Clara", "Erika"];
const FIRST_UMLAUT_M = ["Jürgen", "Björn", "Günter", "Rüdiger", "Sören"];
const FIRST_UMLAUT_W = ["Renate", "Gabi", "Sigrid", "Käte", "Inge"];

const STREETS = [
  "Hauptstrasse 12", "Bahnhofstrasse 3", "Gartenweg 7", "Lindenallee 22",
  "Schulstrasse 5", "Ringstrasse 18", "Am Markt 1", "Bergweg 9",
];

const STREETS_UMLAUT = [
  "Mühlenstraße 4", "Königsweg 11", "Bäckerstraße 8", "Grüner Weg 2",
];

const CITIES = [
  "10115 Berlin", "80331 Muenchen", "50667 Koeln", "20095 Hamburg",
  "60311 Frankfurt", "70173 Stuttgart", "01067 Dresden", "04109 Leipzig",
];

const CITIES_UMLAUT = [
  "80331 München", "50667 Köln", "90402 Nürnberg", "99084 Erfurt",
];

// group = 8402 code from Anhang B of the 2.1 specification (BDM00 Blutdruck, ERGO07 Pulsoximetrie, ALLG00 allgemein)
const DEVICES = [
  { id: "RR_SYS", name: "Blutdruck systolisch", unit: "mmHg", min: 100, max: 160, decimals: 0, group: "BDM00" },
  { id: "RR_DIA", name: "Blutdruck diastolisch", unit: "mmHg", min: 60, max: 100, decimals: 0, group: "BDM00" },
  { id: "HF", name: "Herzfrequenz", unit: "1/min", min: 50, max: 110, decimals: 0, group: "ALLG00" },
  { id: "SPO2", name: "Sauerstoffsaettigung", unit: "%", min: 92, max: 100, decimals: 0, group: "ERGO07" },
  { id: "TEMP", name: "Koerpertemperatur", unit: "C", min: 36.1, max: 38.5, decimals: 1, group: "ALLG00" },
  { id: "GLU", name: "Blutzucker", unit: "mg/dl", min: 70, max: 180, decimals: 0, group: "ALLG00" },
  { id: "GEW", name: "Gewicht", unit: "kg", min: 50, max: 120, decimals: 1, group: "ALLG00" },
  { id: "GRO", name: "Groesse", unit: "cm", min: 150, max: 195, decimals: 0, group: "ALLG00" },
];

const SENDER_IDS = ["PRAXIS01", "LABOR_NW", "KARDIO_A", "HAUSARZT", "GERAET_X"];
// GDT-IDs (8315/8316) consist of exactly 8 characters
const RECEIVER_IDS = ["PVS_MAIN", "EMPFANG1", "ARCHIV01", "ZENTRALE"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

/** DDMMYYYY */
function randomBirthDate() {
  const year = randInt(1940, 2010);
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  return `${pad2(day)}${pad2(month)}${year}`;
}

/** DDMMYYYY today-ish */
function randomExamDate() {
  const year = 2026;
  const month = randInt(1, 7);
  const day = randInt(1, 28);
  return `${pad2(day)}${pad2(month)}${year}`;
}

function randomTime() {
  return `${pad2(randInt(7, 18))}${pad2(randInt(0, 59))}`;
}

function randomPatientId(variable) {
  if (variable && Math.random() < 0.5) {
    // GDT 3.x: variable length patient IDs (not limited to 10 chars)
    return `PAT-${randInt(100000, 999999)}-${randInt(10, 99)}`;
  }
  return `P-${randInt(1000, 9999)}`;
}

function randomMobile() {
  return `017${randInt(0, 9)}${randInt(1000000, 9999999)}`;
}

function randomEmail(first, last) {
  const local = `${first}.${last}`
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9.]/g, "");
  return `${local}@beispiel-mail.de`;
}

function splitCity(cityLine) {
  const m = cityLine.match(/^(\d{5})\s+(.+)$/);
  if (m) return { zip: m[1], city: m[2] };
  return { zip: String(randInt(10000, 99999)), city: cityLine };
}

function randomPatient(format) {
  const preferUmlauts = !!format.preferUmlauts;
  let sexRoll = Math.random();
  let sex;
  let femalePool = true;
  if (format.diversSex && sexRoll > 0.9) {
    sex = pick(["D", "X", "U"]);
    femalePool = sexRoll > 0.95;
  } else if (sexRoll < 0.5) {
    sex = "2";
    femalePool = true;
  } else {
    sex = "1";
    femalePool = false;
  }

  const lasts = preferUmlauts ? LAST_NAMES_UMLAUT : LAST_NAMES;
  const firsts = preferUmlauts
    ? femalePool
      ? FIRST_UMLAUT_W.concat(FIRST_W)
      : FIRST_UMLAUT_M.concat(FIRST_M)
    : femalePool
      ? FIRST_W
      : FIRST_M;

  const lastName = pick(lasts);
  const firstName = pick(firsts);
  const cityLine = pick(preferUmlauts ? CITIES_UMLAUT : CITIES);
  const { zip, city } = splitCity(cityLine);

  return {
    id: randomPatientId(!!format.variableIds),
    lastName,
    firstName,
    birth: randomBirthDate(),
    sex,
    street: pick(preferUmlauts ? STREETS_UMLAUT : STREETS),
    cityLine,
    zip,
    city,
    mobile: randomMobile(),
    email: randomEmail(firstName, lastName),
  };
}

/** Exam date: DDMMYYYY (2.x / birth) or YYYYMMDD (3.x field 6200) */
function randomExamDateYmd() {
  const year = 2026;
  const month = randInt(1, 7);
  const day = randInt(1, 28);
  return `${year}${pad2(month)}${pad2(day)}`;
}

function randomExamTimeLong() {
  // HHMMSS sometimes used in 3.x
  return `${pad2(randInt(7, 18))}${pad2(randInt(0, 59))}${pad2(randInt(0, 59))}`;
}

/** Length in bytes of the file's encoding (UTF-8 umlauts take two bytes, CP1252 one). */
function byteLen(str, format) {
  return format.encoding === "utf8" ? new TextEncoder().encode(str).length : str.length;
}

/**
 * Encode one GDT field line.
 * Length (when used) = 3 (len digits) + 4 (field id) + content + lineEnding, in bytes.
 */
function encodeField(fieldId, content, format) {
  const id = String(fieldId).padStart(4, "0");
  const value = content == null ? "" : String(content);
  const ending = format.lineEnding;

  if (!format.withLength) {
    return id + value + ending;
  }

  const totalLen = 3 + 4 + byteLen(value, format) + ending.length;
  if (totalLen > 999) {
    throw new Error(`Feld ${id} zu lang (${totalLen})`);
  }
  return pad3(totalLen) + id + value + ending;
}

/**
 * Build a sentence (Satz) from ordered field pairs [id, content].
 * Inserts Satzlänge after 8000: field 8100 (GDT 2.x) or 8004 (GDT 3.x).
 */
function buildSentence(fields, format) {
  const lenField = format.satzlaengeField || (format.major >= 3 ? "8004" : "8100");
  const withLen = !format.omitSatzlaenge;
  let ordered = fields.slice();

  if (withLen) {
    // GDT 2.1 defines 8100 as 5 numeric digits with leading zeros (e.g. 00421)
    const fmtLen = (n) => (lenField === "8100" ? String(n).padStart(5, "0") : String(n));
    const without = fields.filter(([id]) => id !== "8100" && id !== "8004");
    const probeLen = byteLen(without.map(([id, val]) => encodeField(id, val, format)).join(""), format);
    let lenStr = fmtLen(probeLen);
    for (let i = 0; i < 5; i++) {
      const lineLen = encodeField(lenField, lenStr, format);
      const total = probeLen + byteLen(lineLen, format);
      const next = fmtLen(total);
      if (next === lenStr) break;
      lenStr = next;
    }
    // Final consistency pass
    lenStr = fmtLen(probeLen + byteLen(encodeField(lenField, lenStr, format), format));

    ordered = [];
    let inserted = false;
    for (const pair of without) {
      ordered.push(pair);
      if (pair[0] === "8000" && !inserted) {
        ordered.push([lenField, lenStr]);
        inserted = true;
      }
    }
    if (!inserted) ordered.unshift([lenField, lenStr]);
  }

  return ordered.map(([id, val]) => encodeField(id, val, format)).join("");
}

function addExamDateTime(fields, format) {
  if (format.examDateYmd) {
    // GDT 3.x style: 6200 = Tag (YYYYMMDD), 6201 = Uhrzeit
    fields.push(["6200", randomExamDateYmd()]);
    fields.push(["6201", Math.random() < 0.5 ? randomTime() : randomExamTimeLong()]);
  } else {
    // GDT 2.1: 6200 Tag der Erhebung (TTMMJJJJ), 6201 Uhrzeit (HHMMSS, 6 Stellen)
    fields.push(["6200", randomExamDate()]);
    fields.push(["6201", randomExamTimeLong()]);
  }
}

function headerFields(format, satzart, patient) {
  const fields = [
    ["8000", satzart],
    ["8315", pick(RECEIVER_IDS)],
    ["8316", pick(SENDER_IDS)],
  ];

  // 9206 Zeichensatz (GDT 2.1: 1 = 7 Bit, 2 = CP437, 3 = ISO 8859-1); not used in 3.x
  if (format.charset) {
    fields.push(["9206", format.charset]);
  }
  fields.push(["9218", format.version]);

  fields.push(["3000", patient.id]);
  fields.push(["3101", patient.lastName]);
  fields.push(["3102", patient.firstName]);
  fields.push(["3103", patient.birth]);
  fields.push(["3110", patient.sex]);

  if (Math.random() < 0.75) {
    fields.push(["3107", patient.street]);
    // 3.x oft PLZ/Ort getrennt (3112/3113), 2.x eher kombiniert 3106
    if (format.major >= 3 && Math.random() < 0.65) {
      fields.push(["3112", patient.zip]);
      fields.push(["3113", patient.city]);
    } else {
      fields.push(["3106", patient.cityLine]);
    }
  }

  if (format.contactFields) {
    if (Math.random() < 0.85) fields.push(["3618", patient.mobile]);
    if (Math.random() < 0.85) fields.push(["3619", patient.email]);
  }

  if (format.major >= 3 && Math.random() < 0.3) {
    fields.push(["3105", `A${randInt(100000000, 999999999)}`]);
    fields.push(["3108", pick(["1", "3", "5"])]);
  }

  return fields;
}

/** Satz 6301 – Stammdaten / Patient */
function buildSatz6301(format, patient) {
  const fields = headerFields(format, "6301", patient);
  if (format.major >= 3) addExamDateTime(fields, format);
  if (Math.random() < 0.5) {
    fields.push(["3622", String(randInt(155, 195))]);
    fields.push(["3623", (randInt(500, 1100) / 10).toFixed(1)]);
  }
  return buildSentence(fields, format);
}

/** Satz 6302 – Untersuchungsanforderung */
function buildSatz6302(format, patient) {
  const fields = headerFields(format, "6302", patient);
  const dev = pick(DEVICES);
  if (format.major >= 3) {
    addExamDateTime(fields, format);
    fields.push(["8410", dev.id]);
    fields.push(["8411", dev.name]);
    fields.push([
      "6220",
      format.preferUmlauts
        ? "Bitte Messung durchführen."
        : "Bitte Messung durchfuehren.",
    ]);
  } else {
    // GDT 2.1 record 6302 carries the kind of examination (8402) and a Test-Ident (8410)
    fields.push(["8402", dev.group]);
    fields.push(["8410", dev.id]);
  }
  return buildSentence(fields, format);
}

/** Satz 6310 – Messergebnisse */
function buildSatz6310(format, patient) {
  const fields = headerFields(format, "6310", patient);
  // 8402 (Geräte- und verfahrensspezifisches Kennfeld) is mandatory in 6310; ALLG00 = allgemein
  fields.push(["8402", "ALLG00"]);
  addExamDateTime(fields, format);

  const count = randInt(2, 4);
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let dev = pick(DEVICES);
    let guard = 0;
    while (used.has(dev.id) && guard++ < 10) dev = pick(DEVICES);
    used.add(dev.id);

    const raw = dev.min + Math.random() * (dev.max - dev.min);
    const value =
      dev.decimals === 0 ? String(Math.round(raw)) : raw.toFixed(dev.decimals);

    fields.push(["8410", dev.id]);
    fields.push(["8411", dev.name]);
    fields.push(["8420", value]);
    fields.push(["8421", dev.unit]);
  }

  const comments = format.preferUmlauts
    ? [
        "Messung unauffällig.",
        "Werte im Referenzbereich.",
        "Kontrolle in 3 Monaten empfohlen.",
        "Technisch einwandfreie Messung.",
      ]
    : [
        "Messung unauffaellig.",
        "Werte im Referenzbereich.",
        "Kontrolle in 3 Monaten empfohlen.",
        "Technisch einwandfreie Messung.",
      ];
  fields.push(["6220", pick(comments)]);
  return buildSentence(fields, format);
}

function listFormats() {
  return Object.values(GDT_FORMATS);
}

/**
 * Generate a random GDT file.
 * @param {string} [formatId] - specific format id, or "random" / omit for random
 * @returns {{ text: string, format: object, fileName: string, satzarten: string[] }}
 */
function generateRandomGdt(formatId) {
  let format;
  if (!formatId || formatId === "random") {
    format = pick(Object.values(GDT_FORMATS));
  } else {
    format = GDT_FORMATS[formatId];
    if (!format) throw new Error(`Unbekanntes Format: ${formatId}`);
  }

  const patient = randomPatient(format);
  let text = "";
  const satzarten = [];

  if (format.multiSatz) {
    text += buildSatz6301(format, patient);
    text += buildSatz6310(format, patient);
    satzarten.push("6301", "6310");
  } else {
    const builders = [
      { art: "6301", fn: buildSatz6301 },
      { art: "6302", fn: buildSatz6302 },
      { art: "6310", fn: buildSatz6310 },
    ];
    const choice = pick(builders);
    text += choice.fn(format, patient);
    satzarten.push(choice.art);
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const fileName = `gdt_${format.id}_${patient.id}_${stamp}.gdt`;

  return {
    text,
    format,
    fileName,
    satzarten,
    patient,
  };
}

// Export for browser (global) and optional module use
if (typeof window !== "undefined") {
  window.GDT_FORMATS = GDT_FORMATS;
  window.generateRandomGdt = generateRandomGdt;
  window.listGdtFormats = listFormats;
}
