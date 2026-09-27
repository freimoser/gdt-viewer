# GDT Viewer

**Kostenloser Online-Viewer und Generator für GDT-Dateien** (Gerätedatentransfer) – die gängige Schnittstelle zwischen Praxissoftware und medizinischen Geräten in Deutschland.

**Live:** [https://freimoser.github.io/gdt-viewer/](https://freimoser.github.io/gdt-viewer/)  
**Wissen:** [Was ist GDT?](https://freimoser.github.io/gdt-viewer/wissen/was-ist-gdt.html) · [Anbindung](https://freimoser.github.io/gdt-viewer/wissen/anbindung.html) · [Tutorial](https://freimoser.github.io/gdt-viewer/wissen/tutorial.html) · [Tool-Hilfe](https://freimoser.github.io/gdt-viewer/wissen/tool.html)

---

## Was macht dieses Projekt?

| Funktion | Beschreibung |
|----------|----------------|
| **GDT lesen** | Drag & Drop / Dateiauswahl – Anzeige als Tabelle mit Feldbedeutungen |
| **Zusammenfassung** | Patient, Geburtsdatum, Satzart, GDT-Version auf einen Blick |
| **Generator** | Zufällige, konforme Testdateien (GDT **2.1** und **3.0/3.1**) |
| **Download** | Erzeugte oder geladene Datei als `.gdt` speichern |
| **Datenschutz** | **100 % clientseitig** – Dateiinhalte werden nicht auf einen Server geladen |

Ideal für **Praxis-IT**, **Support**, **Medizintechnik**, **Entwicklung** und **Schulungen**.

---

## Features im Überblick

- Drag & Drop für `.gdt` / `.txt`
- Feldtabelle (ID, Bedeutung, Inhalt) + optionaler Rohtext
- Generator-Formate: GDT 2.1 (CRLF/LF/UTF-8), GDT 3.0, GDT 3.1, Multi-Satz, ohne Längenpräfix, ohne 8100
- Satzarten: **6301**, **6302**, **6310**
- Wissensseiten: Grundlagen, Anbindung PVS↔Gerät, Anfänger-Tutorial, Tool-Nutzen
- SEO/GEO-taugliche Unterseiten (Meta, Canonical, JSON-LD, Sitemap)

### 2.x vs. 3.x (kurz)

| | GDT 2.1 | GDT 3.0 / 3.1 |
|--|---------|----------------|
| Version (`9218`) | `02.10` | `03.00` / `03.10` |
| Satzlänge | Feld **8100** | Feld **8004** |
| Extras | oft strengere Längen | variable IDs, Mobil/E-Mail, `6200` als YYYYMMDD |

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
| [Anbindung](https://freimoser.github.io/gdt-viewer/wissen/anbindung.html) | PVS und Gerät, Ordner, Checkliste, Fehler |
| [Tutorial](https://freimoser.github.io/gdt-viewer/wissen/tutorial.html) | Anfänger in ~15 Minuten |
| [Tool-Hilfe](https://freimoser.github.io/gdt-viewer/wissen/tool.html) | Debugging, Schulung, Testdaten |

---

## Tech

- Statisches HTML/CSS/JS (kein Backend)
- Hosting: GitHub Pages
- Lizenz: **MIT**

## Hinweis

GDT-Dateien können Patientendaten enthalten. Nur mit freigegebenen bzw. fiktiven Daten arbeiten. Dieses Tool ist **kein Medizinprodukt**.

## Repository

- **Homepage:** https://freimoser.github.io/gdt-viewer/
- **Issues / Code:** https://github.com/freimoser/gdt-viewer
