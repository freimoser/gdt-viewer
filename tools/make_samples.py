"""Write the sample GDT files in beispiele/ (and beispiel.gdt) with correct line and record lengths.

Usage (from the repo root):  python3 tools/make_samples.py
All patient data is fictional. Every sample except the one with deliberate errors must pass the
viewer's GDT 2.1 check – run `node tools/check_samples.js` afterwards.
"""
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "beispiele"
out.mkdir(exist_ok=True)

CODEC = {"2": "cp437", "3": "cp1252"}


def line(fid, value, codec, eol="\r\n"):
    body = f"{fid}{value}"
    return f"{3 + len(body.encode(codec)) + len(eol):03d}{body}{eol}"


def record(fields, charset="3", eol="\r\n", length_override=None):
    """fields without 8100; 8100 is inserted after 8000 and counts every byte of the record."""
    codec = CODEC[charset]
    lines = [line(f, v, codec, eol) for f, v in fields]
    total = sum(len(l.encode(codec)) for l in lines) + 3 + 4 + 5 + len(eol)
    lines.insert(1, line("8100", f"{length_override or total:05d}", codec, eol))
    return "".join(lines).encode(codec)


HEAD_PCS = [("8315", "EKG_TYP1"), ("8316", "PRAX_EDV")]  # Praxis-EDV → Gerät
HEAD_MG = [("8315", "PRAX_EDV"), ("8316", "BDM_SYS1")]  # Gerät → Praxis-EDV
PATIENT = [("3000", "02345"), ("3101", "Mustermann"), ("3102", "Erika"), ("3103", "01051980"), ("3110", "2")]

SAMPLES = {
    "6300-stammdaten-anfordern": record(
        [("8000", "6300"), ("8315", "PRAX_EDV"), ("8316", "EKG_TYP1"), ("9206", "3"), ("9218", "02.10"), ("3000", "02345")]
    ),
    # CP437 (9206 = 2) – the standard character set of GDT 2.1 – with umlauts
    "6301-stammdaten-uebermitteln": record(
        [("8000", "6301"), *HEAD_PCS, ("9206", "2"), ("9218", "02.10"),
         ("3000", "02345"), ("3101", "Müller"), ("3102", "Jürgen"), ("3103", "12041956"), ("3110", "1"),
         ("3107", "Holzweg 106"), ("3106", "50859 Köln"), ("3622", "178"), ("3623", "79.5")],
        charset="2",
    ),
    "6302-untersuchung-anfordern": record(
        [("8000", "6302"), *HEAD_PCS, ("9206", "3"), ("9218", "02.10"), *PATIENT,
         ("8402", "EKG01"), ("8410", "RUHE_EKG")]
    ),
    "6310-untersuchungsdaten-uebermitteln": record(
        [("8000", "6310"), *HEAD_MG, ("9206", "3"), ("9218", "02.10"), *PATIENT,
         ("8402", "BDM01"), ("6200", "04112026"), ("6201", "093000"),
         ("8410", "RR_SYS"), ("8411", "Blutdruck systolisch"), ("8420", "128"), ("8421", "mmHg"),
         ("8410", "RR_DIA"), ("8411", "Blutdruck diastolisch"), ("8420", "82"), ("8421", "mmHg"),
         ("6220", "Langzeit-Blutdruckmessung unauffällig.")]
    ),
    "6311-untersuchung-zeigen": record(
        [("8000", "6311"), ("8315", "BDM_SYS1"), ("8316", "PRAX_EDV"), ("9206", "3"), ("9218", "02.10"),
         ("3000", "02345"), ("3101", "Mustermann"), ("3102", "Erika"),
         ("6200", "04112026"), ("6201", "093000"), ("8402", "BDM01")]
    ),
}

# Deliberate mistakes for practising with the checker (see wissen/fehler.html):
# wrong line length, record length off, date in ISO format, decimal comma, missing 8402
broken = record(
    [("8000", "6310"), *HEAD_MG, ("9206", "3"), ("9218", "02.10"), *PATIENT,
     ("6200", "2026-11-04"), ("8410", "TEMP"), ("8411", "Körpertemperatur"), ("8420", "37,2"), ("8421", "C")],
    length_override=300,
)
broken = broken.replace(b"0193101Mustermann", b"0213101Mustermann")
SAMPLES["6310-mit-fehlern"] = broken

for name, data in SAMPLES.items():
    (out / f"{name}.gdt").write_bytes(data)
    print(f"beispiele/{name}.gdt: {len(data)} Byte")

# The classic sample in the repo root is the result record
(root / "beispiel.gdt").write_bytes(SAMPLES["6310-untersuchungsdaten-uebermitteln"])
print("beispiel.gdt = 6310-untersuchungsdaten-uebermitteln.gdt")

# --- sample sections on wissen/beispieldateien.html ------------------------------------------
import html
import re

PAGE_TEXT = {
    "6300-stammdaten-anfordern": ("Satzart 6300: Stammdaten anfordern",
        "Das Gerät fordert die Stammdaten eines Patienten an; die Praxissoftware antwortet mit Satzart 6301. Sender ist hier das Gerät (8316 = EKG_TYP1)."),
    "6301-stammdaten-uebermitteln": ("Satzart 6301: Stammdaten übermitteln",
        "Die Praxissoftware übergibt die Patientenstammdaten an das Gerät. Diese Datei ist im Zeichensatz IBM CP437 gespeichert (9206 = 2), dem Standard von GDT 2.1 – mit Umlauten in Name und Wohnort."),
    "6302-untersuchung-anfordern": ("Satzart 6302: Neue Untersuchung anfordern",
        "Die Praxissoftware beauftragt ein Ruhe-EKG (8402 = EKG01) und übergibt dazu die Patientendaten. Zeichensatz ISO 8859-1 / Windows-1252 (9206 = 3)."),
    "6310-untersuchungsdaten-uebermitteln": ("Satzart 6310: Daten einer Untersuchung übermitteln",
        "Das Gerät liefert das Ergebnis einer Langzeit-Blutdruckmessung (8402 = BDM01) zurück: zwei Messwerte, jeweils eingeleitet mit Test-Ident 8410, dazu ein Befund in 6220."),
    "6311-untersuchung-zeigen": ("Satzart 6311: Daten einer Untersuchung zeigen",
        "Die Praxissoftware bittet das Gerät, eine bereits durchgeführte Untersuchung vom 4. November 2026 um 9:30 Uhr anzuzeigen."),
    "6310-mit-fehlern": ("Übungsdatei mit fünf typischen Fehlern",
        "Diese Datei ist absichtlich fehlerhaft: falsche Zeilenlänge, falsche Satzlänge, fehlendes Pflichtfeld 8402, Datum im ISO-Format und ein Komma als Dezimaltrennzeichen. Öffnen Sie sie im Viewer, um die Prüfung in Aktion zu sehen."),
}

sections = []
for name, (title, text) in PAGE_TEXT.items():
    data = SAMPLES[name]
    content = data.decode("cp437" if b"92062\r\n" in data else "cp1252").replace("\r\n", "\n").rstrip("\n")
    sections.append(f'''      <h2 id="{name}">{html.escape(title, quote=False)}</h2>
      <p>{html.escape(text, quote=False)}</p>
      <pre tabindex="0">{html.escape(content, quote=False)}</pre>
      <p class="sample-actions">
        <a class="btn btn-secondary" href="../?beispiel={name}">Im Viewer öffnen</a>
        <a class="btn btn-ghost" href="../beispiele/{name}.gdt" download>Herunterladen ({len(data)} Byte)</a>
      </p>''')

page = root / "wissen" / "beispieldateien.html"
s = page.read_text(encoding="utf-8")
block = "<!-- samples:start -->\n" + "\n\n".join(sections) + "\n      <!-- samples:end -->"
s = re.sub(r"<!-- samples:start -->.*?<!-- samples:end -->", lambda m: block, s, flags=re.S)
page.write_text(s, encoding="utf-8")
print("updated wissen/beispieldateien.html sample sections")
