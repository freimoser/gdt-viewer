/**
 * GDT core – character set detection, parsing and validation of Gerätedatentransfer files.
 * No DOM access: runs in the browser (global GdtCore) and in Node (module.exports) for tests.
 * Rules follow GDT_SPEC (gdt-spec.js), generated from the GDT 2.1 specification.
 */
(function (global) {
  const SPEC =
    global.GDT_SPEC || (typeof require === "function" ? require("./gdt-spec.js") : null);

  const CHARSET_NAMES = {
    utf8: "UTF-8",
    cp437: "IBM CP437",
    cp1252: "Windows-1252 / ISO 8859-1",
    din66003: "7 Bit (DIN 66003)",
    ascii: "ASCII",
  };

  // Field 9206 values of GDT 2.1
  const CHARSET_BY_9206 = { 1: "din66003", 2: "cp437", 3: "cp1252" };

  // German 7-bit variant: these ASCII positions carry umlauts
  const DIN66003 = { "@": "§", "[": "Ä", "\\": "Ö", "]": "Ü", "{": "ä", "|": "ö", "}": "ü", "~": "ß" };

  // Umlaut byte values in the two common 8-bit code pages, used to guess an undeclared file
  const CP437_UMLAUTS = new Set([0x81, 0x84, 0x8e, 0x94, 0x99, 0x9a, 0xe1]);
  const CP1252_UMLAUTS = new Set([0xe4, 0xf6, 0xfc, 0xc4, 0xd6, 0xdc, 0xdf]);

  const LINE_RE = /^(\d{3})(\d{4})/;

  function fieldLabel(id) {
    if (SPEC?.fields[id]) return SPEC.fields[id].label;
    if (SPEC?.fieldsV3[id]) return SPEC.fieldsV3[id];
    return "Unbekanntes Feld";
  }

  function isKnownField(id) {
    return Boolean(SPEC?.fields[id] || SPEC?.fieldsV3[id]);
  }

  // ---------------------------------------------------------------------------------------
  // Character sets

  function declared9206(bytes) {
    const ascii = new TextDecoder("windows-1252").decode(bytes);
    const m = ascii.match(/(?:^|[\r\n])(?:\d{3})?9206(\d)/);
    return m ? m[1] : null;
  }

  function decodeLegacy(bytes, charset) {
    if (charset === "cp437") {
      let out = "";
      for (const b of bytes) out += b < 0x80 ? String.fromCharCode(b) : SPEC.cp437High[b - 0x80];
      return out;
    }
    const text = new TextDecoder("windows-1252").decode(bytes);
    if (charset === "din66003") return text.replace(/[@[\\\]{|}~]/g, (c) => DIN66003[c]);
    return text;
  }

  /**
   * Decode raw bytes. UTF-8 is recognised by a strict decode (CP437/CP1252 umlauts are never
   * valid UTF-8); otherwise field 9206 decides, and without it the umlaut bytes do.
   * GDT 2.1 names CP437 as the standard when nothing is declared.
   */
  function decode(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const declared = declared9206(bytes);
    const hasHigh = bytes.some((b) => b > 0x7f);

    if (hasHigh) {
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return { text, charset: "utf8", source: "erkannt", declared };
      } catch {
        // not UTF-8 – fall through to the 8-bit code pages
      }
    }

    let charset = CHARSET_BY_9206[declared];
    let source = "laut Feld 9206";
    if (!charset) {
      if (!hasHigh) {
        charset = "ascii";
        source = "nur ASCII-Zeichen";
      } else {
        let cp437 = 0;
        let cp1252 = 0;
        for (const b of bytes) {
          if (CP437_UMLAUTS.has(b)) cp437++;
          if (CP1252_UMLAUTS.has(b)) cp1252++;
        }
        charset = cp1252 > cp437 ? "cp1252" : "cp437";
        source = "erkannt";
      }
    }
    return { text: decodeLegacy(bytes, charset).replace(/^﻿/, ""), charset, source, declared };
  }

  /** Encode text for download in the given character set (unmappable characters become "?"). */
  function encode(text, charset) {
    if (charset === "utf8") return new TextEncoder().encode(text);
    const reverse437 = charset === "cp437" ? new Map([...SPEC.cp437High].map((c, i) => [c, 0x80 + i])) : null;
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 0x80) out[i] = code;
      else if (reverse437) out[i] = reverse437.get(text[i]) ?? 0x3f;
      else out[i] = code <= 0xff ? code : 0x3f;
    }
    return out;
  }

  function byteLength(str, charset) {
    return charset === "utf8" ? new TextEncoder().encode(str).length : str.length;
  }

  // ---------------------------------------------------------------------------------------
  // Parsing

  function splitLines(text) {
    const lines = [];
    const re = /([^\r\n]*)(\r\n|\n|\r|$)/g;
    let m;
    let number = 0;
    while ((m = re.exec(text)) && !(m[0] === "" && re.lastIndex >= text.length)) {
      number++;
      lines.push({ number, text: m[1], eol: m[2] });
      if (m[0] === "") re.lastIndex++;
    }
    return lines;
  }

  /**
   * Decide once per file whether lines carry the 3-digit length prefix. Reading "80006301"
   * as length 800 + field 0630 would be wrong, so the reading with more known fields wins.
   */
  function detectMode(lines) {
    let prefixed = 0;
    let bare = 0;
    for (const { text } of lines) {
      if (/^\d{7}/.test(text) && isKnownField(text.slice(3, 7))) prefixed++;
      if (/^\d{4}/.test(text) && isKnownField(text.slice(0, 4))) bare++;
    }
    return bare > prefixed ? "bare" : "prefixed";
  }

  function parse(text, charset = "cp1252") {
    const lines = splitLines(text);
    const mode = detectMode(lines);
    const records = [];
    for (const l of lines) {
      if (!l.text.trim()) continue;
      const actualLen = byteLength(l.text + l.eol, charset);
      if (mode === "prefixed" && /^\d{7}/.test(l.text)) {
        const fieldId = l.text.slice(3, 7);
        records.push({ line: l.number, fieldId, content: l.text.slice(7), label: fieldLabel(fieldId), declaredLen: parseInt(l.text.slice(0, 3), 10), actualLen, eol: l.eol });
      } else if (/^\d{4}/.test(l.text)) {
        const fieldId = l.text.slice(0, 4);
        records.push({ line: l.number, fieldId, content: l.text.slice(4), label: fieldLabel(fieldId), declaredLen: null, actualLen, eol: l.eol });
      } else {
        records.push({ line: l.number, fieldId: "—", content: l.text, label: "Freitext / nicht erkannt", declaredLen: null, actualLen, eol: l.eol });
      }
    }
    return { mode, records };
  }

  // ---------------------------------------------------------------------------------------
  // Validation

  function validDate(v) {
    if (!/^\d{8}$/.test(v)) return false;
    const d = +v.slice(0, 2);
    const m = +v.slice(2, 4);
    return d <= 31 && m <= 12; // rule 020: TT 00–31, MM 00–12
  }

  function validTime(v) {
    return /^\d{6}$/.test(v) && +v.slice(0, 2) <= 24 && +v.slice(2, 4) <= 59 && +v.slice(4, 6) <= 59; // rule 090
  }

  function checkField(r, push) {
    const def = SPEC.fields[r.fieldId];
    if (!def) return;
    const v = r.content;
    const len = def.length;
    if (/^\d+$/.test(len)) {
      const n = +len;
      if (v.length !== n) {
        const level = def.type === "alnum" ? "warning" : "error";
        const hint = def.type === "num" ? " – Zahlen mit fester Länge werden mit führenden Nullen aufgefüllt" : "";
        push(level, r, `Inhalt hat ${v.length} statt genau ${n} Zeichen${hint}.`);
      }
    } else if (len.startsWith("<=") && v.length > +len.slice(2)) {
      push("error", r, `Inhalt hat ${v.length} Zeichen, erlaubt sind höchstens ${len.slice(2)}.`);
    }
    if (def.type === "num" && v && !/^\d+$/.test(v)) push("error", r, "Feld erwartet nur Ziffern.");
    if (def.type === "datum" && v) {
      if (!validDate(v)) push("error", r, `Datum „${v}“ entspricht nicht dem Format TTMMJJJJ.`);
      else if (def.past) {
        const iso = `${v.slice(4, 8)}-${v.slice(2, 4)}-${v.slice(0, 2)}`;
        if (iso > new Date().toISOString().slice(0, 10)) push("warning", r, "Geburtsdatum liegt in der Zukunft.");
      }
    }
    if (def.type === "zeit" && v && !validTime(v)) push("error", r, `Uhrzeit „${v}“ entspricht nicht dem Format HHMMSS (6 Ziffern).`);
    if (def.type === "float" && v && !/^-?\d+(\.\d+)?$/.test(v)) {
      push("error", r, /,/.test(v) ? "Dezimalzahl mit Komma – GDT verlangt einen Punkt als Trennzeichen." : "Feld erwartet eine Zahl.");
    }
    if (def.allowed && v && !def.allowed.includes(v)) {
      push("error", r, `Wert „${v}“ ist nicht erlaubt (zulässig: ${def.allowed.join(", ")}).`);
    }
  }

  /**
   * Check a parsed file against GDT 2.1. GDT 3.x files (9218 = 03.xx) only get the structural
   * checks, because the 3.x field catalogue differs and is not part of the 2.1 data.
   */
  function validate(parsed, decoded) {
    const issues = [];
    const push = (level, r, message) => issues.push({ level, line: r ? r.line : null, field: r ? r.fieldId : null, message });
    const { records, mode } = parsed;
    const charset = decoded?.charset || "cp1252";

    if (!records.length) return { issues, version: null, standard: null };

    const version = records.find((r) => r.fieldId === "9218")?.content.trim() || null;
    const v3 = Boolean(version && version.startsWith("03"));
    const standard = v3 ? "GDT 3.x (Grundprüfung)" : "GDT 2.1";

    if (mode === "bare") {
      push("error", null, "Zeilen ohne dreistellige Längenangabe – GDT verlangt sie in jeder Zeile.");
    } else {
      for (const r of records) {
        if (r.declaredLen !== null && r.declaredLen !== r.actualLen) {
          push("error", r, `Zeilenlänge: angegeben ${String(r.declaredLen).padStart(3, "0")}, tatsächlich ${r.actualLen} Byte (inkl. Zeilenende).`);
        }
      }
    }

    const notCrlf = records.filter((r) => r.eol !== "\r\n" && r.eol !== "");
    if (notCrlf.length) {
      push(v3 ? "warning" : "error", null, `${notCrlf.length} Zeile(n) enden nicht mit CR+LF – GDT verlangt CR+LF (0D 0A) als Zeilenende.`);
    }

    // Charset consistency
    if (charset === "utf8" && !v3) {
      push("warning", null, "Datei ist UTF-8-kodiert. GDT 2.1 sieht nur CP437, ISO 8859-1 oder 7 Bit vor (Feld 9206).");
    }

    // Split into Sätze at each 8000
    const saetze = [];
    for (const r of records) {
      if (r.fieldId === "8000" || !saetze.length) saetze.push([]);
      saetze[saetze.length - 1].push(r);
    }

    for (const satz of saetze) {
      const first = satz[0];
      if (first.fieldId !== "8000") {
        push("error", first, "Ein Satz muss mit Feld 8000 (Satzart) beginnen.");
        continue;
      }
      const art = first.content.trim();
      const def = SPEC.satzarten[art];
      if (!def) push(v3 ? "warning" : "error", first, `Unbekannte Satzart „${art}“ (bekannt: ${Object.keys(SPEC.satzarten).join(", ")}).`);

      // Record length 8100 (2.1) / 8004 (3.x) = all bytes of the Satz including line endings
      const lenField = v3 ? "8004" : "8100";
      const lenRec = satz.find((r) => r.fieldId === lenField);
      const total = satz.reduce((sum, r) => sum + r.actualLen, 0);
      if (lenRec) {
        const declaredTotal = parseInt(lenRec.content, 10);
        if (declaredTotal !== total) push(v3 ? "warning" : "error", lenRec, `Satzlänge: angegeben ${lenRec.content}, tatsächlich ${total} Byte.`);
      }
      if (v3) continue;

      // GDT 2.1 checks
      if (def) {
        for (const fid of def.mandatory) {
          if (!satz.some((r) => r.fieldId === fid)) {
            push("error", first, `Pflichtfeld ${fid} (${fieldLabel(fid)}) fehlt in Satzart ${art}.`);
          }
        }
      }
      let inTest = false;
      for (const r of satz) {
        if (r.fieldId === "—") {
          push("error", r, "Zeile ohne Feldkennung.");
          continue;
        }
        if (!SPEC.fields[r.fieldId]) {
          push("warning", r, SPEC.fieldsV3[r.fieldId] ? `Feld ${r.fieldId} stammt aus GDT 3.x und ist in GDT 2.1 nicht definiert.` : `Feldkennung ${r.fieldId} ist in GDT 2.1 nicht definiert.`);
          continue;
        }
        if (def?.fields && !def.fields.includes(r.fieldId)) {
          push("info", r, `Feld ${r.fieldId} ist in Satzart ${art} nicht vorgesehen.`);
        }
        if (r.fieldId === "8410") inTest = true;
        const n = +r.fieldId;
        if (!inTest && n >= 8411 && n <= 8480) {
          push("warning", r, "Messwert-Feld vor dem ersten Test-Ident 8410 – Messwerte gehören zu einer mit 8410 eingeleiteten Gruppe.");
        }
        checkField(r, push);
      }
    }

    const order = { error: 0, warning: 1, info: 2 };
    issues.sort((a, b) => order[a.level] - order[b.level] || (a.line ?? 0) - (b.line ?? 0));
    return { issues, version, standard };
  }

  const api = { CHARSET_NAMES, fieldLabel, decode, encode, byteLength, parse, validate };
  if (typeof module !== "undefined") module.exports = api;
  global.GdtCore = api;
})(typeof window !== "undefined" ? window : globalThis);
