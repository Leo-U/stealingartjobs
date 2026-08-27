#!/usr/bin/env python3
"""Generate crawlable comic pages, sitemap.xml, and robots.txt."""

from __future__ import annotations

import html
import json
import re
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SITE = "https://stealingartjobs.com"


def replace(pattern: str, replacement: str, page: str) -> str:
    updated, count = re.subn(pattern, replacement, page, count=1, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(f"Expected one match for {pattern!r}, found {count}")
    return updated


def rich_caption(text: str) -> str:
    parts = re.split(r"(\*[^*]+\*)", text)
    return "".join(
        f"<em>{html.escape(part[1:-1])}</em>"
        if part.startswith("*") and part.endswith("*")
        else html.escape(part)
        for part in parts
    )


def iso_date(display_date: str) -> str:
    value = display_date.removeprefix("Uploaded ")
    return datetime.strptime(value, "%B %d, %Y").date().isoformat()


def render_page(template: str, comic: dict, index: int, total: int) -> str:
    title = f"{comic['title']} — Stealing Art Jobs"
    path = f"/comics/{comic['slug']}/"
    canonical = f"{SITE}{path}"
    image_url = f"{SITE}{comic['image']}"
    description = comic["description"]
    page = template
    page = replace(r'<meta name="description" content="[^"]*" />', f'<meta name="description" content="{html.escape(description, quote=True)}" />', page)
    page = replace(r'<meta property="og:type" content="[^"]*" />', '<meta property="og:type" content="article" />', page)
    page = replace(r'<meta property="og:title" content="[^"]*" />', f'<meta property="og:title" content="{html.escape(title, quote=True)}" />', page)
    page = replace(r'<meta property="og:description" content="[^"]*" />', f'<meta property="og:description" content="{html.escape(description, quote=True)}" />', page)
    page = replace(r'<meta property="og:image" content="[^"]*" />', f'<meta property="og:image" content="{html.escape(image_url, quote=True)}" />', page)
    page = replace(r'<meta property="og:url" content="[^"]*" />', f'<meta property="og:url" content="{canonical}" />', page)
    page = replace(r'<link rel="canonical" href="[^"]*" />', f'<link rel="canonical" href="{canonical}" />', page)
    page = replace(r"<title>.*?</title>", f"<title>{html.escape(title)}</title>", page)
    page = replace(r'(<p class="issue" id="comic-number">).*?(</p>)', rf"\g<1>Comic {index + 1:02d}\g<2>", page)
    page = replace(r'(<p class="date" id="comic-date">).*?(</p>)', rf"\g<1>{html.escape(comic['date'])}\g<2>", page)
    page = replace(r'(<h1 id="comic-title">).*?(</h1>)', rf"\g<1>{html.escape(comic['title'])}\g<2>", page)
    note = comic.get("authorNote")
    if note:
        note_image = ""
        if note.get("image"):
            note_image = f'<p class="mini-comic-intro" id="mini-comic-intro">{html.escape(note.get("miniIntro", ""))}</p><figure class="author-note-graphic" id="author-note-graphic"><img src="{html.escape(note["image"], quote=True)}" alt="{html.escape(note["imageAlt"], quote=True)}" /></figure><div class="author-note-after-graphic" id="author-note-after-graphic">{note.get("afterImageHtml", "")}</div>'
        note_html = f'''<aside class="author-note" id="author-note" aria-labelledby="author-note-heading">
          <p class="author-note-label">Author’s note</p>
          <h2 id="author-note-heading">Context before reading</h2>
          <p class="author-note-intro" id="author-note-intro">{html.escape(note["intro"])}</p>
          <details open>
            <summary>Read the full context</summary>
            <div class="author-note-copy" id="author-note-copy">{note["html"]}</div>
            {note_image}
          </details>
        </aside>'''
    else:
        note_html = '<aside class="author-note" id="author-note" aria-labelledby="author-note-heading" hidden><p class="author-note-label">Author’s note</p><h2 id="author-note-heading">Context before reading</h2><p class="author-note-intro" id="author-note-intro"></p><details open><summary>Read the full context</summary><div class="author-note-copy" id="author-note-copy"></div></details></aside>'
    page = replace(r'<aside class="author-note" id="author-note".*?</aside>', note_html, page)
    image = f'<img id="comic-image" src="{html.escape(comic["image"], quote=True)}" alt="{html.escape(comic["alt"], quote=True)}" />'
    page = replace(r'<img id="comic-image".*?/>', image, page)
    caption = comic.get("caption", "")
    caption_html = f'<p class="comic-caption" id="comic-caption">{rich_caption(caption)}</p>' if caption else '<p class="comic-caption" id="comic-caption" hidden></p>'
    page = replace(r'<p class="comic-caption" id="comic-caption".*?</p>', caption_html, page)
    page = replace(r'(<span class="reader-position" id="reader-position">).*?(</span>)', rf"\g<1>{index + 1} / {total}\g<2>", page)
    transcript = "\n".join(f"            <p>{html.escape(line)}</p>" for line in comic["transcript"])
    transcript_html = f'''<details class="comic-transcript" id="comic-transcript">
          <summary>Description</summary>
          <div class="comic-transcript-copy" id="comic-transcript-copy">
{transcript}
          </div>
        </details>'''
    page = replace(r'<details class="comic-transcript" id="comic-transcript">.*?</details>', transcript_html, page)
    structured_data = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": comic["title"],
        "description": description,
        "datePublished": iso_date(comic["date"]),
        "image": image_url,
        "url": canonical,
        "isPartOf": {"@type": "WebSite", "name": "Stealing Art Jobs", "url": f"{SITE}/"},
    }
    json_ld = f'    <script type="application/ld+json">{json.dumps(structured_data, ensure_ascii=False)}</script>\n'
    page = page.replace("  </head>", f"{json_ld}  </head>", 1)
    return page


def main() -> None:
    comics = json.loads((ROOT / "comics.json").read_text(encoding="utf-8"))
    template = (ROOT / "index.html").read_text(encoding="utf-8")
    for index, comic in enumerate(comics):
        destination = ROOT / "comics" / comic["slug"] / "index.html"
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(render_page(template, comic, index, len(comics)), encoding="utf-8")

    sitemap_entries = []
    latest = iso_date(comics[-1]["date"])
    sitemap_entries.append(f"  <url><loc>{SITE}/</loc><lastmod>{latest}</lastmod></url>")
    for comic in comics:
        image = comic["image"].split("?", 1)[0]
        sitemap_entries.append(
            "  <url>"
            f"<loc>{SITE}/comics/{comic['slug']}/</loc>"
            f"<lastmod>{iso_date(comic['date'])}</lastmod>"
            f"<image:image><image:loc>{SITE}{image}</image:loc>"
            f"<image:title>{html.escape(comic['title'])}</image:title>"
            f"<image:caption>{html.escape(comic['description'])}</image:caption></image:image>"
            "</url>"
        )
    sitemap = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
""" + "\n".join(sitemap_entries) + "\n</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")


if __name__ == "__main__":
    main()
