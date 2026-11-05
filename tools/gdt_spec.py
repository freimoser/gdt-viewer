"""Single source of truth for GDT field and record definitions.

Source: QMS "GDT – Schnittstellenbeschreibung zum systemunabhängigen Datentransfer zwischen
Praxis-EDV-Systemen und Meßgeräten", Version 2.1 (5/01), chapters 2.2, 3, 4, 5 and Anhang B.

Usage (from the repo root):  python3 tools/gdt_spec.py
Writes gdt-spec.js (used by app.js and generator.js) and the field tables in
wissen/feldkennungen.html. Edit the data here, never the generated outputs.
"""
import html
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent

SOURCE = "GDT-Schnittstellenbeschreibung Version 2.1 (QMS, 5/01)"

# fid: (label, length, type, rule/allowed, example, group)
#   length: "8" = exact, "<=60" = maximum, "var" = variable
#   type:   alnum | num | datum (TTMMJJJJ) | zeit (HHMMSS) | float
FIELDS = {
    "0102": ("Softwareverantwortlicher (SV)", "<=60", "alnum", None, "Firma xxx", "Software"),
    "0103": ("Software", "<=60", "alnum", None, "PraxisMed", "Software"),
    "0132": ("Release-Stand der Software", "<=60", "alnum", None, "Version 4.30b", "Software"),
    "3000": ("Patientennummer / Patientenkennung", "<=10", "alnum", None, "123456", "Patient"),
    "3100": ("Namenszusatz / Vorsatzwort des Patienten", "<=15", "alnum", None, "von", "Patient"),
    "3101": ("Name des Patienten", "<=28", "alnum", None, "Schmitz", "Patient"),
    "3102": ("Vorname des Patienten", "<=28", "alnum", None, "Erna", "Patient"),
    "3103": ("Geburtsdatum des Patienten", "8", "datum", "past", "12041946", "Patient"),
    "3104": ("Titel des Patienten", "<=15", "alnum", None, "Dr.", "Patient"),
    "3105": ("Versichertennummer des Patienten", "<=12", "alnum", None, "123456M789", "Patient"),
    "3106": ("Wohnort des Patienten (PLZ Ort)", "<=30", "alnum", None, "50859 Köln", "Patient"),
    "3107": ("Straße des Patienten", "<=28", "alnum", None, "Holzweg 106", "Patient"),
    "3108": ("Versichertenart (1 = Mitglied, 3 = Familienversicherter, 5 = Rentner)", "1", "num", ["1", "3", "5"], "3", "Patient"),
    "3110": ("Geschlecht des Patienten (1 = männlich, 2 = weiblich)", "1", "num", ["1", "2"], "1", "Patient"),
    "3622": ("Größe des Patienten in cm", "var", "float", None, "175.50", "Patient"),
    "3623": ("Gewicht des Patienten in kg", "var", "float", None, "90.50", "Patient"),
    "3628": ("Muttersprache des Patienten", "<=60", "alnum", None, "türkisch", "Patient"),
    "6200": ("Tag der Erhebung von Behandlungsdaten", "8", "datum", None, "12031993", "Untersuchung"),
    "6201": ("Uhrzeit der Erhebung von Behandlungsdaten", "6", "zeit", None, "132201", "Untersuchung"),
    "6205": ("Aktuelle Diagnose", "<=60", "alnum", None, "Diabetes", "Untersuchung"),
    "6220": ("Befund", "<=60", "alnum", None, "erhöhter Blutdruck", "Untersuchung"),
    "6221": ("Fremdbefund", "<=60", "alnum", None, "Verdacht auf Obstruktion", "Untersuchung"),
    "6226": ("Anzahl der folgenden Zeilen 6228", "<=4", "num", None, "2", "Untersuchung"),
    "6227": ("Kommentar", "<=60", "alnum", None, "Belastung abgebrochen", "Untersuchung"),
    "6228": ("Ergebnistabellentext, formatiert", "<=60", "alnum", None, "", "Untersuchung"),
    "6302": ("Datei-Archivierungsnummer", "<=60", "alnum", None, "000001", "Datei-Verweis"),
    "6303": ("Dateiformat", "<=60", "alnum", None, "PDF", "Datei-Verweis"),
    "6304": ("Dateiinhalt", "<=60", "alnum", None, "Datenanalyse", "Datei-Verweis"),
    "6305": ("Verweis auf Datei (URL oder UNC-Pfad)", "<=60", "alnum", None, "\\\\FS\\DATA\\00712.PDF", "Datei-Verweis"),
    "8000": ("Satzidentifikation (Satzart)", "4", "alnum", None, "6301", "Satz"),
    "8100": ("Satzlänge in Byte", "5", "num", None, "00747", "Satz"),
    "8315": ("GDT-ID des Empfängers", "8", "alnum", None, "ROP200U1", "Satz"),
    "8316": ("GDT-ID des Senders", "8", "alnum", None, "PRAX_EDV", "Satz"),
    "8402": ("Geräte- und verfahrensspezifisches Kennfeld", "<=6", "alnum", None, "EKG01", "Messwerte"),
    "8410": ("Test-Ident", "<=20", "alnum", None, "FEV1", "Messwerte"),
    "8411": ("Testbezeichnung", "<=60", "alnum", None, "Obj. refr. cyl. rechts", "Messwerte"),
    "8418": ("Teststatus (B = bereits berichtet, K = korrigierter Wert)", "1", "alnum", ["B", "K"], "B", "Messwerte"),
    "8420": ("Ergebnis-Wert", "var", "float", None, "-3.7", "Messwerte"),
    "8421": ("Einheit", "<=60", "alnum", None, "dpt", "Messwerte"),
    "8428": ("Probenmaterial-Ident", "<=8", "alnum", None, "", "Messwerte"),
    "8429": ("Probenmaterial-Index", "2", "num", None, "", "Messwerte"),
    "8430": ("Probenmaterial-Bezeichnung", "<=60", "alnum", None, "", "Messwerte"),
    "8431": ("Probenmaterial-Spezifikation", "<=60", "alnum", None, "", "Messwerte"),
    "8432": ("Abnahme-Datum", "8", "datum", None, "31011994", "Messwerte"),
    "8437": ("Einheit(en) für Datenstrom", "<=60", "alnum", None, "min, mmHg, mmHg", "Messwerte"),
    "8438": ("Datenstrom", "<=60", "alnum", None, "(5,120,80),(10,128,92)", "Messwerte"),
    "8439": ("Abnahme-Zeit", "6", "zeit", None, "125600", "Messwerte"),
    "8460": ("Normalwert-Text", "<=60", "alnum", None, "", "Messwerte"),
    "8461": ("Normalwert untere Grenze", "var", "float", None, "-15", "Messwerte"),
    "8462": ("Normalwert obere Grenze", "var", "float", None, "12", "Messwerte"),
    "8470": ("Testbezogene Hinweise", "<=60", "alnum", None, "", "Messwerte"),
    "8480": ("Ergebnis-Text", "<=60", "alnum", None, "", "Messwerte"),
    "8990": ("Signatur (Name / Kürzel des Durchführenden)", "<=60", "alnum", None, "Dr. Huber", "Messwerte"),
    "9206": ("Verwendeter Zeichensatz (1 = 7 Bit, 2 = IBM CP437, 3 = ISO 8859-1 / CP1252)", "1", "num", ["1", "2", "3"], "2", "Satz"),
    "9218": ("Version GDT", "5", "alnum", ["01.00", "02.00", "02.10"], "02.10", "Satz"),
}

# Free categories 6330–6398 (even: name) / 6331–6399 (odd: content), max. 60 characters
for n in range(6330, 6400):
    FIELDS[str(n)] = (
        "Name der freien Kategorie" if n % 2 == 0 else "Inhalt der freien Kategorie",
        "<=60", "alnum", None, "", "Freie Kategorien",
    )

# Fields used by GDT 3.x exports. Not part of the 2.1 specification; only labelled, not checked.
FIELDS_V3 = {
    "8004": "Satzlänge (GDT 3.x)",
    "3618": "Mobiltelefonnummer (GDT 3.x)",
    "3619": "E-Mail-Adresse (GDT 3.x)",
}

SATZARTEN = {
    "6300": {
        "name": "Stammdaten anfordern",
        "direction": "Gerät → Praxissoftware",
        "purpose": "Das Gerät fordert die Stammdaten eines Patienten an; die Antwort ist Satzart 6301.",
        "mandatory": ["8000", "8100", "9218", "3000"],
        "fields": ["8000", "8100", "8315", "8316", "9206", "9218", "3000"],
    },
    "6301": {
        "name": "Stammdaten übermitteln",
        "direction": "Praxissoftware → Gerät",
        "purpose": "Die Praxissoftware übergibt die Patientenstammdaten an das Gerät.",
        "mandatory": ["8000", "8100", "9218", "3000", "3101", "3102", "3103"],
        "fields": ["8000", "8100", "8315", "8316", "9206", "9218", "3000", "3100", "3101", "3102", "3103",
                   "3104", "3105", "3106", "3107", "3108", "3110", "3622", "3623", "3628"],
    },
    "6302": {
        "name": "Neue Untersuchung anfordern",
        "direction": "Praxissoftware → Gerät",
        "purpose": "Die Praxissoftware beauftragt eine Untersuchung und übergibt dazu die Patientendaten.",
        "mandatory": ["8000", "8100", "9218", "3000", "3101", "3102", "3103"],
        "fields": ["8000", "8100", "8315", "8316", "9206", "9218", "0102", "0103", "0132", "3000", "3100",
                   "3101", "3102", "3103", "3104", "3105", "3106", "3107", "3108", "3110", "3622", "3623",
                   "3628", "8402", "8410"],
    },
    "6310": {
        "name": "Daten einer Untersuchung übermitteln",
        "direction": "Gerät → Praxissoftware",
        "purpose": "Das Gerät liefert Messwerte, Befunde und Dateiverweise an die Praxissoftware zurück.",
        "mandatory": ["8000", "8100", "9218", "3000", "8402"],
        "fields": None,  # all result fields are allowed
    },
    "6311": {
        "name": "Daten einer Untersuchung zeigen",
        "direction": "Praxissoftware → Gerät",
        "purpose": "Die Praxissoftware bittet das Gerät, eine bereits durchgeführte Untersuchung anzuzeigen.",
        "mandatory": ["8000", "8100", "9218", "3000"],
        "fields": ["8000", "8100", "8315", "8316", "9206", "9218", "3000", "3100", "3101", "3102", "3103",
                   "3104", "6200", "6201", "8402", "8432", "8439"],
    },
}

# Characters 0x80–0xFF of IBM code page 437 (the GDT 2.1 default character set)
CP437_HIGH = bytes(range(0x80, 0x100)).decode("cp437")

# --- gdt-spec.js --------------------------------------------------------------------------
fields_js = {
    fid: {"label": f[0], "length": f[1], "type": f[2], **({"allowed": f[3]} if isinstance(f[3], list) else {}),
          **({"past": True} if f[3] == "past" else {})}
    for fid, f in FIELDS.items()
}
js = f"""/**
 * GDT field and record definitions – generated by tools/gdt_spec.py, do not edit.
 * Source: {SOURCE}
 */
const GDT_SPEC = {json.dumps({
    "source": SOURCE,
    "fields": fields_js,
    "fieldsV3": FIELDS_V3,
    "satzarten": {k: {kk: vv for kk, vv in v.items() if kk != "purpose"} for k, v in SATZARTEN.items()},
    "cp437High": CP437_HIGH,
}, ensure_ascii=False, indent=2)};

if (typeof window !== "undefined") window.GDT_SPEC = GDT_SPEC;
if (typeof module !== "undefined") module.exports = GDT_SPEC;
"""
(root / "gdt-spec.js").write_text(js, encoding="utf-8")
print(f"updated gdt-spec.js: {len(FIELDS)} fields, {len(SATZARTEN)} Satzarten")


# --- field tables on wissen/feldkennungen.html ---------------------------------------------
def esc(s):
    return html.escape(s, quote=False)


def fmt_len(length):
    if length == "var":
        return "variabel"
    if length.startswith("<="):
        return f"max. {length[2:]}"
    return f"genau {length}"


TYPES = {"alnum": "Text", "num": "Ziffern", "datum": "Datum TTMMJJJJ", "zeit": "Uhrzeit HHMMSS", "float": "Zahl (Punkt)"}
GROUPS = [
    ("Satz", "satz", "Satzkopf und Verwaltung"),
    ("Patient", "patient", "Patientendaten"),
    ("Untersuchung", "untersuchung", "Untersuchung und Befund"),
    ("Messwerte", "messwerte", "Messwerte und Tests"),
    ("Datei-Verweis", "datei", "Verweise auf externe Dateien"),
    ("Software", "software", "Angaben zur Software"),
]


def field_table(group):
    rows = []
    for fid, (label, length, typ, rule, example, g) in FIELDS.items():
        if g != group:
            continue
        ex = f"<code>{esc(example)}</code>" if example else "–"
        rows.append(
            f'            <tr id="feld-{fid}"><td><code>{fid}</code></td><td>{esc(label)}</td>'
            f"<td>{fmt_len(length)}</td><td>{TYPES[typ]}</td><td>{ex}</td></tr>"
        )
    return "\n".join(rows)


blocks = []
for group, anchor, title in GROUPS:
    blocks.append(f'''      <h2 id="{anchor}">{title}</h2>
      <div class="table-scroll" tabindex="0" role="region" aria-label="Tabelle: {title}">
        <table>
          <thead>
            <tr><th scope="col">Feld</th><th scope="col">Bedeutung</th><th scope="col">Länge</th><th scope="col">Format</th><th scope="col">Beispiel</th></tr>
          </thead>
          <tbody>
{field_table(group)}
          </tbody>
        </table>
      </div>''')

sa_rows = "\n".join(
    f'            <tr id="satzart-{sid}"><td><code>{sid}</code></td><td>{esc(s["name"])}</td><td>{esc(s["direction"])}</td>'
    f'<td>{", ".join(f"<code>{m}</code>" for m in s["mandatory"])}</td></tr>'
    for sid, s in SATZARTEN.items()
)
generated = f'''<!-- spec-tables:start -->
      <h2 id="satzarten">Satzarten (Feld 8000)</h2>
      <p>Jeder Satz beginnt mit Feld <code>8000</code>. Nur <code>6300</code> verlangt eine Antwort (<code>6301</code>); alle anderen Satzarten werden ohne Rückmeldung übermittelt.</p>
      <div class="table-scroll" tabindex="0" role="region" aria-label="Tabelle: Satzarten">
        <table>
          <thead>
            <tr><th scope="col">Satzart</th><th scope="col">Bedeutung</th><th scope="col">Richtung</th><th scope="col">Pflichtfelder</th></tr>
          </thead>
          <tbody>
{sa_rows}
          </tbody>
        </table>
      </div>

{chr(10).join(blocks)}

      <h2 id="freie-kategorien">Freie Kategorien (6330–6399)</h2>
      <p>
        Für herstellerspezifische Zusatzangaben stehen Wertepaare bereit: gerade Kennungen
        (<code>6330</code>, <code>6332</code> … <code>6398</code>) enthalten den <strong>Namen</strong>
        der Kategorie, die direkt folgende ungerade Kennung (<code>6331</code> … <code>6399</code>)
        ihren <strong>Inhalt</strong> – jeweils maximal 60 Zeichen.
      </p>
      <!-- spec-tables:end -->'''

page = root / "wissen" / "feldkennungen.html"
if page.exists():
    s = page.read_text(encoding="utf-8")
    s = re.sub(r"<!-- spec-tables:start -->.*?<!-- spec-tables:end -->", lambda m: generated, s, flags=re.S)
    page.write_text(s, encoding="utf-8")
    print("updated wissen/feldkennungen.html field tables")
