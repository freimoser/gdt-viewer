"""Submit all sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver …) after a deploy.

Usage (from the repo root, after GitHub Pages has published):  python3 tools/indexnow.py
The key file <key>.txt in the repo root proves ownership; it must be live before submitting.
"""
import json
import pathlib
import re
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://freimoser.github.io/gdt-viewer/"

key_files = [p for p in root.glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}", p.stem)]
if len(key_files) != 1:
    raise SystemExit("Expected exactly one IndexNow key file (<32 hex chars>.txt) in the repo root")
key = key_files[0].stem

urls = re.findall(r"<loc>(.*?)</loc>", (root / "sitemap.xml").read_text(encoding="utf-8"))
payload = {
    "host": "freimoser.github.io",
    "key": key,
    "keyLocation": f"{BASE}{key}.txt",
    "urlList": urls,
}
req = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json; charset=utf-8"},
)
with urllib.request.urlopen(req, timeout=30) as res:
    # 200 = accepted, 202 = accepted, key validation pending
    print(f"IndexNow: HTTP {res.status} for {len(urls)} URLs")
