# GDT Viewer & Validator

**Kostenloser Online-Viewer, Prüfer und Generator für GDT-Dateien** (Gerätedatentransfer) – die gängige Schnittstelle zwischen Praxissoftware und medizinischen Geräten in Deutschland.

**Live:** [https://freimoser.github.io/gdt-viewer/](https://freimoser.github.io/gdt-viewer/)  
**Wissen:** [Was ist GDT?](https://freimoser.github.io/gdt-viewer/wissen/was-ist-gdt.html) · [Feldkennungen](https://freimoser.github.io/gdt-viewer/wissen/feldkennungen.html) · [Beispieldateien](https://freimoser.github.io/gdt-viewer/wissen/beispieldateien.html) · [Fehler beheben](https://freimoser.github.io/gdt-viewer/wissen/fehler.html) · [Anbindung](https://freimoser.github.io/gdt-viewer/wissen/anbindung.html) · [Tutorial](https://freimoser.github.io/gdt-viewer/wissen/tutorial.html) · [Tool-Hilfe](https://freimoser.github.io/gdt-viewer/wissen/tool.html)

---

## Was macht dieses Projekt?

| Funktion | Beschreibung |
|----------|----------------|
| **GDT lesen** | Drag & Drop / Dateiauswahl – Anzeige als Tabelle mit Feldbedeutungen |
| **GDT prüfen** | Prüfung nach GDT 2.1: Zeilen- und Satzlängen, Pflichtfelder, Feldlängen, Datums- und Zahlenformate |
| **Zeichensatz** | Feld 9206 (7 Bit / CP437 / ISO 8859-1) wird ausgewertet, UTF-8 erkannt |
| **Zusammenfassung** | Patient, Geburtsdatum, Satzart, GDT-Version auf einen Blick |
| **Generator** | Normgerechte GDT-2.1-Testdateien, 3.x-Varianten und gezielte Abweichungen für Robustheitstests |
| **Beispieldateien** | Eine normgerechte Datei je Satzart (6300–6311) in [`beispiele/`](beispiele/) |
| **Download** | Geladene Dateien byteidentisch, erzeugte im passenden Zeichensatz speichern |
| **Datenschutz** | **100 % clientseitig** – Dateiinhalte werden nicht auf einen Server geladen |

Ideal für **Praxis-IT**, **Support**, **Medizintechnik**, **Entwicklung** und **Schulungen**.

---

## Features im Überblick

- Drag & Drop für `.gdt` / `.txt`
- Feldtabelle (ID, Bedeutung, Inhalt) + optionaler Rohtext
- Prüfung mit Sprunglinks zur betroffenen Zeile; Grundlage ist die QMS-Schnittstellenbeschreibung GDT 2.1
- Generator-Formate: GDT 2.1 normgerecht, Multi-Satz, GDT 3.0, GDT 3.1 sowie Abweichungen (nur LF, UTF-8, ohne Längenpräfix, ohne 8100)
- Satzarten: **6300**, **6301**, **6302**, **6310**, **6311**
- Wissensseiten: Grundlagen, Feldkennungen, Beispieldateien, Fehler-Ratgeber, Anbindung PVS↔Gerät, Anfänger-Tutorial, Tool-Nutzen
- SEO/GEO: Meta, Canonical, Open Graph, verknüpftes JSON-LD, Sitemap, `llms.txt` / `llms-full.txt`

### 2.x vs. 3.x (kurz)

| | GDT 2.1 | GDT 3.0 / 3.1 |
|--|---------|----------------|
| Version (`9218`) | `02.10` | `03.00` / `03.10` |
| Satzlänge | Feld **8100** | Feld **8004** |
| Zeichensatz | Feld **9206** (Standard CP437) | kein Feld 9206 |

---

## Schnellstart (lokal)

```bash
git clone https://github.com/freimoser/gdt-viewer.git
cd gdt-viewer
python3 -m http.server 8080
```

Browser: [http://localhost:8080](http://localhost:8080)

---

## Wissensportal

| Seite | Inhalt |
|-------|--------|
| [Wissen](https://freimoser.github.io/gdt-viewer/wissen/) | Übersicht |
| [Was ist GDT?](https://freimoser.github.io/gdt-viewer/wissen/was-ist-gdt.html) | Definition, Dateiaufbau, Felder, Versionen |
| [Feldkennungen](https://freimoser.github.io/gdt-viewer/wissen/feldkennungen.html) | Alle Felder und Satzarten von GDT 2.1 |
| [Beispieldateien](https://freimoser.github.io/gdt-viewer/wissen/beispieldateien.html) | Normgerechte Dateien je Satzart |
| [Fehler beheben](https://freimoser.github.io/gdt-viewer/wissen/fehler.html) | Umlaute, Längen, Import, Zuordnung |
| [Anbindung](https://freimoser.github.io/gdt-viewer/wissen/anbindung.html) | PVS und Gerät, Ordner, Checkliste, Fehler |
| [Tutorial](https://freimoser.github.io/gdt-viewer/wissen/tutorial.html) | Anfänger in ~15 Minuten |
| [Tool-Hilfe](https://freimoser.github.io/gdt-viewer/wissen/tool.html) | Debugging, Schulung, Testdaten |

---

## Pflege (SEO / GEO)

Kopfzeile, Footer, Meta-Tags, strukturierte Daten, Sitemap und `llms.txt` werden aus zentralen Skripten erzeugt.
Die Blöcke zwischen `<!-- site-header:start -->`, `<!-- seo:start -->` usw. **nicht von Hand ändern** – sie werden überschrieben.

| Was ändern? | Wo? |
|-------------|-----|
| Navigation, Footer, Brotkrumen | `tools/site_chrome.py` |
| Title, Description, Open Graph, JSON-LD, Datum, Sitemap | `tools/site_meta.py` |
| Fakten in `llms.txt` | `tools/site_llms.py` |
| Vorschaubild `og-image.png` | `tools/og-image.html` (Render-Befehl in der Datei) |
| Feld- und Satzarttabelle (Viewer, Generator, Seite Feldkennungen) | `tools/gdt_spec.py` → `gdt-spec.js` |
| Beispieldateien und ihre Seite | `tools/make_samples.py` |

Nach jeder Änderung an Inhalten, CSS oder JS:

```bash
python3 tools/gdt_spec.py && python3 tools/make_samples.py && python3 tools/site_chrome.py && python3 tools/site_meta.py && python3 tools/site_llms.py
node tools/check_samples.js   # alle Beispieldateien müssen die Prüfung bestehen
```

Neue oder geänderte Seiten lassen sich über IndexNow sofort an Bing & Co. melden (Schlüsseldatei `c56355b1258259a97ec28d6beef16c93.txt` im Repo-Root):

```bash
python3 tools/indexnow.py
```

Bei inhaltlichen Änderungen einer Seite das sichtbare „Aktualisiert“-Datum **und** `modified` in `tools/site_meta.py` anpassen.
Die Sitemap muss in der Google Search Console und den Bing Webmaster Tools eingereicht werden – `robots.txt` unter `/gdt-viewer/` wird von Crawlern nicht gelesen.

## Tech

- Statisches HTML/CSS/JS (kein Backend); Logik in `gdt-core.js` (ohne DOM, in Node testbar)
- Hosting: GitHub Pages
- Lizenz: **MIT**

## Hinweis

GDT-Dateien können Patientendaten enthalten. Nur mit freigegebenen bzw. fiktiven Daten arbeiten. Dieses Tool ist **kein Medizinprodukt**.

## Repository

- **Homepage:** https://freimoser.github.io/gdt-viewer/
- **Issues / Code:** https://github.com/freimoser/gdt-viewer
