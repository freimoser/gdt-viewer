"""Write the SEO/social <head> block (title, description, canonical, Open Graph, Twitter, JSON-LD) into every page.

Usage (from the repo root):  python3 tools/site_meta.py
Edit the texts in PAGES here, never the generated block between the seo markers in the HTML files.
The script warns when a title or description is longer than search engines display.
"""
import html
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://freimoser.github.io/gdt-viewer/"
SITE_NAME = "GDT Viewer"
THEME_COLOR = "#0f1419"
# Social preview, rendered from tools/og-image.html (render command in that file)
OG_IMAGE = BASE + "og-image.png"
OG_IMAGE_ALT = "GDT Viewer: GDT-Dateien online lesen und Testdaten erzeugen – Beispiel einer Feldtabelle"
LOGO = BASE + "icon-192.png"
REPO = "https://github.com/freimoser/gdt-viewer"
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

# Structured data per page. "modified" must match the visible "Aktualisiert" date on the page.
# FAQPage / HowTo blocks stay hand-written in the pages next to the content they describe.
LD = {
    "index.html": {"schema": "WebPage", "published": "2026-07-18", "modified": "2026-10-26", "app": True},
    "wissen/index.html": {"schema": "CollectionPage", "crumb": "Wissen", "published": "2026-07-20", "modified": "2026-07-20"},
    "wissen/was-ist-gdt.html": {"schema": "Article", "crumb": "Was ist GDT?", "published": "2026-07-20", "modified": "2026-07-20",
                                "headline": "Was ist GDT? Gerätedatentransfer erklärt"},
    "wissen/anbindung.html": {"schema": "Article", "crumb": "Anbindung", "published": "2026-07-20", "modified": "2026-07-20",
                              "headline": "GDT-Anbindung: So funktioniert der Datenaustausch"},
    "wissen/tutorial.html": {"schema": "Article", "crumb": "Tutorial", "published": "2026-07-20", "modified": "2026-07-20",
                             "headline": "GDT Tutorial für Anfänger"},
    "wissen/tool.html": {"schema": "Article", "crumb": "Tool-Hilfe", "published": "2026-07-20", "modified": "2026-07-20",
                         "headline": "Wie der GDT Viewer hilft", "app": True},
}

ORG = {
    "@type": "Organization",
    "@id": BASE + "#organization",
    "name": SITE_NAME,
    "url": BASE,
    "logo": {"@type": "ImageObject", "url": LOGO, "width": 192, "height": 192},
    "sameAs": [REPO],
}
WEBSITE = {
    "@type": "WebSite",
    "@id": BASE + "#website",
    "name": SITE_NAME,
    "url": BASE,
    "inLanguage": "de-DE",
    "description": "GDT Viewer und Wissensportal zum Gerätedatentransfer (GDT) für Praxissoftware und Medizintechnik in Deutschland.",
    "publisher": {"@id": ORG["@id"]},
}
GDT_TOPIC = {"@type": "Thing", "name": "Gerätedatentransfer", "alternateName": ["GDT", "GDT-Schnittstelle"]}
APP = {
    "@type": "WebApplication",
    "@id": BASE + "#app",
    "name": SITE_NAME,
    "alternateName": ["GDT Online Viewer", "Gerätedatentransfer Viewer"],
    "url": BASE,
    "description": "Kostenloser Online-Viewer und Generator für GDT-Dateien (Gerätedatentransfer). Unterstützt GDT 2.1 und 3.x, verarbeitet Dateien lokal im Browser.",
    "applicationCategory": "HealthApplication",
    "applicationSubCategory": "GDT-Viewer und Testdaten-Generator",
    "operatingSystem": "Any",
    "browserRequirements": "Requires JavaScript",
    "inLanguage": "de-DE",
    "isAccessibleForFree": True,
    "license": "https://opensource.org/licenses/MIT",
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
    "image": OG_IMAGE,
    "screenshot": OG_IMAGE,
    "featureList": [
        "GDT-Dateien per Drag-and-Drop lesen",
        "Feldtabelle mit Bedeutungen",
        "Zufällige GDT 2.1 und 3.x Testdateien",
        "Download als .gdt",
        "Keine Server-Speicherung der Dateiinhalte",
    ],
    "about": GDT_TOPIC,
    "publisher": {"@id": ORG["@id"]},
}
# Hand-written blocks of these types are replaced by the generated graph
LD_REPLACED = {"WebApplication", "SoftwareApplication", "WebSite", "CollectionPage", "WebPage", "Article"}


def ld_graph(rel, cfg):
    ld = LD[rel]
    url = BASE + cfg["path"]
    page_id = url + "#webpage"
    page = {
        "@type": "CollectionPage" if ld["schema"] == "CollectionPage" else "WebPage",
        "@id": page_id,
        "url": url,
        "name": cfg["title"],
        "description": cfg["description"],
        "inLanguage": "de-DE",
        "isPartOf": {"@id": WEBSITE["@id"]},
        "primaryImageOfPage": {"@type": "ImageObject", "url": OG_IMAGE, "width": 1200, "height": 630},
        "datePublished": ld["published"],
        "dateModified": ld["modified"],
        "about": GDT_TOPIC,
    }
    graph = [ORG, WEBSITE, page]
    if "crumb" in ld:
        crumbs = [("GDT Viewer", BASE)]
        if rel != "wissen/index.html":
            crumbs.append(("Wissen", BASE + "wissen/"))
        crumbs.append((ld["crumb"], url))
        page["breadcrumb"] = {"@id": url + "#breadcrumb"}
        graph.append({
            "@type": "BreadcrumbList",
            "@id": url + "#breadcrumb",
            "itemListElement": [
                {"@type": "ListItem", "position": i, "name": name, "item": item}
                for i, (name, item) in enumerate(crumbs, start=1)
            ],
        })
    if ld["schema"] == "Article":
        graph.append({
            "@type": "Article",
            "@id": url + "#article",
            "headline": ld["headline"],
            "description": cfg["description"],
            "inLanguage": "de-DE",
            "image": OG_IMAGE,
            "datePublished": ld["published"],
            "dateModified": ld["modified"],
            "author": {"@id": ORG["@id"]},
            "publisher": {"@id": ORG["@id"]},
            "mainEntityOfPage": {"@id": page_id},
            "isPartOf": {"@id": WEBSITE["@id"]},
            "about": GDT_TOPIC,
        })
    if ld.get("app"):
        graph.append(APP)
        if rel == "index.html":
            page["mainEntity"] = {"@id": APP["@id"]}
    body = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)
    body = body.replace("</", "<\\/")
    return "<!-- seo-ld:start -->\n  <script type=\"application/ld+json\">\n" + body + "\n  </script>\n  <!-- seo-ld:end -->"


def strip_replaced_ld(head):
    def keep(m):
        try:
            data = json.loads(m.group(1))
        except ValueError:
            return m.group(0)
        return "" if data.get("@type") in LD_REPLACED else m.group(0)
    return re.sub(r'\s*<script type="application/ld\+json">(.*?)</script>', keep, head, flags=re.S)


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
    head = re.sub(r"\s*<!-- seo-ld:start -->.*?<!-- seo-ld:end -->", "", head, flags=re.S)
    head = strip_replaced_ld(head)
    # Only strip owned tags outside JSON-LD blocks
    parts = re.split(r'(<script type="application/ld\+json">.*?</script>)', head, flags=re.S)
    parts = [p if p.startswith("<script") else OWNED.sub("", p) for p in parts]
    head = "".join(parts)
    head = re.sub(
        r'(<meta name="viewport"[^>]*>)',
        lambda m: m.group(1) + "\n  " + head_block(cfg) + "\n  " + ld_graph(rel, cfg),
        head,
        count=1,
    )
    path.write_text(head + rest, encoding="utf-8")
    print(f"updated {rel}: title {len(cfg['title'])}, description {len(cfg['description'])}")

# sitemap.xml – lastmod follows the structured-data "modified" date of each page
urls = "\n".join(
    f"  <url>\n    <loc>{BASE + cfg['path']}</loc>\n    <lastmod>{LD[rel]['modified']}</lastmod>\n  </url>"
    for rel, cfg in PAGES.items()
)
(root / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f"{urls}\n"
    "</urlset>\n",
    encoding="utf-8",
)
print(f"updated sitemap.xml: {len(PAGES)} URLs")

if problems:
    raise SystemExit(f"{problems} length warning(s)")
