"""Inline shared CSS/JS and results JSON into a project's dashboard templates.

Usage: python shared/build.py <project_dir>
Writes two self-contained, GitHub Pages-ready pages:
  dashboard/template.html    -> docs/index.html     (Spanish)
  dashboard/template.en.html -> docs/en/index.html  (English, if the template exists)
Both get a small ES/EN language switch.
"""
import sys
from pathlib import Path

SHARED = Path(__file__).resolve().parent
MALT_URL = "https://www.malt.com/profile/alvaromartincoll"

SWITCH = ('<nav class="lang" aria-label="Idioma / Language">'
          '<a href="{es}" hreflang="es"{es_cur}>ES</a><a href="{en}" hreflang="en"{en_cur}>EN</a></nav>')


def render(tpl: str, data: str, lang: str, has_en: bool) -> str:
    html = (tpl.replace("/*CSS*/", (SHARED / "style.css").read_text(encoding="utf-8"))
               .replace("/*VIZ*/", (SHARED / "viz.js").read_text(encoding="utf-8"))
               .replace("/*DATA*/", data)
               .replace("https://www.malt.es/profile/alvaromartincoll1", MALT_URL)
               .replace("{{MALT_URL}}", MALT_URL))
    if lang == "en":
        # Assets (img/, portfolio/) live next to the Spanish page, one level up.
        html = html.replace("<head>", '<head>\n<base href="../">', 1)
    if has_en:
        cur = ' aria-current="page"'
        sw = SWITCH.format(es="./", en="en/",
                           es_cur=cur if lang == "es" else "", en_cur=cur if lang == "en" else "")
        html = html.replace("<body>", "<body>\n" + sw, 1)
    return html


def build(project: Path) -> list:
    data = (project / "results" / "results.json").read_text(encoding="utf-8")
    tpl_en = project / "dashboard" / "template.en.html"
    has_en = tpl_en.exists()
    outs = [(project / "docs" / "index.html",
             render((project / "dashboard" / "template.html").read_text(encoding="utf-8"), data, "es", has_en))]
    if has_en:
        outs.append((project / "docs" / "en" / "index.html", render(tpl_en.read_text(encoding="utf-8"), data, "en", True)))
    for path, html in outs:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
    return [p for p, _ in outs]


if __name__ == "__main__":
    for p in build(Path(sys.argv[1]).resolve()):
        print(p, p.stat().st_size // 1024, "KB")
