"""Inline src/ into a single self-contained index.html."""
import base64
from pathlib import Path

here = Path(__file__).parent
src = here / "src"
font = base64.b64encode((src / "fonts" / "InterVariable.woff2").read_bytes()).decode()
css = (src / "styles.css").read_text().replace("/*FONT*/", f"data:font/woff2;base64,{font}")
html = (src / "template.html").read_text()
html = html.replace("/*CSS*/", css)
html = html.replace("/*DATA*/", (src / "data.js").read_text())
html = html.replace("/*APP*/", (src / "app.js").read_text())
html = html.replace("/*TOUR*/", (src / "tour.js").read_text())
(here / "index.html").write_text(html)
print(f"wrote {here / 'index.html'} ({len(html):,} bytes)")
