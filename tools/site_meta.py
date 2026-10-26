"""Write the SEO/social <head> block (title, description, canonical, Open Graph, Twitter) into every page.

Usage (from the repo root):  python3 tools/site_meta.py
Edit the texts in PAGES here, never the generated block between the seo markers in the HTML files.
The script warns when a title or description is longer than search engines display.
"""
import html
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://freimoser.github.io/gdt-viewer/"
SITE_NAME = "GDT Viewer"
THEME_COLOR = "#0f1419"
# Social preview, rendered from tools/og-image.html (render command in that file)
OG_IMAGE = BASE + "og-image.png"
OG_IMAGE_ALT = "GDT Viewer: GDT-Dateien online lesen und Testdaten erzeugen – Beispiel einer Feldtabelle"
TITLE_MAX = 60
DESC_MAX = 155

PAGES = {
    "index.html": {
        "path": "",
        "type": "website",
        "title": "GDT Viewer – GDT-Dateien online lesen & Testdaten erzeugen",
        "description": "Kostenloser GDT Viewer: GDT-Dateien im Browser lesen, Felder verstehen und GDT 2.1/3.x-Testdaten erzeugen. 100 % lokal – nichts wird hochgeladen.",
        "og_title": "GDT Viewer – GDT-Dateien online lesen & erzeugen",
        "og_description": "Gerätedatentransfer im Browser: Dateien anzeigen, Felder deuten, Testdaten für GDT 2.1 und 3.x erzeugen – ohne Upload auf einen Server.",
    },
    "wissen/index.html": {
        "path": "wissen/",
        "type": "website",
        "title": "GDT Wissen: Gerätedatentransfer verstehen | GDT Viewer",
        "description": "GDT (Gerätedatentransfer) lernen: was die Schnittstelle ist, wie die Anbindung an die Praxissoftware funktioniert, Tutorial und Tool-Hilfe.",
        "og_title": "GDT Wissen – Gerätedatentransfer verstehen",
        "og_description": "Übersicht: Was ist GDT, Anbindung an die Praxissoftware, Anfänger-Tutorial und Nutzen des GDT Viewers.",
    },
    "wissen/was-ist-gdt.html": {
        "path": "wissen/was-ist-gdt.html",
        "type": "article",
        "title": "Was ist GDT? Gerätedatentransfer erklärt | GDT Viewer",
        "description": "Was ist GDT (Gerätedatentransfer)? Aufbau einer GDT-Datei, Feldkennungen, Satzarten 6301/6302/6310 und Unterschiede zwischen GDT 2.1 und 3.x.",
        "og_title": "Was ist GDT? Gerätedatentransfer erklärt",
        "og_description": "Definition, Dateiaufbau, Felder und Versionen (GDT 2.1 vs. 3.x) der Geräteschnittstelle in deutschen Arztpraxen.",
    },
    "wissen/anbindung.html": {
        "path": "wissen/anbindung.html",
        "type": "article",
        "title": "GDT-Anbindung: Praxissoftware & Gerät verbinden | GDT Viewer",
        "description": "So funktioniert die GDT-Anbindung: Übergabeordner, Programmaufruf, Satzarten 6302/6310, Checkliste und typische Fehler zwischen PVS und Gerät.",
        "og_title": "GDT-Anbindung: Praxissoftware und Gerät verbinden",
        "og_description": "Ablauf der GDT-Schnittstelle zwischen PVS und Gerät – Verzeichnisse, Aufruf, Import und typische Stolpersteine.",
    },
    "wissen/tutorial.html": {
        "path": "wissen/tutorial.html",
        "type": "article",
        "title": "GDT Tutorial für Anfänger: erste Datei lesen | GDT Viewer",
        "description": "GDT-Tutorial für Anfänger: erste GDT-Datei im Browser öffnen, Felder deuten, Testdaten erzeugen und GDT 2.1 mit 3.x vergleichen – in ca. 15 Minuten.",
        "og_title": "GDT Tutorial für Anfänger",
        "og_description": "In fünf Schritten: GDT-Datei öffnen, Felder verstehen, Testdaten erzeugen und Versionen vergleichen.",
    },
    "wissen/tool.html": {
        "path": "wissen/tool.html",
        "type": "article",
        "title": "Tool-Hilfe: Debugging, Schulung & Tests | GDT Viewer",
        "description": "Wie der GDT Viewer hilft: GDT-Dateien lokal lesen, Anbindungen debuggen, GDT 2.1/3.x-Testdaten erzeugen und Teams in der Praxis-IT schulen.",
        "og_title": "GDT Viewer: So hilft das Tool",
        "og_description": "Debugging, Schulung und Testdaten für GDT 2.1 und 3.x – lokal im Browser, ohne Upload.",
    },
}

# Tags this script owns; older hand-written copies are removed before the block is inserted
OWNED = re.compile(
    r'\s*(<title>.*?</title>'
    r'|<meta name="(description|keywords|robots|author|language|geo\.region|theme-color|twitter:[a-z:]+)"[^>]*>'
    r'|<meta property="og:[a-z:_]+"[^>]*>'
    r'|<link rel="canonical"[^>]*>)',
    re.S,
)


def attr(value):
    return html.escape(value, quote=True)


def head_block(cfg):
    url = BASE + cfg["path"]
    lines = [
        "<!-- seo:start -->",
        f"<title>{attr(cfg['title'])}</title>",
        f'<meta name="description" content="{attr(cfg["description"])}" />',
        '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
        f'<meta name="theme-color" content="{THEME_COLOR}" />',
        f'<link rel="canonical" href="{url}" />',
        f'<meta property="og:type" content="{cfg["type"]}" />',
        '<meta property="og:locale" content="de_DE" />',
        f'<meta property="og:site_name" content="{SITE_NAME}" />',
        f'<meta property="og:title" content="{attr(cfg["og_title"])}" />',
        f'<meta property="og:description" content="{attr(cfg["og_description"])}" />',
        f'<meta property="og:url" content="{url}" />',
        f'<meta property="og:image" content="{OG_IMAGE}" />',
        '<meta property="og:image:type" content="image/png" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        f'<meta property="og:image:alt" content="{attr(OG_IMAGE_ALT)}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{attr(cfg["og_title"])}" />',
        f'<meta name="twitter:description" content="{attr(cfg["og_description"])}" />',
        f'<meta name="twitter:image" content="{OG_IMAGE}" />',
        f'<meta name="twitter:image:alt" content="{attr(OG_IMAGE_ALT)}" />',
        "<!-- seo:end -->",
    ]
    return "\n  ".join(lines)


problems = 0
for rel, cfg in PAGES.items():
    for key, limit in (("title", TITLE_MAX), ("description", DESC_MAX)):
        if len(cfg[key]) > limit:
            problems += 1
            print(f"WARN {rel}: {key} has {len(cfg[key])} chars (max {limit})")

    path = root / rel
    s = path.read_text(encoding="utf-8")
    head_end = s.index("</head>")
    head, rest = s[:head_end], s[head_end:]
    head = re.sub(r"\s*<!-- seo:start -->.*?<!-- seo:end -->", "", head, flags=re.S)
    # Only strip owned tags outside JSON-LD blocks
    parts = re.split(r'(<script type="application/ld\+json">.*?</script>)', head, flags=re.S)
    parts = [p if p.startswith("<script") else OWNED.sub("", p) for p in parts]
    head = "".join(parts)
    head = re.sub(
        r'(<meta name="viewport"[^>]*>)',
        lambda m: m.group(1) + "\n  " + head_block(cfg),
        head,
        count=1,
    )
    path.write_text(head + rest, encoding="utf-8")
    print(f"updated {rel}: title {len(cfg['title'])}, description {len(cfg['description'])}")

if problems:
    raise SystemExit(f"{problems} length warning(s)")
