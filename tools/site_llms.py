"""Write llms.txt (site map for AI search tools) and llms-full.txt (full page text as Markdown).

Usage (from the repo root):  python3 tools/site_llms.py
Both files are generated from the published HTML pages, so run this after every content change.
Spec: https://llmstxt.org
"""
import html
import pathlib
import re
from html.parser import HTMLParser
from urllib.parse import urljoin

root = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://freimoser.github.io/gdt-viewer/"

# Order and grouping of pages in llms.txt / llms-full.txt
PAGES = [
    ("Tool", "index.html"),
    ("Wissen", "wissen/index.html"),
    ("Wissen", "wissen/was-ist-gdt.html"),
    ("Wissen", "wissen/anbindung.html"),
    ("Wissen", "wissen/tutorial.html"),
    ("Wissen", "wissen/tool.html"),
]

# Interface and navigation parts that carry no reference content
SKIP_IDS = {"dropzone", "toolbar", "summary", "results", "raw", "error", "status"}
SKIP_CLASSES = {"breadcrumb", "toc", "cta-box", "related", "sr-only", "generator-controls", "format-hint"}
VOID = {"br", "img", "input", "meta", "link", "hr", "source"}
BLOCKS = {"h1", "h2", "h3", "h4", "p", "li", "pre", "table", "summary", "ul", "ol", "div", "section", "article", "details", "header", "main"}


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node("root", {})

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_endtag(self, tag):
        node = self.cur
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.cur = node.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def find(node, pred):
    if isinstance(node, Node):
        if pred(node):
            return node
        for c in node.children:
            hit = find(c, pred)
            if hit:
                return hit
    return None


def skipped(node):
    classes = set(node.attrs.get("class", "").split())
    return (
        node.attrs.get("id") in SKIP_IDS
        or classes & SKIP_CLASSES
        or node.attrs.get("aria-hidden") == "true"
        or node.tag in {"script", "style", "button", "select", "svg", "template"}
    )


class Renderer:
    def __init__(self, page_url):
        self.page_url = page_url

    def inline(self, node):
        if isinstance(node, str):
            return re.sub(r"\s+", " ", node)
        if skipped(node):
            return ""
        text = "".join(self.inline(c) for c in node.children)
        if node.tag in ("strong", "b"):
            return f"**{text.strip()}**" if text.strip() else ""
        if node.tag in ("em", "i"):
            return f"*{text.strip()}*" if text.strip() else ""
        if node.tag == "code":
            return f"`{text.strip()}`"
        if node.tag == "br":
            return "\n"
        if node.tag == "a":
            href = node.attrs.get("href", "")
            if href.startswith("#") or not text.strip():
                return text
            return f"[{text.strip()}]({urljoin(self.page_url, href)})"
        return text

    def block(self, node, depth=0):
        """Return a list of Markdown blocks."""
        if isinstance(node, str):
            text = re.sub(r"\s+", " ", node).strip()
            return [text] if text else []
        if skipped(node):
            return []
        tag = node.tag
        if tag in ("h1", "h2", "h3", "h4"):
            level = {"h1": "#", "h2": "##", "h3": "###", "h4": "####"}[tag]
            return [f"{level} {self.inline(node).strip()}"]
        if tag == "summary":
            return [f"### {self.inline(node).strip()}"]
        if tag == "p":
            classes = node.attrs.get("class", "")
            text = self.inline(node).strip()
            if not text:
                return []
            return [f"*{text}*" if "meta-line" in classes else text]
        if tag == "span" and "callout-title" in node.attrs.get("class", ""):
            return [f"**{self.inline(node).strip()}**"]
        if tag == "pre":
            raw = "".join(c if isinstance(c, str) else self.inline(c) for c in node.children).strip("\n")
            return ["```\n" + raw + "\n```"]
        if tag in ("ul", "ol"):
            items = [c for c in node.children if isinstance(c, Node) and c.tag == "li"]
            lines = []
            for i, li in enumerate(items, start=1):
                marker = f"{i}." if tag == "ol" else "-"
                text = self.inline(li).strip()
                lines.append(f"{'  ' * depth}{marker} {text}")
            return ["\n".join(lines)] if lines else []
        if tag == "table":
            rows = []
            for tr in self.rows(node):
                cells = [self.inline(td).strip().replace("|", "\\|") for td in tr.children if isinstance(td, Node) and td.tag in ("td", "th")]
                if cells:
                    rows.append(cells)
            if not rows:
                return []
            width = max(len(r) for r in rows)
            rows = [r + [""] * (width - len(r)) for r in rows]
            out = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
            out += ["| " + " | ".join(r) + " |" for r in rows[1:]]
            return ["\n".join(out)]
        blocks = []
        inline_buf = []

        def flush():
            text = "".join(inline_buf).strip()
            if text:
                blocks.append(text)
            inline_buf.clear()

        for c in node.children:
            if isinstance(c, Node) and (c.tag in BLOCKS or c.tag == "span" and "callout-title" in c.attrs.get("class", "")):
                flush()
                blocks.extend(self.block(c, depth))
            elif isinstance(c, Node) and c.tag == "a" and "card-link" in c.attrs.get("class", ""):
                flush()
                title = find(c, lambda n: n.tag in ("h2", "h3"))
                desc = find(c, lambda n: n.tag == "p")
                url = urljoin(self.page_url, c.attrs.get("href", ""))
                blocks.append(f"- [{self.inline(title).strip()}]({url}): {self.inline(desc).strip()}")
            else:
                inline_buf.append(self.inline(c))
        flush()
        return blocks

    def rows(self, table):
        for c in table.children:
            if isinstance(c, Node):
                if c.tag == "tr":
                    yield c
                elif c.tag in ("thead", "tbody", "tfoot"):
                    yield from self.rows(c)


def page_markdown(rel):
    source = (root / rel).read_text(encoding="utf-8")
    tree = TreeBuilder()
    tree.feed(source)
    main = find(tree.root, lambda n: n.tag == "main")
    url = BASE + re.sub(r"(^|/)index\.html$", r"\1", rel)
    md = "\n\n".join(Renderer(url).block(main))
    # Card links render as separate blocks – join neighbouring ones into one list
    md = re.sub(r"(?m)^(- \[.*)\n\n(?=- \[)", r"\1\n", md)
    md = re.sub(r"(?m)^(- \[.*)\n\n(?=- \[)", r"\1\n", md)
    return url, re.sub(r"\n{3,}", "\n\n", md).strip()


def meta(rel, name):
    source = (root / rel).read_text(encoding="utf-8")
    if name == "title":
        return html.unescape(re.search(r"<title>(.*?)</title>", source, re.S).group(1)).strip()
    m = re.search(rf'<meta name="{name}" content="(.*?)"', source)
    return html.unescape(m.group(1)) if m else ""


def short_title(rel):
    return re.sub(r"\s*[|–]\s*GDT Viewer$", "", meta(rel, "title")).strip()


# --- llms.txt ---------------------------------------------------------------
lines = [
    "# GDT Viewer",
    "",
    "> Kostenloser Online-Viewer und Generator für GDT-Dateien (Gerätedatentransfer), die in "
    "Deutschland gängige Textschnittstelle zwischen Praxisverwaltungssoftware (PVS) und "
    "medizinischen Geräten. Liest GDT 2.1 und GDT 3.0/3.1 im Browser, erklärt jedes Feld und "
    "erzeugt konforme Testdateien mit fiktiven Patientendaten. Alle Daten bleiben lokal im Browser.",
    "",
    "Wichtige Fakten:",
    "",
    "- Jede GDT-Zeile besteht aus 3 Ziffern Gesamtlänge (inklusive Zeilenende CR+LF), 4 Ziffern Feldkennung und dem Inhalt, z. B. `0193101Mustermann` (3 + 4 + 10 Zeichen + 2 = 19).",
    "- Satzarten (Feld 8000): 6301 Stammdaten übermitteln, 6302 Untersuchung anfordern, 6310 Untersuchungsergebnis übermitteln.",
    "- GDT 2.1 nutzt Feld 8100 für die Satzlänge und Version `02.10`; GDT 3.x nutzt Feld 8004 und Version `03.00`/`03.10` (Feld 9218).",
    "- Der GDT Viewer ist Open Source (MIT), kein Medizinprodukt und lädt keine Dateiinhalte auf einen Server.",
    "",
]
sections = {}
for group, rel in PAGES:
    url = BASE + re.sub(r"(^|/)index\.html$", r"\1", rel)
    sections.setdefault(group, []).append(f"- [{short_title(rel)}]({url}): {meta(rel, 'description')}")
for group, items in sections.items():
    lines += [f"## {group}", "", *items, ""]
lines += [
    "## Optional",
    "",
    f"- [Volltext aller Seiten]({BASE}llms-full.txt): Alle Inhalte dieser Website als ein Markdown-Dokument",
    "- [Quellcode auf GitHub](https://github.com/freimoser/gdt-viewer): Parser, Generator und Feldbedeutungen (MIT-Lizenz)",
    f"- [Sitemap]({BASE}sitemap.xml)",
    "",
]
(root / "llms.txt").write_text("\n".join(lines), encoding="utf-8")

# --- llms-full.txt ----------------------------------------------------------
parts = [
    "# GDT Viewer – Volltext",
    "",
    f"> Alle Inhalte von {BASE} als Markdown. Quelle für Zitate: die jeweils angegebene Seiten-URL.",
    "",
]
for _, rel in PAGES:
    url, md = page_markdown(rel)
    parts += ["---", "", f"Quelle: {url}", "", md, ""]
(root / "llms-full.txt").write_text("\n".join(parts), encoding="utf-8")

print(f"updated llms.txt ({len((root / 'llms.txt').read_text(encoding='utf-8'))} chars)")
print(f"updated llms-full.txt ({len((root / 'llms-full.txt').read_text(encoding='utf-8'))} chars)")
