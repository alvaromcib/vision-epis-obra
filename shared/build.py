"""Inline shared CSS/JS and results JSON into a project's dashboard template.

Usage: python shared/build.py <project_dir>
Writes <project_dir>/docs/index.html (self-contained, GitHub Pages-ready).
"""
import sys
from pathlib import Path

SHARED = Path(__file__).resolve().parent
MALT_URL = "https://www.malt.com/profile/alvaromartincoll"


def build(project: Path) -> Path:
    tpl = (project / "dashboard" / "template.html").read_text()
    data = (project / "results" / "results.json").read_text()
    html = (tpl.replace("/*CSS*/", (SHARED / "style.css").read_text())
               .replace("/*VIZ*/", (SHARED / "viz.js").read_text())
               .replace("/*DATA*/", data)
               .replace("https://www.malt.es/profile/alvaromartincoll1", MALT_URL)
               .replace("{{MALT_URL}}", MALT_URL))
    out = project / "docs" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html)
    return out


if __name__ == "__main__":
    p = build(Path(sys.argv[1]).resolve())
    print(p, p.stat().st_size // 1024, "KB")
