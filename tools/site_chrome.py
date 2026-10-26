"""Write the shared site header + footer into every page (static site, no build step).

Usage (from the repo root):  python3 tools/site_chrome.py
Edit LINKS / header() / footer() here, never the generated blocks in the HTML files.
Run it again after changing styles.css, app.js or generator.js to refresh the ?v= cache-busting hashes.
"""
import hashlib, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
PAGES = {
    "index.html": ("", "viewer"),
    "wissen/index.html": ("../", "wissen"),
    "wissen/was-ist-gdt.html": ("../", "was-ist-gdt"),
    "wissen/anbindung.html": ("../", "anbindung"),
    "wissen/tutorial.html": ("../", "tutorial"),
    "wissen/tool.html": ("../", "tool"),
    # Served by GitHub Pages for any unknown path, so it needs absolute links
    "404.html": ("/gdt-viewer/", None),
}
LINKS = [
    ("viewer", "", "Viewer"),
    ("wissen", "wissen/", "Wissen"),
    ("was-ist-gdt", "wissen/was-ist-gdt.html", "Was ist GDT?"),
    ("anbindung", "wissen/anbindung.html", "Anbindung"),
    ("tutorial", "wissen/tutorial.html", "Tutorial"),
    ("tool", "wissen/tool.html", "Tool-Hilfe"),
]

# Visible breadcrumb label per page – keep in sync with LD[...]["crumb"] in tools/site_meta.py
CRUMBS = {
    "wissen": "Wissen",
    "was-ist-gdt": "Was ist GDT?",
    "anbindung": "Anbindung",
    "tutorial": "Tutorial",
    "tool": "Tool-Hilfe",
}

CUR = ' aria-current="page"'

NAV_SCRIPT = '''  <script>
    // Mobile: the link row scrolls sideways – bring the current page's link into view
    (function () {
      var nav = document.querySelector(".site-nav");
      var cur = nav && nav.querySelector("[aria-current]");
      if (!cur || nav.scrollWidth <= nav.clientWidth) return;
      var offset = cur.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft = offset - (nav.clientWidth - cur.offsetWidth) / 2;
    })();
  </script>'''

# Cache busting: references to these files get ?v=<content hash>, so browsers fetch a
# new copy exactly when the file changed (GitHub Pages caches assets for 10 minutes)
VERSIONED = ["styles.css", "app.js", "generator.js"]
ASSET_VERSION = {
    name: hashlib.sha1((root / name).read_bytes()).hexdigest()[:8] for name in VERSIONED
}
ASSET_REF = re.compile(r'((?:href|src)="[^"]*?)(' + "|".join(map(re.escape, VERSIONED)) + r')(?:\?v=[0-9a-f]+)?"')


def href(prefix, target):
    # Pages inside wissen/ link to their siblings directly instead of via ../wissen/
    if prefix == "../" and target.startswith("wissen/"):
        return target[len("wissen/"):] or "./"
    return (prefix + target) or "./"

def header(prefix, current):
    links = "\n".join(
        f'        <a href="{href(prefix, t)}"{CUR if k == current else ""}>{label}</a>'
        for k, t, label in LINKS
    )
    return f'''<!-- site-header:start -->
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <header class="site-header">
    <div class="site-header-inner">
      <a class="site-brand" href="{href(prefix, "")}">
        <span class="site-brand-mark" aria-hidden="true">GDT</span>
        <span class="site-brand-name">GDT Viewer</span>
      </a>
      <nav class="site-nav" aria-label="Hauptnavigation">
{links}
      </nav>
    </div>
  </header>
{NAV_SCRIPT}
  <!-- site-header:end -->'''

def breadcrumb(prefix, current):
    items = [f'<li><a href="{href(prefix, "")}">GDT Viewer</a></li>']
    if current != "wissen":
        items.append(f'<li><a href="{href(prefix, "wissen/")}">Wissen</a></li>')
    items.append(f'<li><span aria-current="page">{CRUMBS[current]}</span></li>')
    lines = "\n".join("          " + i for i in items)
    return f'''<!-- breadcrumb:start -->
      <nav class="breadcrumb" aria-label="Brotkrumen">
        <ol>
{lines}
        </ol>
      </nav>
      <!-- breadcrumb:end -->'''


def footer(prefix):
    p = prefix
    return f'''<!-- site-footer:start -->
    <footer class="site-footer">
      <div class="site-footer-grid">
        <div>
          <h2>Tool</h2>
          <ul>
            <li><a href="{href(p, "")}">GDT Viewer</a></li>
            <li><a href="{href(p, "wissen/tool.html")}">Tool-Hilfe</a></li>
            <li><a href="https://github.com/freimoser/gdt-viewer">GitHub Repository</a></li>
          </ul>
        </div>
        <div>
          <h2>Wissen</h2>
          <ul>
            <li><a href="{href(p, "wissen/")}">Übersicht</a></li>
            <li><a href="{href(p, "wissen/was-ist-gdt.html")}">Was ist GDT?</a></li>
            <li><a href="{href(p, "wissen/anbindung.html")}">GDT-Anbindung</a></li>
            <li><a href="{href(p, "wissen/tutorial.html")}">Tutorial für Anfänger</a></li>
          </ul>
        </div>
        <div>
          <h2>Hinweise</h2>
          <ul>
            <li>Kein Medizinprodukt · nur Hilfswerkzeug</li>
            <li>Dateiinhalte bleiben im Browser</li>
            <li>Open Source · Lizenz: MIT</li>
          </ul>
        </div>
      </div>
      <p class="site-footer-note">GDT Viewer für Praxis-IT &amp; Medizintechnik in Deutschland</p>
    </footer>
    <!-- site-footer:end -->'''

for rel, (prefix, current) in PAGES.items():
    path = root / rel
    s = path.read_text(encoding="utf-8")

    # Header: replace a previous generated block, or the old in-page nav + skip link
    if "<!-- site-header:start -->" in s:
        s = re.sub(r"<!-- site-header:start -->.*?<!-- site-header:end -->", lambda m: header(prefix, current), s, flags=re.S)
    else:
        s = re.sub(r'\s*<a class="skip-link"[^>]*>[^<]*</a>', "", s)
        s = re.sub(r'\s*<nav class="site-nav".*?</nav>', "", s, count=1, flags=re.S)
        s = s.replace("<body>", "<body>\n  " + header(prefix, current), 1)

    # Breadcrumb on knowledge pages: replace a previous generated block or the old <p class="breadcrumb">
    if current in CRUMBS:
        if "<!-- breadcrumb:start -->" in s:
            s = re.sub(r"<!-- breadcrumb:start -->.*?<!-- breadcrumb:end -->", lambda m: breadcrumb(prefix, current), s, flags=re.S)
        else:
            s = re.sub(r'<p class="breadcrumb">.*?</p>', lambda m: breadcrumb(prefix, current), s, count=1, flags=re.S)

    s = ASSET_REF.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={ASSET_VERSION[m.group(2)]}"', s)

    # Footer
    if "<!-- site-footer:start -->" in s:
        s = re.sub(r"<!-- site-footer:start -->.*?<!-- site-footer:end -->", lambda m: footer(prefix), s, flags=re.S)
    else:
        s = re.sub(r'<footer class="site-footer">.*?</footer>', lambda m: footer(prefix), s, count=1, flags=re.S)

    # Every page gets a <main id="main"> landmark wrapping the content before the footer
    if '<main id="main">' not in s:
        s = re.sub(r"\s*<main>", "", s)
        s = re.sub(r"\s*</main>", "", s)
        s = re.sub(r'(<div class="page[^"]*">)', r'\1\n    <main id="main">', s, count=1)
        s = s.replace("    <!-- site-footer:start -->", "    </main>\n\n    <!-- site-footer:start -->", 1)

    path.write_text(s, encoding="utf-8")
    print("updated", rel)
